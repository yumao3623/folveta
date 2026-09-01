import { z } from "zod";
import { generateQuickCheck, checksumGuide } from "@/lib/ai/quick-check";
import { MVP_LIMITS } from "@/lib/config";
import { guideSchema, quickCheckSchema, toTakingQuickCheck } from "@/lib/schemas";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { enforceRateLimit, sessionRateLimitKey } from "@/lib/server/rate-limit";

export const maxDuration = 300;

const inputSchema = z.object({
  questionCount: z.number().int().min(5).max(MVP_LIMITS.maxQuickCheckQuestions)
    .default(MVP_LIMITS.defaultQuickCheckQuestions),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    await enforceRateLimit({ scope: "quick_check.generate", key: sessionRateLimitKey(sessionId), limit: 5, windowSeconds: 3600 });
    const input = inputSchema.parse(await request.json().catch(() => ({})));
    const admin = getSupabaseAdmin();
    const { data: guideRow, error: guideError } = await admin
      .from("study_guides")
      .select("guide_json")
      .eq("session_id", sessionId)
      .maybeSingle();
    if (guideError) throw guideError;
    if (!guideRow) throw new AppError("GUIDE_NOT_READY", "Generate the Study Guide before starting a Quick Check.", 409);

    const guide = guideSchema.parse(guideRow.guide_json);
    const guideChecksum = checksumGuide(guide);
    const { data: existingRow, error: existingError } = await admin
      .from("quick_checks")
      .select("quick_check_json")
      .eq("session_id", sessionId)
      .eq("guide_checksum", guideChecksum)
      .eq("requested_question_count", input.questionCount)
      .maybeSingle();
    if (existingError) throw existingError;

    const quickCheck = existingRow
      ? quickCheckSchema.parse(existingRow.quick_check_json)
      : (await generateQuickCheck(sessionId, guide, input.questionCount)).quickCheck;
    return Response.json({ quickCheck: toTakingQuickCheck(quickCheck) }, { status: existingRow ? 200 : 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
