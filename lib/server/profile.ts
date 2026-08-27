import { getSupabaseAdmin } from "@/lib/server/supabase";

export type ProfileSummary = { guideCount: number; sourceCount: number };

export async function getOwnedProfileSummary(userId: string): Promise<ProfileSummary> {
  const admin = getSupabaseAdmin();
  const [guideResult, sourceResult] = await Promise.all([
    admin
      .from("study_guides")
      .select("id, preparation_sessions!inner(owner_user_id, deleted_at)", { count: "exact" })
      .eq("preparation_sessions.owner_user_id", userId)
      .is("preparation_sessions.deleted_at", null)
      .is("deleted_at", null)
      .limit(0),
    admin
      .from("sources")
      .select("id, preparation_sessions!inner(owner_user_id, deleted_at)", { count: "exact" })
      .eq("preparation_sessions.owner_user_id", userId)
      .is("preparation_sessions.deleted_at", null)
      .limit(0),
  ]);
  if (guideResult.error) throw guideResult.error;
  if (sourceResult.error) throw sourceResult.error;
  return { guideCount: guideResult.count ?? 0, sourceCount: sourceResult.count ?? 0 };
}
