import { describe, expect, it } from "vitest";
import { isGenerationActive } from "@/components/generation-panel";

describe("GenerationPanel failure recovery", () => {
  it("does not keep the generate control busy after a persisted retryable failure", () => {
    expect(isGenerationActive("failed_retryable", false)).toBe(false);
  });

  it("does not keep the generate control busy after a persisted terminal failure", () => {
    expect(isGenerationActive("failed_terminal", false)).toBe(false);
  });

  it("keeps the control busy while an active generation stage is persisted", () => {
    expect(isGenerationActive("generating_guide", false)).toBe(true);
  });
});
