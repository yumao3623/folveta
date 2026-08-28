import { requireOwnedSession } from "@/lib/server/auth";
import { generateGuideStep } from "@/lib/ai/pipeline";
import { claimGenerationLease, releaseGenerationLease } from "@/lib/ai/generation-lease";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

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

export async function POST(_request: Request, context: RouteContext<"/api/sessions/[sessionId]/generate">) {
  const { sessionId } = await context.params;
  let leaseId: string | null = null;
  let authorized = false;
  let claimed = false;
  try {
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    authorized = true;
    if (!isGenerationClaimable(session.state)) throw new AppError("GENERATION_NOT_AVAILABLE", "Guide generation is not available for this session.", 409);

    leaseId = await claimGenerationLease(sessionId);
    if (!leaseId) throw new AppError("GENERATION_IN_PROGRESS", "Guide generation is already in progress.", 409);
    claimed = true;
    const step = await generateGuideStep(sessionId, session.title);
    return Response.json({ complete: step.complete, currentStage: step.stage });
  } catch (error) {
    if (authorized) {
      if (claimed && leaseId) {
        const admin = getSupabaseAdmin();
        const { data: liveSession } = await admin.from("preparation_sessions").select("current_stage").eq("id", sessionId).eq("generation_lease_id", leaseId).maybeSingle();
        const failedStage = liveSession?.current_stage?.replace(/^retrying_/, "") ?? "generation";
        const retryable = error instanceof AppError && ["MODEL_EMPTY_OUTPUT", "MODEL_INCOMPLETE_RESPONSE", "MODEL_PROVIDER_TRANSIENT", "MODEL_PROVIDER_TIMEOUT"].includes(error.code);
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
