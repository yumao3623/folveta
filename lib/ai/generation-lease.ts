import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const GENERATION_LEASE_MS = 5 * 60_000;

export function isGenerationLeaseActive(expiresAt: string | null | undefined, now = Date.now()) {
  return Boolean(expiresAt && Number.isFinite(new Date(expiresAt).getTime()) && new Date(expiresAt).getTime() > now);
}

export async function claimGenerationLease(sessionId: string) {
  const leaseId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + GENERATION_LEASE_MS).toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from("preparation_sessions")
    .update({ generation_lease_id: leaseId, generation_lease_expires_at: expiresAt })
    .eq("id", sessionId)
    .or(`generation_lease_expires_at.is.null,generation_lease_expires_at.lt.${now.toISOString()}`)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data ? leaseId : null;
}

export async function releaseGenerationLease(sessionId: string, leaseId: string) {
  const { error } = await getSupabaseAdmin()
    .from("preparation_sessions")
    .update({ generation_lease_id: null, generation_lease_expires_at: null })
    .eq("id", sessionId)
    .eq("generation_lease_id", leaseId);
  if (error) throw error;
}
