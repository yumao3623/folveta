import { z } from "zod";
import { requireOwnedSource } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const schema = z.object({ message: z.string().min(1).max(500) }).strict();

export async function POST(request: Request, context: RouteContext<"/api/sources/[sourceId]/upload-failed">) {
  try {
    const { sourceId } = await context.params;
    const source = await requireOwnedSource(sourceId);
    if (!source) throw new AppError("SOURCE_NOT_FOUND", "This source is missing or expired.", 404);
    const input = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("sources").update({
      status: "cannot_use",
      error_code: "UPLOAD_FAILED",
      error_message: input.message,
      updated_at: new Date().toISOString(),
    }).eq("id", sourceId);
    if (error) throw error;
    await admin.from("preparation_sessions").update({
      state: "ready_with_gaps",
      current_stage: "upload_failed",
      error_code: "UPLOAD_FAILED",
      error_message: input.message,
      updated_at: new Date().toISOString(),
    }).eq("id", source.session_id);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
