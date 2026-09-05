import type { Json, Database } from "@/lib/server/database.types";
import type { V2ArtifactResult } from "@/lib/ai/generation-v2-persistence";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type RequestInsert = Database["public"]["Tables"]["generation_v2_requests"]["Insert"];
type ArtifactInsert = Database["public"]["Tables"]["generation_v2_artifacts"]["Insert"];

export async function createOrJoinGenerationV2Request(input: RequestInsert) {
  const { data, error } = await getSupabaseAdmin().rpc("create_or_join_generation_v2_request", {
    p_session_id: input.session_id!,
    p_source_snapshot_hash: input.source_snapshot_hash,
    p_generation_contract_hash: input.generation_contract_hash,
    p_output_language: input.output_language,
    p_request_content_key: input.request_content_key,
    p_manifest_json: input.manifest_json,
  });
  if (error) throw error;
  if (!data) throw new Error("V2_REQUEST_CREATE_EMPTY");
  return data;
}

export async function reserveGenerationV2Billing(requestId: string, billingEnvironment: "sandbox" | "live" | null) {
  const { data, error } = await getSupabaseAdmin().rpc("billing_reserve_generation_v2", {
    p_request_id: requestId,
    p_billing_environment: billingEnvironment,
  });
  if (error) {
    if (/billing_quota_exceeded/i.test(error.message ?? "")) throw new Error("BILLING_QUOTA_EXCEEDED");
    throw error;
  }
  return data;
}

export async function settleGenerationV2Billing(requestId: string, deliveryStatus: "complete" | "complete_with_gaps" | "failed_no_guide") {
  const { data, error } = await getSupabaseAdmin().rpc("billing_settle_generation_v2", {
    p_request_id: requestId,
    p_delivery_status: deliveryStatus,
  });
  if (error) throw error;
  return data;
}

export async function upsertGenerationV2Artifact(input: ArtifactInsert) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("generation_v2_artifacts")
    .upsert(input, { onConflict: "session_id,artifact_content_key", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: existing, error: existingError } = await admin
    .from("generation_v2_artifacts")
    .select("*")
    .eq("session_id", input.session_id!)
    .eq("artifact_content_key", input.artifact_content_key)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw new Error("V2_ARTIFACT_UPSERT_EMPTY");
  return existing;
}

export async function linkGenerationV2Artifact(input: { request_id: string; artifact_id: string; session_id: string; partition_key: string; partition_order: number; required: boolean }) {
  const { error } = await getSupabaseAdmin().from("generation_v2_request_artifacts").upsert(input, { onConflict: "request_id,artifact_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function claimGenerationV2Artifact(artifactId: string, leaseId: string, leaseSeconds = 120) {
  const { data, error } = await getSupabaseAdmin().rpc("claim_generation_v2_artifact", { p_artifact_id: artifactId, p_lease_id: leaseId, p_lease_seconds: leaseSeconds });
  if (error) throw error;
  return data;
}

export async function settleGenerationV2Artifact(input: { artifactId: string; leaseId: string; status: "complete" | "retry_wait" | "gap"; result?: V2ArtifactResult; resultHash?: string; gapCode?: string; gapMessage?: string; retryable?: boolean; retryAfterSeconds?: number }) {
  const { data, error } = await getSupabaseAdmin().rpc("settle_generation_v2_artifact", {
    p_artifact_id: input.artifactId,
    p_lease_id: input.leaseId,
    p_status: input.status,
    p_result_json: (input.result ?? null) as unknown as Json,
    p_result_hash: input.resultHash ?? null,
    p_gap_code: input.gapCode ?? null,
    p_gap_message: input.gapMessage ?? null,
    p_retryable: input.retryable ?? false,
    p_retry_after_seconds: input.retryAfterSeconds ?? 1,
  });
  if (error) throw error;
  return data;
}

export async function readGenerationV2Request(requestId: string) {
  const { data, error } = await getSupabaseAdmin().from("generation_v2_requests").select("*").eq("id", requestId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function markGenerationV2RequestWorking(requestId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("generation_v2_requests")
    .update({ status: "working", last_progress_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "queued")
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function readGenerationV2Artifacts(requestId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("generation_v2_request_artifacts")
    .select("request_id, artifact_id, session_id, partition_key, partition_order, required, generation_v2_artifacts(*)")
    .eq("request_id", requestId)
    .order("partition_order");
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, artifact: Array.isArray(row.generation_v2_artifacts) ? row.generation_v2_artifacts[0] : row.generation_v2_artifacts }));
}

export async function assembleGenerationV2Request(input: { requestId: string; deliveryStatus: "complete" | "complete_with_gaps" | "failed_no_guide"; guide?: Json | null }) {
  const { data, error } = await getSupabaseAdmin().rpc("assemble_generation_v2_request", {
    p_request_id: input.requestId,
    p_delivery_status: input.deliveryStatus,
    p_guide_json: input.guide ?? null,
  });
  if (error) throw error;
  return data;
}

export async function persistGenerationV2Guide(input: { requestId: string; sessionId: string; sourceSnapshotHash: string; generationContractHash: string; deliveryStatus: "complete" | "complete_with_gaps"; guide: Json }) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("generation_v2_guides").insert({
    request_id: input.requestId,
    session_id: input.sessionId,
    source_snapshot_hash: input.sourceSnapshotHash,
    generation_contract_hash: input.generationContractHash,
    delivery_status: input.deliveryStatus,
    guide_json: input.guide,
  }).select().maybeSingle();
  if (error && error.code !== "23505") throw error;
  if (data) return data;
  const { data: existing, error: existingError } = await admin.from("generation_v2_guides").select("*").eq("request_id", input.requestId).maybeSingle();
  if (existingError) throw existingError;
  if (!existing) throw new Error("V2_GUIDE_PERSIST_EMPTY");
  return existing;
}

export async function readOwnedGenerationV2Guide(sessionId: string, requestId: string) {
  const { data, error } = await getSupabaseAdmin().from("generation_v2_guides").select("*").eq("session_id", sessionId).eq("request_id", requestId).maybeSingle();
  if (error) throw error;
  return data;
}
