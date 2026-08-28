import { z } from "zod";

export const sourceKindSchema = z.enum(["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "image"]);
export const locatorKindSchema = z.enum(["page", "slide", "paragraph", "sheet", "image", "file"]);
export const sourceStatusSchema = z.enum([
  "uploading",
  "uploaded",
  "parsing",
  "ready",
  "ready_with_gaps",
  "cannot_use",
]);

export const sourceWarningSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
    locator: z.number().int().positive().nullable(),
  })
  .strict();

export const sourceSchema = z
  .object({
    id: z.uuid(),
    session_id: z.uuid(),
    display_name: z.string().min(1),
    kind: sourceKindSchema,
    mime_type: z.string().min(1),
    size_bytes: z.number().int().nonnegative(),
    storage_path: z.string().min(1),
    file_hash: z.string().nullable(),
    status: sourceStatusSchema,
    unit_count: z.number().int().nonnegative(),
    readable_unit_count: z.number().int().nonnegative(),
    warnings: z.array(sourceWarningSchema),
    error_code: z.string().nullable(),
    error_message: z.string().nullable(),
  })
  .strict();

export const sourceSpanSchema = z
  .object({
    id: z.string().min(12),
    source_id: z.uuid(),
    locator: z
      .object({
        kind: locatorKindSchema,
        number: z.number().int().positive(),
      })
      .strict(),
    text: z.string().min(1),
    excerpt: z.string().min(1),
    content_hash: z.string().min(16),
  })
  .strict();

export type Source = z.infer<typeof sourceSchema>;
export type SourceKind = z.infer<typeof sourceKindSchema>;
export type LocatorKind = z.infer<typeof locatorKindSchema>;
export type SourceSpan = z.infer<typeof sourceSpanSchema>;
export type SourceWarning = z.infer<typeof sourceWarningSchema>;
