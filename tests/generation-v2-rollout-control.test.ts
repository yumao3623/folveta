import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { generationV2RolloutMatches, isGenerationV2SchemaUnavailable } from "@/lib/ai/generation-v2-rollout";

const read = (path: string) => readFileSync(path, "utf8");
const generateRoute = read("app/api/sessions/[sessionId]/generate/route.ts");
const statusRoute = read("app/api/sessions/[sessionId]/status/route.ts");
const studyPage = read("app/study/[sessionId]/page.tsx");
const guidesDal = read("lib/server/guides.ts");
const envExample = read(".env.example");

describe("Generation v2 rollout control", () => {
  it("matches explicit authenticated and anonymous cohorts without enabling everyone", () => {
    const authenticated = { id: "session-a", owner_user_id: "user-a" };
    const anonymous = { id: "session-b", owner_user_id: null };

    expect(generationV2RolloutMatches(authenticated, "")).toBe(false);
    expect(generationV2RolloutMatches(authenticated, "user-a")).toBe(true);
    expect(generationV2RolloutMatches(authenticated, "session-a")).toBe(true);
    expect(generationV2RolloutMatches(anonymous, "session-b")).toBe(true);
    expect(generationV2RolloutMatches(anonymous, "user-a")).toBe(false);
    expect(generationV2RolloutMatches(authenticated, " user-b, user-a ")).toBe(true);
    expect(generationV2RolloutMatches(anonymous, "*")).toBe(true);
  });

  it("keeps rollout admission on writes and leaves reads independent", () => {
    expect(generateRoute).toContain("v2RuntimeAndProductEnabled && isGenerationV2WriteEnabled(session)");
    expect(generateRoute).toContain("GENERATION_V2_RUNTIME_ENABLED");
    expect(generateRoute).toContain("GENERATION_V2_PRODUCT_ENABLED");
    expect(statusRoute).toContain('.from("generation_v2_requests")');
    expect(statusRoute).toContain("isGenerationV2SchemaUnavailable");
    expect(statusRoute).not.toContain("isGenerationV2WriteEnabled");
    expect(studyPage).toContain('.from("generation_v2_requests")');
    expect(studyPage).not.toContain("GENERATION_V2_RUNTIME_ENABLED");
    expect(studyPage).not.toContain("GENERATION_V2_PRODUCT_ENABLED");
    expect(guidesDal).toContain('.from("generation_v2_guides")');
    expect(guidesDal).not.toContain("isGenerationV2WriteEnabled");
  });

  it("defaults to v1-safe rollout configuration", () => {
    expect(envExample).toContain("GENERATION_V2_RUNTIME_ENABLED=false");
    expect(envExample).toContain("GENERATION_V2_PRODUCT_ENABLED=false");
    expect(envExample).toContain("GENERATION_V2_ROLLOUT_ALLOWLIST=");
  });

  it("falls back when v2 tables are not installed or visible in schema cache", () => {
    expect(isGenerationV2SchemaUnavailable({ code: "42P01" })).toBe(true);
    expect(isGenerationV2SchemaUnavailable({ code: "PGRST205" })).toBe(true);
    expect(isGenerationV2SchemaUnavailable({ code: "42501" })).toBe(false);
  });
});
