import { parseGuideListSearchParams } from "@/lib/schemas/guide-management";
import { getCurrentUser } from "@/lib/server/auth";
import { listOwnedGuides } from "@/lib/server/guides";
import { AppError, errorResponse } from "@/lib/server/http";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to view your Guides.", 401);
    const options = parseGuideListSearchParams(new URL(request.url).searchParams);
    return Response.json(await listOwnedGuides(user.id, options));
  } catch (error) {
    return errorResponse(error);
  }
}
