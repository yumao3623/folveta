import { describe, expect, it } from "vitest";
import { validateQuickCheckCandidates } from "@/lib/ai/quick-check";
import type { QuestionVerdicts, RawQuickCheckCandidate } from "@/lib/ai/schemas";
import { demoGuide } from "@/lib/fixtures/demo-guide";
import { demoQuickCheck } from "@/lib/fixtures/demo-quick-check";
import {
  collectQuestionTargets,
  QuickCheckScoringError,
  quickCheckSchema,
  scoreQuickCheck,
  stemsAreNearDuplicates,
  toTakingQuickCheck,
} from "@/lib/schemas";

const targets = collectQuestionTargets(demoGuide);
const target = targets.find((item) => item.topic_id === "cellular-respiration")!;

function candidate(overrides: Partial<RawQuickCheckCandidate> = {}): RawQuickCheckCandidate {
  return {
    candidate_id: "candidate-1",
    target_id: target.id,
    topic_id: target.topic_id,
    cognitive_intent: "relationship_or_process",
    stem: "What directly powers ATP synthase according to the supplied evidence?",
    options: [
      { id: "A", text: "Proton flow down the electrochemical gradient" },
      { id: "B", text: "Oxygen binding directly to ADP" },
      { id: "C", text: "NAD+ moving through ATP synthase" },
      { id: "D", text: "A fixed ATP yield across every cell" },
    ],
    correct_option_id: "A",
    explanation: "Proton flow down the gradient through ATP synthase is coupled to ATP production.",
    source_span_ids: [target.source_refs[0].span_id],
    ...overrides,
  };
}

function verdict(candidateId = "candidate-1", overrides: Partial<QuestionVerdicts["verdicts"][number]> = {}): QuestionVerdicts["verdicts"][number] {
  return {
    candidate_id: candidateId,
    correct_option_id: "A",
    question_grounded: true,
    answer_grounded: true,
    explanation_grounded: true,
    single_best_answer: true,
    reason: "The evidence directly supports one answer.",
    ...overrides,
  };
}

describe("Quick Check contracts and filtering", () => {
  it("accepts the complete five-question fixture", () => {
    expect(quickCheckSchema.parse(demoQuickCheck).question_count).toBe(5);
  });

  it("removes answer keys and explanations from the taking payload", () => {
    const taking = toTakingQuickCheck(demoQuickCheck);
    expect(taking.questions[0]).not.toHaveProperty("correct_option_id");
    expect(taking.questions[0]).not.toHaveProperty("explanation");
    expect(taking.questions[0]).not.toHaveProperty("source_refs");
  });

  it("collects only directly supported Guide targets with stable anchors", () => {
    expect(targets.length).toBeGreaterThanOrEqual(5);
    expect(targets.every((item) => item.source_refs.length > 0)).toBe(true);
    expect(targets.every((item) => item.anchor.startsWith(`topic-${item.topic_id}`))).toBe(true);
  });

  it("keeps only candidates that pass structural, evidence, topic, and single-answer checks", () => {
    const invalidTopic = candidate({ candidate_id: "bad-topic", topic_id: "missing-topic" });
    const invalidEvidence = candidate({ candidate_id: "bad-evidence", source_span_ids: ["span-not-supplied"] });
    const ambiguous = candidate({ candidate_id: "ambiguous", stem: "Which statement is best supported?" });
    const result = validateQuickCheckCandidates({
      candidates: [candidate(), invalidTopic, invalidEvidence, ambiguous],
      verdicts: [
        verdict(),
        verdict("bad-topic"),
        verdict("bad-evidence"),
        verdict("ambiguous", { single_best_answer: false, reason: "Two options are defensible." }),
      ],
      targets,
      requestedCount: 5,
    });
    expect(result.selected.map((item) => item.candidate_id)).toEqual(["candidate-1"]);
    expect(result.rejections).toHaveLength(3);
  });

  it("detects exact and near-duplicate stems", () => {
    expect(stemsAreNearDuplicates("How does ATP synthase use the proton gradient?", "How does ATP synthase use a proton gradient?")).toBe(true);
    expect(stemsAreNearDuplicates("What is chemiosmosis?", "Why does fermentation regenerate NAD+?")).toBe(false);
  });
});

describe("deterministic option-ID scoring", () => {
  it("scores by immutable option ID and groups only wrong topics", () => {
    const answers = demoQuickCheck.questions.map((question, index) => ({
      question_id: question.id,
      selected_option_id: index === 0 ? "A" as const : question.correct_option_id,
    }));
    const result = scoreQuickCheck(demoQuickCheck, answers);
    expect(result.correct_count).toBe(4);
    expect(result.scored_count).toBe(5);
    expect(result.wrong_items).toHaveLength(1);
    expect(result.review_topics).toEqual([expect.objectContaining({
      topic_id: "cellular-respiration",
      wrong_question_count: 1,
      label: "one_gap_found",
    })]);
  });

  it("does not infer mastery or evaluate untested topics when every sampled answer is correct", () => {
    const result = scoreQuickCheck(demoQuickCheck, demoQuickCheck.questions.map((question) => ({
      question_id: question.id,
      selected_option_id: question.correct_option_id,
    })));
    expect(result.correct_count).toBe(5);
    expect(result.wrong_items).toEqual([]);
    expect(result.review_topics).toEqual([]);
    expect(result.disclaimer.toLowerCase()).not.toContain("mastered");
  });

  it("rejects incomplete submissions before scoring", () => {
    expect(() => scoreQuickCheck(demoQuickCheck, [{
      question_id: demoQuickCheck.questions[0].id,
      selected_option_id: demoQuickCheck.questions[0].correct_option_id,
    }])).toThrow(QuickCheckScoringError);
  });
});
