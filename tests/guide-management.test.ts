import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  guideListOptionsSchema,
  guideMutationSchema,
  guideTitleSchema,
  parseGuideListSearchParams,
} from "@/lib/schemas/guide-management";
import { sessionAccessMode } from "@/lib/server/auth";

const dal = readFileSync("lib/server/guides.ts", "utf8");
const api = readFileSync("app/api/guides/[guideId]/route.ts", "utf8");
const reopenApi = readFileSync("app/api/guides/[guideId]/reopen/route.ts", "utf8");
const migration = readFileSync("supabase/migrations/202608260002_product_3b_guide_management.sql", "utf8");
const studyPage = readFileSync("app/study/[sessionId]/page.tsx", "utf8");

describe("Guide list ownership and performance", () => {
  it("filters every private list by the authenticated owner", () => {
    expect(dal).toContain('.eq("preparation_sessions.owner_user_id", userId)');
    expect(dal).toContain('.is("preparation_sessions.deleted_at", null)');
  });

  it("does not authorize a second user for the first user's aggregate", () => {
    const ownedSession = {
      owner_user_id: "user-a",
      access_token_hash: null,
      expires_at: null,
      deleted_at: null,
    };
    expect(sessionAccessMode(ownedSession, { userId: "user-a", tokenHash: null, now: new Date() })).toBe("authenticated");
    expect(sessionAccessMode(ownedSession, { userId: "user-b", tokenHash: null, now: new Date() })).toBeNull();
  });

  it("uses stable recent sorting led by last access", () => {
    const lastAccess = dal.indexOf('.order("last_accessed_at", { ascending: false })');
    const updated = dal.indexOf('.order("updated_at", { ascending: false })');
    const id = dal.indexOf('.order("id", { ascending: false })');
    expect(lastAccess).toBeGreaterThan(-1);
    expect(updated).toBeGreaterThan(lastAccess);
    expect(id).toBeGreaterThan(updated);
  });

  it("bounds pagination and fetches only one look-ahead row", () => {
    expect(guideListOptionsSchema.parse({ view: "active", page: "2", limit: "24" })).toEqual({ view: "active", page: 2, limit: 24 });
    expect(() => guideListOptionsSchema.parse({ view: "active", page: "1", limit: "25" })).toThrow();
    expect(dal).toContain(".range(offset, offset + options.limit)");
    expect(dal).toContain("rows.slice(0, options.limit)");
  });

  it("gets source counts in the list query without N+1 reads", () => {
    expect(dal).toContain("sources(count)");
    expect(dal).not.toMatch(/for\s*\([^)]*guide[^)]*\)[\s\S]{0,160}from\(\"sources\"\)/);
    expect(migration).toContain("create index if not exists sources_session_idx");
  });

  it("keeps archived Guides out of the default and Recent query", () => {
    expect(parseGuideListSearchParams(new URLSearchParams())).toEqual({ view: "active", page: 1, limit: 12 });
    expect(dal).toContain('.is("archived_at", null)');
    expect(dal).toContain('.is("preparation_sessions.archived_at", null)');
    expect(dal).toContain('{ view: "active", page: 1, limit }');
  });
});

describe("Guide management behavior", () => {
  it("reopens by stable Guide ID through an owner-authorized redirect and touches access time", () => {
    expect(reopenApi).toContain("requireAuthenticatedOwnedGuide(user.id, guideId)");
    expect(reopenApi).toContain("touchOwnedGuide(owned.guide)");
    expect(reopenApi).toContain("owned.guide.session_id");
  });

  it("trims a valid rename and limits it to 140 characters", () => {
    expect(guideTitleSchema.parse("  Cell Biology Review  ")).toBe("Cell Biology Review");
    expect(guideMutationSchema.parse({ action: "rename", title: "  Midterm Guide  " })).toEqual({ action: "rename", title: "Midterm Guide" });
  });

  it("rejects empty and overlong rename requests", () => {
    expect(guideTitleSchema.safeParse("   ").success).toBe(false);
    expect(guideTitleSchema.safeParse("x".repeat(141)).success).toBe(false);
    expect(api).toContain("INVALID_GUIDE_UPDATE");
  });

  it("renames only the normalized Guide title, not content or sources", () => {
    const renameStart = dal.indexOf("export async function renameOwnedGuide");
    const archiveStart = dal.indexOf("export async function setOwnedGuideArchived");
    const renameBlock = dal.slice(renameStart, archiveStart);
    expect(renameBlock).toContain('.from("study_guides")');
    expect(renameBlock).toContain(".update({ title, updated_at: updatedAt })");
    expect(renameBlock).not.toContain("guide_json");
    expect(renameBlock).not.toContain('.from("sources")');
    expect(studyPage).toContain("displayTitle={guideRow.title}");
  });

  it("archives and restores both existing lifecycle records", () => {
    expect(guideMutationSchema.parse({ action: "archive" })).toEqual({ action: "archive" });
    expect(guideMutationSchema.parse({ action: "restore" })).toEqual({ action: "restore" });
    expect(dal).toContain("setOwnedGuideArchived");
    expect(dal).toContain("priorGuideArchivedAt");
    expect(dal).toContain("priorSessionArchivedAt");
  });

  it("soft deletes with a delayed purge instead of physically deleting rows", () => {
    const deleteStart = dal.indexOf("export async function softDeleteOwnedGuide");
    const deleteBlock = dal.slice(deleteStart);
    expect(deleteBlock).toContain("deleted_at");
    expect(deleteBlock).toContain("purge_after");
    expect(deleteBlock).toContain("DELETE_RETENTION_DAYS");
    expect(deleteBlock).not.toContain(".delete()");
  });

  it("makes deleted Guides unavailable to reopen and existing workspace reads", () => {
    expect(dal).toContain('.is("deleted_at", null)');
    expect(studyPage).toContain('.is("deleted_at", null).maybeSingle()');
    expect(sessionAccessMode({
      owner_user_id: "user-a",
      access_token_hash: null,
      expires_at: null,
      deleted_at: "2030-01-01T00:00:00.000Z",
    }, { userId: "user-a", tokenHash: null, now: new Date() })).toBeNull();
  });

  it("requires authentication, same-origin mutation, and owner authorization", () => {
    expect(api).toContain("requireSameOrigin(request)");
    expect(api).toContain("if (!user) throw new AppError(\"AUTH_REQUIRED\"");
    expect(dal).toContain("requireAuthenticatedOwnedGuide(userId, guideId)");
    expect(dal).toContain('.eq("owner_user_id", userId)');
  });
});

describe("anonymous private list", () => {
  it("returns 401 before querying Guides when there is no account", async () => {
    vi.resetModules();
    vi.doMock("@/lib/server/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/server/guides", () => ({ listOwnedGuides: vi.fn() }));
    const { GET } = await import("@/app/api/guides/route");
    const response = await GET(new Request("http://localhost/api/guides"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.objectContaining({ code: "AUTH_REQUIRED" }) }));
    vi.doUnmock("@/lib/server/auth");
    vi.doUnmock("@/lib/server/guides");
  });
});
