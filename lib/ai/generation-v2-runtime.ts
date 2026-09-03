import { createHash, randomUUID } from "node:crypto";
import { canonicalizeV2Artifact, detectV2Language, sourceSnapshotSchema, v2ContractHash, v2GuideSchema, type V2Guide, type V2SourceSnapshot } from "@/lib/ai/generation-v2";
import { ModelGatewayV2Provider, v2ArtifactFailure, type V2ArtifactProvider } from "@/lib/ai/generation-v2-provider";
import { v2ArtifactContentKey, v2RequestContentKey, type V2OutputLanguage } from "@/lib/ai/generation-v2-persistence";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { createOrJoinGenerationV2Request, upsertGenerationV2Artifact, linkGenerationV2Artifact, claimGenerationV2Artifact, settleGenerationV2Artifact, assembleGenerationV2Request, readGenerationV2Request, readGenerationV2Artifacts, markGenerationV2RequestWorking } from "@/lib/server/generation-v2-persistence";
import type { Json, Database } from "@/lib/server/database.types";
import type { V2Partition } from "@/lib/ai/generation-v2";

const LEASE_SECONDS = 210;
type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
type SpanRow = Database["public"]["Tables"]["source_spans"]["Row"];

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex"); }
function asWarnings(value: Json) { return Array.isArray(value) ? value.filter((item): item is { code: string; message: string; locator: number | null } => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).code === "string" && typeof (item as Record<string, unknown>).message === "string")) : []; }
function logRuntime(input: { requestId: string; status: string; artifacts: Array<{ status: string; attempt_count: number }>; providerAttempts: number; durationMs: number; outcome: string }) {
  const counts = input.artifacts.reduce((value, artifact) => ({ ...value, [artifact.status]: (value[artifact.status] ?? 0) + 1 }), {} as Record<string, number>);
  console.info("[generation-v2-runtime]", JSON.stringify({ requestId: input.requestId, artifactCounts: counts, providerAttempts: input.providerAttempts, persistedAttemptCount: input.artifacts.reduce((sum, artifact) => sum + artifact.attempt_count, 0), durationMs: input.durationMs, finalStatus: input.status, runnerOutcome: input.outcome }));
}

export async function loadV2SourceSnapshot(sessionId: string): Promise<V2SourceSnapshot> {
  const admin = getSupabaseAdmin();
  const [{ data: sources, error: sourceError }, { data: spans, error: spanError }, { data: session, error: sessionError }] = await Promise.all([
    admin.from("sources").select("*").eq("session_id", sessionId).in("status", ["ready", "ready_with_gaps"]).order("created_at"),
    admin.from("source_spans").select("*").eq("session_id", sessionId).order("source_id").order("locator_number").order("ordinal"),
    admin.from("preparation_sessions").select("title").eq("id", sessionId).maybeSingle(),
  ]);
  if (sourceError) throw sourceError; if (spanError) throw spanError; if (sessionError) throw sessionError;
  if (!sources?.length || !spans?.length) throw new Error("NO_USABLE_SOURCES");
  const sourceRows = sources as SourceRow[];
  const spanRows = (spans as SpanRow[]).filter((span) => sourceRows.some((source) => source.id === span.source_id));
  const snapshot = {
    session_id: sessionId,
    owner_scope: `session:${sessionId}`,
    title: session?.title ?? "Study Guide",
    sources: sourceRows.map((source) => ({ id: source.id, display_name: source.display_name, role: "material" as const, status: source.status === "ready_with_gaps" ? "ready_with_gaps" as const : "ready" as const, unit_count: source.unit_count, readable_unit_count: source.readable_unit_count, warnings: asWarnings(source.warnings) })),
    spans: spanRows.map((span) => ({ id: span.id, source_id: span.source_id, locator: { kind: span.locator_kind, number: span.locator_number }, text: span.text, excerpt: span.excerpt, content_hash: span.content_hash, ordinal: span.ordinal })),
    warnings: sourceRows.flatMap((source) => asWarnings(source.warnings).map((warning) => ({ ...warning, source_id: source.id }))),
  };
  return sourceSnapshotSchema.parse({ ...snapshot, snapshot_hash: hash({
    sources: snapshot.sources.map((source, index) => ({ index, id: source.id, display_name: source.display_name, role: source.role, status: source.status, unit_count: source.unit_count, readable_unit_count: source.readable_unit_count, warnings: source.warnings })),
    spans: snapshot.spans.map(({ id, source_id, locator, ordinal, content_hash }) => ({ id, source_id, locator, ordinal, content_hash })),
  }) });
}

function partitionFromManifest(snapshot: V2SourceSnapshot, partitionKey: string, index: number, spanIds: string[]): V2Partition {
  const spans = spanIds.map((id) => snapshot.spans.find((span) => span.id === id)).filter(Boolean) as V2SourceSnapshot["spans"];
  return { id: partitionKey, index, span_ids: spans.map((span) => span.id), source_ids: [...new Set(spans.map((span) => span.source_id))], character_count: spans.reduce((sum, span) => sum + span.text.length, 0), token_count: spans.length };
}

export async function createOrJoinV2RuntimeRequest(sessionId: string, outputLanguage: V2OutputLanguage = "match_materials") {
  const snapshot = await loadV2SourceSnapshot(sessionId);
  const { v2ManifestForSnapshot } = await import("@/lib/ai/generation-v2-execution");
  const contract = hash({ runtime: "slice-4", artifactContract: v2ContractHash(), provider: "model-gateway-responses-structured-v1" });
  const manifest = v2ManifestForSnapshot(snapshot);
  const request = await createOrJoinGenerationV2Request({ session_id: sessionId, source_snapshot_hash: snapshot.snapshot_hash, generation_contract_hash: contract, output_language: outputLanguage, request_content_key: v2RequestContentKey({ sourceSnapshotHash: snapshot.snapshot_hash, generationContractHash: contract, outputLanguage }), manifest_json: manifest as unknown as Json });
  for (const entry of manifest) {
    const kind = entry.partitionKey === "guide" ? "guide" : "section";
    const artifact = await upsertGenerationV2Artifact({ session_id: sessionId, source_snapshot_hash: snapshot.snapshot_hash, generation_contract_hash: contract, output_language: outputLanguage, artifact_kind: kind, partition_key: entry.partitionKey, artifact_content_key: v2ArtifactContentKey({ sourceSnapshotHash: snapshot.snapshot_hash, generationContractHash: contract, outputLanguage, kind, partitionKey: entry.partitionKey, spanContentHashes: entry.spanContentHashes }), span_identity_json: { span_ids: entry.spanIds ?? partitionFromManifest(snapshot, entry.partitionKey, entry.partitionOrder, snapshot.spans.filter((span) => entry.spanContentHashes.includes(span.content_hash)).map((span) => span.id)).span_ids } });
    await linkGenerationV2Artifact({ request_id: request.id, artifact_id: artifact.id, session_id: sessionId, partition_key: entry.partitionKey, partition_order: entry.partitionOrder, required: entry.required });
  }
  return { request, snapshot };
}

export type V2RuntimeResult = { requestId: string; status: string; guide: V2Guide | null; nextRetryAt: string | null; metrics: Array<Record<string, unknown>> };

export type V2ReadModelStatus = "preparing" | "generating" | "ready" | "ready_with_gaps" | "unable_to_generate";

export function v2ReadModelStatus(requestStatus: string, artifacts: Array<{ status: string }>): V2ReadModelStatus {
  if (requestStatus === "complete") return "ready";
  if (requestStatus === "complete_with_gaps") return "ready_with_gaps";
  if (requestStatus === "failed_no_guide") return "unable_to_generate";
  return artifacts.some((artifact) => artifact.status === "complete" || artifact.status === "working" || artifact.status === "retry_wait" || artifact.status === "gap")
    ? "generating"
    : "preparing";
}

export async function runV2Request(requestId: string, provider: V2ArtifactProvider = new ModelGatewayV2Provider()): Promise<V2RuntimeResult> {
  const startedAt = Date.now();
  const request = await readGenerationV2Request(requestId); if (!request) throw new Error("V2_REQUEST_NOT_FOUND");
  if (["complete", "complete_with_gaps", "failed_no_guide"].includes(request.status)) {
    logRuntime({ requestId, status: request.status, artifacts: [], providerAttempts: 0, durationMs: Date.now() - startedAt, outcome: "terminal_noop" });
    return { requestId, status: request.status, guide: null, nextRetryAt: null, metrics: [] };
  }
  await markGenerationV2RequestWorking(requestId);
  const snapshot = await loadV2SourceSnapshot(request.session_id);
  if (snapshot.snapshot_hash !== request.source_snapshot_hash) throw new Error("V2_SOURCE_SNAPSHOT_CHANGED");
  const rows = await readGenerationV2Artifacts(requestId);
  const metrics: Array<Record<string, unknown>> = [];
  let nextRetryAt: string | null = null;
  for (const row of rows) {
    const artifact = row.artifact; if (!artifact || artifact.status === "complete" || artifact.status === "gap") continue;
    const spanIds = Array.isArray(artifact.span_identity_json) ? [] : ((artifact.span_identity_json as { span_ids?: unknown })?.span_ids ?? []);
    if (!Array.isArray(spanIds) || !spanIds.every((id) => typeof id === "string")) continue;
    const leaseId = randomUUID();
    const claim = await claimGenerationV2Artifact(artifact.id, leaseId, LEASE_SECONDS);
    if (!claim) {
      const wakeAt = artifact.status === "working" ? artifact.lease_expires_at : artifact.retry_at;
      if (wakeAt && (!nextRetryAt || wakeAt < nextRetryAt)) nextRetryAt = wakeAt;
      continue;
    }
    try {
      const partition = partitionFromManifest(snapshot, artifact.partition_key, row.partition_order, spanIds as string[]);
      const language = request.output_language === "match_materials" ? detectV2Language(partition.span_ids.map((id) => snapshot.spans.find((span) => span.id === id)?.text ?? "").join("\n")) : request.output_language;
      const raw = await provider.generate({ artifactId: artifact.id, attempt: claim.attempt_count, partition, spans: partition.span_ids.map((id) => snapshot.spans.find((span) => span.id === id)!), outputLanguage: language });
      const result = canonicalizeV2Artifact(raw, partition, snapshot);
      const settled = await settleGenerationV2Artifact({ artifactId: artifact.id, leaseId, status: "complete", result, resultHash: hash(result) });
      metrics.push({ artifact_id: artifact.id, attempt: claim.attempt_count, outcome: settled ? "success" : "settlement_rejected" });
    } catch (error) {
      const failure = v2ArtifactFailure(error); const retry = failure.retryable && claim.attempt_count < 2;
      const settled = await settleGenerationV2Artifact({ artifactId: artifact.id, leaseId, status: retry ? "retry_wait" : "gap", gapCode: failure.code, gapMessage: failure.message, retryable: retry, retryAfterSeconds: retry ? Math.min(2 ** claim.attempt_count, 30) : undefined });
      metrics.push({ artifact_id: artifact.id, attempt: claim.attempt_count, outcome: settled ? (retry ? "retry_wait" : "gap") : "settlement_rejected", error_code: failure.code });
    }
    // One provider call per durable step keeps long, partitioned requests bounded.
    break;
  }
  const refreshed = await readGenerationV2Artifacts(requestId);
  const linkedArtifacts = refreshed.filter((row): row is typeof row & { artifact: Database["public"]["Tables"]["generation_v2_artifacts"]["Row"] } => Boolean(row.artifact));
  const artifacts = linkedArtifacts.map((row) => row.artifact);
  const retryRows = artifacts.filter((artifact) => artifact.status === "retry_wait" && artifact.retry_at);
  if (retryRows.length) nextRetryAt = retryRows.map((artifact) => artifact.retry_at!).sort()[0];
  const workingRows = artifacts.filter((artifact) => artifact.status === "working" && artifact.lease_expires_at);
  if (workingRows.length) {
    const activeLeaseWakeAt = workingRows.map((artifact) => artifact.lease_expires_at!).sort()[0];
    if (!nextRetryAt || activeLeaseWakeAt < nextRetryAt) nextRetryAt = activeLeaseWakeAt;
  }
  if (artifacts.some((artifact) => artifact.status === "pending") && !nextRetryAt) nextRetryAt = new Date().toISOString();
  const required = linkedArtifacts.filter((row) => row.required).map((row) => row.artifact);
  const completed = required.filter((artifact) => artifact.status === "complete" && artifact.result_json);
  const terminal = required.every((artifact) => artifact.status === "complete" || artifact.status === "gap");
  let status = request.status;
  let guide: V2Guide | null = null;
  if (terminal) {
    status = completed.length === 0 ? "failed_no_guide" : completed.length === required.length ? "complete" : "complete_with_gaps";
    if (completed.length) {
      const sections = completed.map((artifact) => artifact.result_json as unknown as V2Guide["sections"][number]);
      const gaps = required.filter((artifact) => artifact.status === "gap").map((artifact) => ({ code: artifact.gap_code ?? "provider_transient_exhausted", message: artifact.gap_message ?? "Artifact unavailable.", source_id: null, locator: null, partition_id: artifact.partition_key }));
      const coveredUnits = new Set(sections.flatMap((section) => section.source_refs.map((ref) => `${ref.source_id}:${ref.locator.kind}:${ref.locator.number}`))).size;
      guide = v2GuideSchema.parse({ schema_version: "2.0", id: `v2-guide-${requestId}`, session_id: request.session_id, title: snapshot.title, source_snapshot_hash: request.source_snapshot_hash, generation_status: status, coverage: { readable_units: snapshot.sources.reduce((sum, source) => sum + source.readable_unit_count, 0), covered_units: coveredUnits, total_units: snapshot.sources.reduce((sum, source) => sum + source.unit_count, 0), gaps }, study_map: sections.map((section) => ({ section_id: section.id, priority: section.priority, why_this_matters: section.focus_reason, source_refs: section.source_refs })), sections, generated_at: new Date().toISOString() });
    }
    await assembleGenerationV2Request({ requestId, deliveryStatus: status as "complete" | "complete_with_gaps" | "failed_no_guide", guide: guide as unknown as Json });
  }
  logRuntime({ requestId, status, artifacts, providerAttempts: metrics.length, durationMs: Date.now() - startedAt, outcome: terminal ? "assembled" : metrics.length ? "artifact_settled" : "waiting" });
  return { requestId, status, guide, nextRetryAt, metrics };
}
