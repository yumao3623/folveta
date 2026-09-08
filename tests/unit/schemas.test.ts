import { describe, expect, it } from "vitest";
import { demoGuide } from "@/lib/fixtures/demo-guide";
import { groundedClaimSchema, guideSchema, prioritySchema } from "@/lib/schemas";

describe("Guide contracts", () => {
  it("accepts the complete fixture guide", () => {
    expect(guideSchema.parse(demoGuide).topics).toHaveLength(3);
  });

  it("allows only the three Phase 1 priority values", () => {
    expect(prioritySchema.safeParse("study_first").success).toBe(true);
    expect(prioritySchema.safeParse("study_next").success).toBe(true);
    expect(prioritySchema.safeParse("review_if_time").success).toBe(true);
    expect(prioritySchema.safeParse("high_probability").success).toBe(false);
  });

  it("rejects a positive factual claim without a source reference", () => {
    const result = groundedClaimSchema.safeParse({
      id: "unsupported-positive",
      text: "A positive factual statement.",
      support_status: "direct",
      source_references: [],
    });
    expect(result.success).toBe(false);
  });

  it("permits an explicit unsupported gap without an invented citation", () => {
    const result = groundedClaimSchema.safeParse({
      id: "gap",
      text: "The materials do not establish this relationship.",
      support_status: "unsupported_gap",
      source_references: [],
    });
    expect(result.success).toBe(true);
  });
});
