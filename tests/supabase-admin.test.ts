import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseAdminFetch } from "@/lib/server/supabase";

function clockSkewResponse(method: "GET" | "HEAD") {
  return new Response(
    method === "GET" ? JSON.stringify({ code: "PGRST303", message: "JWT issued at future" }) : null,
    { status: 401, headers: { "proxy-status": "PostgREST; error=PGRST303" } },
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Supabase admin transport", () => {
  it.each(["GET", "HEAD"] as const)("retries one transient PostgREST clock-skew %s", async (method) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(clockSkewResponse(method))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = supabaseAdminFetch("https://example.supabase.co/rest/v1/sources", { method });
    await vi.runAllTimersAsync();

    expect((await request).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry writes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(clockSkewResponse("GET"));
    vi.stubGlobal("fetch", fetchMock);

    expect((await supabaseAdminFetch("https://example.supabase.co/rest/v1/sources", { method: "POST" })).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry unrelated authorization failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ code: "PGRST301", message: "JWT expired" }),
      { status: 401, headers: { "proxy-status": "PostgREST; error=PGRST301" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    expect((await supabaseAdminFetch("https://example.supabase.co/rest/v1/sources")).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
