import { parseKnowledgeSearchParams } from "@/lib/schemas/library-search";
import { getCurrentUser } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { searchOwnedKnowledge } from "@/lib/server/knowledge-search";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new AppError("AUTH_REQUIRED", "Sign in to search your knowledge.", 401);
    const options = parseKnowledgeSearchParams(new URL(request.url).searchParams);
    return Response.json(await searchOwnedKnowledge(options));
  } catch (error) {
    return errorResponse(error);
  }
}
