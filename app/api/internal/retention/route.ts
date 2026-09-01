import { AppError, errorResponse } from "@/lib/server/http";
import { purgeDueSessions, retentionRequestAuthorized } from "@/lib/server/retention";

async function runRetention(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const retentionSecret = process.env.RETENTION_JOB_SECRET;
  if (!cronSecret && !retentionSecret) throw new AppError("RETENTION_NOT_CONFIGURED", "Retention cleanup is not configured.", 503);
  if (!retentionRequestAuthorized(request.headers.get("authorization"), cronSecret, retentionSecret)) {
    throw new AppError("UNAUTHORIZED", "This endpoint requires retention-job authorization.", 401);
  }
  const result = await purgeDueSessions();
  console.info(JSON.stringify({ event: "retention_completed", ...result }));
  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    return await runRetention(request);
  } catch (error) {
    console.error(JSON.stringify({ event: "retention_failed", code: error instanceof AppError ? error.code : "UNKNOWN" }));
    return errorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    return await runRetention(request);
  } catch (error) {
    console.error(JSON.stringify({ event: "retention_failed", code: error instanceof AppError ? error.code : "UNKNOWN" }));
    return errorResponse(error);
  }
}
