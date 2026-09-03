import { start } from "workflow/api";
import { generateStudyGuideV2Workflow } from "@/app/workflows/generation-v2";
import { createOrJoinV2RuntimeRequest } from "@/lib/ai/generation-v2-runtime";
import { getServerEnv } from "@/lib/env";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!getServerEnv().GENERATION_V2_RUNTIME_ENABLED) throw new AppError("GENERATION_V2_DISABLED", "Generation v2 is not enabled in this environment.", 404);
    const body = await request.json().catch(() => ({})) as { sessionId?: unknown; outputLanguage?: unknown };
    if (typeof body.sessionId !== "string") throw new AppError("SESSION_NOT_FOUND", "A study session is required.", 400);
    if (!(await requireOwnedSession(body.sessionId))) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or unavailable.", 404);
    const outputLanguage = body.outputLanguage === "en" || body.outputLanguage === "zh" ? body.outputLanguage : "match_materials";
    const { request: runtimeRequest } = await createOrJoinV2RuntimeRequest(body.sessionId, outputLanguage);
    let workflowRunId: string | null = null;
    if (!["complete", "complete_with_gaps", "failed_no_guide"].includes(runtimeRequest.status)) {
      const run = await start(generateStudyGuideV2Workflow, [runtimeRequest.id]);
      workflowRunId = run.runId;
    }
    return Response.json({ request: runtimeRequest, accepted: true, workflowRunId }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
