import { readGenerationV2Artifacts, readGenerationV2Request, readOwnedGenerationV2Guide } from "@/lib/server/generation-v2-persistence";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { v2ReadModelStatus } from "@/lib/ai/generation-v2-runtime";

export async function GET(_request: Request) {
  try {
    const requestId = new URL(_request.url).searchParams.get("requestId");
    if (!requestId) throw new AppError("V2_REQUEST_NOT_FOUND", "A v2 request is required.", 400);
    const request = await readGenerationV2Request(requestId);
    if (!request || !(await requireOwnedSession(request.session_id))) throw new AppError("V2_REQUEST_NOT_FOUND", "This v2 request is unavailable.", 404);
    const [artifacts, guide] = await Promise.all([readGenerationV2Artifacts(requestId), readOwnedGenerationV2Guide(request.session_id, requestId)]);
    const rows = artifacts.map((row) => row.artifact).filter(Boolean) as Array<{ status: string }>;
    const completed = rows.filter((artifact) => artifact.status === "complete").length;
    const gaps = rows.filter((artifact) => artifact.status === "gap").length;
    return Response.json({ request: { id: request.id, status: v2ReadModelStatus(request.status, rows), updated_at: request.updated_at, completed_at: request.completed_at }, artifacts: { completed, total: rows.length, gaps }, guide: guide?.guide_json ?? null });
  } catch (error) { return errorResponse(error); }
}
