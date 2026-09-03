import { createHash } from "node:crypto";
import { MODEL_TIMEOUT_MS } from "@/lib/ai/gateway";
import { canonicalizeV2Artifact, detectV2Language, partitionV2Snapshot, type V2Guide, type V2SourceSnapshot } from "@/lib/ai/generation-v2";
import { GenerationV2Persistence, type V2OutputLanguage } from "@/lib/ai/generation-v2-persistence";
import { type V2ArtifactProvider, v2ArtifactFailure } from "@/lib/ai/generation-v2-provider";

// A provider attempt can consume the current 180-second gateway boundary.
// Reserve a small settlement margin without changing the provider timeout.
export const V2_PROVIDER_ARTIFACT_LEASE_MS = MODEL_TIMEOUT_MS + 30_000;

export type V2ExecutionMetric = {
  artifactId: string;
  partitionId: string;
  attempt: number;
  outcome: "success" | "retry_wait" | "gap" | "already_complete";
  errorCode: string | null;
};

export function v2ManifestForSnapshot(snapshot: V2SourceSnapshot) {
  const partitions = partitionV2Snapshot(snapshot);
  return partitions.map((partition, index) => ({
    partitionKey: partitions.length === 1 ? "guide" : partition.id,
    partitionOrder: index,
    required: true,
    spanContentHashes: partition.span_ids.map((id) => snapshot.spans.find((span) => span.id === id)!.content_hash),
  }));
}

function artifactPartition(snapshot: V2SourceSnapshot, partitionKey: string) {
  const partitions = partitionV2Snapshot(snapshot);
  return partitionKey === "guide" ? partitions[0] : partitions.find((partition) => partition.id === partitionKey);
}

function resultHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export async function executePersistedGenerationV2(input: {
  store: GenerationV2Persistence;
  requestId: string;
  snapshot: V2SourceSnapshot;
  title: string;
  provider: V2ArtifactProvider;
  outputLanguage?: V2OutputLanguage;
  onMetric?: (metric: V2ExecutionMetric) => void;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<{ guide: V2Guide | null; metrics: V2ExecutionMetric[] }> {
  const metrics: V2ExecutionMetric[] = [];
  const emit = (metric: V2ExecutionMetric) => { metrics.push(metric); input.onMetric?.(metric); };
  const outputLanguage = input.outputLanguage ?? "match_materials";
  const resolvedLanguage = outputLanguage === "match_materials" ? detectV2Language(input.snapshot.spans.map((span) => span.text).join("\n")) : outputLanguage;
  const artifacts = input.store.attachManifest(input.requestId);

  for (const artifact of artifacts) {
    if (artifact.status === "complete") {
      emit({ artifactId: artifact.id, partitionId: artifact.partitionKey, attempt: artifact.attemptCount, outcome: "already_complete", errorCode: null });
      continue;
    }
    let claim = input.store.claimArtifact(artifact.id, undefined, V2_PROVIDER_ARTIFACT_LEASE_MS);
    while (claim) {
      const partition = artifactPartition(input.snapshot, artifact.partitionKey);
      if (!partition) throw new Error("V2_ARTIFACT_PARTITION_MISSING");
      try {
        const raw = await input.provider.generate({ artifactId: artifact.id, attempt: claim.artifact.attemptCount, partition, spans: partition.span_ids.map((id) => input.snapshot.spans.find((span) => span.id === id)!), outputLanguage: resolvedLanguage });
        const result = canonicalizeV2Artifact(raw, partition, input.snapshot);
        input.store.settleArtifactSuccess(artifact.id, claim.leaseId, result);
        void resultHash(result); // Hash parity is asserted at the database repository boundary.
        emit({ artifactId: artifact.id, partitionId: artifact.partitionKey, attempt: claim.artifact.attemptCount, outcome: "success", errorCode: null });
        break;
      } catch (error) {
        const failure = v2ArtifactFailure(error);
        const settled = input.store.settleArtifactFailure(artifact.id, claim.leaseId, { code: failure.code, message: failure.message }, failure.retryable);
        emit({ artifactId: artifact.id, partitionId: artifact.partitionKey, attempt: claim.artifact.attemptCount, outcome: settled.status === "retry_wait" ? "retry_wait" : "gap", errorCode: failure.code });
        if (settled.status !== "retry_wait") break;
        await (input.sleep?.(Math.min(250 * settled.attemptCount, 2_000)) ?? Promise.resolve());
        claim = input.store.claimArtifact(artifact.id, undefined, V2_PROVIDER_ARTIFACT_LEASE_MS);
      }
    }
  }

  const assembled = input.store.assemble(input.requestId, {
    schema_version: "2.0",
    id: `v2-guide-${input.requestId}`,
    session_id: input.snapshot.session_id,
    title: input.title,
    source_snapshot_hash: input.snapshot.snapshot_hash,
    totalUnits: input.snapshot.sources.reduce((sum, source) => sum + source.unit_count, 0),
    readableUnits: input.snapshot.sources.reduce((sum, source) => sum + source.readable_unit_count, 0),
  });
  return { guide: assembled.guide, metrics };
}
