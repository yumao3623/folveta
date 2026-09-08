import { describe, expect, it } from "vitest";
import { GENERATION_STALE_AFTER_MS, isStaleGeneration } from "@/lib/ai/generation-recovery";

describe("generation stale recovery", () => {
  const now = Date.parse("2026-08-28T04:00:00.000Z");

  it("recovers an active generation that stopped making progress", () => {
    expect(isStaleGeneration("generating_guide", new Date(now - GENERATION_STALE_AFTER_MS - 1).toISOString(), now)).toBe(true);
  });

  it("does not recover an active generation with recent progress", () => {
    expect(isStaleGeneration("generating_guide", new Date(now - GENERATION_STALE_AFTER_MS).toISOString(), now)).toBe(false);
  });

  it("does not change a terminal state regardless of age", () => {
    expect(isStaleGeneration("guide_ready", "2020-01-01T00:00:00.000Z", now)).toBe(false);
  });
});
