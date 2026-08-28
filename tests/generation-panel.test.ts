import { describe, expect, it } from "vitest";
import {
  commitGenerationSnapshot,
  generationFailureMessage,
  generationStatusLabel,
  isGenerationActive,
  type GenerationSnapshot,
} from "@/components/generation-panel";

const generation = (overrides: Partial<GenerationSnapshot> = {}): GenerationSnapshot => ({
  run_id: "run-1",
  status: "running",
  stage: "generating_guide",
  progress_percent: 60,
  failure_category: null,
  retry_allowed: false,
  support_id: null,
  ...overrides,
});

describe("GenerationPanel server-owned progress", () => {
  it("treats queued, running, and retrying logical runs as active", () => {
    expect(isGenerationActive("queued", false)).toBe(true);
    expect(isGenerationActive("running", false)).toBe(true);
    expect(isGenerationActive("retrying", false)).toBe(true);
    expect(isGenerationActive("failed", false)).toBe(false);
  });

  it("does not regress committed progress for the same logical run", () => {
    expect(commitGenerationSnapshot(generation(), generation({ progress_percent: 35 }))?.progress_percent).toBe(60);
  });

  it("resets progress when observing a different logical run", () => {
    expect(commitGenerationSnapshot(generation(), generation({ run_id: "run-2", progress_percent: 5 }))?.progress_percent).toBe(5);
  });

  it("uses fixed labels instead of provider or API text", () => {
    expect(generationStatusLabel(generation(), "ready")).toBe("Writing your Study Guide");
    expect(generationStatusLabel(generation({ status: "retrying", stage: "provider secret" }), "ready")).toBe("Restoring generation progress");
    expect(generationStatusLabel(generation({ stage: "provider secret" }), "ready")).toBe("Building your Study Guide");
  });

  it("uses fixed privacy-safe failure messages", () => {
    expect(generationFailureMessage("raw provider payload", true)).toBe("Generation could not finish this time. Your materials and completed work are saved.");
    expect(generationFailureMessage("raw provider payload", false)).toBe("Generation could not be completed with these materials.");
  });
});
