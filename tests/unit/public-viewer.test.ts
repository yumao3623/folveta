import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BILLING_PLANS } from "@/lib/billing/config";
import { AppError } from "@/lib/server/http";
import { PUBLIC_PAGE_PATHS } from "@/lib/site";

const mocks = vi.hoisted(() => ({ user: vi.fn(), limits: vi.fn(), client: vi.fn(), validate: vi.fn() }));
vi.mock("@/lib/server/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/server/billing", () => ({ getBillingLimitsForUser: mocks.limits }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.client }));

import { GET } from "@/app/api/viewer/route";
import { proxy } from "@/proxy";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockReturnValue({ auth: { getUser: mocks.validate } });
  mocks.validate.mockResolvedValue({ data: { user: null }, error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("public shell / private viewer boundary", () => {
  it("returns anonymous limits without storing a reusable identity response", async () => {
    mocks.user.mockResolvedValue(null);
    mocks.limits.mockResolvedValue(BILLING_PLANS.free);
    const response = await GET();
    expect(await response.json()).toEqual({ user: null, limits: BILLING_PLANS.free });
    expect(mocks.limits).toHaveBeenCalledWith(null);
    expect(response.headers.get("cache-control")).toContain("private, no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("uses verified ownership for Pro limits and only exposes required identity fields", async () => {
    mocks.user.mockResolvedValue({ id: "owner-a", email: "student@example.test", app_metadata: { private: true }, access_token: "never-public" });
    mocks.limits.mockResolvedValue(BILLING_PLANS.pro);
    const response = await GET();
    expect(mocks.limits).toHaveBeenCalledWith("owner-a");
    expect(await response.json()).toEqual({ user: { id: "owner-a", email: "student@example.test" }, limits: BILLING_PLANS.pro });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("fails closed and prevents caching when auth or billing is unavailable", async () => {
    mocks.user.mockRejectedValue(new AppError("AUTH_UNAVAILABLE", "Try again", 503));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).user).toBeUndefined();
    expect(mocks.limits).not.toHaveBeenCalled();
  });

  it.each(PUBLIC_PAGE_PATHS)("does not refresh cookies on cacheable public HTML: %s", async (pathname) => {
    const response = await proxy(new NextRequest(`https://folveta.com${pathname}`, { headers: { cookie: "sb-example-auth-token=expired" } }));
    expect(mocks.client).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("still validates and clears a revoked session on private requests", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
    mocks.validate.mockResolvedValue({ error: { code: "refresh_token_not_found" } });
    const response = await proxy(new NextRequest("https://folveta.com/api/viewer", { headers: { cookie: "sb-example-auth-token=revoked" } }));
    expect(mocks.validate).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toContain("sb-example-auth-token=;");
  });
});
