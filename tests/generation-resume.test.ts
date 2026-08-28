import { describe, expect, it } from "vitest";
import { GENERATION_STEP_REQUEST_TIMEOUT_MS, checkpointMatches, type GenerationCheckpoint } from "@/lib/ai/pipeline";
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

  it("allows a saved active stage to continue while keeping terminal sessions unavailable", () => {
    expect(isGenerationClaimable("ready")).toBe(true);
    expect(isGenerationClaimable("failed_retryable")).toBe(true);
    expect(isGenerationClaimable("generating_guide")).toBe(true);
    expect(isGenerationClaimable("guide_ready")).toBe(false);
    expect(isGenerationClaimable("failed_terminal")).toBe(false);
  });

  it("keeps a legacy single-attempt continuation inside the Route Handler time budget", () => {
    expect(GENERATION_STEP_REQUEST_TIMEOUT_MS).toBeLessThan(300_000);
  });
});
