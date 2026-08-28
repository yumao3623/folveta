import { describe, expect, it } from "vitest";
import { isGenerationActive, isGenerationContinuationReady, isPersistedGenerationInProgress } from "@/components/generation-panel";

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

  it("restarts status polling only for a persisted active stage after refresh", () => {
    expect(isPersistedGenerationInProgress("merging_topics")).toBe(true);
    expect(isPersistedGenerationInProgress("failed_retryable")).toBe(false);
  });

  it("only resumes a persisted continuation after its database lease is free", () => {
    expect(isGenerationContinuationReady("generating_guide", false)).toBe(true);
    expect(isGenerationContinuationReady("generating_guide", true)).toBe(false);
    expect(isGenerationContinuationReady("failed_retryable", false)).toBe(false);
  });
});
