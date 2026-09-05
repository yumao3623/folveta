import { requireOwnedSession } from "@/lib/server/auth";
import { generateGuideStep } from "@/lib/ai/pipeline";
import { claimGenerationLease, releaseGenerationLease } from "@/lib/ai/generation-lease";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getServerEnv } from "@/lib/env";
import { claimLogicalGeneration, dispatchGeneration, generationSnapshot } from "@/lib/ai/generation-dispatch";
import { enforceRateLimit, requestRateLimitKey, sessionRateLimitKey } from "@/lib/server/rate-limit";
import { start } from "workflow/api";
import { generateStudyGuideV2Workflow } from "@/app/workflows/generation-v2";
import { createOrJoinV2RuntimeRequest } from "@/lib/ai/generation-v2-runtime";
import { isGenerationV2WriteEnabled } from "@/lib/ai/generation-v2-rollout";

export const maxDuration = 300;

const continuableGenerationStates = [
  "ready",
  "ready_with_gaps",
  "failed_retryable",
  "extracting_topics",
  "merging_topics",
  "generating_guide",
  "verifying_guide",
];

export function isGenerationClaimable(state: string) {
  return continuableGenerationStates.includes(state);
}

export async function POST(request: Request, context: RouteContext<"/api/sessions/[sessionId]/generate">) {
  const { sessionId } = await context.params;
  let leaseId: string | null = null;
  let authorized = false;
  let claimed = false;
  try {
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    authorized = true;
    await enforceRateLimit({ scope: "generate.ip", key: requestRateLimitKey(request), limit: 8, windowSeconds: 3600 });
    await enforceRateLimit({ scope: "generate.session", key: sessionRateLimitKey(sessionId), limit: 3, windowSeconds: 600 });
    if (!isGenerationClaimable(session.state)) throw new AppError("GENERATION_NOT_AVAILABLE", "Guide generation is not available for this session.", 409);

    const env = getServerEnv();
    const v2RuntimeAndProductEnabled = env.GENERATION_V2_RUNTIME_ENABLED && env.GENERATION_V2_PRODUCT_ENABLED;
    if (v2RuntimeAndProductEnabled && isGenerationV2WriteEnabled(session)) {
      const { request: runtimeRequest } = await createOrJoinV2RuntimeRequest(sessionId);
      let workflowRunId: string | null = null;
      if (!["complete", "complete_with_gaps", "failed_no_guide"].includes(runtimeRequest.status)) {
        const run = await start(generateStudyGuideV2Workflow, [runtimeRequest.id]);
        workflowRunId = run.runId;
      }
      return Response.json({ accepted: true, engine: "v2", requestId: runtimeRequest.id, workflowRunId }, { status: 202 });
    }

    if (env.AI_GENERATION_WORKFLOW_ENABLED) {
      const claimed = await claimLogicalGeneration(sessionId);
      const generationRunId = String(claimed.generationRunId);
      await dispatchGeneration(generationRunId);
      const { data, error } = await (getSupabaseAdmin() as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
      }).rpc("get_generation_execution_status", { p_generation_run_id: generationRunId });
      if (error) throw new AppError("GENERATION_STATUS_UNAVAILABLE", "Generation was accepted but its status is unavailable.", 503);
      return Response.json({ generation: generationSnapshot(data as Record<string, unknown>), accepted: true }, { status: 202 });
    }

    leaseId = await claimGenerationLease(sessionId);
    if (!leaseId) throw new AppError("GENERATION_IN_PROGRESS", "Guide generation is already in progress.", 409);
    claimed = true;
    const step = await generateGuideStep(sessionId, session.title);
    return Response.json({ complete: step.complete, currentStage: step.stage });
  } catch (error) {
    if (error instanceof Error && error.message === "BILLING_QUOTA_EXCEEDED") {
      return errorResponse(new AppError("BILLING_QUOTA_EXCEEDED", "Your monthly Study Guide limit has been reached. Upgrade to Folveta Pro to continue.", 429));
    }
    if (authorized) {
      if (claimed && leaseId) {
        const admin = getSupabaseAdmin();
        const { data: liveSession } = await admin.from("preparation_sessions").select("current_stage").eq("id", sessionId).eq("generation_lease_id", leaseId).maybeSingle();
        const failedStage = liveSession?.current_stage?.replace(/^retrying_/, "") ?? "generation";
        const retryable = error instanceof AppError && [
          "MODEL_EMPTY_OUTPUT",
          "MODEL_INCOMPLETE_RESPONSE",
          "MODEL_PROVIDER_CONNECTION",
          "MODEL_PROVIDER_RATE_LIMITED",
          "MODEL_PROVIDER_TRANSIENT",
          "MODEL_PROVIDER_TIMEOUT",
        ].includes(error.code);
        await admin.from("preparation_sessions").update({
          state: retryable ? "failed_retryable" : "failed_terminal",
          failed_stage: failedStage,
          error_code: error instanceof AppError ? error.code : "GENERATION_FAILED",
          error_message: retryable
            ? "Generation could not complete this time. Your materials and completed work are saved. Please retry."
            : "Generation could not be completed with these materials.",
          updated_at: new Date().toISOString(),
        }).eq("id", sessionId).eq("generation_lease_id", leaseId);
      }
    }
    if (error instanceof AppError && error.code !== "GENERATION_IN_PROGRESS") {
      return errorResponse(new AppError(error.code, "Generation could not complete. Your uploaded materials are still available.", error.status));
    }
    return errorResponse(error);
  } finally {
    if (leaseId) await releaseGenerationLease(sessionId, leaseId);
  }
}
