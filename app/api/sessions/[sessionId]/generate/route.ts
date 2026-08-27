import { requireOwnedSession } from "@/lib/server/auth";
import { generateGuide } from "@/lib/ai/pipeline";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const maxDuration = 300;

const claimableGenerationStates = ["ready", "ready_with_gaps", "failed_retryable"];

export function isGenerationClaimable(state: string) {
  return claimableGenerationStates.includes(state);
}

export async function POST(_request: Request, context: RouteContext<"/api/sessions/[sessionId]/generate">) {
  const { sessionId } = await context.params;
  let authorized = false;
  let generationClaimed = false;
  try {
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    authorized = true;
    if (["extracting_topics", "merging_topics", "generating_guide", "verifying_guide"].includes(session.state)) {
      throw new AppError("GENERATION_IN_PROGRESS", "Guide generation is already in progress.", 409);
    }
    const { data: claimed, error: claimError } = await getSupabaseAdmin()
      .from("preparation_sessions")
      .update({
        state: "extracting_topics",
        current_stage: "extracting_topics",
        failed_stage: null,
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .in("state", claimableGenerationStates)
      .select("id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) throw new AppError("GENERATION_IN_PROGRESS", "Guide generation is already in progress.", 409);
    generationClaimed = true;
    const guide = await generateGuide(sessionId, session.title);
    return Response.json({ guide });
  } catch (error) {
    if (authorized) {
      if (generationClaimed) {
      const { data: liveSession } = await getSupabaseAdmin().from("preparation_sessions").select("current_stage").eq("id", sessionId).maybeSingle();
      const failedStage = liveSession?.current_stage?.replace(/^retrying_/, "") ?? "generation";
      const retryable = error instanceof AppError && ["MODEL_EMPTY_OUTPUT", "MODEL_INCOMPLETE_RESPONSE", "MODEL_PROVIDER_TRANSIENT", "MODEL_PROVIDER_TIMEOUT"].includes(error.code);
      await getSupabaseAdmin().from("preparation_sessions").update({
        state: retryable ? "failed_retryable" : "failed_terminal",
        failed_stage: failedStage,
        error_code: error instanceof AppError ? error.code : "GENERATION_FAILED",
        error_message: retryable
          ? "Generation could not complete this time. Your materials and completed work are saved. Please retry."
          : "Generation could not be completed with these materials.",
        updated_at: new Date().toISOString(),
      }).eq("id", sessionId);
      }
    }
    if (error instanceof AppError && error.code !== "GENERATION_IN_PROGRESS") {
      return errorResponse(new AppError(error.code, "Generation could not complete. Your uploaded materials are still available.", error.status));
    }
    return errorResponse(error);
  }
}
