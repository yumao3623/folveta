import type { LibraryListOptions } from "@/lib/schemas/library-search";
import { LIBRARY_DEFAULT_LIMIT } from "@/lib/schemas/library-search";
import type { Database } from "@/lib/server/database.types";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { isGenerationV2SchemaUnavailable } from "@/lib/ai/generation-v2-rollout";

type SourceRow = Database["public"]["Tables"]["sources"]["Row"];
type SessionRow = Database["public"]["Tables"]["preparation_sessions"]["Row"];
type GuideRow = Database["public"]["Tables"]["study_guides"]["Row"];
type V2GuideRow = Database["public"]["Tables"]["generation_v2_guides"]["Row"];

export type LibraryQueryRow = Pick<SourceRow, "id" | "display_name" | "kind" | "status" | "unit_count" | "readable_unit_count" | "created_at"> & {
  preparation_sessions: Pick<SessionRow, "id" | "archived_at" | "deleted_at"> & {
    study_guides:
      | Pick<GuideRow, "id" | "title" | "archived_at" | "deleted_at">
      | Array<Pick<GuideRow, "id" | "title" | "archived_at" | "deleted_at">>
      | null;
  };
};

export type LibraryItem = {
  id: string;
  filename: string;
  kind: "pdf" | "ppt" | "pptx" | "doc" | "docx" | "xls" | "xlsx" | "image";
  status: string;
  unitCount: number;
  readableUnitCount: number;
  createdAt: string;
  sessionId: string;
  relatedGuide: { id: string; title: string; archived: boolean } | null;
};

type V2LibraryGuideRow = Pick<V2GuideRow, "id" | "session_id" | "created_at"> & {
  preparation_sessions: Pick<SessionRow, "title" | "archived_at" | "deleted_at">;
  generation_v2_requests: { status: string } | Array<{ status: string }>;
};

export type LibraryListResult = {
  sources: LibraryItem[];
  page: number;
  limit: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export function toLibraryItem(row: LibraryQueryRow): LibraryItem {
  const relationship = row.preparation_sessions.study_guides;
  const guides = Array.isArray(relationship) ? relationship : relationship ? [relationship] : [];
  const guide = guides.find((candidate) => !candidate.deleted_at) ?? null;
  return {
    id: row.id,
    filename: row.display_name,
    kind: row.kind,
    status: row.status,
    unitCount: row.unit_count,
    readableUnitCount: row.readable_unit_count,
    createdAt: row.created_at,
    sessionId: row.preparation_sessions.id,
    relatedGuide: guide ? {
      id: guide.id,
      title: guide.title,
      archived: Boolean(guide.archived_at || row.preparation_sessions.archived_at),
    } : null,
  };
}

export async function listOwnedSources(
  userId: string,
  options: LibraryListOptions = { type: "all", sort: "newest", page: 1, limit: LIBRARY_DEFAULT_LIMIT },
): Promise<LibraryListResult> {
  const offset = (options.page - 1) * options.limit;
  let query = getSupabaseAdmin()
    .from("sources")
    .select(`
      id,
      display_name,
      kind,
      status,
      unit_count,
      readable_unit_count,
      created_at,
      preparation_sessions!inner(
        id,
        owner_user_id,
        archived_at,
        deleted_at,
        study_guides(id, title, archived_at, deleted_at)
      )
    `)
    .eq("preparation_sessions.owner_user_id", userId)
    .is("preparation_sessions.deleted_at", null);

  if (options.type !== "all") query = query.eq("kind", options.type);

  if (options.sort === "name") {
    query = query.order("display_name", { ascending: true }).order("id", { ascending: true });
  } else {
    const ascending = options.sort === "oldest";
    query = query.order("created_at", { ascending }).order("id", { ascending });
  }

  const { data, error } = await query.range(offset, offset + options.limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as LibraryQueryRow[];
  const items = rows.slice(0, options.limit).map(toLibraryItem);
  const sessionIds = [...new Set(items.map((item) => item.sessionId))];
  if (sessionIds.length) {
    const { data: v2Data, error: v2Error } = await getSupabaseAdmin()
      .from("generation_v2_guides")
      .select(`
        id,
        session_id,
        created_at,
        generation_v2_requests!inner(status),
        preparation_sessions!inner(title, archived_at, deleted_at)
      `)
      .in("session_id", sessionIds)
      .in("generation_v2_requests.status", ["complete", "complete_with_gaps"])
      .is("preparation_sessions.deleted_at", null)
      .order("created_at", { ascending: false });
    if (v2Error && !isGenerationV2SchemaUnavailable(v2Error)) throw v2Error;
    if (!v2Error) {
      const latestBySession = new Map<string, V2LibraryGuideRow>();
      for (const row of (v2Data ?? []) as unknown as V2LibraryGuideRow[]) {
        if (!latestBySession.has(row.session_id)) latestBySession.set(row.session_id, row);
      }
      for (const item of items) {
        const guide = latestBySession.get(item.sessionId);
        if (guide) {
          item.relatedGuide = {
            id: guide.id,
            title: guide.preparation_sessions.title,
            archived: Boolean(guide.preparation_sessions.archived_at),
          };
        }
      }
    }
  }
  return {
    sources: items,
    page: options.page,
    limit: options.limit,
    hasPreviousPage: options.page > 1,
    hasNextPage: rows.length > options.limit,
  };
}
