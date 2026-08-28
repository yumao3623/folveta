import { describe, expect, it } from "vitest";
import { approximateTokenCount, planningBatches, planningBudget } from "@/lib/ai/generation-contract";

describe("generation planning token guard", () => {
  it("allows the single-call plan only when character and token guards both pass", () => {
    expect(planningBudget({
      evidence: "course material ".repeat(500),
      metadataCharacters: 500,
      modelContextTokens: 128_000,
      gatewayInputTokens: 80_000,
    }).singleCall).toBe(true);
    expect(planningBudget({
      evidence: "x".repeat(45_001),
      metadataCharacters: 500,
      modelContextTokens: 128_000,
      gatewayInputTokens: 80_000,
    }).singleCall).toBe(false);
    expect(planningBudget({
      evidence: "x".repeat(20_000),
      metadataCharacters: 500,
      modelContextTokens: 8_000,
      gatewayInputTokens: 8_000,
    }).singleCall).toBe(false);
  });

  it("batches every span without dropping or duplicating material", () => {
    const spans = Array.from({ length: 5 }, (_, index) => ({ id: `span-${index}`, text: "x".repeat(12_000) }));
    const batches = planningBatches({ spans, metadataCharacters: 100, modelContextTokens: 128_000, gatewayInputTokens: 80_000 });
    expect(batches.length).toBeGreaterThan(1);
    expect(batches.flat().map((span) => span.id)).toEqual(spans.map((span) => span.id));
    expect(batches.every((batch) => batch.reduce((sum, span) => sum + span.text.length, 0) <= 45_000)).toBe(true);
  });

  it("counts CJK input conservatively and rejects an individually unsafe span", () => {
    expect(approximateTokenCount("学习材料")).toBeGreaterThan(approximateTokenCount("study"));
    expect(() => planningBatches({
      spans: [{ id: "oversized", text: "学".repeat(20_000) }],
      metadataCharacters: 100,
      modelContextTokens: 8_000,
      gatewayInputTokens: 8_000,
    })).toThrow("GENERATION_SPAN_EXCEEDS_TOKEN_BUDGET");
  });
});
