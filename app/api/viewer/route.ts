import { getCurrentUser } from "@/lib/server/auth";
import { getBillingLimitsForUser } from "@/lib/server/billing";
import { errorResponse, privateResponse } from "@/lib/server/http";
import type { PublicViewer } from "@/lib/public-viewer";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const limits = await getBillingLimitsForUser(user?.id ?? null);
    const viewer: PublicViewer = {
      user: user ? { id: user.id, email: user.email ?? null } : null,
      limits,
    };
    return privateResponse(Response.json(viewer));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}
