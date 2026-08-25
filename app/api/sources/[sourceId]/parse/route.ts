import { createHash } from "node:crypto";
import { MVP_LIMITS, STORAGE_BUCKET } from "@/lib/config";
import { requireOwnedSource } from "@/lib/server/auth";
import { AppError, errorResponse } from "@/lib/server/http";
import { createSpanRows, parseMaterial } from "@/lib/server/parser";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const maxDuration = 60;

async function failSource(sourceId: string, error: unknown) {
  const code = error instanceof AppError ? error.code : "PARSING_FAILED";
  const message = error instanceof AppError ? error.message : "This source could not be parsed.";
  const admin = getSupabaseAdmin();
  const { data: source } = await admin.from("sources").update({
    status: "cannot_use",
    error_code: code,
    error_message: message,
    updated_at: new Date().toISOString(),
  }).eq("id", sourceId).select("session_id").maybeSingle();
  if (source) {
    await admin.from("preparation_sessions").update({
      state: "ready_with_gaps",
      current_stage: "parsing_complete",
      error_code: code,
      error_message: message,
      updated_at: new Date().toISOString(),
    }).eq("id", source.session_id);
  }
}

export async function POST(_request: Request, context: RouteContext<"/api/sources/[sourceId]/parse">) {
  const { sourceId } = await context.params;
  let authorized = false;
  try {
    const source = await requireOwnedSource(sourceId);
    if (!source) throw new AppError("SOURCE_NOT_FOUND", "This source is missing or expired.", 404);
    authorized = true;
    const admin = getSupabaseAdmin();
    await admin.from("sources").update({ status: "parsing", error_code: null, error_message: null }).eq("id", sourceId);
    await admin.from("preparation_sessions").update({ state: "parsing", current_stage: "parsing" }).eq("id", source.session_id);

    const { data: blob, error: downloadError } = await admin.storage.from(STORAGE_BUCKET).download(source.storage_path);
    if (downloadError || !blob) throw new AppError("UPLOAD_MISSING", "The uploaded file could not be read from private storage.", 422);
    const buffer = Buffer.from(await blob.arrayBuffer());
    if (buffer.length !== Number(source.size_bytes) || buffer.length > MVP_LIMITS.maxFileBytes) {
      throw new AppError("FILE_SIZE_MISMATCH", "The uploaded file size did not match the declared file.", 422);
    }
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    const { data: duplicate, error: duplicateError } = await admin
      .from("sources")
      .select("id, display_name")
      .eq("session_id", source.session_id)
      .eq("file_hash", fileHash)
      .neq("id", sourceId)
      .neq("status", "cannot_use")
      .maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) {
      throw new AppError("DUPLICATE_FILE", `This file duplicates ${duplicate.display_name} and was excluded so repetition is not overstated.`, 409);
    }

    const parsed = await parseMaterial(buffer, source.kind);
    const extractedCharacters = parsed.units.reduce((sum, unit) => sum + unit.normalizedText.length, 0);
    const { data: otherSources, error: totalsError } = await admin
      .from("sources")
      .select("unit_count, extracted_character_count")
      .eq("session_id", source.session_id)
      .neq("id", sourceId)
      .in("status", ["ready", "ready_with_gaps"]);
    if (totalsError) throw totalsError;
    const existingUnits = (otherSources ?? []).reduce((sum, item) => sum + Number(item.unit_count), 0);
    const existingCharacters = (otherSources ?? []).reduce((sum, item) => sum + Number(item.extracted_character_count), 0);
    if (existingUnits + parsed.units.length > MVP_LIMITS.maxTotalUnits) {
      throw new AppError("UNIT_LIMIT_EXCEEDED", `This upload would exceed the ${MVP_LIMITS.maxTotalUnits} combined page/slide limit.`, 413);
    }
    if (existingCharacters + extractedCharacters > MVP_LIMITS.maxExtractedCharacters) {
      throw new AppError("TEXT_LIMIT_EXCEEDED", `This upload would exceed the ${MVP_LIMITS.maxExtractedCharacters.toLocaleString()} extracted-character limit.`, 413);
    }

    const unitRows = parsed.units.map((unit) => ({
      session_id: source.session_id,
      source_id: sourceId,
      locator_kind: unit.locatorKind,
      locator_number: unit.locatorNumber,
      title: unit.title,
      raw_text: unit.rawText,
      normalized_text: unit.normalizedText,
      readable: unit.readable,
      warnings: unit.warnings,
      content_hash: unit.contentHash,
    }));
    const spanRows = createSpanRows(sourceId, source.session_id, parsed.units);
    await admin.from("source_units").delete().eq("source_id", sourceId);
    await admin.from("source_spans").delete().eq("source_id", sourceId);
    if (unitRows.length) {
      const { error } = await admin.from("source_units").insert(unitRows);
      if (error) throw error;
    }
    if (spanRows.length) {
      const { error } = await admin.from("source_spans").insert(spanRows);
      if (error) throw error;
    }

    const readableCount = parsed.units.filter((unit) => unit.readable).length;
    if (readableCount === 0) throw new AppError("NO_READABLE_TEXT", "No reliable text was found. Scanned or image-only materials are not supported.", 422);
    const status = parsed.warnings.length ? "ready_with_gaps" : "ready";
    const { error: updateError } = await admin.from("sources").update({
      file_hash: fileHash,
      status,
      unit_count: parsed.units.length,
      readable_unit_count: readableCount,
      extracted_character_count: extractedCharacters,
      warnings: parsed.warnings,
      updated_at: new Date().toISOString(),
    }).eq("id", sourceId);
    if (updateError) throw updateError;

    const { data: sessionSources, error: statesError } = await admin.from("sources").select("status").eq("session_id", source.session_id);
    if (statesError) throw statesError;
    const sessionState = (sessionSources ?? []).some((item) => item.status === "ready_with_gaps" || item.status === "cannot_use") ? "ready_with_gaps" : "ready";
    await admin.from("preparation_sessions").update({ state: sessionState, current_stage: "parsing_complete", error_code: null, error_message: null }).eq("id", source.session_id);

    return Response.json({ source: { id: sourceId, status, unitCount: parsed.units.length, readableUnitCount: readableCount, warnings: parsed.warnings } });
  } catch (error) {
    if (authorized) await failSource(sourceId, error);
    return errorResponse(error);
  }
}
