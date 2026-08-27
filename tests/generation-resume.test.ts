import { describe, expect, it } from "vitest";
import { checkpointMatches, type GenerationCheckpoint } from "@/lib/ai/pipeline";
import { isGenerationClaimable } from "@/app/api/sessions/[sessionId]/generate/route";

const checkpoint: GenerationCheckpoint = {
  source_checksum: "source-a",
  prompt_version: "prompt-a",
  schema_version: "1.0",
  extracted_batch_keys: ["batch-a"],
  candidate_groups: [],
  merged_topics: [],
  raw_topics: [],
  verdicts: {},
};

describe("Guide generation resume and duplicate protection", () => {
  it("reuses only a checkpoint bound to the same source and contract versions", () => {
    expect(checkpointMatches(checkpoint, "source-a", "prompt-a", "1.0")).toBe(true);
    expect(checkpointMatches(checkpoint, "source-b", "prompt-a", "1.0")).toBe(false);
    expect(checkpointMatches(checkpoint, "source-a", "prompt-b", "1.0")).toBe(false);
    expect(checkpointMatches(checkpoint, "source-a", "prompt-a", "2.0")).toBe(false);
  });

  it("claims only idle or retryable sessions", () => {
    expect(isGenerationClaimable("ready")).toBe(true);
    expect(isGenerationClaimable("failed_retryable")).toBe(true);
    expect(isGenerationClaimable("generating_guide")).toBe(false);
    expect(isGenerationClaimable("guide_ready")).toBe(false);
    expect(isGenerationClaimable("failed_terminal")).toBe(false);
  });
});
