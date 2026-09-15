import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("supabase/migrations/20260909154815_generation_v2_product_reads.sql", "utf8");
const quickCheckRoute = readFileSync("app/api/sessions/[sessionId]/quick-check/route.ts", "utf8");
const quickCheckPage = readFileSync("app/study/[sessionId]/quick-check/page.tsx", "utf8");
const resultPage = readFileSync("app/study/[sessionId]/quick-check/[attemptId]/result/page.tsx", "utf8");
const workspace = readFileSync("components/v2-guide-workspace.tsx", "utf8");

describe("Generation v2 product reads", () => {
  it("keeps exactly one relational Guide identity for every Quick Check", () => {
    expect(migration).toContain("alter column guide_id drop not null");
    expect(migration).toContain("generation_v2_guide_id uuid");
    expect(migration).toContain("quick_checks_generation_v2_guide_id_fkey");
    expect(migration).toContain("(guide_id is not null) <> (generation_v2_guide_id is not null)");
  });

  it("uses the same dual-read adapter for Quick Check creation, display, and results", () => {
    expect(quickCheckRoute).toContain("readLatestQuickCheckGuide");
    expect(quickCheckPage).toContain("readLatestQuickCheckGuide");
    expect(resultPage).toContain("readQuickCheckGuide");
    expect(resultPage).toContain("generation_v2_guide_id");
  });

  it("exposes a V2 Quick Check entry and stable review anchors", () => {
    expect(workspace).toContain("Start Quick Check");
    expect(workspace).toContain("guideSectionAnchor(section.id");
    expect(workspace).toContain("scroll-mt-28");
    expect(workspace).toContain("Key concepts");
    expect(workspace).toContain("Practice prompts");
  });
});
