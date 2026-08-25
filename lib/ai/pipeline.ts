import { createHash, randomUUID } from "node:crypto";
import { guideSchema, type GroundedClaim, type Guide, type GuideTopic, type SourceReference } from "@/lib/schemas";
import { getServerEnv } from "@/lib/env";
import { MVP_LIMITS } from "@/lib/config";
import { AppError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { Json } from "@/lib/server/database.types";
import { ModelGateway, type ModelTask, type StructuredResult } from "@/lib/ai/gateway";
import { PROMPTS } from "@/lib/ai/prompts";
import {
  groundingVerdictsSchema,
  mergedTopicsSchema,
  rawGuideTopicSchema,
  topicCandidatesSchema,
  type TopicCandidates,
  type GroundingVerdicts,
  type MergedTopic,
  type RawClaim,
  type RawGuideTopic,
} from "@/lib/ai/schemas";

type SourceRow = {
  id: string;
  display_name: string;
  kind: "pdf" | "pptx";
  status: string;
  warnings: Array<{ code: string; message: string; locator: number | null }>;
  error_code: string | null;
  error_message: string | null;
};

type SpanRow = {
  id: string;
  source_id: string;
  locator_kind: "page" | "slide";
  locator_number: number;
  text: string;
  excerpt: string;
  content_hash: string;
};

const stageStates = {
  extracting_topics: "extracting_topics",
  merging_topics: "merging_topics",
  generating_guide: "generating_guide",
  verifying_guide: "verifying_guide",
} as const;

function modelForTask(task: ModelTask) {
  const env = getServerEnv();
  return {
    topic_extract: env.MODEL_TOPIC_EXTRACT,
    topic_merge: env.MODEL_TOPIC_MERGE,
    guide: env.MODEL_GUIDE,
    grounding_verify: env.MODEL_GROUNDING_VERIFY,
    quick_check: env.MODEL_QUICK_CHECK,
    question_verify: env.MODEL_QUESTION_VERIFY,
  }[task];
}

async function setStage(sessionId: string, stage: keyof typeof stageStates) {
  const { error } = await getSupabaseAdmin().from("preparation_sessions").update({
    state: stageStates[stage],
    current_stage: stage,
    failed_stage: null,
    error_code: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", sessionId);
  if (error) throw error;
}

async function trackedCall<T>(
  sessionId: string,
  stage: keyof typeof stageStates,
  task: ModelTask,
  call: () => Promise<StructuredResult<T>>,
) {
  const env = getServerEnv();
  const admin = getSupabaseAdmin();
  const runId = randomUUID();
  await admin.from("generation_runs").insert({
    id: runId,
    session_id: sessionId,
    stage,
    status: "running",
    prompt_version: env.PROMPT_VERSION,
    schema_version: env.GUIDE_SCHEMA_VERSION,
    provider: env.MODEL_PROVIDER,
    model: modelForTask(task),
  });
  try {
    const result = await call();
    await admin.from("generation_runs").update({
      status: "succeeded",
      model: result.actualModel,
      usage: result.usage as Json,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    return result.data;
  } catch (error) {
    await admin.from("generation_runs").update({
      status: "failed",
      error_code: error instanceof AppError ? error.code : "MODEL_GENERATION_FAILED",
      error_message: error instanceof Error ? error.message : "Unknown generation error",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    throw error;
  }
}

function evidenceLine(span: SpanRow, source: SourceRow) {
  const locator = span.locator_kind === "page" ? "Page" : "Slide";
  return `[${span.id}] ${source.display_name} · ${locator} ${span.locator_number}\n${span.text}`;
}

function batchSpans(spans: SpanRow[], maximumCharacters = 45_000) {
  const batches: SpanRow[][] = [];
  let batch: SpanRow[] = [];
  let size = 0;
  for (const span of spans) {
    if (batch.length && size + span.text.length > maximumCharacters) {
      batches.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(span);
    size += span.text.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

function allRawClaims(topic: RawGuideTopic) {
  return [
    ...topic.explanation,
    ...topic.key_concepts.flatMap((item) => item.explanation),
    ...topic.definitions.flatMap((item) => item.definition),
    ...topic.processes_relationships,
    ...topic.common_confusions.flatMap((item) => [...item.confusion, ...item.clarification]),
  ];
}

function referenceFor(span: SpanRow, source: SourceRow): SourceReference {
  return {
    span_id: span.id,
    source_id: span.source_id,
    source_name: source.display_name,
    locator: { kind: span.locator_kind, number: span.locator_number },
    excerpt: span.excerpt,
  };
}

function uniqueReferences(references: SourceReference[]) {
  return [...new Map(references.map((reference) => [reference.span_id, reference])).values()];
}

function buildTopic(
  raw: RawGuideTopic,
  merged: MergedTopic,
  verdicts: GroundingVerdicts,
  spansById: Map<string, SpanRow>,
  sourcesById: Map<string, SourceRow>,
): GuideTopic {
  const verdictMap = new Map(verdicts.verdicts.map((item) => [item.claim_id, item.verdict]));
  const resolveClaim = (claim: RawClaim): GroundedClaim => {
    const verdict = verdictMap.get(claim.id) ?? "unsupported";
    const references = uniqueReferences(claim.span_ids.flatMap((id) => {
      const span = spansById.get(id);
      const source = span ? sourcesById.get(span.source_id) : undefined;
      return span && source ? [referenceFor(span, source)] : [];
    }));
    if (verdict === "unsupported" || references.length === 0) {
      return {
        id: `${merged.id}-${claim.id}`,
        text: `The uploaded materials did not reliably establish: ${claim.text}`,
        support_status: "unsupported_gap",
        source_references: [],
      };
    }
    return {
      id: `${merged.id}-${claim.id}`,
      text: claim.text,
      support_status: verdict === "partial" ? "partial" : claim.support_status,
      source_references: references,
    };
  };

  const explanation = raw.explanation.map(resolveClaim);
  const keyConcepts = raw.key_concepts.map((item) => ({ ...item, id: `${merged.id}-${item.id}`, explanation: item.explanation.map(resolveClaim) }));
  const definitions = raw.definitions.map((item) => ({ ...item, id: `${merged.id}-${item.id}`, definition: item.definition.map(resolveClaim) }));
  const processes = raw.processes_relationships.map(resolveClaim);
  const confusions = raw.common_confusions.map((item) => ({ ...item, id: `${merged.id}-${item.id}`, confusion: item.confusion.map(resolveClaim), clarification: item.clarification.map(resolveClaim) }));
  const generatedGaps: GroundedClaim[] = raw.gaps.map((gap) => ({ id: `${merged.id}-${gap.id}`, text: gap.text, support_status: "unsupported_gap", source_references: [] }));
  const unsupportedClaims = [
    ...explanation,
    ...keyConcepts.flatMap((item) => item.explanation),
    ...definitions.flatMap((item) => item.definition),
    ...processes,
    ...confusions.flatMap((item) => [...item.confusion, ...item.clarification]),
  ].filter((claim) => claim.support_status === "unsupported_gap");
  const positiveClaims = [
    ...explanation,
    ...keyConcepts.flatMap((item) => item.explanation),
    ...definitions.flatMap((item) => item.definition),
    ...processes,
    ...confusions.flatMap((item) => [...item.confusion, ...item.clarification]),
  ].filter((claim) => claim.support_status !== "unsupported_gap");
  let references = uniqueReferences(positiveClaims.flatMap((claim) => claim.source_references));
  if (references.length === 0) {
    references = uniqueReferences(merged.evidence_span_ids.flatMap((id) => {
      const span = spansById.get(id);
      const source = span ? sourcesById.get(span.source_id) : undefined;
      return span && source ? [referenceFor(span, source)] : [];
    }));
  }
  return {
    id: merged.id,
    title: merged.title,
    priority: merged.priority,
    focus_reason: merged.focus_reason,
    explanation: explanation.filter((claim) => claim.support_status !== "unsupported_gap"),
    key_concepts: keyConcepts.map((item) => ({ ...item, explanation: item.explanation.filter((claim) => claim.support_status !== "unsupported_gap") })).filter((item) => item.explanation.length),
    definitions: definitions.map((item) => ({ ...item, definition: item.definition.filter((claim) => claim.support_status !== "unsupported_gap") })).filter((item) => item.definition.length),
    processes_relationships: processes.filter((claim) => claim.support_status !== "unsupported_gap"),
    common_confusions: confusions.map((item) => ({
      ...item,
      confusion: item.confusion.filter((claim) => claim.support_status !== "unsupported_gap"),
      clarification: item.clarification.filter((claim) => claim.support_status !== "unsupported_gap"),
    })).filter((item) => item.confusion.length && item.clarification.length),
    gaps: [...generatedGaps, ...unsupportedClaims],
    source_references: references,
  };
}

function forbiddenLanguage(guide: Guide) {
  return /exam probability|likely to (?:appear|be on)|predict(?:s|ed|ion)? (?:the |your )?exam|mastered|safe to skip|guaranteed (?:coverage|readiness)|complete course coverage/i.test(JSON.stringify(guide));
}

export async function generateGuide(sessionId: string, title: string): Promise<Guide> {
  const admin = getSupabaseAdmin();
  const env = getServerEnv();
  const gateway = new ModelGateway();
  const [{ data: sourceData, error: sourceError }, { data: spanData, error: spanError }] = await Promise.all([
    admin.from("sources").select("id, display_name, kind, status, warnings, error_code, error_message").eq("session_id", sessionId).order("created_at"),
    admin.from("source_spans").select("id, source_id, locator_kind, locator_number, text, excerpt, content_hash").eq("session_id", sessionId).order("source_id").order("locator_number").order("ordinal"),
  ]);
  if (sourceError) throw sourceError;
  if (spanError) throw spanError;
  const sources = (sourceData ?? []) as SourceRow[];
  const usableSources = sources.filter((source) => source.status === "ready" || source.status === "ready_with_gaps");
  const spans = (spanData ?? []) as SpanRow[];
  if (!usableSources.length || !spans.length) {
    throw new AppError("NO_USABLE_SOURCES", "At least one source with readable course text is required before generation.", 422);
  }
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const spansById = new Map(spans.map((span) => [span.id, span]));

  await setStage(sessionId, "extracting_topics");
  const candidateGroups: TopicCandidates["candidates"] = [];
  for (const source of usableSources) {
    const sourceSpans = spans.filter((span) => span.source_id === source.id);
    for (const batch of batchSpans(sourceSpans)) {
      const candidates = await trackedCall(sessionId, "extracting_topics", "topic_extract", () => gateway.generateStructured({
        task: "topic_extract",
        schema: topicCandidatesSchema,
        schemaName: "topic_candidates",
        instructions: PROMPTS.topicExtract,
        evidence: `Source: ${source.display_name}\n\n${batch.map((span) => evidenceLine(span, source)).join("\n\n")}`,
      }));
      candidateGroups.push(...candidates.candidates);
    }
  }
  if (!candidateGroups.length) throw new AppError("TOPIC_EXTRACTION_EMPTY", "No supported study topics could be extracted.", 422);

  await setStage(sessionId, "merging_topics");
  const mergedResult = await trackedCall(sessionId, "merging_topics", "topic_merge", () => gateway.generateStructured({
    task: "topic_merge",
    schema: mergedTopicsSchema,
    schemaName: "merged_topics",
    instructions: PROMPTS.topicMerge,
    evidence: `Maximum topics: ${MVP_LIMITS.maxTopics}\nValid span IDs: ${spans.map((span) => span.id).join(", ")}\n\nCandidates:\n${JSON.stringify(candidateGroups)}`,
  }));
  const mergedTopics = mergedResult.topics.slice(0, MVP_LIMITS.maxTopics).map((topic) => ({
    ...topic,
    evidence_span_ids: [...new Set(topic.evidence_span_ids)].filter((id) => spansById.has(id)),
  })).filter((topic) => topic.evidence_span_ids.length > 0);
  if (!mergedTopics.length) throw new AppError("TOPIC_REFERENCE_VALIDATION_FAILED", "Topic extraction returned no valid source references.", 422);

  await setStage(sessionId, "generating_guide");
  const rawTopics: Array<{ merged: MergedTopic; raw: RawGuideTopic }> = [];
  for (const merged of mergedTopics) {
    const evidenceSpans = merged.evidence_span_ids.map((id) => spansById.get(id)).filter((span): span is SpanRow => Boolean(span));
    const raw = await trackedCall(sessionId, "generating_guide", "guide", () => gateway.generateStructured({
      task: "guide",
      schema: rawGuideTopicSchema,
      schemaName: "study_guide_topic",
      instructions: PROMPTS.guideTopic,
      evidence: `Topic contract: ${JSON.stringify(merged)}\n\nEvidence:\n${evidenceSpans.map((span) => evidenceLine(span, sourcesById.get(span.source_id)!)).join("\n\n")}`,
    }));
    const invalidReference = allRawClaims(raw).some((claim) => claim.span_ids.some((id) => !merged.evidence_span_ids.includes(id)));
    if (invalidReference) throw new AppError("GUIDE_REFERENCE_VALIDATION_FAILED", `Generated topic “${merged.title}” cited an evidence span outside its supplied bundle.`, 422);
    rawTopics.push({ merged, raw: { ...raw, id: merged.id, title: merged.title, priority: merged.priority, focus_reason: merged.focus_reason } });
  }

  await setStage(sessionId, "verifying_guide");
  const topics: GuideTopic[] = [];
  for (const { merged, raw } of rawTopics) {
    const claims = allRawClaims(raw);
    const citedIds = [...new Set(claims.flatMap((claim) => claim.span_ids))];
    const verdicts = claims.length ? await trackedCall(sessionId, "verifying_guide", "grounding_verify", () => gateway.generateStructured({
      task: "grounding_verify",
      schema: groundingVerdictsSchema,
      schemaName: "grounding_verdicts",
      instructions: PROMPTS.groundingVerify,
      evidence: `Claims:\n${JSON.stringify(claims)}\n\nCited evidence:\n${citedIds.map((id) => {
        const span = spansById.get(id)!;
        return evidenceLine(span, sourcesById.get(span.source_id)!);
      }).join("\n\n")}`,
    })) : { verdicts: [] };
    topics.push(buildTopic(raw, merged, verdicts, spansById, sourcesById));
  }

  const sourceIssues = sources.flatMap((source) => {
    const warnings = (source.warnings ?? []).map((warning) => ({ source_id: source.id, source_name: source.display_name, code: warning.code, message: warning.message }));
    if (source.status === "cannot_use") {
      warnings.push({ source_id: source.id, source_name: source.display_name, code: source.error_code ?? "SOURCE_EXCLUDED", message: source.error_message ?? "This source was excluded." });
    }
    return warnings;
  });
  const guideId = randomUUID();
  const overallGaps: GroundedClaim[] = sourceIssues.map((issue, index) => ({
    id: `source-gap-${index + 1}`,
    text: `${issue.source_name}: ${issue.message}`,
    support_status: "unsupported_gap",
    source_references: [],
  }));
  const guide = guideSchema.parse({
    schema_version: "1.0",
    id: guideId,
    session_id: sessionId,
    title,
    based_on_uploaded_materials: true,
    source_count: usableSources.length,
    priority_method_summary: "Priority bands reflect supported topic coverage and course structure in the uploaded materials. They are study suggestions, not probabilities of appearing on an exam.",
    generation_status: sourceIssues.length ? "ready_with_warnings" : "ready",
    source_issues: sourceIssues,
    topics,
    overall_gaps: overallGaps,
    generated_at: new Date().toISOString(),
  });
  if (forbiddenLanguage(guide)) {
    throw new AppError("FORBIDDEN_LANGUAGE", "The generated guide used prediction, mastery, or guaranteed-coverage language and was rejected.", 422);
  }

  const sourceChecksum = createHash("sha256").update(spans.map((span) => span.content_hash).sort().join(":"), "utf8").digest("hex");
  const { error: guideError } = await admin.from("study_guides").upsert({
    id: guideId,
    session_id: sessionId,
    schema_version: env.GUIDE_SCHEMA_VERSION,
    prompt_version: env.PROMPT_VERSION,
    source_checksum: sourceChecksum,
    guide_json: guide,
    validation_warnings: sourceIssues,
    updated_at: new Date().toISOString(),
  }, { onConflict: "session_id" });
  if (guideError) throw guideError;
  const { error: sessionError } = await admin.from("preparation_sessions").update({
    state: "guide_ready",
    current_stage: "guide_ready",
    failed_stage: null,
    error_code: null,
    error_message: null,
    updated_at: new Date().toISOString(),
  }).eq("id", sessionId);
  if (sessionError) throw sessionError;
  return guide;
}
