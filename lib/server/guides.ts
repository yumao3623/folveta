import { GUIDE_LIST_DEFAULT_LIMIT, type GuideListOptions } from "@/lib/schemas/guide-management";
import type { Database } from "@/lib/server/database.types";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { isGenerationV2SchemaUnavailable } from "@/lib/ai/generation-v2-rollout";

const DELETE_RETENTION_DAYS = 30;

type GuideRow = Database["public"]["Tables"]["study_guides"]["Row"];
type V2GuideRow = Database["public"]["Tables"]["generation_v2_guides"]["Row"];
type V2RequestRow = Database["public"]["Tables"]["generation_v2_requests"]["Row"];
type SessionRow = Database["public"]["Tables"]["preparation_sessions"]["Row"];

type GuideListQueryRow = Pick<
  GuideRow,
  "id" | "title" | "created_at" | "updated_at" | "last_accessed_at" | "archived_at"
> & {
  preparation_sessions: Pick<SessionRow, "id" | "state"> & {
    sources: Array<{ count: number }>;
  };
};

type V2GuideListQueryRow = Pick<V2GuideRow, "id" | "session_id" | "created_at" | "updated_at"> & {
  generation_v2_requests: Pick<V2RequestRow, "status"> | Array<Pick<V2RequestRow, "status">>;
  preparation_sessions: Pick<SessionRow, "id" | "title" | "state" | "last_accessed_at" | "archived_at" | "deleted_at" | "updated_at"> & {
    sources: Array<{ count: number }>;
  };
};

export type OwnedGuideRecord = {
  id: string;
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  engine: "v1" | "v2";
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

function toV2GuideSummary(row: V2GuideListQueryRow): GuideSummary {
  return {
    id: row.id,
    sessionId: row.preparation_sessions.id,
    title: row.preparation_sessions.title,
    createdAt: row.created_at,
    updatedAt: row.preparation_sessions.updated_at,
    lastAccessedAt: row.preparation_sessions.last_accessed_at,
    archivedAt: row.preparation_sessions.archived_at,
    sourceCount: row.preparation_sessions.sources[0]?.count ?? 0,
    state: row.preparation_sessions.state,
  };
}

function toV2OwnedGuide(row: V2GuideRow, session: SessionRow): OwnedGuideRecord {
  return {
    id: row.id,
    session_id: row.session_id,
    title: session.title,
    created_at: row.created_at,
    updated_at: session.updated_at,
    last_accessed_at: session.last_accessed_at,
    archived_at: session.archived_at,
    deleted_at: session.deleted_at,
    engine: "v2",
  };
}

function toV1OwnedGuide(row: GuideRow): OwnedGuideRecord {
  return { ...row, engine: "v1" };
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

  const orderedQuery = query
    .order("last_accessed_at", { ascending: false })
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });
  // Dual-read can suppress legacy rows and older v2 snapshots for the same session.
  const { data, error } = await orderedQuery.range(0, (offset + options.limit) * 2);
  if (error) throw error;

  const summaries = ((data ?? []) as unknown as GuideListQueryRow[]).map(toGuideSummary);
  let v2Query = getSupabaseAdmin()
    .from("generation_v2_guides")
    .select(`
      id,
      session_id,
      created_at,
      updated_at,
      generation_v2_requests!inner(status),
      preparation_sessions!inner(
        id,
        title,
        owner_user_id,
        state,
        updated_at,
        last_accessed_at,
        archived_at,
        deleted_at,
        sources(count)
      )
    `)
    .eq("preparation_sessions.owner_user_id", userId)
    .is("preparation_sessions.deleted_at", null)
    .in("generation_v2_requests.status", ["complete", "complete_with_gaps"]);
  v2Query = options.view === "archived"
    ? v2Query.not("preparation_sessions.archived_at", "is", null)
    : v2Query.is("preparation_sessions.archived_at", null);
  const { data: v2Data, error: v2Error } = await v2Query
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .range(0, (offset + options.limit) * 2);
  if (v2Error && !isGenerationV2SchemaUnavailable(v2Error)) throw v2Error;
  if (!v2Error) {
    const latestV2BySession = new Map<string, GuideSummary>();
    for (const row of (v2Data ?? []) as unknown as V2GuideListQueryRow[]) {
      if (latestV2BySession.has(row.session_id)) continue;
      latestV2BySession.set(row.session_id, toV2GuideSummary(row));
    }
    const merged = [...summaries.filter((guide) => !latestV2BySession.has(guide.sessionId)), ...latestV2BySession.values()]
      .sort((a, b) => b.lastAccessedAt.localeCompare(a.lastAccessedAt) || b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
    return {
      guides: merged.slice(offset, offset + options.limit),
      page: options.page,
      limit: options.limit,
      hasPreviousPage: options.page > 1,
      hasNextPage: merged.length > offset + options.limit,
    };
  }
  return {
    guides: summaries.slice(offset, offset + options.limit),
    page: options.page,
    limit: options.limit,
    hasPreviousPage: options.page > 1,
    hasNextPage: summaries.length > offset + options.limit,
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
  if (guide) {
    const { data: session, error: sessionError } = await admin
      .from("preparation_sessions")
      .select("id, owner_user_id, archived_at, deleted_at")
      .eq("id", guide.session_id)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();
    if (sessionError) throw sessionError;
    return session ? { guide: toV1OwnedGuide(guide), session } : null;
  }

  const { data: v2Guide, error: v2GuideError } = await admin
    .from("generation_v2_guides")
    .select("*")
    .eq("id", guideId)
    .maybeSingle();
  if (v2GuideError && !isGenerationV2SchemaUnavailable(v2GuideError)) throw v2GuideError;
  if (v2GuideError) return null;
  if (!v2Guide) return null;

  const { data: session, error: sessionError } = await admin
    .from("preparation_sessions")
    .select("*")
    .eq("id", v2Guide.session_id)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (sessionError) throw sessionError;
  return session ? { guide: toV2OwnedGuide(v2Guide, session), session } : null;
}

export async function touchOwnedGuide(guide: Pick<OwnedGuideRecord, "id" | "session_id" | "engine">) {
  const accessedAt = new Date().toISOString();
  const admin = getSupabaseAdmin();
  const [{ error: guideError }, { error: sessionError }] = await Promise.all([
    guide.engine === "v1"
      ? admin.from("study_guides").update({ last_accessed_at: accessedAt }).eq("id", guide.id).is("deleted_at", null)
      : Promise.resolve({ error: null }),
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
  const { data, error } = owned.guide.engine === "v1"
    ? await getSupabaseAdmin()
      .from("study_guides")
      .update({ title, updated_at: updatedAt })
      .eq("id", guideId)
      .eq("session_id", owned.guide.session_id)
      .is("deleted_at", null)
      .select("id, title, updated_at")
      .maybeSingle()
    : await getSupabaseAdmin()
      .from("preparation_sessions")
      .update({ title, updated_at: updatedAt })
      .eq("id", owned.guide.session_id)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .select("id, title, updated_at")
      .maybeSingle()
  if (error) throw error;
  return data ? { id: guideId, title: data.title, updated_at: data.updated_at } : null;
}

export async function setOwnedGuideArchived(userId: string, guideId: string, archived: boolean) {
  const owned = await requireAuthenticatedOwnedGuide(userId, guideId);
  if (!owned) return null;
  const priorGuideArchivedAt = owned.guide.archived_at;
  const priorSessionArchivedAt = owned.session.archived_at;
  const archivedAt = archived ? new Date().toISOString() : null;
  const updatedAt = new Date().toISOString();
  const admin = getSupabaseAdmin();

  const { error: guideError } = owned.guide.engine === "v1"
    ? await admin
      .from("study_guides")
      .update({ archived_at: archivedAt, updated_at: updatedAt })
      .eq("id", guideId)
      .eq("session_id", owned.guide.session_id)
      .is("deleted_at", null)
    : { error: null };
  if (guideError) throw guideError;

  const { error: sessionError } = await admin
    .from("preparation_sessions")
    .update({ archived_at: archivedAt, updated_at: updatedAt })
    .eq("id", owned.guide.session_id)
    .eq("owner_user_id", userId)
    .is("deleted_at", null);
  if (sessionError) {
    if (owned.guide.engine === "v1") await admin.from("study_guides").update({ archived_at: priorGuideArchivedAt }).eq("id", guideId);
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

  const { error: guideError } = owned.guide.engine === "v1"
    ? await admin
      .from("study_guides")
      .update({ deleted_at: lifecycle.deleted_at, updated_at: lifecycle.updated_at })
      .eq("id", guideId)
      .eq("session_id", owned.guide.session_id)
      .is("deleted_at", null)
    : { error: null };
  if (guideError) throw guideError;
  return { id: guideId, deletedAt: lifecycle.deleted_at, purgeAfter: lifecycle.purge_after };
}
