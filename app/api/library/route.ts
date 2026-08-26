import { parseLibrarySearchParams } from "@/lib/schemas/library-search";
import { getCurrentUser } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { listOwnedSources } from "@/lib/server/library";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to view your Library.", 401);
    const options = parseLibrarySearchParams(new URL(request.url).searchParams);
    return Response.json(await listOwnedSources(user.id, options));
  } catch (error) {
    return errorResponse(error);
  }
}
