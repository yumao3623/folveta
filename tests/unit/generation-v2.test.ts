import { describe, expect, it } from "vitest";
import {
  buildSourceSnapshot,
  classifyV2Input,
  detectV2Language,
  partitionV2Snapshot,
  runGenerationV2,
  v2GuideSchema,
  type V2Artifact,
  type V2SourceSnapshot,
} from "@/lib/ai/generation-v2";
import type { ParsedMaterial } from "@/lib/server/parser";

function material(texts: string[], locatorKind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file" = "page"): ParsedMaterial {
  return { units: texts.map((text, index) => ({ locatorKind, locatorNumber: index + 1, title: null, rawText: text, normalizedText: text, readable: text.length > 20, warnings: text.length > 20 ? [] : [{ code: "UNREADABLE_UNIT", message: "No readable text.", locator: index + 1 }], contentHash: `unit-hash-${locatorKind}-${index}-123456`, blocks: text.length > 20 ? [text] : [] })), warnings: texts.flatMap((text, index) => text.length > 20 ? [] : [{ code: "UNREADABLE_UNIT", message: "No readable text.", locator: index + 1 }]) };
}
function artifactFor(snapshot: V2SourceSnapshot, partitionIndex: number, overrides: Partial<V2Artifact> = {}): V2Artifact {
  const partition = partitionV2Snapshot(snapshot)[partitionIndex];
  const spanId = partition.span_ids[0];
  return { section_id: "ignored-by-runner", title: "Core concepts", priority: "study_first", focus_reason: "This is supported by the supplied material.", explanation: [{ id: "model-id", text: "The material explains the core relationship.", span_ids: [spanId], support_status: "direct" }], review_targets: ["Recall the core relationship."], ...overrides };
}

describe("Generation v2 offline contract runner", () => {
  it("builds a deterministic snapshot and selects small/medium/long paths", () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-en", ownerScope: "owner-a", title: "Cellular Respiration", sources: [{ id: "source-en", displayName: "notes.pdf", parsed: material(["The electron transport chain pumps protons across the membrane."]) }] });
    expect(snapshot.spans[0].locator).toEqual({ kind: "page", number: 1 });
    expect(classifyV2Input(snapshot)).toBe("small");
    expect(partitionV2Snapshot(snapshot)).toHaveLength(1);
    const medium = buildSourceSnapshot({ sessionId: "session-medium", ownerScope: "owner-a", title: "Medium", sources: [{ id: "source-medium", displayName: "medium.pdf", parsed: material(["M".repeat(20_000)]) }] });
    expect(classifyV2Input(medium)).toBe("medium");
    expect(partitionV2Snapshot(medium)).toHaveLength(1);
    expect(buildSourceSnapshot({ sessionId: "session-en", ownerScope: "owner-a", title: "Cellular Respiration", sources: [{ id: "source-en", displayName: "notes.pdf", parsed: material(["The electron transport chain pumps protons across the membrane."]) }] }).snapshot_hash).toBe(snapshot.snapshot_hash);
  });

  it("keeps source identity independent from owner scope while retaining ownership metadata", () => {
    const input = { sessionId: "claimable-session", title: "Claimed material", sources: [{ id: "source-claim", displayName: "notes.pdf", parsed: material(["The same immutable source content remains available after account claim."]) }] };
    const anonymous = buildSourceSnapshot({ ...input, ownerScope: "anonymous:session" });
    const authenticated = buildSourceSnapshot({ ...input, ownerScope: "user:account" });
    expect(anonymous.snapshot_hash).toBe(authenticated.snapshot_hash);
    expect(anonymous.owner_scope).toBe("anonymous:session");
    expect(authenticated.owner_scope).toBe("user:account");
  });

  it("changes source identity when generation-input facts change", () => {
    const base = { sessionId: "identity-session", ownerScope: "owner-a", title: "Identity", sources: [{ id: "source-a", displayName: "a.pdf", parsed: material(["Stable source content that is long enough to produce a readable span."]) }] };
    const changedContent = buildSourceSnapshot({ ...base, sources: [{ ...base.sources[0], parsed: material(["Changed source content that is long enough to produce a readable span."]) }] });
    const changedRole = buildSourceSnapshot({ ...base, sources: [{ ...base.sources[0], role: "scope", parsed: base.sources[0].parsed }] });
    const changedLocator = buildSourceSnapshot({ ...base, sources: [{ ...base.sources[0], parsed: material(["Stable source content that is long enough to produce a readable span."], "slide") }] });
    const ordered = buildSourceSnapshot({ ...base, sources: [base.sources[0], { id: "source-b", displayName: "b.pdf", parsed: material(["Another source with enough readable evidence for a span."]) }] });
    const reordered = buildSourceSnapshot({ ...base, sources: [{ id: "source-b", displayName: "b.pdf", parsed: material(["Another source with enough readable evidence for a span."]) }, base.sources[0]] });
    expect(changedContent.snapshot_hash).not.toBe(buildSourceSnapshot(base).snapshot_hash);
    expect(changedRole.snapshot_hash).not.toBe(buildSourceSnapshot(base).snapshot_hash);
    expect(changedLocator.snapshot_hash).not.toBe(buildSourceSnapshot(base).snapshot_hash);
    expect(reordered.snapshot_hash).not.toBe(ordered.snapshot_hash);
  });

  it("keeps long content and late files in source-bounded partitions", () => {
    const long = buildSourceSnapshot({ sessionId: "session-long", ownerScope: "owner-a", title: "Long", sources: [{ id: "source-one", displayName: "one.pdf", parsed: material(["A".repeat(30_000), "B".repeat(30_000)]) }, { id: "source-two", displayName: "two.pdf", parsed: material(["C".repeat(30_000)]) }] });
    const partitions = partitionV2Snapshot(long);
    expect(classifyV2Input(long)).toBe("long");
    expect(partitions.length).toBe(3);
    expect(partitions.every((partition) => partition.source_ids.length === 1)).toBe(true);
    expect(partitions.flatMap((partition) => partition.span_ids)).toEqual(long.spans.map((span) => span.id));
  });

  it("detects English, Chinese and mixed material without an English-only gate", () => {
    expect(detectV2Language("The mitochondrion produces ATP.")).toBe("en");
    expect(detectV2Language("线粒体通过质子梯度产生 ATP。")).toBe("zh");
    expect(detectV2Language("ATP synthase 通过质子流产生 ATP")).toBe("en");
  });

  it("canonicalizes all supported locator kinds from trusted spans", async () => {
    const source = (kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file", id: string) => buildSourceSnapshot({ sessionId: `s-${kind}`, ownerScope: "owner-a", title: kind, sources: [{ id, displayName: `${kind}.source`, parsed: material([`Readable ${kind} evidence text. This is long enough.`,], kind) }] });
    for (const [kind, id] of [["page", "source-page"], ["slide", "source-slide"], ["paragraph", "source-paragraph"], ["sheet", "source-sheet"], ["image", "source-image"], ["file", "source-file"]] as const) {
      const snapshot = source(kind, id);
      const guide = await runGenerationV2(snapshot, async ({ partition }) => artifactFor(snapshot, partition.index));
      expect(guide.sections[0].source_refs[0].locator.kind).toBe(kind);
      expect(guide.sections[0].source_refs[0].source_name).toBe(`${kind}.source`);
    }
  });

  it("allows absent optional blocks and preserves parser unreadable gaps", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-zh", ownerScope: "owner-a", title: "学习指南", sources: [{ id: "source-zh", displayName: "讲义.pdf", parsed: material(["这是关于质子梯度和 ATP 合成的可读材料。", "x"]) }] });
    const guide = await runGenerationV2(snapshot, async ({ partition }) => artifactFor(snapshot, partition.index));
    expect(v2GuideSchema.parse(guide).generation_status).toBe("complete_with_gaps");
    expect(guide.sections[0]).not.toHaveProperty("definitions");
    expect(guide.coverage.gaps.some((gap) => gap.code === "UNREADABLE_UNIT")).toBe(true);
  });

  it("delivers a valid Guide when review targets and optional blocks are absent", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-no-review", ownerScope: "owner-a", title: "No review target", sources: [{ id: "source-no-review", displayName: "notes.pdf", parsed: material(["Identity, rationale, explanation, and provenance are sufficient for delivery."]) }] });
    const guide = await runGenerationV2(snapshot, async ({ partition }) => {
      const artifact = artifactFor(snapshot, partition.index);
      const { review_targets: _reviewTargets, ...withoutReviewTargets } = artifact;
      void _reviewTargets;
      return withoutReviewTargets;
    });
    expect(guide.generation_status).toBe("complete");
    expect(guide.sections[0]).not.toHaveProperty("review_targets");
    expect(guide.sections[0]).not.toHaveProperty("key_concepts");
  });

  it("rejects an artifact missing delivery-critical explanation", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-core-required", ownerScope: "owner-a", title: "Core required", sources: [{ id: "source-core-required", displayName: "notes.pdf", parsed: material(["Readable evidence that is sufficient for a section."]) }] });
    await expect(runGenerationV2(snapshot, async ({ partition }) => artifactFor(snapshot, partition.index, { explanation: [] }))).rejects.toThrow("failed_no_guide");
  });

  it("rejects an invalid span in one artifact without losing an unrelated section", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-mixed", ownerScope: "owner-a", title: "Mixed", sources: [{ id: "source-mixed", displayName: "mixed.pdf", parsed: material(["A".repeat(30_000), "B".repeat(30_000)]), }] });
    const calls: number[] = [];
    const guide = await runGenerationV2(snapshot, async ({ partition }) => {
      calls.push(partition.index);
      if (partition.index === 0) return artifactFor(snapshot, partition.index, { explanation: [{ id: "bad", text: "Bad citation", span_ids: ["span-not-allowed"], support_status: "direct" }] });
      return artifactFor(snapshot, partition.index);
    });
    expect(calls).toEqual([0, 1]);
    expect(guide.generation_status).toBe("complete_with_gaps");
    expect(guide.sections).toHaveLength(1);
    expect(guide.coverage.gaps.some((gap) => gap.code === "invalid_output")).toBe(true);
  });

  it("fails clearly when every section fails and rejects duplicate span identities", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-fail", ownerScope: "owner-a", title: "Failure", sources: [{ id: "source-fail", displayName: "fail.pdf", parsed: material(["Readable evidence that is sufficient for a section."]) }] });
    await expect(runGenerationV2(snapshot, async () => { throw new Error("provider down"); })).rejects.toThrow("failed_no_guide");
    const duplicate = { ...snapshot, spans: [snapshot.spans[0], snapshot.spans[0]] };
    await expect(runGenerationV2(duplicate, async () => artifactFor(snapshot, 0))).rejects.toThrow("DUPLICATE_SOURCE_SPAN_ID");
  });

  it("treats duplicate source references as invalid output", async () => {
    const snapshot = buildSourceSnapshot({ sessionId: "session-duplicate-ref", ownerScope: "owner-a", title: "Duplicate refs", sources: [{ id: "source-duplicate-ref", displayName: "refs.pdf", parsed: material(["Readable evidence that is sufficient for a section."]) }] });
    await expect(runGenerationV2(snapshot, async ({ partition }) => artifactFor(snapshot, partition.index, { explanation: [{ id: "duplicate", text: "Repeated citation", span_ids: [partition.span_ids[0], partition.span_ids[0]], support_status: "direct" }] }))).rejects.toThrow("failed_no_guide");
  });
});
