import { guideSchema } from "@/lib/schemas";
import { isStaleGeneration } from "@/lib/ai/generation-recovery";
import { isGenerationLeaseActive } from "@/lib/ai/generation-lease";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { generationSnapshot } from "@/lib/ai/generation-dispatch";

export async function GET(_request: Request, context: RouteContext<"/api/sessions/[sessionId]/status">) {
  try {
    const { sessionId } = await context.params;
    let session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    const admin = getSupabaseAdmin();
    const nowMs = Date.now();
    const leaseActive = isGenerationLeaseActive(session.generation_lease_expires_at, nowMs);
    if (!session.current_generation_run_id && isStaleGeneration(session.state, session.updated_at, nowMs, leaseActive)) {
      const now = new Date().toISOString();
      const { data: recovered, error: recoveryError } = await admin
        .from("preparation_sessions")
        .update({
          state: "failed_retryable",
          failed_stage: session.current_stage?.replace(/^retrying_/, "") ?? "generation",
          error_code: "GENERATION_STALLED",
          error_message: "Generation paused before it could finish. Your materials and completed work are saved. Please retry.",
          generation_lease_id: null,
          generation_lease_expires_at: null,
          updated_at: now,
        })
        .eq("id", session.id)
        .eq("state", session.state)
        .eq("updated_at", session.updated_at)
        .or(`generation_lease_expires_at.is.null,generation_lease_expires_at.lt.${now}`)
        .select("*")
        .maybeSingle();
      if (recoveryError) throw recoveryError;
      if (recovered) session = recovered;
    }
    const [{ data: sources, error: sourceError }, { data: guideRow, error: guideError }, generationResult] = await Promise.all([
      admin.from("sources").select("id, display_name, kind, status, unit_count, readable_unit_count, warnings, error_code, error_message").eq("session_id", sessionId).order("created_at"),
      admin.from("study_guides").select("guide_json").eq("session_id", sessionId).maybeSingle(),
      session.current_generation_run_id
        ? (admin as unknown as { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> }).rpc("get_generation_execution_status", { p_generation_run_id: session.current_generation_run_id })
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (sourceError) throw sourceError;
    if (guideError) throw guideError;
    if (generationResult.error) throw generationResult.error;
    const guide = guideRow ? guideSchema.parse(guideRow.guide_json) : null;
    const safeSession = {
      id: session.id,
      state: session.state,
      current_stage: session.current_stage,
      failed_stage: session.failed_stage,
      error_message: session.error_message,
      updated_at: session.updated_at,
      generation_lease_active: isGenerationLeaseActive(session.generation_lease_expires_at),
    };
    return Response.json({
      session: safeSession,
      sources: sources ?? [],
      guide,
      guide_ready: Boolean(guide),
      generation: generationSnapshot(generationResult.data as Record<string, unknown> | null),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
