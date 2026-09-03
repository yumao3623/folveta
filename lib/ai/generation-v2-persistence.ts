import { createHash, randomUUID } from "node:crypto";
import type { V2Guide } from "@/lib/ai/generation-v2";

export type V2OutputLanguage = "match_materials" | "en" | "zh";
export type V2RequestStatus = "queued" | "working" | "complete" | "complete_with_gaps" | "failed_no_guide";
export type V2ArtifactStatus = "pending" | "working" | "retry_wait" | "complete" | "gap";
export type V2ArtifactKind = "guide" | "section" | "synthesis";

export type V2ArtifactResult = V2Guide["sections"][number];

export type V2RequestInput = {
  sessionId: string;
  sourceSnapshotHash: string;
  generationContractHash: string;
  outputLanguage: V2OutputLanguage;
  manifest: Array<{ partitionKey: string; partitionOrder: number; required: boolean; spanContentHashes: string[] }>;
};

export type V2PersistedRequest = V2RequestInput & {
  id: string;
  requestContentKey: string;
  status: V2RequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type V2PersistedArtifact = {
  id: string;
  sessionId: string;
  sourceSnapshotHash: string;
  generationContractHash: string;
  outputLanguage: V2OutputLanguage;
  kind: V2ArtifactKind;
  partitionKey: string;
  artifactContentKey: string;
  spanContentHashes: string[];
  status: V2ArtifactStatus;
  result: V2ArtifactResult | null;
  gap: { code: string; message: string } | null;
  retryable: boolean;
  attemptCount: number;
  leaseId: string | null;
  leaseExpiresAt: number | null;
};

export type V2SessionAccess = { sessionId: string; anonymousTokenHash: string | null; ownerUserId: string | null; expiresAt: number | null; deletedAt: number | null };

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

// Content identities intentionally exclude owner and session. session_id scopes
// storage and authorization, remaining stable when the parent session is claimed.
export function v2RequestContentKey(input: Omit<V2RequestInput, "sessionId" | "manifest">) {
  return stableHash({ source_snapshot_hash: input.sourceSnapshotHash, generation_contract_hash: input.generationContractHash, output_language: input.outputLanguage });
}

export function v2ArtifactContentKey(input: Pick<V2PersistedArtifact, "sourceSnapshotHash" | "generationContractHash" | "outputLanguage" | "kind" | "partitionKey" | "spanContentHashes">) {
  return stableHash({ source_snapshot_hash: input.sourceSnapshotHash, generation_contract_hash: input.generationContractHash, output_language: input.outputLanguage, kind: input.kind, partition_key: input.partitionKey, span_content_hashes: input.spanContentHashes });
}

export function v2SessionAccessMode(session: V2SessionAccess, identity: { userId: string | null; tokenHash: string | null; now: number }) {
  if (session.deletedAt) return null;
  if (session.ownerUserId) return identity.userId === session.ownerUserId ? "authenticated" : null;
  return session.anonymousTokenHash === identity.tokenHash && !!session.expiresAt && session.expiresAt > identity.now ? "anonymous" : null;
}

export function v2BillingOutcome(status: V2RequestStatus) {
  return status === "complete" || status === "complete_with_gaps" ? "eligible_once" : "do_not_consume";
}

/** A deterministic repository model used by Slice 2 fixtures. Its state maps 1:1 to the three SQL tables. */
export class GenerationV2Persistence {
  private readonly requests = new Map<string, V2PersistedRequest>();
  private readonly requestsBySessionKey = new Map<string, string>();
  private readonly artifacts = new Map<string, V2PersistedArtifact>();
  private readonly artifactsBySessionKey = new Map<string, string>();
  private readonly requestArtifacts = new Map<string, string[]>();
  private readonly sessions = new Map<string, V2SessionAccess>();
  private readonly guides = new Map<string, V2Guide>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  registerSession(session: V2SessionAccess) {
    this.sessions.set(session.sessionId, { ...session });
  }

  claimSession(sessionId: string, ownerUserId: string, tokenHash: string, now = this.now()) {
    const session = this.sessions.get(sessionId);
    if (!session || session.deletedAt || session.ownerUserId || session.anonymousTokenHash !== tokenHash || !session.expiresAt || session.expiresAt <= now) return false;
    session.ownerUserId = ownerUserId;
    session.anonymousTokenHash = null;
    session.expiresAt = null;
    return true;
  }

  canRead(sessionId: string, identity: { userId: string | null; tokenHash: string | null; now: number }) {
    const session = this.sessions.get(sessionId);
    return session ? v2SessionAccessMode(session, identity) : null;
  }

  createOrJoinRequest(input: V2RequestInput) {
    const requestContentKey = v2RequestContentKey(input);
    const lookup = `${input.sessionId}:${requestContentKey}`;
    const existing = this.requestsBySessionKey.get(lookup);
    if (existing) return { request: this.requests.get(existing)!, created: false };
    const time = new Date(this.now()).toISOString();
    const request: V2PersistedRequest = { ...input, manifest: input.manifest.map((entry) => ({ ...entry, spanContentHashes: [...entry.spanContentHashes] })), id: randomUUID(), requestContentKey, status: "queued", createdAt: time, updatedAt: time };
    this.requests.set(request.id, request);
    this.requestsBySessionKey.set(lookup, request.id);
    this.requestArtifacts.set(request.id, []);
    return { request, created: true };
  }

  attachManifest(requestId: string) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("UNKNOWN_V2_REQUEST");
    for (const entry of request.manifest) {
      const artifactSeed = { sessionId: request.sessionId, sourceSnapshotHash: request.sourceSnapshotHash, generationContractHash: request.generationContractHash, outputLanguage: request.outputLanguage, kind: (entry.partitionKey === "guide" ? "guide" : "section") as V2ArtifactKind, partitionKey: entry.partitionKey, spanContentHashes: entry.spanContentHashes };
      const artifactContentKey = v2ArtifactContentKey(artifactSeed);
      const lookup = `${request.sessionId}:${artifactContentKey}`;
      let artifactId = this.artifactsBySessionKey.get(lookup);
      if (!artifactId) {
        artifactId = randomUUID();
        this.artifacts.set(artifactId, { ...artifactSeed, id: artifactId, artifactContentKey, spanContentHashes: [...entry.spanContentHashes], status: "pending", result: null, gap: null, retryable: false, attemptCount: 0, leaseId: null, leaseExpiresAt: null });
        this.artifactsBySessionKey.set(lookup, artifactId);
      }
      const linked = this.requestArtifacts.get(requestId)!;
      if (!linked.includes(artifactId)) linked.push(artifactId);
    }
    return this.artifactsForRequest(requestId);
  }

  artifactsForRequest(requestId: string) {
    return (this.requestArtifacts.get(requestId) ?? []).map((id) => this.artifacts.get(id)!).sort((a, b) => a.partitionKey.localeCompare(b.partitionKey));
  }

  claimArtifact(artifactId: string, leaseId: string = randomUUID(), leaseMs = 120_000, now = this.now()) {
    const artifact = this.artifacts.get(artifactId);
    const expiredWorking = artifact?.status === "working" && !!artifact.leaseExpiresAt && artifact.leaseExpiresAt <= now;
    if (!artifact || (!["pending", "retry_wait"].includes(artifact.status) && !expiredWorking) || artifact.attemptCount >= 2) return null;
    artifact.status = "working";
    artifact.attemptCount += 1;
    artifact.leaseId = leaseId;
    artifact.leaseExpiresAt = now + leaseMs;
    return { artifact, leaseId };
  }

  settleArtifactSuccess(artifactId: string, leaseId: string, result: V2ArtifactResult) {
    const artifact = this.requireWorkingLease(artifactId, leaseId);
    artifact.status = "complete";
    artifact.result = result;
    artifact.gap = null;
    artifact.retryable = false;
    artifact.leaseId = null;
    artifact.leaseExpiresAt = null;
    return artifact;
  }

  settleArtifactFailure(artifactId: string, leaseId: string, gap: { code: string; message: string }, retryable: boolean) {
    const artifact = this.requireWorkingLease(artifactId, leaseId);
    artifact.status = retryable && artifact.attemptCount < 2 ? "retry_wait" : "gap";
    artifact.result = null;
    artifact.gap = gap;
    artifact.retryable = artifact.status === "retry_wait";
    artifact.leaseId = null;
    artifact.leaseExpiresAt = null;
    return artifact;
  }

  assemble(requestId: string, guide: Omit<V2Guide, "sections" | "study_map" | "generation_status" | "coverage" | "generated_at"> & { totalUnits: number; readableUnits: number }) {
    const request = this.requests.get(requestId);
    if (!request) throw new Error("UNKNOWN_V2_REQUEST");
    const artifacts = this.artifactsForRequest(requestId);
    const complete = artifacts.filter((artifact) => artifact.status === "complete" && artifact.result);
    const gaps = artifacts.filter((artifact) => artifact.status === "gap").map((artifact) => ({ code: artifact.gap?.code ?? "provider_transient_exhausted", message: artifact.gap?.message ?? "Artifact unavailable.", source_id: null, locator: null, partition_id: artifact.partitionKey }));
    const requiredComplete = artifacts.filter((artifact) => artifact.kind !== "synthesis" && artifact.status === "complete").length;
    const requiredTotal = artifacts.filter((artifact) => artifact.kind !== "synthesis").length;
    request.status = requiredComplete === 0 ? (artifacts.every((artifact) => artifact.status === "gap") ? "failed_no_guide" : "working") : requiredComplete === requiredTotal && gaps.length === 0 ? "complete" : "complete_with_gaps";
    request.updatedAt = new Date(this.now()).toISOString();
    if (request.status === "failed_no_guide" || request.status === "working") return { request, guide: null };
    const sections = complete.map((artifact) => artifact.result!);
    const coveredUnits = new Set(complete.flatMap((artifact) => artifact.spanContentHashes)).size;
    const assembled = {
      schema_version: "2.0" as const,
      id: guide.id,
      session_id: request.sessionId,
      title: guide.title,
      source_snapshot_hash: request.sourceSnapshotHash,
      generation_status: request.status,
      coverage: { readable_units: guide.readableUnits, covered_units: coveredUnits, total_units: guide.totalUnits, gaps },
      study_map: sections.map((section) => ({ section_id: section.id, priority: section.priority, why_this_matters: section.focus_reason, source_refs: section.source_refs })),
      sections,
      generated_at: new Date(this.now()).toISOString(),
    } as V2Guide;
    this.guides.set(requestId, assembled);
    return { request, guide: assembled };
  }

  getPersistedGuide(requestId: string) {
    return this.guides.get(requestId) ?? null;
  }

  private requireWorkingLease(artifactId: string, leaseId: string) {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact || artifact.status !== "working" || artifact.leaseId !== leaseId || !artifact.leaseExpiresAt || artifact.leaseExpiresAt <= this.now()) throw new Error("V2_ARTIFACT_LEASE_LOST");
    return artifact;
  }
}
