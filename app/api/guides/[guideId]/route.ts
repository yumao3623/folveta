import { guideMutationSchema } from "@/lib/schemas/guide-management";
import { getCurrentUser, requireOwnedGuide } from "@/lib/server/auth";
import {
  renameOwnedGuide,
  requireAuthenticatedOwnedGuide,
  setOwnedGuideArchived,
  softDeleteOwnedGuide,
  touchOwnedGuide,
} from "@/lib/server/guides";
import { AppError, errorResponse, requireSameOrigin } from "@/lib/server/http";

export async function GET(_request: Request, context: { params: Promise<{ guideId: string }> }) {
  try {
    const user = await getCurrentUser();
    const { guideId } = await context.params;
    const owned = user
      ? await requireAuthenticatedOwnedGuide(user.id, guideId)
      : await requireOwnedGuide(guideId).then((guide) => guide ? { guide: { ...guide, engine: "v1" as const } } : null);
    if (!owned) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    const accessedAt = await touchOwnedGuide(owned.guide);
    return Response.json({
      guide: {
        id: owned.guide.id,
        title: owned.guide.title,
        createdAt: owned.guide.created_at,
        updatedAt: owned.guide.updated_at,
        lastAccessedAt: accessedAt,
        reopenPath: `/study/${owned.guide.session_id}`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<"/api/guides/[guideId]">) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to manage your Guides.", 401);
    const { guideId } = await context.params;
    const parsed = guideMutationSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new AppError(
        "INVALID_GUIDE_UPDATE",
        parsed.error.issues[0]?.message ?? "This Guide update is invalid.",
        422,
        parsed.error.issues,
      );
    }
    const input = parsed.data;
    const result = input.action === "rename"
      ? await renameOwnedGuide(user.id, guideId, input.title)
      : await setOwnedGuideArchived(user.id, guideId, input.action === "archive");
    if (!result) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    return Response.json({ guide: result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<"/api/guides/[guideId]">) {
  try {
    requireSameOrigin(request);
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to manage your Guides.", 401);
    const { guideId } = await context.params;
    const result = await softDeleteOwnedGuide(user.id, guideId);
    if (!result) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    return Response.json({ guide: result });
  } catch (error) {
    return errorResponse(error);
  }
}
