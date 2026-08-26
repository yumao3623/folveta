import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  libraryListOptionsSchema,
  parseKnowledgeSearchParams,
  searchOptionsSchema,
} from "@/lib/schemas/library-search";
import { toKnowledgeSearchResult } from "@/lib/server/knowledge-search";
import { toLibraryItem, type LibraryQueryRow } from "@/lib/server/library";

const libraryDal = readFileSync("lib/server/library.ts", "utf8");
const searchDal = readFileSync("lib/server/knowledge-search.ts", "utf8");
const profileDal = readFileSync("lib/server/profile.ts", "utf8");
const migration = readFileSync("supabase/migrations/202608260003_product_3c_library_search_profile.sql", "utf8");
const libraryPage = readFileSync("app/library/page.tsx", "utf8");
const searchPage = readFileSync("app/search/page.tsx", "utf8");
const profilePage = readFileSync("app/profile/page.tsx", "utf8");
const workspaceShell = readFileSync("components/workspace-shell.tsx", "utf8");

function libraryRow(overrides: Partial<LibraryQueryRow> = {}): LibraryQueryRow {
  return {
    id: "source-a",
    display_name: "Lecture 4.pdf",
    kind: "pdf",
    status: "ready",
    unit_count: 12,
    readable_unit_count: 11,
    created_at: "2030-01-02T00:00:00.000Z",
    preparation_sessions: {
      id: "session-a",
      archived_at: null,
      deleted_at: null,
      study_guides: [{ id: "guide-a", title: "Cell Biology", archived_at: null, deleted_at: null }],
    },
    ...overrides,
  };
}

describe("Library", () => {
  it("validates real file types, sorting, and bounded pagination", () => {
    expect(libraryListOptionsSchema.parse({ type: "pdf", sort: "name", page: "2", limit: "24" })).toEqual({ type: "pdf", sort: "name", page: 2, limit: 24 });
    expect(libraryListOptionsSchema.safeParse({ type: "docx", sort: "newest", page: 1, limit: 12 }).success).toBe(false);
    expect(libraryListOptionsSchema.safeParse({ type: "all", sort: "newest", page: 1, limit: 25 }).success).toBe(false);
  });

  it("maps source fields and preserves an archived Guide relationship", () => {
    const item = toLibraryItem(libraryRow({
      preparation_sessions: {
        id: "session-a",
        archived_at: "2030-01-03T00:00:00.000Z",
        deleted_at: null,
        study_guides: [{ id: "guide-a", title: "Cell Biology", archived_at: "2030-01-03T00:00:00.000Z", deleted_at: null }],
      },
    }));
    expect(item).toEqual(expect.objectContaining({ filename: "Lecture 4.pdf", kind: "pdf", unitCount: 12, readableUnitCount: 11 }));
    expect(item.relatedGuide).toEqual({ id: "guide-a", title: "Cell Biology", archived: true });
  });

  it("does not expose a deleted related Guide", () => {
    const item = toLibraryItem(libraryRow({
      preparation_sessions: {
        id: "session-a",
        archived_at: null,
        deleted_at: null,
        study_guides: [{ id: "guide-a", title: "Deleted", archived_at: null, deleted_at: "2030-01-04T00:00:00.000Z" }],
      },
    }));
    expect(item.relatedGuide).toBeNull();
  });

  it("filters at the database by owner and deletion state with one look-ahead page", () => {
    expect(libraryDal).toContain('.eq("preparation_sessions.owner_user_id", userId)');
    expect(libraryDal).toContain('.is("preparation_sessions.deleted_at", null)');
    expect(libraryDal).toContain(".range(offset, offset + options.limit)");
    expect(libraryDal).not.toMatch(/for\s*\([^)]*source[^)]*\)[\s\S]{0,180}from\("study_guides"\)/);
    expect(libraryPage).toContain("No source materials");
  });
});

describe("private knowledge search", () => {
  it("validates query length and pagination", () => {
    expect(parseKnowledgeSearchParams(new URLSearchParams("q=cell+membrane&page=2"))).toEqual({ q: "cell membrane", page: 2, limit: 12 });
    expect(searchOptionsSchema.safeParse({ q: "x", page: 1, limit: 12 }).success).toBe(false);
    expect(searchOptionsSchema.safeParse({ q: "x".repeat(101), page: 1, limit: 12 }).success).toBe(false);
    expect(searchOptionsSchema.safeParse({ q: "valid", page: 1, limit: 25 }).success).toBe(false);
  });

  it("builds real targets for Guide, Topic, and Source results", () => {
    const base = { guide_id: "guide-a", session_id: "session-a", source_id: null, title: "Cells", subtitle: "Biology", excerpt: null, rank: 2, total_count: 3 };
    expect(toKnowledgeSearchResult({ ...base, result_type: "guide", result_id: "guide-a" }).href).toBe("/api/guides/guide-a/reopen");
    expect(toKnowledgeSearchResult({ ...base, result_type: "topic", result_id: "cell membrane" }).href).toBe("/study/session-a#cell%20membrane");
    expect(toKnowledgeSearchResult({ ...base, result_type: "source", result_id: "source-a", source_id: "source-a" }).href).toBe("/api/guides/guide-a/reopen");
  });

  it("uses indexed server-side FTS with authenticated RLS ownership", () => {
    expect(searchDal).toContain('.rpc("search_owned_knowledge"');
    expect(migration).toContain("security invoker");
    expect(migration).toContain("session.owner_user_id = auth.uid()");
    expect(migration).toContain("session.archived_at is null");
    expect(migration).toContain("session.deleted_at is null");
    expect(migration).toContain("guide.deleted_at is null");
    expect(migration).toContain("source_spans_private_search_idx");
    expect(migration.match(/using gin/g)?.length).toBe(3);
    for (const type of ["guide", "topic", "source"]) expect(migration).toContain(`'${type}'::text as result_type`);
    expect(migration).toContain("grant execute on function public.search_owned_knowledge(text, integer, integer) to authenticated");
    expect(migration).toContain("limit least(greatest(result_limit, 1), 24)");
  });

  it("renders empty query, invalid query, no-results, and result states", () => {
    expect(searchPage).toContain("Search your workspace");
    expect(searchPage).toContain("validationMessage");
    expect(searchPage).toContain("No results");
    expect(searchPage).toContain("SearchResultRow");
  });
});

describe("Profile and workspace shell", () => {
  it("counts only owner-scoped non-deleted Guides and Sources in two parallel queries", () => {
    expect(profileDal).toContain("Promise.all");
    expect(profileDal.match(/\.eq\("preparation_sessions.owner_user_id", userId\)/g)?.length).toBe(2);
    expect(profileDal.match(/\.is\("preparation_sessions.deleted_at", null\)/g)?.length).toBe(2);
    expect(profilePage).toContain("user.created_at");
    expect(profilePage).toContain("user.email");
    expect(profilePage).toContain("action={signOut}");
  });

  it("exposes only implemented workspace destinations", () => {
    for (const path of ["/my-guides", "/library", "/search", "/profile"]) expect(workspaceShell).toContain(`href: "${path}"`);
    expect(workspaceShell).not.toContain("coming soon");
    expect(workspaceShell).not.toContain("disabled");
  });
});

describe("private read APIs", () => {
  it.each([
    ["library", "@/app/api/library/route", "@/lib/server/library", "listOwnedSources"],
    ["search", "@/app/api/search/route", "@/lib/server/knowledge-search", "searchOwnedKnowledge"],
  ])("rejects anonymous %s requests before the DAL runs", async (_name, routePath, dalPath, method) => {
    vi.resetModules();
    const dal = vi.fn();
    vi.doMock("@/lib/server/auth", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
    vi.doMock(dalPath, () => ({ [method]: dal }));
    const { GET } = await import(routePath);
    const response = await GET(new Request(`http://localhost/api/${_name}?q=cell`));
    expect(response.status).toBe(401);
    expect(dal).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/server/auth");
    vi.doUnmock(dalPath);
  });
});
