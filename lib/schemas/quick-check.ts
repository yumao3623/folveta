import { z } from "zod";
import {
  groundedClaimSchema,
  guideSchema,
  sourceReferenceSchema,
  type Guide,
  type GroundedClaim,
  type SourceReference,
} from "@/lib/schemas/guide";

export const optionIdSchema = z.enum(["A", "B", "C", "D"]);

export const quickCheckSectionTypeSchema = z.enum([
  "concise_explanation",
  "key_concept",
  "definition",
  "process_relationship",
  "common_confusion",
]);

export const relatedGuideSectionSchema = z
  .object({
    section_type: quickCheckSectionTypeSchema,
    section_item_id: z.string().min(1),
    anchor: z.string().regex(/^topic-[a-z0-9-]+(?:-[a-z0-9-]+)*$/),
  })
  .strict();

export const mcqOptionSchema = z
  .object({
    id: optionIdSchema,
    text: z.string().trim().min(1),
  })
  .strict();

const mcqQuestionBaseSchema = z.object({
    id: z.string().min(1),
    topic_id: z.string().min(1),
    stem: z.string().trim().min(1),
    options: z.array(mcqOptionSchema).length(4),
    correct_option_id: optionIdSchema,
    explanation: z.array(groundedClaimSchema).min(1),
    source_refs: z.array(sourceReferenceSchema).min(1),
    related_section: relatedGuideSectionSchema,
    validation: z
      .object({
        status: z.literal("validated"),
        single_best_answer: z.literal(true),
        question_grounded: z.literal(true),
        answer_grounded: z.literal(true),
        explanation_grounded: z.literal(true),
      })
      .strict(),
  }).strict();

export const mcqQuestionSchema = mcqQuestionBaseSchema.superRefine((question, ctx) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (optionIds.size !== 4) {
      ctx.addIssue({
        code: "custom",
        message: "A Quick Check question must contain exactly one option for each immutable option ID.",
        path: ["options"],
      });
    }

    const normalizedOptions = question.options.map((option) => normalizeText(option.text));
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      ctx.addIssue({
        code: "custom",
        message: "Quick Check option text must be unique.",
        path: ["options"],
      });
    }

    if (!optionIds.has(question.correct_option_id)) {
      ctx.addIssue({
        code: "custom",
        message: "The correct option ID must identify one present option.",
        path: ["correct_option_id"],
      });
    }
  });

export const quickCheckSchema = z
  .object({
    schema_version: z.literal("1.0"),
    id: z.uuid(),
    guide_id: z.uuid(),
    guide_checksum: z.string().regex(/^[a-f0-9]{64}$/),
    requested_question_count: z.number().int().min(5).max(10),
    question_count: z.number().int().min(1).max(10),
    format: z.literal("mcq_only"),
    disclaimer: z.string().min(1),
    limited_sample: z.boolean(),
    questions: z.array(mcqQuestionSchema).min(1).max(10),
    generated_at: z.iso.datetime(),
  })
  .strict()
  .superRefine((quickCheck, ctx) => {
    if (quickCheck.question_count !== quickCheck.questions.length) {
      ctx.addIssue({
        code: "custom",
        message: "question_count must equal the number of persisted questions.",
        path: ["question_count"],
      });
    }
    if (quickCheck.limited_sample !== (quickCheck.question_count < quickCheck.requested_question_count)) {
      ctx.addIssue({
        code: "custom",
        message: "limited_sample must describe whether fewer than the requested questions survived validation.",
        path: ["limited_sample"],
      });
    }
    const ids = quickCheck.questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: "custom",
        message: "Quick Check question IDs must be unique.",
        path: ["questions"],
      });
    }
  });

export const takingQuestionSchema = mcqQuestionBaseSchema.omit({
  correct_option_id: true,
  explanation: true,
  source_refs: true,
  validation: true,
});

export const takingQuickCheckSchema = z.object({
  schema_version: z.literal("1.0"),
  id: z.uuid(),
  guide_id: z.uuid(),
  guide_checksum: z.string().regex(/^[a-f0-9]{64}$/),
  requested_question_count: z.number().int().min(5).max(10),
  question_count: z.number().int().min(1).max(10),
  format: z.literal("mcq_only"),
  disclaimer: z.string().min(1),
  limited_sample: z.boolean(),
  questions: z.array(takingQuestionSchema).min(1).max(10),
  generated_at: z.iso.datetime(),
}).strict().superRefine((quickCheck, ctx) => {
  if (quickCheck.question_count !== quickCheck.questions.length) {
    ctx.addIssue({
      code: "custom",
      message: "question_count must equal the number of taking questions.",
      path: ["question_count"],
    });
  }
});

export const selectedAnswerSchema = z
  .object({
    question_id: z.string().min(1),
    selected_option_id: optionIdSchema,
  })
  .strict();

export const understoodItemSchema = z
  .object({
    question_id: z.string().min(1),
    topic_id: z.string().min(1),
  })
  .strict();

export const wrongItemSchema = z
  .object({
    question_id: z.string().min(1),
    topic_id: z.string().min(1),
    selected_option_id: optionIdSchema,
    correct_option_id: optionIdSchema,
    related_section: relatedGuideSectionSchema,
  })
  .strict();

export const reviewTopicSchema = z
  .object({
    topic_id: z.string().min(1),
    wrong_question_count: z.number().int().positive(),
    label: z.enum(["review_this_topic", "one_gap_found"]),
    section_anchors: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const quickCheckResultSchema = z
  .object({
    correct_count: z.number().int().nonnegative(),
    scored_count: z.number().int().positive(),
    understood_items: z.array(understoodItemSchema),
    wrong_items: z.array(wrongItemSchema),
    review_topics: z.array(reviewTopicSchema),
    disclaimer: z.string().min(1),
  })
  .strict();

export const quickCheckAttemptSchema = z
  .object({
    id: z.uuid(),
    quick_check_id: z.uuid(),
    status: z.literal("submitted"),
    answers: z.array(selectedAnswerSchema).min(1).max(10),
    result: quickCheckResultSchema,
    submitted_at: z.iso.datetime(),
  })
  .strict();

export type OptionId = z.infer<typeof optionIdSchema>;
export type MCQOption = z.infer<typeof mcqOptionSchema>;
export type MCQQuestion = z.infer<typeof mcqQuestionSchema>;
export type QuickCheck = z.infer<typeof quickCheckSchema>;
export type TakingQuestion = z.infer<typeof takingQuestionSchema>;
export type TakingQuickCheck = z.infer<typeof takingQuickCheckSchema>;
export type SelectedAnswer = z.infer<typeof selectedAnswerSchema>;
export type QuickCheckResult = z.infer<typeof quickCheckResultSchema>;
export type QuickCheckAttempt = z.infer<typeof quickCheckAttemptSchema>;
export type RelatedGuideSection = z.infer<typeof relatedGuideSectionSchema>;
export type QuickCheckSectionType = z.infer<typeof quickCheckSectionTypeSchema>;

export type QuestionTarget = {
  id: string;
  topic_id: string;
  topic_title: string;
  section_type: QuickCheckSectionType;
  section_item_id: string;
  anchor: string;
  guide_text: string;
  source_refs: SourceReference[];
};

export class QuickCheckScoringError extends Error {}

export function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function anchorPart(value: string) {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "section";
}

export function guideSectionAnchor(
  topicId: string,
  sectionType?: QuickCheckSectionType,
  sectionItemId?: string,
) {
  const topic = `topic-${anchorPart(topicId)}`;
  if (!sectionType) return topic;
  const sectionNames: Record<QuickCheckSectionType, string> = {
    concise_explanation: "explanation",
    key_concept: "concept",
    definition: "definition",
    process_relationship: "process",
    common_confusion: "confusion",
  };
  if (sectionType === "concise_explanation") return `${topic}-${sectionNames[sectionType]}`;
  return `${topic}-${sectionNames[sectionType]}-${anchorPart(sectionItemId ?? "section")}`;
}

function tokenSet(value: string) {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 2));
}

export function stemsAreNearDuplicates(left: string, right: string) {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (normalizedLeft === normalizedRight) return true;
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union >= 0.8;
}

function directClaims(claims: GroundedClaim[]) {
  return claims.filter((claim) => claim.support_status === "direct" && claim.source_references.length > 0);
}

function targetFromClaims({
  topicId,
  topicTitle,
  sectionType,
  sectionItemId,
  anchor,
  label,
  claims,
}: {
  topicId: string;
  topicTitle: string;
  sectionType: QuickCheckSectionType;
  sectionItemId: string;
  anchor: string;
  label: string;
  claims: GroundedClaim[];
}): QuestionTarget | null {
  const supported = directClaims(claims);
  if (supported.length === 0) return null;
  const refs = [...new Map(
    supported.flatMap((claim) => claim.source_references).map((reference) => [reference.span_id, reference]),
  ).values()];
  if (refs.length === 0) return null;
  return {
    id: `${topicId}:${sectionType}:${sectionItemId}`,
    topic_id: topicId,
    topic_title: topicTitle,
    section_type: sectionType,
    section_item_id: sectionItemId,
    anchor,
    guide_text: `${label}\n${supported.map((claim) => claim.text).join("\n")}`,
    source_refs: refs,
  };
}

export function collectQuestionTargets(input: Guide): QuestionTarget[] {
  const guide = guideSchema.parse(input);
  const targets: QuestionTarget[] = [];
  for (const topic of guide.topics) {
    const explanationTarget = targetFromClaims({
      topicId: topic.id,
      topicTitle: topic.title,
      sectionType: "concise_explanation",
      sectionItemId: topic.id,
      anchor: guideSectionAnchor(topic.id, "concise_explanation", topic.id),
      label: "Concise explanation",
      claims: topic.explanation,
    });
    if (explanationTarget) targets.push(explanationTarget);

    for (const concept of topic.key_concepts) {
      const target = targetFromClaims({
        topicId: topic.id,
        topicTitle: topic.title,
        sectionType: "key_concept",
        sectionItemId: concept.id,
        anchor: guideSectionAnchor(topic.id, "key_concept", concept.id),
        label: `Key concept: ${concept.name}`,
        claims: concept.explanation,
      });
      if (target) targets.push(target);
    }

    for (const definition of topic.definitions) {
      const target = targetFromClaims({
        topicId: topic.id,
        topicTitle: topic.title,
        sectionType: "definition",
        sectionItemId: definition.id,
        anchor: guideSectionAnchor(topic.id, "definition", definition.id),
        label: `Definition: ${definition.term}`,
        claims: definition.definition,
      });
      if (target) targets.push(target);
    }

    for (const relationship of topic.processes_relationships) {
      const target = targetFromClaims({
        topicId: topic.id,
        topicTitle: topic.title,
        sectionType: "process_relationship",
        sectionItemId: relationship.id,
        anchor: guideSectionAnchor(topic.id, "process_relationship", relationship.id),
        label: "Process or relationship",
        claims: [relationship],
      });
      if (target) targets.push(target);
    }

    for (const confusion of topic.common_confusions) {
      const target = targetFromClaims({
        topicId: topic.id,
        topicTitle: topic.title,
        sectionType: "common_confusion",
        sectionItemId: confusion.id,
        anchor: guideSectionAnchor(topic.id, "common_confusion", confusion.id),
        label: "Common confusion and clarification",
        claims: [...confusion.confusion, ...confusion.clarification],
      });
      if (target) targets.push(target);
    }
  }
  return targets;
}

export function toTakingQuickCheck(quickCheck: QuickCheck): TakingQuickCheck {
  return takingQuickCheckSchema.parse({
    ...quickCheck,
    questions: quickCheck.questions.map((question) => ({
      id: question.id,
      topic_id: question.topic_id,
      stem: question.stem,
      options: question.options,
      related_section: question.related_section,
    })),
  });
}

export function scoreQuickCheck(input: QuickCheck, answerInput: SelectedAnswer[]): QuickCheckResult {
  const quickCheck = quickCheckSchema.parse(input);
  const answers = z.array(selectedAnswerSchema).parse(answerInput);
  const answerMap = new Map<string, OptionId>();
  for (const answer of answers) {
    if (answerMap.has(answer.question_id)) {
      throw new QuickCheckScoringError(`Question ${answer.question_id} was answered more than once.`);
    }
    answerMap.set(answer.question_id, answer.selected_option_id);
  }
  if (answerMap.size !== quickCheck.questions.length) {
    throw new QuickCheckScoringError("Every Quick Check question must be answered before submission.");
  }

  const understoodItems: Array<{ question_id: string; topic_id: string }> = [];
  const wrongItems: Array<{
    question_id: string;
    topic_id: string;
    selected_option_id: OptionId;
    correct_option_id: OptionId;
    related_section: RelatedGuideSection;
  }> = [];

  for (const question of quickCheck.questions) {
    const selected = answerMap.get(question.id);
    if (!selected || !question.options.some((option) => option.id === selected)) {
      throw new QuickCheckScoringError(`Question ${question.id} has a missing or invalid option selection.`);
    }
    if (selected === question.correct_option_id) {
      understoodItems.push({ question_id: question.id, topic_id: question.topic_id });
    } else {
      wrongItems.push({
        question_id: question.id,
        topic_id: question.topic_id,
        selected_option_id: selected,
        correct_option_id: question.correct_option_id,
        related_section: question.related_section,
      });
    }
  }

  const grouped = new Map<string, typeof wrongItems>();
  for (const item of wrongItems) {
    const current = grouped.get(item.topic_id) ?? [];
    current.push(item);
    grouped.set(item.topic_id, current);
  }
  const reviewTopics = [...grouped.entries()].map(([topicId, items]) => ({
    topic_id: topicId,
    wrong_question_count: items.length,
    label: items.length === 1 ? "one_gap_found" as const : "review_this_topic" as const,
    section_anchors: [...new Set(items.map((item) => item.related_section.anchor))],
  }));

  return quickCheckResultSchema.parse({
    correct_count: understoodItems.length,
    scored_count: quickCheck.questions.length,
    understood_items: understoodItems,
    wrong_items: wrongItems,
    review_topics: reviewTopics,
    disclaimer: "This result reflects the sampled questions, not complete mastery or exam readiness.",
  });
}
