import { start } from "workflow/api";
import { generateStudyGuideWorkflow } from "@/app/workflows/generation";
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
  if (!getServerEnv().AI_GENERATION_WORKFLOW_ENABLED) {
    return Response.json({ ok: true, disabled: true, dispatched: 0 });
  }
  await rpc("watchdog_generation_executions", { p_limit: 20, p_stale_seconds: 120 });
  let dispatched = 0;
  for (let index = 0; index < 20; index += 1) {
    const { data, error } = await rpc("claim_generation_dispatch", { p_generation_run_id: null, p_lease_seconds: 20 });
    if (error || !data || typeof data !== "object" || (data as { status?: unknown }).status !== "claimed") break;
    const claim = data as { generationRunId: string; dispatchToken: string };
    try {
      await start(generateStudyGuideWorkflow, [{ generationRunId: claim.generationRunId, dispatchToken: claim.dispatchToken }]);
    } catch {
      // A later reconciliation epoch handles an unacknowledged start.
    }
    dispatched += 1;
  }
  return Response.json({ ok: true, dispatched });
}
