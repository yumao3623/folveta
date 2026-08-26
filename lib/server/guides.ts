import { GUIDE_LIST_DEFAULT_LIMIT, type GuideListOptions } from "@/lib/schemas/guide-management";
import type { Database } from "@/lib/server/database.types";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const DELETE_RETENTION_DAYS = 30;

type GuideRow = Database["public"]["Tables"]["study_guides"]["Row"];
type SessionRow = Database["public"]["Tables"]["preparation_sessions"]["Row"];

type GuideListQueryRow = Pick<
  GuideRow,
  "id" | "title" | "created_at" | "updated_at" | "last_accessed_at" | "archived_at"
> & {
  preparation_sessions: Pick<SessionRow, "id" | "state"> & {
    sources: Array<{ count: number }>;
  };
};

export type GuideSummary = {
  id: string;
  sessionId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
  archivedAt: string | null;
  sourceCount: number;
  state: string;
};

export type GuideListResult = {
  guides: GuideSummary[];
  page: number;
  limit: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function toGuideSummary(row: GuideListQueryRow): GuideSummary {
  return {
    id: row.id,
    sessionId: row.preparation_sessions.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessedAt: row.last_accessed_at,
    archivedAt: row.archived_at,
    sourceCount: row.preparation_sessions.sources[0]?.count ?? 0,
    state: row.preparation_sessions.state,
  };
}

export async function listOwnedGuides(
  userId: string,
  options: GuideListOptions = { view: "active", page: 1, limit: GUIDE_LIST_DEFAULT_LIMIT },
): Promise<GuideListResult> {
  const offset = (options.page - 1) * options.limit;
  let query = getSupabaseAdmin()
    .from("study_guides")
    .select(`
      id,
      title,
      created_at,
      updated_at,
      last_accessed_at,
      archived_at,
      preparation_sessions!inner(
        id,
        owner_user_id,
        state,
        archived_at,
        deleted_at,
        sources(count)
      )
    `)
    .eq("preparation_sessions.owner_user_id", userId)
    .is("preparation_sessions.deleted_at", null)
    .is("deleted_at", null);

  if (options.view === "archived") {
    query = query
      .not("archived_at", "is", null)
      .not("preparation_sessions.archived_at", "is", null);
  } else {
    query = query
      .is("archived_at", null)
      .is("preparation_sessions.archived_at", null);
  }

  const { data, error } = await query
    .order("last_accessed_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + options.limit);
  if (error) throw error;

  const rows = (data ?? []) as unknown as GuideListQueryRow[];
  return {
    guides: rows.slice(0, options.limit).map(toGuideSummary),
    page: options.page,
    limit: options.limit,
    hasPreviousPage: options.page > 1,
    hasNextPage: rows.length > options.limit,
  };
}

export async function listRecentGuides(userId: string, limit = 4) {
  return listOwnedGuides(userId, { view: "active", page: 1, limit });
}

export async function requireAuthenticatedOwnedGuide(userId: string, guideId: string) {
  const admin = getSupabaseAdmin();
  const { data: guide, error: guideError } = await admin
    .from("study_guides")
    .select("*")
    .eq("id", guideId)
    .is("deleted_at", null)
    .maybeSingle();
  if (guideError) throw guideError;
  if (!guide) return null;

  const { data: session, error: sessionError } = await admin
    .from("preparation_sessions")
    .select("id, owner_user_id, archived_at, deleted_at")
    .eq("id", guide.session_id)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (sessionError) throw sessionError;
  return session ? { guide, session } : null;
}

export async function touchOwnedGuide(guide: Pick<GuideRow, "id" | "session_id">) {
  const accessedAt = new Date().toISOString();
  const admin = getSupabaseAdmin();
  const [{ error: guideError }, { error: sessionError }] = await Promise.all([
    admin.from("study_guides").update({ last_accessed_at: accessedAt }).eq("id", guide.id).is("deleted_at", null),
    admin.from("preparation_sessions").update({ last_accessed_at: accessedAt }).eq("id", guide.session_id).is("deleted_at", null),
  ]);
  if (guideError) throw guideError;
  if (sessionError) throw sessionError;
  return accessedAt;
}

export async function renameOwnedGuide(userId: string, guideId: string, title: string) {
  const owned = await requireAuthenticatedOwnedGuide(userId, guideId);
  if (!owned) return null;
  const updatedAt = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("study_guides")
    .update({ title, updated_at: updatedAt })
    .eq("id", guideId)
    .eq("session_id", owned.guide.session_id)
    .is("deleted_at", null)
    .select("id, title, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setOwnedGuideArchived(userId: string, guideId: string, archived: boolean) {
  const owned = await requireAuthenticatedOwnedGuide(userId, guideId);
  if (!owned) return null;
  const priorGuideArchivedAt = owned.guide.archived_at;
  const priorSessionArchivedAt = owned.session.archived_at;
  const archivedAt = archived ? new Date().toISOString() : null;
  const updatedAt = new Date().toISOString();
  const admin = getSupabaseAdmin();

  const { error: guideError } = await admin
    .from("study_guides")
    .update({ archived_at: archivedAt, updated_at: updatedAt })
    .eq("id", guideId)
    .eq("session_id", owned.guide.session_id)
    .is("deleted_at", null);
  if (guideError) throw guideError;

  const { error: sessionError } = await admin
    .from("preparation_sessions")
    .update({ archived_at: archivedAt, updated_at: updatedAt })
    .eq("id", owned.guide.session_id)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);
  if (sessionError) {
    await admin.from("study_guides").update({ archived_at: priorGuideArchivedAt }).eq("id", guideId);
    await admin.from("preparation_sessions").update({ archived_at: priorSessionArchivedAt }).eq("id", owned.guide.session_id);
    throw sessionError;
  }
  return { id: guideId, archivedAt };
}

export async function softDeleteOwnedGuide(userId: string, guideId: string) {
  const owned = await requireAuthenticatedOwnedGuide(userId, guideId);
  if (!owned) return null;
  const deletedAt = new Date();
  const purgeAfter = new Date(deletedAt);
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + DELETE_RETENTION_DAYS);
  const lifecycle = {
    deleted_at: deletedAt.toISOString(),
    purge_after: purgeAfter.toISOString(),
    updated_at: deletedAt.toISOString(),
  };
  const admin = getSupabaseAdmin();
  const { error: sessionError } = await admin
    .from("preparation_sessions")
    .update(lifecycle)
    .eq("id", owned.guide.session_id)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);
  if (sessionError) throw sessionError;

  const { error: guideError } = await admin
    .from("study_guides")
    .update({ deleted_at: lifecycle.deleted_at, updated_at: lifecycle.updated_at })
    .eq("id", guideId)
    .eq("session_id", owned.guide.session_id)
    .is("deleted_at", null);
  if (guideError) throw guideError;
  return { id: guideId, deletedAt: lifecycle.deleted_at, purgeAfter: lifecycle.purge_after };
}
