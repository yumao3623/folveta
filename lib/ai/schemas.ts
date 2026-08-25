import { z } from "zod";
import { prioritySchema } from "@/lib/schemas";

export const topicCandidatesSchema = z.object({
  candidates: z.array(z.object({
    title: z.string().min(1),
    aliases: z.array(z.string().min(1)),
    focus_reason: z.string().min(1),
    evidence_span_ids: z.array(z.string().min(1)).min(1),
  }).strict()).min(1),
}).strict();

export const mergedTopicsSchema = z.object({
  topics: z.array(z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    priority: prioritySchema,
    focus_reason: z.string().min(1),
    evidence_span_ids: z.array(z.string().min(1)).min(1),
  }).strict()).min(1),
}).strict();

export const rawClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  support_status: z.enum(["direct", "partial", "conflict"]),
  span_ids: z.array(z.string().min(1)).min(1),
}).strict();

export const rawGuideTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  priority: prioritySchema,
  focus_reason: z.string().min(1),
  explanation: z.array(rawClaimSchema),
  key_concepts: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    explanation: z.array(rawClaimSchema),
  }).strict()),
  definitions: z.array(z.object({
    id: z.string().min(1),
    term: z.string().min(1),
    definition: z.array(rawClaimSchema),
  }).strict()),
  processes_relationships: z.array(rawClaimSchema),
  common_confusions: z.array(z.object({
    id: z.string().min(1),
    confusion: z.array(rawClaimSchema),
    clarification: z.array(rawClaimSchema),
  }).strict()),
  gaps: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
  }).strict()),
}).strict();

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
