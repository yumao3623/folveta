import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isInvalidAuthSessionError } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/auth-redirect";
import { sessionAccessMode } from "@/lib/server/auth";
import { retentionRequestAuthorized } from "@/lib/server/retention";

const activeAnonymous = {
  owner_user_id: null,
  access_token_hash: "token-hash",
  expires_at: "2030-01-02T00:00:00.000Z",
  deleted_at: null,
};

describe("workspace ownership", () => {
  it("allows an active anonymous owner and rejects another cookie", () => {
    expect(sessionAccessMode(activeAnonymous, {
      userId: null,
      tokenHash: "token-hash",
      now: new Date("2030-01-01T00:00:00.000Z"),
    })).toBe("anonymous");
    expect(sessionAccessMode(activeAnonymous, {
      userId: null,
      tokenHash: "wrong-token",
      now: new Date("2030-01-01T00:00:00.000Z"),
    })).toBeNull();
  });

  it("rejects expired and deleted anonymous sessions", () => {
    expect(sessionAccessMode(activeAnonymous, {
      userId: null,
      tokenHash: "token-hash",
      now: new Date("2030-01-03T00:00:00.000Z"),
    })).toBeNull();
    expect(sessionAccessMode({ ...activeAnonymous, deleted_at: "2030-01-01T00:00:00.000Z" }, {
      userId: null,
      tokenHash: "token-hash",
      now: new Date("2030-01-01T00:00:00.000Z"),
    })).toBeNull();
  });

  it("allows only the authenticated owner after claim", () => {
    const claimed = {
      owner_user_id: "user-a",
      access_token_hash: null,
      expires_at: null,
      deleted_at: null,
    };
    expect(sessionAccessMode(claimed, { userId: "user-a", tokenHash: null, now: new Date() })).toBe("authenticated");
    expect(sessionAccessMode(claimed, { userId: "user-b", tokenHash: "token-hash", now: new Date() })).toBeNull();
    expect(sessionAccessMode(claimed, { userId: null, tokenHash: "token-hash", now: new Date() })).toBeNull();
  });
});

describe("auth and persistence contracts", () => {
  const migration = readFileSync("supabase/migrations/202608260001_product_3a_auth_persistence.sql", "utf8");
  const pipeline = readFileSync("lib/ai/pipeline.ts", "utf8");
  const generateRoute = readFileSync("app/api/sessions/[sessionId]/generate/route.ts", "utf8");
  const parseRoute = readFileSync("app/api/sources/[sourceId]/parse/route.ts", "utf8");

  it("claims only the current authenticated user's unexpired anonymous token once", () => {
    expect(migration).toContain("auth.uid() is null");
    expect(migration).toContain("where access_token_hash = token_hash");
    expect(migration).toContain("and owner_user_id is null");
    expect(migration).toContain("and expires_at > now()");
    expect(migration).toContain("access_token_hash = null");
    expect(migration).toContain("owner_user_id = auth.uid()");
  });

  it("defines owner-scoped RLS for every private aggregate table", () => {
    for (const table of [
      "preparation_sessions",
      "sources",
      "source_units",
      "source_spans",
      "generation_runs",
      "study_guides",
      "quick_checks",
      "quick_check_attempts",
    ]) {
      expect(migration).toContain(`on public.${table} for select to authenticated`);
    }
    expect(migration).toContain("session.owner_user_id = (select auth.uid())");
    expect(migration).not.toContain("for delete to authenticated");
    expect(migration).not.toContain("for update to authenticated");
  });

  it("does not mutate guessed sessions or sources after authorization fails", () => {
    expect(generateRoute).toContain("if (authorized) {");
    expect(parseRoute).toContain("if (authorized) await failSource");
  });

  it("preserves the Guide ID when regenerating persistent content", () => {
    expect(pipeline).toContain("const guideId = existingGuide?.id ?? randomUUID()");
    expect(migration).toContain("add column if not exists last_accessed_at");
    expect(migration).toContain("add column if not exists title text");
  });

  it("rejects external redirect targets", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("https://example.com")).toBe("/");
    expect(safeNextPath("//example.com")).toBe("/");
    expect(safeNextPath("/\\example.com")).toBe("/");
    expect(safeNextPath("/%5C%5Cexample.com")).toBe("/");
  });

  it("treats expired, revoked, and deleted-user credentials as anonymous sessions", () => {
    expect(isInvalidAuthSessionError({ name: "AuthSessionMissingError" })).toBe(true);
    expect(isInvalidAuthSessionError({ code: "jwt_expired" })).toBe(true);
    expect(isInvalidAuthSessionError({ code: "refresh_token_not_found" })).toBe(true);
    expect(isInvalidAuthSessionError({ code: "user_not_found" })).toBe(true);
    expect(isInvalidAuthSessionError({ code: "unexpected_failure" })).toBe(false);
  });

  it("requires an exact retention job bearer secret", () => {
    expect(retentionRequestAuthorized("Bearer secret", "secret")).toBe(true);
    expect(retentionRequestAuthorized("Bearer wrong", "secret")).toBe(false);
    expect(retentionRequestAuthorized(null, undefined)).toBe(false);
  });
});
