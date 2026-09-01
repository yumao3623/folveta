import { getSupabaseAuth } from "@/lib/server/supabase-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { AppError } from "@/lib/server/http";

const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due"];

export async function deleteOwnedAccount(userId: string) {
  const admin = getSupabaseAdmin();
  // Formal folveta.com has no Live billing schema until Paddle approval and
  // the explicit Live cutover. Once that environment exists, require users
  // to cancel an active Live subscription before deleting their account.
  if (process.env.PADDLE_ENV === "live") {
    const { data: liveSubscription, error: subscriptionError } = await admin
      .from("billing_subscriptions")
      .select("paddle_subscription_id")
      .eq("user_id", userId)
      .eq("billing_environment", "live")
      .in("status", ACTIVE_SUBSCRIPTION_STATUSES)
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (liveSubscription) {
      throw new AppError(
        "ACTIVE_SUBSCRIPTION",
        "Cancel your active Folveta Pro subscription before deleting your account.",
        409,
      );
    }
  }

  const { data: sessions, error: sessionsError } = await admin
    .from("preparation_sessions")
    .select("id")
    .eq("owner_user_id", userId);
  if (sessionsError) throw sessionsError;
  const sessionIds = (sessions ?? []).map((session) => session.id);

  let objectCount = 0;
  if (sessionIds.length) {
    const { data: sources, error: sourcesError } = await admin
      .from("sources")
      .select("storage_path")
      .in("session_id", sessionIds);
    if (sourcesError) throw sourcesError;
    const paths = (sources ?? []).map((source) => source.storage_path);
    if (paths.length) {
      const { error: storageError } = await admin.storage
        .from(process.env.SUPABASE_STORAGE_BUCKET ?? "course-materials")
        .remove(paths);
      if (storageError) throw storageError;
      objectCount = paths.length;
    }

    const { error: deleteSessionsError } = await admin
      .from("preparation_sessions")
      .delete()
      .eq("owner_user_id", userId);
    if (deleteSessionsError) throw deleteSessionsError;
  }

  // Revoke refresh tokens before the Auth record is removed. Existing access
  // tokens remain valid only until their normal expiry, per Supabase Auth.
  const auth = await getSupabaseAuth();
  const { error: signOutError } = await auth.auth.signOut({ scope: "global" });
  if (signOutError) throw signOutError;
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) throw deleteUserError;

  console.info(JSON.stringify({ event: "account_deleted", sessions: sessionIds.length, objects: objectCount }));
  return { sessions: sessionIds.length, objects: objectCount };
}
