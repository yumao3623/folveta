import { requireOwnedSession } from "@/lib/server/auth";
import { generateGuide } from "@/lib/ai/pipeline";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const maxDuration = 300;

export async function POST(_request: Request, context: RouteContext<"/api/sessions/[sessionId]/generate">) {
  const { sessionId } = await context.params;
  try {
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    if (["extracting_topics", "merging_topics", "generating_guide", "verifying_guide"].includes(session.state)) {
      throw new AppError("GENERATION_IN_PROGRESS", "Guide generation is already in progress.", 409);
    }
    const guide = await generateGuide(sessionId, session.title);
    return Response.json({ guide });
  } catch (error) {
    await getSupabaseAdmin().from("preparation_sessions").update({
      state: "failed_retryable",
      failed_stage: "generation",
      error_code: error instanceof AppError ? error.code : "GENERATION_FAILED",
      error_message: error instanceof Error ? error.message : "Guide generation failed.",
      updated_at: new Date().toISOString(),
    }).eq("id", sessionId);
    return errorResponse(error);
  }
}
