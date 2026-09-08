import { describe, expect, it } from "vitest";
import { GENERATION_LEASE_MS, isGenerationLeaseActive } from "@/lib/ai/generation-lease";
import { isStaleGeneration } from "@/lib/ai/generation-recovery";

describe("generation continuation lease", () => {
  const now = Date.parse("2026-08-28T04:00:00.000Z");

  it("blocks a duplicate continuation while its database lease is live", () => {
    expect(isGenerationLeaseActive(new Date(now + GENERATION_LEASE_MS).toISOString(), now)).toBe(true);
  });

  it("allows recovery after lease expiry without treating a live request as stalled", () => {
    const staleUpdatedAt = new Date(now - 7 * 60_000).toISOString();
    expect(isGenerationLeaseActive(new Date(now - 1).toISOString(), now)).toBe(false);
    expect(isStaleGeneration("generating_guide", staleUpdatedAt, now, true)).toBe(false);
    expect(isStaleGeneration("generating_guide", staleUpdatedAt, now, false)).toBe(true);
  });
});
