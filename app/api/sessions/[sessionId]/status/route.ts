import { guideSchema } from "@/lib/schemas";
import { isStaleGeneration } from "@/lib/ai/generation-recovery";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(_request: Request, context: RouteContext<"/api/sessions/[sessionId]/status">) {
  try {
    const { sessionId } = await context.params;
    let session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    const admin = getSupabaseAdmin();
    if (isStaleGeneration(session.state, session.updated_at)) {
      const now = new Date().toISOString();
      const { data: recovered, error: recoveryError } = await admin
        .from("preparation_sessions")
        .update({
          state: "failed_retryable",
          failed_stage: session.current_stage?.replace(/^retrying_/, "") ?? "generation",
          error_code: "GENERATION_STALLED",
          error_message: "Generation paused before it could finish. Your materials and completed work are saved. Please retry.",
          updated_at: now,
        })
        .eq("id", session.id)
        .eq("state", session.state)
        .eq("updated_at", session.updated_at)
        .select("*")
        .maybeSingle();
      if (recoveryError) throw recoveryError;
      if (recovered) session = recovered;
    }
    const [{ data: sources, error: sourceError }, { data: guideRow, error: guideError }] = await Promise.all([
      admin.from("sources").select("id, display_name, kind, status, unit_count, readable_unit_count, warnings, error_code, error_message").eq("session_id", sessionId).order("created_at"),
      admin.from("study_guides").select("guide_json").eq("session_id", sessionId).maybeSingle(),
    ]);
    if (sourceError) throw sourceError;
    if (guideError) throw guideError;
    const guide = guideRow ? guideSchema.parse(guideRow.guide_json) : null;
    return Response.json({ session, sources: sources ?? [], guide });
  } catch (error) {
    return errorResponse(error);
  }
}
