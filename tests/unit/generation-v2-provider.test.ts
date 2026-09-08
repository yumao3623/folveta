import { describe, expect, it } from "vitest";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { SafeProviderError } from "@/lib/ai/gateway";
import { buildSourceSnapshot, canonicalizeV2Artifact, partitionV2Snapshot, type V2Artifact, type V2SourceSnapshot, v2ArtifactSchemaForSpanIds } from "@/lib/ai/generation-v2";
import { executePersistedGenerationV2, v2ManifestForSnapshot, V2_PROVIDER_ARTIFACT_LEASE_MS } from "@/lib/ai/generation-v2-execution";
import { GenerationV2Persistence } from "@/lib/ai/generation-v2-persistence";
import { type V2ArtifactProvider, v2ArtifactFailure } from "@/lib/ai/generation-v2-provider";
import type { ParsedMaterial } from "@/lib/server/parser";

function material(texts: string[]): ParsedMaterial {
  return {
    units: texts.map((text, index) => ({ locatorKind: "page" as const, locatorNumber: index + 1, title: null, rawText: text, normalizedText: text, readable: true, warnings: [], contentHash: `provider-fixture-${index}-123456789`, blocks: [text] })),
    warnings: [],
  };
}

function snapshot(texts = ["ATP synthase uses a proton gradient to make ATP in cellular respiration."]): V2SourceSnapshot {
  return buildSourceSnapshot({ sessionId: "provider-session", ownerScope: "test-owner", title: "Provider fixture", sources: [{ id: "provider-source", displayName: "private-notes.pdf", parsed: material(texts) }] });
}

function artifactFor(partition: ReturnType<typeof partitionV2Snapshot>[number], language: "en" | "zh" = "en"): V2Artifact {
  return {
    section_id: "ignored-by-canonicalizer",
    title: language === "zh" ? "核心概念" : "Core concept",
    priority: "study_first",
    focus_reason: language === "zh" ? "材料直接说明这个关系。" : "The evidence directly explains this relationship.",
    explanation: [{ id: "model-claim", text: language === "zh" ? "质子梯度驱动 ATP 合成。" : "The proton gradient drives ATP synthesis.", span_ids: [partition.span_ids[0]], support_status: "direct" }],
  };
}

function structuredArtifactFor(partition: ReturnType<typeof partitionV2Snapshot>[number]) {
  return {
    ...artifactFor(partition),
    review_targets: null,
    gaps: [],
    key_concepts: null,
    definitions: null,
    processes_relationships: null,
    common_confusions: null,
    practice_prompts: null,
  };
}

function setup(inputSnapshot = snapshot()) {
  const store = new GenerationV2Persistence();
  const request = store.createOrJoinRequest({ sessionId: inputSnapshot.session_id, sourceSnapshotHash: inputSnapshot.snapshot_hash, generationContractHash: "v2-provider-test-contract", outputLanguage: "match_materials", manifest: v2ManifestForSnapshot(inputSnapshot) }).request;
  return { store, request, requestId: request.id, snapshot: inputSnapshot };
}

describe("Generation v2 provider adapter and artifact execution", () => {
  it("uses an exact provider span enum and reconstructs canonical provenance", () => {
    const input = snapshot();
    const partition = partitionV2Snapshot(input)[0];
    const schema = v2ArtifactSchemaForSpanIds(partition.span_ids);
    expect(schema.safeParse(structuredArtifactFor(partition)).success).toBe(true);
    expect(schema.safeParse({ ...structuredArtifactFor(partition), explanation: [{ ...artifactFor(partition).explanation[0], span_ids: ["unknown-span"] }] }).success).toBe(false);
    const canonical = canonicalizeV2Artifact(artifactFor(partition), partition, input);
    expect(canonical.source_refs).toEqual([expect.objectContaining({ span_id: partition.span_ids[0], source_name: "private-notes.pdf", locator: { kind: "page", number: 1 } })]);
  });

  it("converts the scoped artifact schema to a Responses structured-output format", () => {
    const input = snapshot();
    const partition = partitionV2Snapshot(input)[0];
    expect(() => zodTextFormat(v2ArtifactSchemaForSpanIds(partition.span_ids), "generation_v2_artifact")).not.toThrow();
  });

  it("records a timeout before retrying only that artifact, then persists a complete Guide", async () => {
    const state = setup();
    const partition = partitionV2Snapshot(state.snapshot)[0];
    let calls = 0;
    const provider: V2ArtifactProvider = { generate: async () => {
      calls += 1;
      if (calls === 1) throw new SafeProviderError("MODEL_PROVIDER_TIMEOUT", "provider_transient", true, 408, null, "timeout", true);
      return artifactFor(partition);
    } };
    const sleeps: number[] = [];
    const result = await executePersistedGenerationV2({ ...state, title: "Provider fixture", provider, sleep: async (milliseconds) => { sleeps.push(milliseconds); } });
    expect(calls).toBe(2);
    expect(sleeps).toEqual([250]);
    expect(result.metrics.map((metric) => metric.outcome)).toEqual(["retry_wait", "success"]);
    expect(result.guide?.generation_status).toBe("complete");
    expect(state.store.artifactsForRequest(state.request.id)[0]).toMatchObject({ status: "complete", attemptCount: 2 });
  });

  it("keeps the artifact lease through the configured provider timeout and settlement margin", async () => {
    let now = 0;
    const input = snapshot();
    const store = new GenerationV2Persistence(() => now);
    const request = store.createOrJoinRequest({ sessionId: input.session_id, sourceSnapshotHash: input.snapshot_hash, generationContractHash: "lease-window-contract", outputLanguage: "match_materials", manifest: v2ManifestForSnapshot(input) }).request;
    const partition = partitionV2Snapshot(input)[0];
    const provider: V2ArtifactProvider = { generate: async () => {
      now = 180_001;
      return artifactFor(partition);
    } };
    const result = await executePersistedGenerationV2({ store, requestId: request.id, snapshot: input, title: "Provider fixture", provider });
    expect(V2_PROVIDER_ARTIFACT_LEASE_MS).toBe(210_000);
    expect(result.guide?.generation_status).toBe("complete");
  });

  it("allows one schema-invalid repair attempt but never retries an invalid source reference", async () => {
    const state = setup();
    const partition = partitionV2Snapshot(state.snapshot)[0];
    let calls = 0;
    const provider: V2ArtifactProvider = { generate: async () => {
      calls += 1;
      return calls === 1 ? ({ ...artifactFor(partition), explanation: [] } as unknown as V2Artifact) : artifactFor(partition);
    } };
    const repaired = await executePersistedGenerationV2({ ...state, title: "Provider fixture", provider, sleep: async () => {} });
    expect(calls).toBe(2);
    expect(repaired.guide?.generation_status).toBe("complete");

    const terminal = setup();
    let terminalCalls = 0;
    const invalidReference: V2ArtifactProvider = { generate: async () => {
      terminalCalls += 1;
      return { ...artifactFor(partition), explanation: [{ ...artifactFor(partition).explanation[0], span_ids: ["foreign-span"] }] };
    } };
    const failed = await executePersistedGenerationV2({ ...terminal, title: "Provider fixture", provider: invalidReference });
    expect(terminalCalls).toBe(1);
    expect(failed.guide).toBeNull();
    expect(terminal.store.artifactsForRequest(terminal.request.id)[0]).toMatchObject({ status: "gap", gap: { code: "invalid_output" } });
  });

  it("keeps completed siblings while an exhausted partition becomes a visible gap", async () => {
    const state = setup(snapshot(["A".repeat(30_000), "B".repeat(30_000)]));
    const partitions = partitionV2Snapshot(state.snapshot);
    const calls = new Map<number, number>();
    const provider: V2ArtifactProvider = { generate: async ({ partition }) => {
      calls.set(partition.index, (calls.get(partition.index) ?? 0) + 1);
      if (partition.index === 0) throw new SafeProviderError("MODEL_PROVIDER_CONNECTION", "provider_transient", true, null, null, "connection");
      return artifactFor(partition);
    } };
    const result = await executePersistedGenerationV2({ ...state, title: "Long fixture", provider, sleep: async () => {} });
    expect(calls).toEqual(new Map([[0, 2], [1, 1]]));
    expect(result.guide?.generation_status).toBe("complete_with_gaps");
    expect(result.guide?.sections).toHaveLength(1);
    expect(result.guide?.coverage.gaps).toEqual([expect.objectContaining({ code: "MODEL_PROVIDER_CONNECTION", partition_id: "partition_0" })]);
  });

  it("has one provider call under duplicate runners and replays completed artifacts without another call", async () => {
    const state = setup();
    const partition = partitionV2Snapshot(state.snapshot)[0];
    let calls = 0;
    let release: (() => void) | undefined;
    const provider: V2ArtifactProvider = { generate: async () => {
      calls += 1;
      await new Promise<void>((resolve) => { release = resolve; });
      return artifactFor(partition);
    } };
    const first = executePersistedGenerationV2({ ...state, title: "Provider fixture", provider });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const duplicate = executePersistedGenerationV2({ ...state, title: "Provider fixture", provider });
    release?.();
    await Promise.all([first, duplicate]);
    const replay = await executePersistedGenerationV2({ ...state, title: "Provider fixture", provider });
    expect(calls).toBe(1);
    expect(replay.metrics).toEqual([expect.objectContaining({ outcome: "already_complete" })]);
    expect(replay.guide?.generation_status).toBe("complete");
  });

  it("classifies the provider failure boundary without retaining provider text", () => {
    expect(v2ArtifactFailure(Object.assign(new Error("private timeout text"), { name: "TimeoutError" }))).toMatchObject({ code: "MODEL_PROVIDER_TIMEOUT", retryable: true });
    expect(v2ArtifactFailure(Object.assign(new Error("private connection text"), { cause: { code: "ECONNRESET" } }))).toMatchObject({ code: "MODEL_PROVIDER_CONNECTION", retryable: true });
    expect(v2ArtifactFailure(Object.assign(new Error("rate limit"), { status: 429 }))).toMatchObject({ code: "MODEL_PROVIDER_RATE_LIMITED", retryable: true });
    expect(v2ArtifactFailure(Object.assign(new Error("upstream"), { status: 503 }))).toMatchObject({ code: "MODEL_PROVIDER_TRANSIENT", retryable: true });
    expect(v2ArtifactFailure(Object.assign(new Error("bad request"), { status: 400 }))).toMatchObject({ code: "MODEL_PROVIDER_FAILURE", retryable: false });
    expect(v2ArtifactFailure(new z.ZodError([]))).toEqual({ code: "invalid_output", message: "The provider returned an invalid structured artifact.", retryable: true });
  });
});
