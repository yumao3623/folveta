import { z } from "zod";
import { locatorKindSchema } from "@/lib/schemas/source";

export const prioritySchema = z.enum([
  "study_first",
  "study_next",
  "review_if_time",
]);

export const supportStatusSchema = z.enum([
  "direct",
  "partial",
  "conflict",
  "unsupported_gap",
]);

export const sourceReferenceSchema = z
  .object({
    span_id: z.string().min(12),
    source_id: z.uuid(),
    source_name: z.string().min(1),
    locator: z
      .object({
        kind: locatorKindSchema,
        number: z.number().int().positive(),
      })
      .strict(),
    excerpt: z.string().min(1),
  })
  .strict();

export const groundedClaimSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    support_status: supportStatusSchema,
    source_references: z.array(sourceReferenceSchema),
  })
  .strict()
  .superRefine((claim, ctx) => {
    if (
      claim.support_status !== "unsupported_gap" &&
      claim.source_references.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Supported claims require at least one source reference.",
        path: ["source_references"],
      });
    }
  });

export const guideTopicSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    priority: prioritySchema,
    focus_reason: z.string().min(1),
    explanation: z.array(groundedClaimSchema),
    key_concepts: z.array(
      z
        .object({
          id: z.string().min(1),
          name: z.string().min(1),
          explanation: z.array(groundedClaimSchema),
        })
        .strict(),
    ),
    definitions: z.array(
      z
        .object({
          id: z.string().min(1),
          term: z.string().min(1),
          definition: z.array(groundedClaimSchema),
        })
        .strict(),
    ),
    processes_relationships: z.array(groundedClaimSchema),
    common_confusions: z.array(
      z
        .object({
          id: z.string().min(1),
          confusion: z.array(groundedClaimSchema),
          clarification: z.array(groundedClaimSchema),
        })
        .strict(),
    ),
    gaps: z.array(groundedClaimSchema),
    source_references: z.array(sourceReferenceSchema),
  })
  .strict();

export const guideIssueSchema = z
  .object({
    source_id: z.uuid().nullable(),
    source_name: z.string().nullable(),
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .strict();

export const guideSchema = z
  .object({
    schema_version: z.literal("1.0"),
    id: z.uuid(),
    session_id: z.uuid(),
    title: z.string().min(1),
    based_on_uploaded_materials: z.literal(true),
    source_count: z.number().int().positive(),
    priority_method_summary: z.string().min(1),
    generation_status: z.enum(["ready", "ready_with_warnings"]),
    source_issues: z.array(guideIssueSchema),
    topics: z.array(guideTopicSchema).min(1),
    overall_gaps: z.array(groundedClaimSchema),
    generated_at: z.iso.datetime(),
  })
  .strict()
  .superRefine((guide, ctx) => {
    const topicIds = new Set<string>();
    const claimIds = new Set<string>();
    const references = new Map<string, string>();
    const registerClaim = (claim: z.infer<typeof groundedClaimSchema>, path: Array<string | number>) => {
      if (claimIds.has(claim.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate claim ID: ${claim.id}`, path });
      }
      claimIds.add(claim.id);
      for (const reference of claim.source_references) {
        const signature = `${reference.source_id}:${reference.locator.kind}:${reference.locator.number}:${reference.excerpt}`;
        const prior = references.get(reference.span_id);
        if (prior && prior !== signature) {
          ctx.addIssue({ code: "custom", message: `Span ${reference.span_id} resolves inconsistently.`, path });
        }
        references.set(reference.span_id, signature);
      }
    };

    guide.topics.forEach((topic, topicIndex) => {
      if (topicIds.has(topic.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate topic ID: ${topic.id}`, path: ["topics", topicIndex, "id"] });
      }
      topicIds.add(topic.id);
      const topicReferenceIds = new Set(topic.source_references.map((reference) => reference.span_id));
      const topicClaims = [
        ...topic.explanation,
        ...topic.key_concepts.flatMap((item) => item.explanation),
        ...topic.definitions.flatMap((item) => item.definition),
        ...topic.processes_relationships,
        ...topic.common_confusions.flatMap((item) => [...item.confusion, ...item.clarification]),
        ...topic.gaps,
      ];
      topicClaims.forEach((claim, claimIndex) => {
        registerClaim(claim, ["topics", topicIndex, "claims", claimIndex]);
        for (const reference of claim.source_references) {
          if (!topicReferenceIds.has(reference.span_id)) {
            ctx.addIssue({ code: "custom", message: `Claim reference ${reference.span_id} is missing from the topic reference index.`, path: ["topics", topicIndex, "source_references"] });
          }
        }
      });
      topic.source_references.forEach((reference, referenceIndex) => {
        const signature = `${reference.source_id}:${reference.locator.kind}:${reference.locator.number}:${reference.excerpt}`;
        const prior = references.get(reference.span_id);
        if (prior && prior !== signature) {
          ctx.addIssue({ code: "custom", message: `Span ${reference.span_id} resolves inconsistently.`, path: ["topics", topicIndex, "source_references", referenceIndex] });
        }
        references.set(reference.span_id, signature);
      });
    });
    guide.overall_gaps.forEach((claim, index) => registerClaim(claim, ["overall_gaps", index]));
  });

export type Priority = z.infer<typeof prioritySchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type GroundedClaim = z.infer<typeof groundedClaimSchema>;
export type GuideTopic = z.infer<typeof guideTopicSchema>;
export type Guide = z.infer<typeof guideSchema>;
