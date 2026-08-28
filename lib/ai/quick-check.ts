import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { ModelGateway, type ModelTask, type StructuredResult } from "@/lib/ai/gateway";
import { PROMPTS } from "@/lib/ai/prompts";
import {
  questionVerdictsSchema,
  rawQuickCheckCandidatesSchema,
  type QuestionVerdicts,
  type RawQuickCheckCandidate,
} from "@/lib/ai/schemas";
import { MVP_LIMITS } from "@/lib/config";
import { getServerEnv } from "@/lib/env";
import {
  collectQuestionTargets,
  mcqQuestionSchema,
  normalizeText,
  optionIdSchema,
  quickCheckSchema,
  stemsAreNearDuplicates,
  type Guide,
  type MCQQuestion,
  type QuestionTarget,
  type QuickCheck,
} from "@/lib/schemas";
import type { Json } from "@/lib/server/database.types";
import { AppError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type SpanRow = {
  id: string;
  source_id: string;
  locator_kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file";
  locator_number: number;
  text: string;
};

type SourceRow = {
  id: string;
  display_name: string;
};

type CandidateRejection = {
  candidate_id: string;
  reason: string;
};

const forbiddenQuestionLanguage = /mock exam|professor(?:'s)? exam|predict(?:s|ed|ion)? (?:the |your )?exam|master(?:ed|y)|safe to skip|guaranteed readiness/i;

export function checksumGuide(guide: Guide) {
  return createHash("sha256").update(JSON.stringify(guide), "utf8").digest("hex");
}

function modelForTask(task: ModelTask) {
  const env = getServerEnv();
  if (task === "quick_check") return env.MODEL_QUICK_CHECK;
  if (task === "question_verify") return env.MODEL_QUESTION_VERIFY;
  throw new Error(`Unsupported Quick Check model task: ${task}`);
}

async function trackedQuickCheckCall<T>(
  sessionId: string,
  stage: "generating_quick_check" | "verifying_questions",
  task: "quick_check" | "question_verify",
  call: (onRetry: (attempt: number) => Promise<void>) => Promise<StructuredResult<T>>,
) {
  const env = getServerEnv();
  const admin = getSupabaseAdmin();
  const runId = randomUUID();
  const { error: insertError } = await admin.from("generation_runs").insert({
    id: runId,
    session_id: sessionId,
    stage,
    status: "running",
    prompt_version: env.PROMPT_VERSION,
    schema_version: env.QUICK_CHECK_SCHEMA_VERSION,
    provider: env.MODEL_PROVIDER,
    model: modelForTask(task),
  });
  if (insertError) throw insertError;

  try {
    const result = await call(async (attempt) => {
      console.info("[generation-retry]", JSON.stringify({ sessionId, stage, task, attempt }));
    });
    await admin.from("generation_runs").update({
      status: "succeeded",
      model: result.actualModel,
      usage: result.usage as Json,
      attempt: result.retryCount + 1,
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    return result.data;
  } catch (error) {
    await admin.from("generation_runs").update({
      status: "failed",
      error_code: error instanceof AppError ? error.code : "QUICK_CHECK_MODEL_FAILED",
      error_message: error instanceof Error ? error.message : "Unknown Quick Check generation error",
      completed_at: new Date().toISOString(),
    }).eq("id", runId);
    throw error;
  }
}

function roundRobinTargets(targets: QuestionTarget[], limit: number) {
  const byTopic = new Map<string, QuestionTarget[]>();
  for (const target of targets) {
    const group = byTopic.get(target.topic_id) ?? [];
    group.push(target);
    byTopic.set(target.topic_id, group);
  }

  const selected: QuestionTarget[] = [];
  let depth = 0;
  while (selected.length < limit) {
    let added = false;
    for (const group of byTopic.values()) {
      const target = group[depth];
      if (target) {
        selected.push(target);
        added = true;
        if (selected.length === limit) break;
      }
    }
    if (!added) break;
    depth += 1;
  }
  return selected;
}

function evidenceLine(span: SpanRow, source: SourceRow) {
  const locator = span.locator_kind === "page" ? "Page" : span.locator_kind === "slide" ? "Slide" : span.locator_kind === "sheet" ? "Sheet" : span.locator_kind === "paragraph" ? "Paragraph" : span.locator_kind === "image" ? "Image" : "File";
  return `[${span.id}] ${source.display_name} · ${locator} ${span.locator_number}\n${span.text}`;
}

function candidateShape(candidate: RawQuickCheckCandidate, target: QuestionTarget | undefined) {
  if (!target || candidate.topic_id !== target.topic_id) return "The related Guide target or topic does not exist.";
  if (candidate.options.length !== 4) return "The item does not have exactly four options.";
  const parsedIds = candidate.options.map((option) => optionIdSchema.safeParse(option.id));
  if (parsedIds.some((result) => !result.success)) return "An option ID is not A, B, C, or D.";
  const optionIds = candidate.options.map((option) => option.id);
  if (new Set(optionIds).size !== 4) return "Option IDs are duplicated.";
  const optionText = candidate.options.map((option) => normalizeText(option.text));
  if (optionText.some((text) => !text) || new Set(optionText).size !== 4) return "Option text is empty or duplicated.";
  if (!optionIdSchema.safeParse(candidate.correct_option_id).success || !optionIds.includes(candidate.correct_option_id)) {
    return "The keyed answer does not identify one present option.";
  }
  const allowedSpanIds = new Set(target.source_refs.map((reference) => reference.span_id));
  if (candidate.source_span_ids.length === 0 || candidate.source_span_ids.some((id) => !allowedSpanIds.has(id))) {
    return "The item cites evidence outside its related Guide section.";
  }
  if (forbiddenQuestionLanguage.test(`${candidate.stem} ${candidate.explanation}`)) {
    return "The item uses prohibited exam-simulation or mastery language.";
  }
  return null;
}

function uniqueVerdicts(verdicts: QuestionVerdicts["verdicts"]) {
  const counts = new Map<string, number>();
  for (const verdict of verdicts) counts.set(verdict.candidate_id, (counts.get(verdict.candidate_id) ?? 0) + 1);
  return new Map(verdicts.filter((verdict) => counts.get(verdict.candidate_id) === 1).map((verdict) => [verdict.candidate_id, verdict]));
}

function chooseDiverseCandidates(candidates: RawQuickCheckCandidate[], requestedCount: number) {
  const selected: RawQuickCheckCandidate[] = [];
  const addIfDistinct = (candidate: RawQuickCheckCandidate) => {
    if (selected.length >= requestedCount) return;
    if (selected.some((prior) => stemsAreNearDuplicates(prior.stem, candidate.stem))) return;
    selected.push(candidate);
  };

  const seenTopics = new Set<string>();
  for (const candidate of candidates) {
    if (!seenTopics.has(candidate.topic_id)) {
      addIfDistinct(candidate);
      seenTopics.add(candidate.topic_id);
    }
  }
  for (const candidate of candidates) addIfDistinct(candidate);
  return selected;
}

export function validateQuickCheckCandidates({
  candidates,
  verdicts,
  targets,
  requestedCount,
}: {
  candidates: RawQuickCheckCandidate[];
  verdicts: QuestionVerdicts["verdicts"];
  targets: QuestionTarget[];
  requestedCount: number;
}) {
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  const verdictsById = uniqueVerdicts(verdicts);
  const candidateIdCounts = new Map<string, number>();
  for (const candidate of candidates) {
    candidateIdCounts.set(candidate.candidate_id, (candidateIdCounts.get(candidate.candidate_id) ?? 0) + 1);
  }

  const rejections: CandidateRejection[] = [];
  const passed: RawQuickCheckCandidate[] = [];
  for (const candidate of candidates) {
    if (candidateIdCounts.get(candidate.candidate_id) !== 1) {
      rejections.push({ candidate_id: candidate.candidate_id, reason: "Candidate ID is duplicated." });
      continue;
    }
    const shapeReason = candidateShape(candidate, targetsById.get(candidate.target_id));
    if (shapeReason) {
      rejections.push({ candidate_id: candidate.candidate_id, reason: shapeReason });
      continue;
    }
    const verdict = verdictsById.get(candidate.candidate_id);
    if (!verdict) {
      rejections.push({ candidate_id: candidate.candidate_id, reason: "No unique quality verdict was returned." });
      continue;
    }
    if (
      !verdict.question_grounded
      || !verdict.answer_grounded
      || !verdict.explanation_grounded
      || !verdict.single_best_answer
      || verdict.correct_option_id !== candidate.correct_option_id
    ) {
      rejections.push({ candidate_id: candidate.candidate_id, reason: verdict.reason });
      continue;
    }
    passed.push(candidate);
  }

  const selected = chooseDiverseCandidates(passed, requestedCount);
  for (const candidate of passed) {
    if (!selected.includes(candidate)) {
      rejections.push({ candidate_id: candidate.candidate_id, reason: "Excluded as a near-duplicate or beyond the requested sample." });
    }
  }
  return { selected, rejections };
}

function referencesForCandidate(candidate: RawQuickCheckCandidate, target: QuestionTarget) {
  const cited = new Set(candidate.source_span_ids);
  return target.source_refs.filter((reference) => cited.has(reference.span_id));
}

function buildQuestion(candidate: RawQuickCheckCandidate, target: QuestionTarget): MCQQuestion {
  const id = randomUUID();
  const refs = referencesForCandidate(candidate, target);
  return mcqQuestionSchema.parse({
    id,
    topic_id: target.topic_id,
    stem: candidate.stem,
    options: candidate.options,
    correct_option_id: candidate.correct_option_id,
    explanation: [{
      id: `${id}-explanation`,
      text: candidate.explanation,
      support_status: "direct",
      source_references: refs,
    }],
    source_refs: refs,
    related_section: {
      section_type: target.section_type,
      section_item_id: target.section_item_id,
      anchor: target.anchor,
    },
    validation: {
      status: "validated",
      single_best_answer: true,
      question_grounded: true,
      answer_grounded: true,
      explanation_grounded: true,
    },
  });
}

export async function generateQuickCheck(
  sessionId: string,
  guide: Guide,
  requestedQuestionCount: number = MVP_LIMITS.defaultQuickCheckQuestions,
): Promise<{ quickCheck: QuickCheck; rejectionCount: number }> {
  const requested = z.number().int().min(5).max(MVP_LIMITS.maxQuickCheckQuestions).parse(requestedQuestionCount);
  const allTargets = collectQuestionTargets(guide);
  const targets = roundRobinTargets(allTargets, Math.min(allTargets.length, requested * 3));
  if (targets.length === 0) {
    throw new AppError(
      "NO_SUPPORTED_QUESTION_TARGETS",
      "This Guide does not contain enough directly supported material for a reliable Quick Check.",
      422,
    );
  }

  const spanIds = [...new Set(targets.flatMap((target) => target.source_refs.map((reference) => reference.span_id)))];
  const admin = getSupabaseAdmin();
  const { data: spanData, error: spanError } = await admin
    .from("source_spans")
    .select("id, source_id, locator_kind, locator_number, text")
    .eq("session_id", sessionId)
    .in("id", spanIds);
  if (spanError) throw spanError;
  const spans = (spanData ?? []) as SpanRow[];
  const sourceIds = [...new Set(spans.map((span) => span.source_id))];
  const { data: sourceData, error: sourceError } = await admin
    .from("sources")
    .select("id, display_name")
    .eq("session_id", sessionId)
    .in("id", sourceIds);
  if (sourceError) throw sourceError;
  const sources = (sourceData ?? []) as SourceRow[];
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const spansById = new Map(spans.map((span) => [span.id, span]));

  const reliableTargets = targets
    .map((target) => ({
      ...target,
      source_refs: target.source_refs.filter((reference) => spansById.has(reference.span_id)),
    }))
    .filter((target) => target.source_refs.length > 0);
  if (reliableTargets.length === 0) {
    throw new AppError(
      "QUESTION_EVIDENCE_MISSING",
      "The Guide references could not be resolved to the uploaded course evidence.",
      422,
    );
  }

  const candidateCount = Math.min(
    requested * MVP_LIMITS.quickCheckCandidateMultiplier,
    20,
  );
  const targetPayload = reliableTargets.map((target) => ({
    target_id: target.id,
    topic_id: target.topic_id,
    topic_title: target.topic_title,
    section_type: target.section_type,
    guide_text: target.guide_text,
    allowed_source_span_ids: target.source_refs.map((reference) => reference.span_id).filter((id) => spansById.has(id)),
  }));
  const evidence = spans
    .map((span) => {
      const source = sourcesById.get(span.source_id);
      return source ? evidenceLine(span, source) : null;
    })
    .filter((line): line is string => Boolean(line))
    .join("\n\n");

  const gateway = new ModelGateway();
  const raw = await trackedQuickCheckCall(sessionId, "generating_quick_check", "quick_check", (onRetry) => gateway.generateStructured({
    task: "quick_check",
    schema: rawQuickCheckCandidatesSchema,
    schemaName: "quick_check_candidates",
    instructions: PROMPTS.quickCheck,
    evidence: `Requested final questions: ${requested}\nGenerate ${candidateCount} candidates so weak items can be discarded.\n\nGuide targets:\n${JSON.stringify(targetPayload)}\n\nUploaded-course evidence:\n${evidence}`,
    onRetry,
  }));

  const targetMap = new Map(reliableTargets.map((target) => [target.id, target]));
  const structurallyReviewable = raw.candidates.filter((candidate) => !candidateShape(candidate, targetMap.get(candidate.target_id)));
  if (structurallyReviewable.length === 0) {
    throw new AppError("NO_VALID_QUESTION_CANDIDATES", "No generated question passed the basic evidence and option checks.", 422);
  }

  const verificationEvidence = structurallyReviewable.map((candidate) => {
    const target = targetMap.get(candidate.target_id)!;
    const candidateEvidence = candidate.source_span_ids.map((id) => spansById.get(id)).filter((span): span is SpanRow => Boolean(span)).map((span) => {
      const source = sourcesById.get(span.source_id)!;
      return evidenceLine(span, source);
    }).join("\n\n");
    return `Candidate:\n${JSON.stringify(candidate)}\nEvidence:\n${candidateEvidence}\nGuide target:\n${target.guide_text}`;
  }).join("\n\n---\n\n");

  const verified = await trackedQuickCheckCall(sessionId, "verifying_questions", "question_verify", (onRetry) => gateway.generateStructured({
    task: "question_verify",
    schema: questionVerdictsSchema,
    schemaName: "question_verdicts",
    instructions: PROMPTS.questionVerify,
    evidence: verificationEvidence,
    onRetry,
  }));

  const { selected, rejections } = validateQuickCheckCandidates({
    candidates: raw.candidates,
    verdicts: verified.verdicts,
    targets: reliableTargets,
    requestedCount: requested,
  });
  if (selected.length === 0) {
    throw new AppError(
      "NO_RELIABLE_QUICK_CHECK",
      "A reliable Quick Check could not be created from the current Guide and uploaded evidence.",
      422,
    );
  }

  const questions = selected.map((candidate) => buildQuestion(candidate, targetMap.get(candidate.target_id)!));
  const quickCheck = quickCheckSchema.parse({
    schema_version: "1.0",
    id: randomUUID(),
    guide_id: guide.id,
    guide_checksum: checksumGuide(guide),
    requested_question_count: requested,
    question_count: questions.length,
    format: "mcq_only",
    disclaimer: "This checks a sample of concepts from the current Study Guide. It does not certify mastery or predict an exam score.",
    limited_sample: questions.length < requested,
    questions,
    generated_at: new Date().toISOString(),
  });

  const env = getServerEnv();
  const validationWarnings = quickCheck.limited_sample ? [{
    code: "LIMITED_SAMPLE",
    message: `${questions.length} of ${requested} requested questions passed all quality checks.`,
  }] : [];
  const { error: persistError } = await admin.from("quick_checks").insert({
    id: quickCheck.id,
    session_id: sessionId,
    guide_id: guide.id,
    guide_checksum: quickCheck.guide_checksum,
    schema_version: env.QUICK_CHECK_SCHEMA_VERSION,
    prompt_version: env.PROMPT_VERSION,
    requested_question_count: requested,
    question_count: questions.length,
    quick_check_json: quickCheck as unknown as Json,
    validation_warnings: validationWarnings,
  });
  if (persistError) throw persistError;
  return { quickCheck, rejectionCount: rejections.length };
}
