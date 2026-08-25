import { AppError, errorResponse } from "@/lib/server/http";
import { purgeDueSessions, retentionRequestAuthorized } from "@/lib/server/retention";

export async function POST(request: Request) {
  try {
    const secret = process.env.RETENTION_JOB_SECRET;
    if (!secret) throw new AppError("RETENTION_NOT_CONFIGURED", "Retention cleanup is not configured.", 503);
    if (!retentionRequestAuthorized(request.headers.get("authorization"), secret)) {
      throw new AppError("UNAUTHORIZED", "This endpoint requires retention-job authorization.", 401);
    }
    return Response.json(await purgeDueSessions());
  } catch (error) {
    return errorResponse(error);
  }
}
