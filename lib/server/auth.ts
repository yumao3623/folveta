import { cache } from "react";
import { cookies } from "next/headers";
import { isInvalidAuthSessionError } from "@/lib/auth-errors";
import { SESSION_COOKIE } from "@/lib/config";
import { hashValue } from "@/lib/server/crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getSupabaseAuth } from "@/lib/server/supabase-auth";
import type { Database } from "@/lib/server/database.types";

type SessionRow = Database["public"]["Tables"]["preparation_sessions"]["Row"];

export type SessionIdentity = {
  userId: string | null;
  tokenHash: string | null;
  now: Date;
};

export function sessionAccessMode(
  session: Pick<SessionRow, "owner_user_id" | "access_token_hash" | "expires_at" | "deleted_at">,
  identity: SessionIdentity,
) {
  if (session.deleted_at) return null;
  if (session.owner_user_id) {
    return identity.userId === session.owner_user_id ? "authenticated" : null;
  }
  if (!session.access_token_hash || !session.expires_at || !identity.tokenHash) return null;
  return session.access_token_hash === identity.tokenHash && new Date(session.expires_at) > identity.now
    ? "anonymous"
    : null;
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await getSupabaseAuth();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    if (isInvalidAuthSessionError(error)) return null;
    throw error;
  }
  return data.user;
});

export async function getSessionIdentity(): Promise<SessionIdentity> {
  const [user, token] = await Promise.all([getCurrentUser(), getSessionToken()]);
  return {
    userId: user?.id ?? null,
    tokenHash: token ? hashValue(token) : null,
    now: new Date(),
  };
}

export async function requireOwnedSession(sessionId: string) {
  const identity = await getSessionIdentity();
  if (!identity.userId && !identity.tokenHash) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("preparation_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data && sessionAccessMode(data, identity) ? data : null;
}

export async function requireOwnedSource(sourceId: string) {
  const admin = getSupabaseAdmin();
  const { data: source, error } = await admin
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!source) return null;

  return (await requireOwnedSession(source.session_id)) ? source : null;
}

export async function requireOwnedGuide(guideId: string) {
  const { data: guide, error } = await getSupabaseAdmin()
    .from("study_guides")
    .select("*")
    .eq("id", guideId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!guide) return null;
  return (await requireOwnedSession(guide.session_id)) ? guide : null;
}

export async function claimCurrentAnonymousSession() {
  const token = await getSessionToken();
  if (!token) return null;
  const supabase = await getSupabaseAuth();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;
  const { data, error } = await supabase.rpc("claim_current_anonymous_session", {
    token_hash: hashValue(token),
  });
  if (error) throw error;
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return data;
}
