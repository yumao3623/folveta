import { guideMutationSchema } from "@/lib/schemas/guide-management";
import { getCurrentUser } from "@/lib/server/auth";
import { requireOwnedGuide } from "@/lib/server/auth";
import {
  renameOwnedGuide,
  setOwnedGuideArchived,
  softDeleteOwnedGuide,
  touchOwnedGuide,
} from "@/lib/server/guides";
import { AppError, errorResponse, requireSameOrigin } from "@/lib/server/http";

export async function GET(_request: Request, context: { params: Promise<{ guideId: string }> }) {
  try {
    const { guideId } = await context.params;
    const guide = await requireOwnedGuide(guideId);
    if (!guide) throw new AppError("GUIDE_NOT_FOUND", "This Guide is unavailable.", 404);
    const accessedAt = await touchOwnedGuide(guide);
    return Response.json({
      guide: {
        id: guide.id,
        title: guide.title,
        createdAt: guide.created_at,
        updatedAt: guide.updated_at,
        lastAccessedAt: accessedAt,
        reopenPath: `/study/${guide.session_id}`,
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
