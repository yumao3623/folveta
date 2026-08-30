import { z } from "zod";
import { prioritySchema } from "@/lib/schemas";

function allowedSpanIdSchema(allowedSpanIds: readonly string[]) {
  const uniqueIds = [...new Set(allowedSpanIds)];
  if (!uniqueIds.length) throw new Error("ALLOWED_EVIDENCE_SPAN_IDS_EMPTY");
  return z.enum(uniqueIds as [string, ...string[]]);
}

function createTopicCandidatesSchema(spanIdSchema: z.ZodType<string>) {
  return z.object({
    candidates: z.array(z.object({
      title: z.string().min(1),
      aliases: z.array(z.string().min(1)),
      focus_reason: z.string().min(1),
      evidence_span_ids: z.array(spanIdSchema).min(1),
    }).strict()).min(1),
  }).strict();
}

function createMergedTopicsSchema(spanIdSchema: z.ZodType<string>) {
  return z.object({
    topics: z.array(z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string().min(1),
      priority: prioritySchema,
      focus_reason: z.string().min(1),
      evidence_span_ids: z.array(spanIdSchema).min(1),
    }).strict()).min(1),
  }).strict();
}

function createRawClaimSchema(spanIdSchema: z.ZodType<string>) {
  return z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    support_status: z.enum(["direct", "partial", "conflict"]),
    span_ids: z.array(spanIdSchema).min(1),
  }).strict();
}

function createRawGuideTopicSchema(spanIdSchema: z.ZodType<string>) {
  const claimSchema = createRawClaimSchema(spanIdSchema);
  return z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    priority: prioritySchema,
    focus_reason: z.string().min(1),
    explanation: z.array(claimSchema),
    key_concepts: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      explanation: z.array(claimSchema),
    }).strict()),
    definitions: z.array(z.object({
      id: z.string().min(1),
      term: z.string().min(1),
      definition: z.array(claimSchema),
    }).strict()),
    processes_relationships: z.array(claimSchema),
    common_confusions: z.array(z.object({
      id: z.string().min(1),
      confusion: z.array(claimSchema),
      clarification: z.array(claimSchema),
    }).strict()),
    gaps: z.array(z.object({
      id: z.string().min(1),
      text: z.string().min(1),
    }).strict()),
  }).strict();
}

const unrestrictedSpanIdSchema = z.string().min(1);

export const topicCandidatesSchema = createTopicCandidatesSchema(unrestrictedSpanIdSchema);
export const mergedTopicsSchema = createMergedTopicsSchema(unrestrictedSpanIdSchema);
export const rawClaimSchema = createRawClaimSchema(unrestrictedSpanIdSchema);
export const rawGuideTopicSchema = createRawGuideTopicSchema(unrestrictedSpanIdSchema);

export const topicCandidatesSchemaForSpanIds = (allowedSpanIds: readonly string[]) =>
  createTopicCandidatesSchema(allowedSpanIdSchema(allowedSpanIds));

export const mergedTopicsSchemaForSpanIds = (allowedSpanIds: readonly string[]) =>
  createMergedTopicsSchema(allowedSpanIdSchema(allowedSpanIds));

export const rawGuideTopicSchemaForSpanIds = (allowedSpanIds: readonly string[]) =>
  createRawGuideTopicSchema(allowedSpanIdSchema(allowedSpanIds));

export const groundingVerdictsSchema = z.object({
  verdicts: z.array(z.object({
    claim_id: z.string().min(1),
    verdict: z.enum(["supported", "partial", "unsupported"]),
    reason: z.string().min(1),
  }).strict()),
}).strict();

export const rawQuickCheckCandidatesSchema = z.object({
  candidates: z.array(z.object({
    candidate_id: z.string().min(1),
    target_id: z.string().min(1),
    topic_id: z.string().min(1),
    cognitive_intent: z.enum([
      "concept_recognition",
      "understanding",
      "relationship_or_process",
      "simple_application",
    ]),
    stem: z.string().min(1),
    options: z.array(z.object({
      id: z.string().min(1),
      text: z.string().min(1),
    }).strict()).min(2).max(6),
    correct_option_id: z.string().min(1),
    explanation: z.string().min(1),
    source_span_ids: z.array(z.string().min(1)).min(1),
  }).strict()).min(1).max(20),
}).strict();

export const questionVerdictsSchema = z.object({
  verdicts: z.array(z.object({
    candidate_id: z.string().min(1),
    correct_option_id: z.enum(["A", "B", "C", "D"]),
    question_grounded: z.boolean(),
    answer_grounded: z.boolean(),
    explanation_grounded: z.boolean(),
    single_best_answer: z.boolean(),
    reason: z.string().min(1),
  }).strict()),
}).strict();

export type TopicCandidates = z.infer<typeof topicCandidatesSchema>;
export type MergedTopic = z.infer<typeof mergedTopicsSchema>["topics"][number];
export type RawClaim = z.infer<typeof rawClaimSchema>;
export type RawGuideTopic = z.infer<typeof rawGuideTopicSchema>;
export type GroundingVerdicts = z.infer<typeof groundingVerdictsSchema>;
export type RawQuickCheckCandidate = z.infer<typeof rawQuickCheckCandidatesSchema>["candidates"][number];
export type QuestionVerdicts = z.infer<typeof questionVerdictsSchema>;
