import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/config";
import { hashValue } from "@/lib/server/crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function getSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireOwnedSession(sessionId: string) {
  const token = await getSessionToken();
  if (!token) return null;

  const { data, error } = await getSupabaseAdmin()
    .from("preparation_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("access_token_hash", hashValue(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function requireOwnedSource(sourceId: string) {
  const token = await getSessionToken();
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data: source, error } = await admin
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!source) return null;

  const { data: session, error: sessionError } = await admin
    .from("preparation_sessions")
    .select("id")
    .eq("id", source.session_id)
    .eq("access_token_hash", hashValue(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (sessionError) throw sessionError;
  return session ? source : null;
}
