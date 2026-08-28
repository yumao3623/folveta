import { randomUUID } from "node:crypto";
import { z } from "zod";
import { isSupportedSourceMimeType, MVP_LIMITS, sourceKindFromFilename, STORAGE_BUCKET } from "@/lib/config";
import { requireOwnedSession } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const inputSchema = z.object({
  filename: z.string().trim().min(1).max(240),
  mimeType: z.string().min(1).max(180),
  size: z.number().int().positive().max(MVP_LIMITS.maxFileBytes),
}).strict();

function fileKind(filename: string) {
  const kind = sourceKindFromFilename(filename);
  if (kind) return kind;
  throw new AppError("UNSUPPORTED_FILE", "This file type is not supported. Upload PDF, Word, Excel, PowerPoint, or an image.", 415);
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-180);
}

export async function POST(request: Request, context: RouteContext<"/api/sessions/[sessionId]/sources/upload-url">) {
  try {
    const { sessionId } = await context.params;
    const session = await requireOwnedSession(sessionId);
    if (!session) throw new AppError("SESSION_NOT_FOUND", "This study session is missing or expired.", 404);
    const input = inputSchema.parse(await request.json());
    const kind = fileKind(input.filename);
    if (!isSupportedSourceMimeType(kind, input.mimeType)) {
      throw new AppError("UNSUPPORTED_FILE", "The file type does not match its supported format.", 415);
    }
    const admin = getSupabaseAdmin();

    const { count, error: countError } = await admin
      .from("sources")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId);
    if (countError) throw countError;
    if ((count ?? 0) >= MVP_LIMITS.maxFiles) {
      throw new AppError("FILE_LIMIT_EXCEEDED", `You can upload at most ${MVP_LIMITS.maxFiles} files in one session.`, 413);
    }

    const sourceId = randomUUID();
    const path = `${sessionId}/${sourceId}/${safeFilename(input.filename)}`;
    const { error: insertError } = await admin.from("sources").insert({
      id: sourceId,
      session_id: sessionId,
      display_name: input.filename,
      kind,
      mime_type: input.mimeType,
      size_bytes: input.size,
      storage_path: path,
      status: "uploading",
    });
    if (insertError) throw insertError;

    const { data, error } = await admin.storage.from(STORAGE_BUCKET).createSignedUploadUrl(path);
    if (error) {
      await admin.from("sources").update({ status: "cannot_use", error_code: "UPLOAD_URL_FAILED", error_message: "A private upload URL could not be created." }).eq("id", sourceId);
      throw new AppError("UPLOAD_URL_FAILED", "A private upload URL could not be created.", 502);
    }

    return Response.json({ sourceId, path: data.path, token: data.token }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
