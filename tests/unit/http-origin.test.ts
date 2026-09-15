import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppError, requireSameOrigin } from "@/lib/server/http";

describe("requireSameOrigin", () => {
  it("accepts an exact same-origin mutation", () => {
    const request = new Request("https://folveta.com/api/sessions", {
      method: "POST",
      headers: { origin: "https://folveta.com" },
    });

    expect(() => requireSameOrigin(request)).not.toThrow();
  });

  it.each([
    ["a missing Origin header", undefined],
    ["a cross-origin host", "https://example.com"],
    ["a different scheme", "http://folveta.com"],
    ["a different port", "https://folveta.com:444"],
    ["an opaque origin", "null"],
  ])("rejects %s", (_label, origin) => {
    const headers = origin ? { origin } : undefined;
    const request = new Request("https://folveta.com/api/sessions", { method: "POST", headers });

    expect(() => requireSameOrigin(request)).toThrowError(
      expect.objectContaining<Partial<AppError>>({ code: "INVALID_ORIGIN", status: 403 }),
    );
  });
});

describe("browser mutation origin coverage", () => {
  const browserMutationRoutes = [
    "app/api/account/route.ts",
    "app/api/auth/claim/route.ts",
    "app/api/guides/[guideId]/route.ts",
    "app/api/internal/generation-v2/route.ts",
    "app/api/sessions/route.ts",
    "app/api/sessions/[sessionId]/generate/route.ts",
    "app/api/sessions/[sessionId]/quick-check/route.ts",
    "app/api/sessions/[sessionId]/quick-check/submit/route.ts",
    "app/api/sessions/[sessionId]/sources/upload-url/route.ts",
    "app/api/sources/[sourceId]/parse/route.ts",
    "app/api/sources/[sourceId]/upload-failed/route.ts",
  ];

  it.each(browserMutationRoutes)("protects %s", (route) => {
    expect(readFileSync(route, "utf8")).toContain("requireSameOrigin(request)");
  });

  it.each([
    "app/api/internal/generation-reconcile/route.ts",
    "app/api/internal/retention/route.ts",
    "app/api/paddle/webhook/route.ts",
  ])("keeps signed service endpoint %s exempt", (route) => {
    expect(readFileSync(route, "utf8")).not.toContain("requireSameOrigin(request)");
  });
});
