import { start } from "workflow/api";
import { generateStudyGuideWorkflow } from "@/app/workflows/generation";
import { generateStudyGuideV2Workflow } from "@/app/workflows/generation-v2";
import { getServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const maxDuration = 60;

function authorized(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function rpc(name: string, args: Record<string, unknown>) {
  const client = getSupabaseAdmin() as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
  return client.rpc(name, args);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  const env = getServerEnv();
  let v1Dispatched = 0;
  let v2Dispatched = 0;
  let v2BillingReconciled = 0;

  if (env.AI_GENERATION_WORKFLOW_ENABLED) {
    await rpc("watchdog_generation_executions", { p_limit: 20, p_stale_seconds: 120 });
    for (let index = 0; index < 20; index += 1) {
      const { data, error } = await rpc("claim_generation_dispatch", { p_generation_run_id: null, p_lease_seconds: 20 });
      if (error || !data || typeof data !== "object" || (data as { status?: unknown }).status !== "claimed") break;
      const claim = data as { generationRunId: string; dispatchToken: string };
      try {
        await start(generateStudyGuideWorkflow, [{ generationRunId: claim.generationRunId, dispatchToken: claim.dispatchToken }]);
      } catch {
        // A later reconciliation epoch handles an unacknowledged start.
      }
      v1Dispatched += 1;
    }
  }

  if (env.GENERATION_V2_RUNTIME_ENABLED) {
    const billing = await rpc("reconcile_generation_v2_billing", { p_limit: 20 });
    if (billing.error) throw billing.error;
    v2BillingReconciled = typeof billing.data === "number" ? billing.data : 0;

    const stale = await rpc("claim_stale_generation_v2_requests", { p_limit: 20, p_stale_seconds: 300 });
    if (stale.error) throw stale.error;
    const requests = Array.isArray(stale.data) ? stale.data : [];
    for (const value of requests) {
      const requestId = value && typeof value === "object" && "request_id" in value
        ? (value as { request_id?: unknown }).request_id
        : null;
      if (typeof requestId !== "string") continue;
      try {
        await start(generateStudyGuideV2Workflow, [requestId]);
      } catch {
        // The stale window makes a failed dispatch claimable again.
      }
      v2Dispatched += 1;
    }
  }

  return Response.json({
    ok: true,
    disabled: !env.AI_GENERATION_WORKFLOW_ENABLED && !env.GENERATION_V2_RUNTIME_ENABLED,
    dispatched: v1Dispatched + v2Dispatched,
    v1Dispatched,
    v2Dispatched,
    v2BillingReconciled,
  });
}
