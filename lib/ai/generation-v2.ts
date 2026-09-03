import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createSpanRows, normalizeText, type ParsedMaterial } from "@/lib/server/parser";

const MAX_PARTITION_CHARACTERS = 45_000;
const MAX_PARTITION_TOKENS = 12_000;
const MAX_PARTITIONS = 24;

const locatorSchema = z.object({ kind: z.enum(["page", "slide", "paragraph", "sheet", "image", "file"]), number: z.number().int().positive() }).strict();
const snapshotSpanSchema = z.object({
  id: z.string().min(12), source_id: z.string().min(1), locator: locatorSchema,
  text: z.string().min(1), excerpt: z.string().min(1), content_hash: z.string().min(16), ordinal: z.number().int().nonnegative(),
}).strict();
const snapshotSourceSchema = z.object({
  id: z.string().min(1), display_name: z.string().min(1), role: z.enum(["material", "scope", "review"]),
  status: z.enum(["ready", "ready_with_gaps"]), unit_count: z.number().int().nonnegative(), readable_unit_count: z.number().int().nonnegative(),
  warnings: z.array(z.object({ code: z.string().min(1), message: z.string().min(1), locator: z.number().int().positive().nullable() }).strict()),
}).strict();

export const sourceSnapshotSchema = z.object({
  session_id: z.string().min(1), owner_scope: z.string().min(1), title: z.string().min(1), snapshot_hash: z.string().min(16),
  sources: z.array(snapshotSourceSchema).min(1), spans: z.array(snapshotSpanSchema),
  warnings: z.array(z.object({ code: z.string().min(1), message: z.string().min(1), locator: z.number().int().positive().nullable(), source_id: z.string().min(1).nullable() }).strict()),
}).strict();

export type V2SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export type V2Source = V2SourceSnapshot["sources"][number];
export type V2Span = V2SourceSnapshot["spans"][number];

export type SnapshotSourceInput = {
  id: string; displayName: string; role?: V2Source["role"]; status?: V2Source["status"];
  parsed: ParsedMaterial;
};

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function buildSourceSnapshot(input: { sessionId: string; ownerScope: string; title: string; sources: SnapshotSourceInput[] }): V2SourceSnapshot {
  const sources = input.sources.map((source) => {
    const spans = createSpanRows(source.id, input.sessionId, source.parsed.units);
    return {
      id: source.id, display_name: source.displayName, role: source.role ?? "material", status: source.status ?? (source.parsed.warnings.length ? "ready_with_gaps" : "ready"),
      unit_count: source.parsed.units.length, readable_unit_count: source.parsed.units.filter((unit) => unit.readable).length,
      warnings: source.parsed.warnings,
      spans: spans.map((span) => ({ id: span.id, source_id: span.source_id, locator: { kind: span.locator_kind, number: span.locator_number }, text: span.text, excerpt: span.excerpt, content_hash: span.content_hash, ordinal: span.ordinal })),
    };
  });
  const sourceRows = sources.map((source) => ({ id: source.id, display_name: source.display_name, role: source.role, status: source.status, unit_count: source.unit_count, readable_unit_count: source.readable_unit_count, warnings: source.warnings }));
  const spans = sources.flatMap((source) => source.spans);
  const warnings = input.sources.flatMap((source) => source.parsed.warnings.map((warning) => ({ ...warning, source_id: source.id })));
  const snapshotHash = hash({ owner_scope: input.ownerScope, sources: sourceRows.map((source, index) => ({ index, id: source.id, role: source.role, status: source.status, unit_count: source.unit_count, readable_unit_count: source.readable_unit_count, warnings: source.warnings })), spans: spans.map((span) => ({ id: span.id, source_id: span.source_id, locator: span.locator, ordinal: span.ordinal, content_hash: span.content_hash })) });
  return sourceSnapshotSchema.parse({ session_id: input.sessionId, owner_scope: input.ownerScope, title: input.title, snapshot_hash: snapshotHash, sources: sourceRows, spans, warnings });
}

export function detectV2Language(text: string): "en" | "zh" {
  let latin = 0;
  let cjk = 0;
  for (const char of normalizeText(text)) {
    if (/[\u3400-\u9fff]/u.test(char)) cjk += 1;
    else if (/[A-Za-z]/u.test(char)) latin += 1;
  }
  return cjk > latin ? "zh" : "en";
}

export function approximateV2TokenCount(text: string) {
  let tokens = 0;
  for (const char of text) tokens += /[\u3400-\u9fff\u3040-\u30ff]/u.test(char) ? 1 : 0.25;
  return Math.ceil(tokens);
}

export type V2Partition = { id: string; index: number; span_ids: string[]; source_ids: string[]; character_count: number; token_count: number };

export type PartitionClass = "small" | "medium" | "long";

export function classifyV2Input(snapshot: V2SourceSnapshot): PartitionClass {
  const chars = snapshot.spans.reduce((sum, span) => sum + span.text.length, 0);
  const tokens = approximateV2TokenCount(snapshot.spans.map((span) => span.text).join("\n"));
  if (chars <= 15_000 && tokens <= 4_000) return "small";
  if (chars <= MAX_PARTITION_CHARACTERS && tokens <= MAX_PARTITION_TOKENS) return "medium";
  return "long";
}

export function partitionV2Snapshot(snapshot: V2SourceSnapshot): V2Partition[] {
  const readable = snapshot.spans;
  if (!readable.length) return [];
  const totalCharacters = readable.reduce((sum, span) => sum + span.text.length, 0);
  const totalTokens = approximateV2TokenCount(readable.map((span) => span.text).join("\n"));
  if (totalCharacters <= MAX_PARTITION_CHARACTERS && totalTokens <= MAX_PARTITION_TOKENS) {
    return [{ id: "partition_0", index: 0, span_ids: readable.map((span) => span.id), source_ids: [...new Set(readable.map((span) => span.source_id))], character_count: totalCharacters, token_count: totalTokens }];
  }
  const partitions: V2Partition[] = [];
  const bySource = [...new Set(readable.map((span) => span.source_id))];
  for (const sourceId of bySource) {
    const sourceSpans = readable.filter((span) => span.source_id === sourceId);
    let current: V2Span[] = [];
    let characters = 0;
    let tokens = 0;
    const flush = () => {
      if (!current.length) return;
      const index = partitions.length;
      partitions.push({ id: `partition_${index}`, index, span_ids: current.map((span) => span.id), source_ids: [sourceId], character_count: characters, token_count: tokens });
      current = []; characters = 0; tokens = 0;
    };
    for (const span of sourceSpans) {
      const spanTokens = approximateV2TokenCount(span.text);
      if (span.text.length > MAX_PARTITION_CHARACTERS || spanTokens > MAX_PARTITION_TOKENS) throw new Error("GENERATION_SPAN_EXCEEDS_TOKEN_BUDGET");
      if (current.length && (characters + span.text.length > MAX_PARTITION_CHARACTERS || tokens + spanTokens > MAX_PARTITION_TOKENS)) flush();
      current.push(span); characters += span.text.length; tokens += spanTokens;
    }
    flush();
  }
  if (partitions.length > MAX_PARTITIONS) throw new Error("GENERATION_PARTITION_LIMIT_EXCEEDED");
  return partitions;
}

const rawClaimSchema = z.object({ id: z.string().min(1), text: z.string().min(1), span_ids: z.array(z.string().min(1)).default([]), support_status: z.enum(["direct", "partial", "conflict", "unsupported_gap"]).default("direct") }).strict();
const optionalBlocksSchema = z.object({ key_concepts: z.array(z.string().min(1)).optional(), definitions: z.array(z.string().min(1)).optional(), processes_relationships: z.array(z.string().min(1)).optional(), common_confusions: z.array(z.string().min(1)).optional(), practice_prompts: z.array(z.string().min(1)).optional() }).strict();
export const v2ArtifactSchema = z.object({
  section_id: z.string().min(1), title: z.string().min(1), priority: z.enum(["study_first", "study_next", "review_if_time"]), focus_reason: z.string().min(1),
  explanation: z.array(rawClaimSchema).min(1), review_targets: z.array(z.string().min(1)).min(1), gaps: z.array(z.object({ code: z.enum(["optional_missing", "source_coverage", "unreadable", "invalid_output", "provider_transient_exhausted", "not_requested", "synthesis_unavailable"]), message: z.string().min(1), span_ids: z.array(z.string().min(1)).default([]) }).strict()).default([]),
  ...optionalBlocksSchema.shape,
}).strict();
export type V2Artifact = z.input<typeof v2ArtifactSchema>;
type ValidatedV2Artifact = Omit<z.output<typeof v2ArtifactSchema>, "explanation"> & {
  explanation: Array<{ id: string; text: string; support_status: z.infer<typeof rawClaimSchema>["support_status"]; source_refs: z.infer<typeof v2SourceReferenceSchema>[] }>;
  source_refs: z.infer<typeof v2SourceReferenceSchema>[];
};

export const v2SourceReferenceSchema = z.object({ span_id: z.string().min(1), source_id: z.string().min(1), source_name: z.string().min(1), locator: locatorSchema, excerpt: z.string().min(1) }).strict();
const v2ClaimSchema = z.object({ id: z.string().min(1), text: z.string().min(1), support_status: z.enum(["direct", "partial", "conflict", "unsupported_gap"]), source_refs: z.array(v2SourceReferenceSchema) }).strict();
const v2SectionSchema = z.object({ id: z.string().min(1), title: z.string().min(1), priority: z.enum(["study_first", "study_next", "review_if_time"]), focus_reason: z.string().min(1), explanation: z.array(v2ClaimSchema).min(1), source_refs: z.array(v2SourceReferenceSchema), gaps: z.array(z.object({ code: z.string().min(1), message: z.string().min(1) }).strict()), review_targets: z.array(z.string().min(1)).min(1), key_concepts: z.array(z.string().min(1)).optional(), definitions: z.array(z.string().min(1)).optional(), processes_relationships: z.array(z.string().min(1)).optional(), common_confusions: z.array(z.string().min(1)).optional(), practice_prompts: z.array(z.string().min(1)).optional() }).strict();
export const v2GuideSchema = z.object({ schema_version: z.literal("2.0"), id: z.string().min(1), session_id: z.string().min(1), title: z.string().min(1), source_snapshot_hash: z.string().min(16), generation_status: z.enum(["complete", "complete_with_gaps"]), coverage: z.object({ readable_units: z.number().int().nonnegative(), covered_units: z.number().int().nonnegative(), total_units: z.number().int().nonnegative(), gaps: z.array(z.object({ code: z.string().min(1), message: z.string().min(1), source_id: z.string().min(1).nullable(), locator: locatorSchema.nullable(), partition_id: z.string().min(1).nullable() }).strict()) }).strict(), study_map: z.array(z.object({ section_id: z.string().min(1), priority: z.enum(["study_first", "study_next", "review_if_time"]), why_this_matters: z.string().min(1), source_refs: z.array(v2SourceReferenceSchema) }).strict()).min(1), sections: z.array(v2SectionSchema).min(1), generated_at: z.iso.datetime() }).strict().superRefine((guide, ctx) => {
  const sectionIds = new Set(guide.sections.map((section) => section.id));
  guide.study_map.forEach((item, index) => { if (!sectionIds.has(item.section_id)) ctx.addIssue({ code: "custom", message: "Study map item must reference a delivered section.", path: ["study_map", index, "section_id"] }); });
});
export type V2Guide = z.infer<typeof v2GuideSchema>;

export type V2Provider = (input: { partition: V2Partition; spans: V2Span[]; output_language: "match_materials" | "en" | "zh" }) => Promise<unknown>;
export type V2RunOptions = { output_language?: "match_materials" | "en" | "zh"; now?: Date };

function canonicalReference(span: V2Span, sources: Map<string, V2Source>) {
  const source = sources.get(span.source_id);
  if (!source) throw new Error(`UNKNOWN_SOURCE:${span.source_id}`);
  return { span_id: span.id, source_id: source.id, source_name: source.display_name, locator: span.locator, excerpt: span.excerpt };
}

function validateAndCanonicalizeArtifact(value: unknown, partition: V2Partition, snapshot: V2SourceSnapshot): ValidatedV2Artifact {
  const artifact = v2ArtifactSchema.parse(value);
  const allowed = new Set(partition.span_ids);
  const spans = new Map(snapshot.spans.map((span) => [span.id, span]));
  const sources = new Map(snapshot.sources.map((source) => [source.id, source]));
  const references = (ids: string[]) => {
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length || unique.some((id) => !allowed.has(id))) throw new Error("MODEL_INVALID_SOURCE_REFERENCE");
    return unique.map((id) => canonicalReference(spans.get(id)!, sources));
  };
  if (artifact.explanation.some((claim) => claim.support_status === "unsupported_gap")) throw new Error("MODEL_UNSUPPORTED_CLAIM_IN_EXPLANATION");
  const explanation = artifact.explanation.map((claim, index) => ({ id: `${partition.id}:claim:${index}`, text: claim.text, support_status: claim.support_status, source_refs: claim.support_status === "unsupported_gap" ? [] : references(claim.span_ids) }));
  if (explanation.some((claim) => claim.support_status !== "unsupported_gap" && claim.source_refs.length === 0)) throw new Error("MODEL_UNSUPPORTED_CLAIM");
  const sourceRefs = [...new Map(explanation.flatMap((claim) => claim.source_refs).map((ref) => [ref.span_id, ref])).values()];
  const { explanation: _rawExplanation, ...rest } = artifact;
  void _rawExplanation;
  return { ...rest, section_id: partition.id, explanation, source_refs: sourceRefs };
}

export async function runGenerationV2(snapshotInput: V2SourceSnapshot, provider: V2Provider, options: V2RunOptions = {}): Promise<V2Guide> {
  const snapshot = sourceSnapshotSchema.parse(snapshotInput);
  if (new Set(snapshot.spans.map((span) => span.id)).size !== snapshot.spans.length) throw new Error("DUPLICATE_SOURCE_SPAN_ID");
  if (new Set(snapshot.sources.map((source) => source.id)).size !== snapshot.sources.length) throw new Error("DUPLICATE_SOURCE_ID");
  if (snapshot.spans.some((span) => !snapshot.sources.some((source) => source.id === span.source_id))) throw new Error("SPAN_SOURCE_MISMATCH");
  const partitions = partitionV2Snapshot(snapshot);
  const covered = new Set<string>();
  const artifacts: Array<ReturnType<typeof validateAndCanonicalizeArtifact>> = [];
  const gaps: V2Guide["coverage"]["gaps"] = snapshot.warnings.map((warning) => ({ code: warning.code, message: warning.message, source_id: warning.source_id, locator: warning.locator === null ? null : { kind: "file" as const, number: warning.locator }, partition_id: null }));
  const language = options.output_language ?? "match_materials";
  const resolvedLanguage = language === "match_materials" ? detectV2Language(snapshot.spans.map((span) => span.text).join("\n")) : language;
  for (const partition of partitions) {
    try {
      const result = validateAndCanonicalizeArtifact(await provider({ partition, spans: partition.span_ids.map((id) => snapshot.spans.find((span) => span.id === id)!), output_language: resolvedLanguage }), partition, snapshot);
      artifacts.push(result); partition.span_ids.forEach((id) => covered.add(id));
    } catch (error) {
      gaps.push({ code: error instanceof Error && error.message === "MODEL_INVALID_SOURCE_REFERENCE" ? "invalid_output" : "provider_transient_exhausted", message: error instanceof Error ? error.message : "Provider artifact failed.", source_id: partition.source_ids[0] ?? null, locator: null, partition_id: partition.id });
    }
  }
  if (!artifacts.length) throw new Error("failed_no_guide");
  const sections = artifacts.map((artifact) => ({ id: artifact.section_id, title: artifact.title, priority: artifact.priority, focus_reason: artifact.focus_reason, explanation: artifact.explanation, source_refs: artifact.source_refs, gaps: artifact.gaps.map(({ code, message }) => ({ code, message })), review_targets: artifact.review_targets, ...Object.fromEntries(Object.entries(optionalBlocksSchema.shape).flatMap(([key]) => artifact[key as keyof typeof artifact] === undefined ? [] : [[key, artifact[key as keyof typeof artifact]]])) }));
  const studyMap = sections.map((section) => ({ section_id: section.id, priority: section.priority, why_this_matters: section.focus_reason, source_refs: section.source_refs }));
  const totalUnits = snapshot.sources.reduce((sum, source) => sum + source.unit_count, 0);
  const readableUnits = snapshot.sources.reduce((sum, source) => sum + source.readable_unit_count, 0);
  const coveredUnits = new Set([...covered].map((id) => { const span = snapshot.spans.find((candidate) => candidate.id === id); return span ? `${span.source_id}:${span.locator.kind}:${span.locator.number}` : null; }).filter(Boolean));
  const guide = { schema_version: "2.0" as const, id: randomUUID(), session_id: snapshot.session_id, title: snapshot.title, source_snapshot_hash: snapshot.snapshot_hash, generation_status: covered.size === snapshot.spans.length && gaps.length === 0 ? "complete" as const : "complete_with_gaps" as const, coverage: { readable_units: readableUnits, covered_units: coveredUnits.size, total_units: totalUnits, gaps }, study_map: studyMap, sections, generated_at: (options.now ?? new Date()).toISOString() };
  return v2GuideSchema.parse(guide);
}

export function v2ContractHash() {
  return hash({ schema: "2.0", partition: { characters: MAX_PARTITION_CHARACTERS, tokens: MAX_PARTITION_TOKENS }, grounding: "allowed_span_ids" });
}
