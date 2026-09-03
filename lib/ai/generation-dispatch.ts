import { createHash } from "node:crypto";
import { start } from "workflow/api";
import { generateStudyGuideWorkflow } from "@/app/workflows/generation";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getServerEnv } from "@/lib/env";
import { getBillingEnvironment } from "@/lib/server/billing-environment";
import { executionContract, OPERATION_VERSION, planningBatches, planningBudget } from "@/lib/ai/generation-contract";
import type { Json } from "@/lib/server/database.types";

type RpcResult = Record<string, unknown>;

function snapshotHash(hashes: string[]) {
  return createHash("sha256").update([...hashes].sort().join(":"), "utf8").digest("hex");
}

function safeError(code: string) {
  const error = new Error(code);
  error.name = "GenerationDispatchError";
  return error;
}

function sqlState(error: unknown) {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : null;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const client = getSupabaseAdmin() as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const details = error as { message?: string };
    if (details.message?.includes("billing_quota_exceeded")) throw safeError("BILLING_QUOTA_EXCEEDED");
    const code = sqlState(error);
    console.error(JSON.stringify({ event: "generation_rpc_failed", rpc: name, sqlstate: code }));
    throw safeError(code ? `DB_${name.toUpperCase()}_FAILED_${code}` : `DB_${name.toUpperCase()}_FAILED`);
  }
  return data as RpcResult;
}

export async function claimLogicalGeneration(sessionId: string) {
  const admin = getSupabaseAdmin();
  const env = getServerEnv();
  const contract = executionContract(env);
  const { data: sources, error: sourcesError } = await admin
    .from("sources")
    .select("id, display_name, kind, status")
    .eq("session_id", sessionId)
    .in("status", ["ready", "ready_with_gaps"]);
  if (sourcesError || !sources?.length) throw safeError("NO_USABLE_SOURCES");
  const { data: spans, error: spansError } = await admin
    .from("source_spans")
    .select("id, source_id, locator_kind, locator_number, text, content_hash")
    .eq("session_id", sessionId)
    .in("source_id", sources.map((source) => source.id))
    .order("source_id")
    .order("locator_number")
    .order("ordinal");
  if (spansError || !spans?.length) throw safeError("NO_USABLE_SOURCES");
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const evidence = spans.map((span) => {
    const source = sourcesById.get(span.source_id);
    return `[${span.id}] ${source?.display_name ?? "Source"} · ${span.locator_kind} ${span.locator_number}\n${span.text}`;
  }).join("\n\n");
  const metadataCharacters = JSON.stringify(sources.map(({ id, display_name, kind }) => ({ id, display_name, kind }))).length
    + spans.reduce((total, span) => total + span.id.length + span.source_id.length + 16, 0);
  const budget = planningBudget({
    evidence,
    metadataCharacters,
    modelContextTokens: env.MODEL_CONTEXT_WINDOW_TOKENS,
    gatewayInputTokens: env.GATEWAY_MAX_INPUT_TOKENS,
  });
  const batches = budget.singleCall ? [spans] : planningBatches({
    spans,
    metadataCharacters,
    modelContextTokens: env.MODEL_CONTEXT_WINDOW_TOKENS,
    gatewayInputTokens: env.GATEWAY_MAX_INPUT_TOKENS,
  });
  const privateInput = {
    mode: budget.singleCall ? "single" : "batch",
    sourceIds: sources.map((source) => source.id),
    spanIds: batches[0].map((span) => span.id),
    batches: batches.map((batch) => batch.map((span) => span.id)),
    approximateInputTokens: budget.approximateInputTokens,
    safeInputTokens: budget.safeLimit,
  } as Json;
  const claimArgs: Record<string, unknown> = {
    p_session_id: sessionId,
    p_source_snapshot_hash: snapshotHash(spans.map((span) => span.content_hash)),
    p_execution_contract_hash: contract.hash,
    p_provider: env.MODEL_PROVIDER,
    p_model: env.MODEL_TOPIC_MERGE,
    p_prompt_version: env.PROMPT_VERSION,
    p_schema_version: env.GUIDE_SCHEMA_VERSION,
    p_pipeline_version: contract.value.pipelineVersion,
    p_parsing_contract_version: "source-spans-v1",
    p_plan_operation_version: OPERATION_VERSION,
    p_plan_operation_kind: budget.singleCall ? "plan_topics" : "extract_topics",
    p_plan_operation_input_hash: createHash("sha256").update(JSON.stringify(privateInput), "utf8").digest("hex"),
    p_plan_input_json: privateInput,
  };
  const billingEnvironment = getBillingEnvironment();
  if (billingEnvironment) claimArgs.p_billing_environment = billingEnvironment;
  return rpc("claim_generation_execution", claimArgs);
}

export async function dispatchGeneration(generationRunId: string) {
  const claim = await rpc("claim_generation_dispatch", {
    p_generation_run_id: generationRunId,
    p_lease_seconds: 20,
  });
  if (claim.status !== "claimed") return claim;
  try {
    await start(generateStudyGuideWorkflow, [{
      generationRunId: String(claim.generationRunId),
      dispatchToken: String(claim.dispatchToken),
    }]);
  } catch {
    // The run may have started before the acknowledgement was lost. The
    // reconciler will issue another epoch; DB operation fencing is authoritative.
  }
  return claim;
}

export function generationSnapshot(value: RpcResult | null) {
  if (!value) return null;
  const completed = Number(value.completedOperations ?? 0);
  const total = Number(value.totalOperations ?? 0);
  return {
    run_id: String(value.generationRunId),
    status: String(value.status),
    stage: typeof value.stage === "string" ? value.stage : null,
    progress_percent: total > 0 ? Math.min(99, Math.round((completed / total) * 100)) : null,
    failure_category: typeof value.failureCategory === "string" ? value.failureCategory : null,
    retry_allowed: value.retryAllowed === true,
    support_id: typeof value.supportId === "string" ? value.supportId : null,
  };
}
