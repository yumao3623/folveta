import { deleteOwnedAccount } from "@/lib/server/account-deletion";
import { getCurrentUser } from "@/lib/server/auth";
import { AppError, errorResponse, requireSameOrigin } from "@/lib/server/http";
import { enforceRateLimit, requestRateLimitKey } from "@/lib/server/rate-limit";

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to delete your account.", 401);
    const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
    if (body?.confirmation !== "DELETE") {
      throw new AppError("DELETE_CONFIRMATION_REQUIRED", "Type DELETE to confirm account deletion.", 422);
    }
    await enforceRateLimit({ scope: "account.delete", key: requestRateLimitKey(request), limit: 3, windowSeconds: 3600 });
    return Response.json(await deleteOwnedAccount(user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
