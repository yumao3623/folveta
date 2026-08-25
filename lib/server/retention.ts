import { getSupabaseAdmin } from "@/lib/server/supabase";

export function retentionRequestAuthorized(header: string | null, secret: string | undefined) {
  return Boolean(secret && header === `Bearer ${secret}`);
}

export async function purgeDueSessions(limit = 50) {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const [{ data: expired, error: expiredError }, { data: deleted, error: deletedError }] = await Promise.all([
    admin
      .from("preparation_sessions")
      .select("id")
      .is("owner_user_id", null)
      .is("deleted_at", null)
      .lte("expires_at", now)
      .limit(limit),
    admin
      .from("preparation_sessions")
      .select("id")
      .not("purge_after", "is", null)
      .lte("purge_after", now)
      .limit(limit),
  ]);
  if (expiredError) throw expiredError;
  if (deletedError) throw deletedError;
  const sessionIds = [...new Set([...(expired ?? []), ...(deleted ?? [])].map(({ id }) => id))].slice(0, limit);
  if (!sessionIds.length) return { sessions: 0, objects: 0 };

  const { data: sources, error: sourcesError } = await admin
    .from("sources")
    .select("storage_path")
    .in("session_id", sessionIds);
  if (sourcesError) throw sourcesError;
  const paths = (sources ?? []).map(({ storage_path }) => storage_path);
  if (paths.length) {
    const { error: storageError } = await admin.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET ?? "course-materials")
      .remove(paths);
    if (storageError) throw storageError;
  }
  const { error: deleteError } = await admin.from("preparation_sessions").delete().in("id", sessionIds);
  if (deleteError) throw deleteError;
  return { sessions: sessionIds.length, objects: paths.length };
}
