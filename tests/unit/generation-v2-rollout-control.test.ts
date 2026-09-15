import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isGenerationV2SchemaUnavailable } from "@/lib/ai/generation-v2-rollout";

const read = (path: string) => readFileSync(path, "utf8");
const generateRoute = read("app/api/sessions/[sessionId]/generate/route.ts");
const statusRoute = read("app/api/sessions/[sessionId]/status/route.ts");
const studyPage = read("app/study/[sessionId]/page.tsx");
const guidesDal = read("lib/server/guides.ts");
const envExample = read(".env.example");
const releaseSwitch = read("lib/ai/generation-v2-rollout.ts");

describe("Generation v2 rollout control", () => {
  it("uses one release switch for all new writes and leaves reads independent", () => {
    expect(generateRoute).toContain("if (isGenerationV2WriteEnabled())");
    expect(releaseSwitch).toContain("GENERATION_V2_RUNTIME_ENABLED");
    expect(generateRoute).not.toContain("GENERATION_V2_PRODUCT_ENABLED");
    expect(generateRoute).not.toContain("ROLLOUT_ALLOWLIST");
    expect(generateRoute).not.toContain("ROLLOUT_PERCENT");
    expect(statusRoute).toContain('.from("generation_v2_requests")');
    expect(statusRoute).toContain("isGenerationV2SchemaUnavailable");
    expect(statusRoute).not.toContain("isGenerationV2WriteEnabled");
    expect(studyPage).toContain('.from("generation_v2_requests")');
    expect(studyPage).not.toContain("GENERATION_V2_RUNTIME_ENABLED");
    expect(guidesDal).toContain('.from("generation_v2_guides")');
    expect(guidesDal).not.toContain("isGenerationV2WriteEnabled");
  });

  it("defaults to a disabled V2 release switch", () => {
    expect(envExample).toContain("GENERATION_V2_RUNTIME_ENABLED=false");
    expect(envExample).not.toContain("GENERATION_V2_PRODUCT_ENABLED");
    expect(envExample).not.toContain("GENERATION_V2_ROLLOUT_ALLOWLIST");
    expect(envExample).not.toContain("GENERATION_V2_ROLLOUT_PERCENT");
  });

  it("falls back when v2 tables are not installed or visible in schema cache", () => {
    expect(isGenerationV2SchemaUnavailable({ code: "42P01" })).toBe(true);
    expect(isGenerationV2SchemaUnavailable({ code: "PGRST205" })).toBe(true);
    expect(isGenerationV2SchemaUnavailable({ code: "42501" })).toBe(false);
  });
});
