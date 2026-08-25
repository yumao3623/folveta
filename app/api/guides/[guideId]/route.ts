import { requireOwnedGuide } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(_request: Request, context: { params: Promise<{ guideId: string }> }) {
  try {
    const { guideId } = await context.params;
    const guide = await requireOwnedGuide(guideId);
    if (!guide) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    const accessedAt = new Date().toISOString();
    await Promise.all([
      getSupabaseAdmin().from("study_guides").update({ last_accessed_at: accessedAt }).eq("id", guide.id),
      getSupabaseAdmin().from("preparation_sessions").update({ last_accessed_at: accessedAt }).eq("id", guide.session_id),
    ]);
    return Response.json({
      guide: {
        id: guide.id,
        title: guide.title,
        createdAt: guide.created_at,
        updatedAt: guide.updated_at,
        lastAccessedAt: accessedAt,
        reopenPath: `/study/${guide.session_id}`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
