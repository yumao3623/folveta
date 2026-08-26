import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { requireAuthenticatedOwnedGuide, touchOwnedGuide } from "@/lib/server/guides";
import { AppError, errorResponse } from "@/lib/server/http";

export async function GET(request: Request, context: { params: Promise<{ guideId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const { guideId } = await context.params;
      const next = `/api/guides/${guideId}/reopen`;
      return NextResponse.redirect(new URL(`/auth?next=${encodeURIComponent(next)}`, request.url));
    }
    const { guideId } = await context.params;
    const owned = await requireAuthenticatedOwnedGuide(user.id, guideId);
    if (!owned) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    await touchOwnedGuide(owned.guide);
    return NextResponse.redirect(new URL(`/study/${owned.guide.session_id}`, request.url));
  } catch (error) {
    return errorResponse(error);
  }
}
