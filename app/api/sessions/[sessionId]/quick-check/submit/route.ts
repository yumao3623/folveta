import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  quickCheckAttemptSchema,
  quickCheckSchema,
  QuickCheckScoringError,
  scoreQuickCheck,
  selectedAnswerSchema,
} from "@/lib/schemas";
import type { Json } from "@/lib/server/database.types";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const submitSchema = z.object({
  quickCheckId: z.uuid(),
  answers: z.array(selectedAnswerSchema).min(1).max(10),
}).strict();

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    const input = submitSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: quickCheckRow, error: quickCheckError } = await admin
      .from("quick_checks")
      .select("quick_check_json")
      .eq("id", input.quickCheckId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (quickCheckError) throw quickCheckError;
    if (!quickCheckRow) throw new AppError("QUICK_CHECK_NOT_FOUND", "This Quick Check is missing or no longer belongs to the current session.", 404);

    const quickCheck = quickCheckSchema.parse(quickCheckRow.quick_check_json);
    let result;
    try {
      result = scoreQuickCheck(quickCheck, input.answers);
    } catch (error) {
      if (error instanceof QuickCheckScoringError) {
        throw new AppError("INVALID_QUICK_CHECK_ANSWERS", error.message, 422);
      }
      throw error;
    }

    const attempt = quickCheckAttemptSchema.parse({
      id: randomUUID(),
      quick_check_id: quickCheck.id,
      status: "submitted",
      answers: input.answers,
      result,
      submitted_at: new Date().toISOString(),
    });
    const { error: persistError } = await admin.from("quick_check_attempts").insert({
      id: attempt.id,
      session_id: sessionId,
      quick_check_id: quickCheck.id,
      status: "submitted",
      selected_answers: attempt.answers as unknown as Json,
      result_json: attempt.result as unknown as Json,
      correct_count: attempt.result.correct_count,
      scored_count: attempt.result.scored_count,
      submitted_at: attempt.submitted_at,
    });
    if (persistError) throw persistError;

    return Response.json({
      attemptId: attempt.id,
      resultPath: `/study/${sessionId}/quick-check/${attempt.id}/result`,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
