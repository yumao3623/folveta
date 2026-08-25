import { claimCurrentAnonymousSession, getCurrentUser } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";

export async function POST() {
  try {
    if (!(await getCurrentUser())) throw new AppError("AUTH_REQUIRED", "Sign in before saving this Guide.", 401);
    const sessionId = await claimCurrentAnonymousSession();
    return Response.json({ claimed: Boolean(sessionId), sessionId });
  } catch (error) {
    return errorResponse(error);
  }
}
