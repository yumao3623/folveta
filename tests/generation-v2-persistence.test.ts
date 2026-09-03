import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  GenerationV2Persistence,
  v2ArtifactContentKey,
  v2BillingOutcome,
  v2RequestContentKey,
} from "@/lib/ai/generation-v2-persistence";
import type { V2Guide } from "@/lib/ai/generation-v2";

const result = (id: string, span: string): V2Guide["sections"][number] => ({
  id, title: id, priority: "study_first", focus_reason: "supported", source_refs: [{ span_id: span, source_id: "source", source_name: "notes", locator: { kind: "page", number: 1 }, excerpt: "evidence" }],
  explanation: [{ id: `${id}:claim`, text: "supported claim", support_status: "direct", source_refs: [{ span_id: span, source_id: "source", source_name: "notes", locator: { kind: "page", number: 1 }, excerpt: "evidence" }] }], gaps: [],
});

describe("Generation v2 persistence semantics", () => {
  const input = { sessionId: "session-a", sourceSnapshotHash: "snapshot-a", generationContractHash: "contract-a", outputLanguage: "en" as const, manifest: [
    { partitionKey: "partition_0", partitionOrder: 0, required: true, spanContentHashes: ["span-a"] },
    { partitionKey: "partition_1", partitionOrder: 1, required: true, spanContentHashes: ["span-b"] },
    { partitionKey: "partition_2", partitionOrder: 2, required: true, spanContentHashes: ["span-c"] },
    { partitionKey: "partition_3", partitionOrder: 3, required: true, spanContentHashes: ["span-d"] },
  ] };

  it("keeps owner out of immutable request and artifact identities", () => {
    expect(v2RequestContentKey({ sourceSnapshotHash: "s", generationContractHash: "c", outputLanguage: "en" })).toBe(v2RequestContentKey({ sourceSnapshotHash: "s", generationContractHash: "c", outputLanguage: "en" }));
    expect(v2ArtifactContentKey({ sourceSnapshotHash: "s", generationContractHash: "c", outputLanguage: "en", kind: "section", partitionKey: "p", spanContentHashes: ["b", "a"] })).not.toBe(v2ArtifactContentKey({ sourceSnapshotHash: "s", generationContractHash: "c", outputLanguage: "en", kind: "section", partitionKey: "p", spanContentHashes: ["a", "b"] }));
  });

  it("joins duplicate Generate and retains one canonical artifact per partition", () => {
    const store = new GenerationV2Persistence(() => Date.parse("2030-01-01T00:00:00.000Z"));
    store.registerSession({ sessionId: "session-a", anonymousTokenHash: "anon", ownerUserId: null, expiresAt: Date.parse("2030-01-02T00:00:00.000Z"), deletedAt: null });
    const first = store.createOrJoinRequest(input);
    const duplicate = store.createOrJoinRequest(input);
    expect(first.created).toBe(true);
    expect(duplicate.created).toBe(false);
    expect(duplicate.request.id).toBe(first.request.id);
    expect(store.attachManifest(first.request.id)).toHaveLength(4);
    expect(store.attachManifest(first.request.id)).toHaveLength(4);
  });

  it("has one canonical request under concurrent duplicate creation", async () => {
    const store = new GenerationV2Persistence();
    const joined = await Promise.all(Array.from({ length: 8 }, () => Promise.resolve().then(() => store.createOrJoinRequest(input))));
    expect(new Set(joined.map(({ request }) => request.id)).size).toBe(1);
    expect(joined.filter(({ created }) => created)).toHaveLength(1);
  });

  it("persists three successful siblings, one gap, and assembles complete_with_gaps", () => {
    const store = new GenerationV2Persistence();
    store.registerSession({ sessionId: "session-a", anonymousTokenHash: "anon", ownerUserId: null, expiresAt: Date.now() + 10_000, deletedAt: null });
    const request = store.createOrJoinRequest(input).request;
    const artifacts = store.attachManifest(request.id);
    artifacts.slice(0, 3).forEach((artifact, index) => { const claim = store.claimArtifact(artifact.id, `lease-${index}`); store.settleArtifactSuccess(artifact.id, claim!.leaseId, result(artifact.partitionKey, `span-${String.fromCharCode(97 + index)}`)); });
    const failed = artifacts[3];
    const claim = store.claimArtifact(failed.id, "lease-fail");
    store.settleArtifactFailure(failed.id, claim!.leaseId, { code: "provider_transient_exhausted", message: "timeout" }, false);
    const assembled = store.assemble(request.id, { schema_version: "2.0", id: "guide-a", session_id: "session-a", title: "Guide", source_snapshot_hash: "snapshot-a", totalUnits: 4, readableUnits: 4 });
    expect(assembled.request.status).toBe("complete_with_gaps");
    expect(assembled.guide?.sections).toHaveLength(3);
    expect(assembled.guide?.coverage.gaps).toHaveLength(1);
    expect(store.getPersistedGuide(request.id)?.generation_status).toBe("complete_with_gaps");
  });

  it("retries only failed artifacts and never lets a stale lease overwrite completion", () => {
    const store = new GenerationV2Persistence();
    const request = store.createOrJoinRequest({ ...input, manifest: input.manifest.slice(0, 2) }).request;
    const artifacts = store.attachManifest(request.id);
    const first = store.claimArtifact(artifacts[0].id, "lease-1");
    store.settleArtifactSuccess(artifacts[0].id, first!.leaseId, result("partition_0", "span-a"));
    const failed = store.claimArtifact(artifacts[1].id, "lease-2");
    store.settleArtifactFailure(artifacts[1].id, failed!.leaseId, { code: "timeout", message: "retry" }, true);
    expect(store.claimArtifact(artifacts[0].id, "duplicate")).toBeNull();
    const retry = store.claimArtifact(artifacts[1].id, "lease-3");
    expect(retry).not.toBeNull();
    expect(() => store.settleArtifactSuccess(artifacts[1].id, "lease-2", result("partition_1", "span-b"))).toThrow("V2_ARTIFACT_LEASE_LOST");
    store.settleArtifactSuccess(artifacts[1].id, retry!.leaseId, result("partition_1", "span-b"));
    expect(store.artifactsForRequest(request.id).filter((artifact) => artifact.status === "complete")).toHaveLength(2);
  });

  it("assembles complete only when every required artifact persisted successfully", () => {
    const store = new GenerationV2Persistence();
    const request = store.createOrJoinRequest({ ...input, manifest: input.manifest.slice(0, 2) }).request;
    const artifacts = store.attachManifest(request.id);
    artifacts.forEach((artifact, index) => {
      const claim = store.claimArtifact(artifact.id, `complete-${index}`);
      store.settleArtifactSuccess(artifact.id, claim!.leaseId, result(artifact.partitionKey, index === 0 ? "span-a" : "span-b"));
    });
    const assembled = store.assemble(request.id, { schema_version: "2.0", id: "guide-complete", session_id: "session-a", title: "Guide", source_snapshot_hash: "snapshot-a", totalUnits: 2, readableUnits: 2 });
    expect(assembled.request.status).toBe("complete");
    expect(assembled.guide?.generation_status).toBe("complete");
  });

  it("records failed_no_guide without inventing a deliverable snapshot", () => {
    const store = new GenerationV2Persistence();
    const request = store.createOrJoinRequest({ ...input, manifest: input.manifest.slice(0, 1) }).request;
    const artifact = store.attachManifest(request.id)[0];
    const claim = store.claimArtifact(artifact.id, "no-guide");
    store.settleArtifactFailure(artifact.id, claim!.leaseId, { code: "invalid_output", message: "invalid" }, false);
    const assembled = store.assemble(request.id, { schema_version: "2.0", id: "guide-none", session_id: "session-a", title: "Guide", source_snapshot_hash: "snapshot-a", totalUnits: 1, readableUnits: 1 });
    expect(assembled.request.status).toBe("failed_no_guide");
    expect(assembled.guide).toBeNull();
    expect(store.getPersistedGuide(request.id)).toBeNull();
  });

  it("reclaims an expired working lease after process restart", () => {
    let now = 1_000;
    const store = new GenerationV2Persistence(() => now);
    const request = store.createOrJoinRequest({ ...input, manifest: input.manifest.slice(0, 1) }).request;
    const artifact = store.attachManifest(request.id)[0];
    expect(store.claimArtifact(artifact.id, "lease-old", 100)).not.toBeNull();
    now = 1_101;
    expect(() => store.settleArtifactSuccess(artifact.id, "lease-old", result("partition_0", "span-a"))).toThrow("V2_ARTIFACT_LEASE_LOST");
    expect(store.claimArtifact(artifact.id, "lease-recovered", 100)?.leaseId).toBe("lease-recovered");
  });

  it("preserves access and identities across anonymous claim, while blocking other owners", () => {
    const store = new GenerationV2Persistence();
    store.registerSession({ sessionId: "session-a", anonymousTokenHash: "anon", ownerUserId: null, expiresAt: Date.now() + 10_000, deletedAt: null });
    const request = store.createOrJoinRequest(input).request;
    const artifactKey = store.attachManifest(request.id)[0].artifactContentKey;
    expect(store.claimSession("session-a", "user-a", "anon")).toBe(true);
    expect(store.canRead("session-a", { userId: "user-a", tokenHash: null, now: Date.now() })).toBe("authenticated");
    expect(store.canRead("session-a", { userId: null, tokenHash: "anon", now: Date.now() })).toBeNull();
    expect(store.canRead("session-a", { userId: "user-b", tokenHash: null, now: Date.now() })).toBeNull();
    expect(store.createOrJoinRequest(input).request.id).toBe(request.id);
    expect(store.artifactsForRequest(request.id)[0].artifactContentKey).toBe(artifactKey);
  });

  it("invalidates reuse when source content/role order, prompt/schema contract, language, partition, or owner lineage changes", () => {
    const base = { sourceSnapshotHash: "s", generationContractHash: "c", outputLanguage: "en" as const, kind: "section" as const, partitionKey: "p", spanContentHashes: ["span"] };
    expect(v2ArtifactContentKey(base)).not.toBe(v2ArtifactContentKey({ ...base, sourceSnapshotHash: "s2" }));
    expect(v2ArtifactContentKey(base)).not.toBe(v2ArtifactContentKey({ ...base, generationContractHash: "c2" }));
    expect(v2ArtifactContentKey(base)).not.toBe(v2ArtifactContentKey({ ...base, outputLanguage: "zh" }));
    expect(v2ArtifactContentKey(base)).not.toBe(v2ArtifactContentKey({ ...base, partitionKey: "p2" }));
    const store = new GenerationV2Persistence();
    const ownerA = store.createOrJoinRequest(input).request;
    const ownerAArtifact = store.attachManifest(ownerA.id)[0];
    const ownerB = store.createOrJoinRequest({ ...input, sessionId: "session-b" }).request;
    const ownerBArtifact = store.attachManifest(ownerB.id)[0];
    expect(ownerB.id).not.toBe(ownerA.id);
    expect(ownerBArtifact.id).not.toBe(ownerAArtifact.id);
  });

  it("keeps billing at the Guide result boundary", () => {
    expect(v2BillingOutcome("complete")).toBe("eligible_once");
    expect(v2BillingOutcome("complete_with_gaps")).toBe("eligible_once");
    expect(v2BillingOutcome("failed_no_guide")).toBe("do_not_consume");
  });

  it("ships a minimal auditable migration with private reads and atomic claims", () => {
    const migration = readFileSync("supabase/migrations/20260903030000_generation_v2_persistence.sql", "utf8");
    expect(migration).toContain("unique (session_id, request_content_key)");
    expect(migration).toContain("unique (session_id, artifact_content_key)");
    expect(migration).toContain("foreign key (request_id, session_id) references public.generation_v2_requests(id, session_id)");
    expect(migration).toContain("foreign key (artifact_id, session_id) references public.generation_v2_artifacts(id, session_id)");
    expect(migration).toContain("alter table public.generation_v2_requests enable row level security");
    expect(migration).toContain("and session.owner_user_id = (select auth.uid())");
    expect(migration).toContain("grant execute on function public.claim_generation_v2_artifact");
    expect(migration).toContain("or (status = 'working' and lease_expires_at <= now())");
    expect(migration).toContain("and lease_expires_at > now()");
    expect(migration).toContain("grant execute on function public.settle_generation_v2_artifact");
    const repository = readFileSync("lib/server/generation-v2-persistence.ts", "utf8");
    expect(repository).toContain("create_or_join_generation_v2_request");
    expect(repository).toContain("claim_generation_v2_artifact");
    expect(repository).toContain("settle_generation_v2_artifact");
    expect(repository).toContain("generation_v2_guides");
    expect(migration).toContain("create table public.generation_v2_guides");
    expect(migration).toContain("delivery_status in ('complete', 'complete_with_gaps')");
    expect(migration).not.toContain("add column if not exists generation_v2_request_id");
    expect(migration).not.toContain("grant execute on function public.create_or_join_generation_v2_request(uuid, text, text, text, text, jsonb) to anon");
  });
});
