import { z } from "zod";

export const GUIDE_TITLE_MAX_LENGTH = 140;
export const GUIDE_LIST_DEFAULT_LIMIT = 12;
export const GUIDE_LIST_MAX_LIMIT = 24;

export const guideTitleSchema = z
  .string()
  .trim()
  .min(1, "Enter a title for this Guide.")
  .max(GUIDE_TITLE_MAX_LENGTH, `Keep the title to ${GUIDE_TITLE_MAX_LENGTH} characters or fewer.`);

export const guideListViewSchema = z.enum(["active", "archived"]);

export const guideListOptionsSchema = z.object({
  view: guideListViewSchema.default("active"),
  page: z.coerce.number().int().min(1).max(1_000).default(1),
  limit: z.coerce.number().int().min(1).max(GUIDE_LIST_MAX_LIMIT).default(GUIDE_LIST_DEFAULT_LIMIT),
}).strict();

export const guideMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), title: guideTitleSchema }).strict(),
  z.object({ action: z.literal("archive") }).strict(),
  z.object({ action: z.literal("restore") }).strict(),
]);

export type GuideListOptions = z.infer<typeof guideListOptionsSchema>;
export type GuideListView = z.infer<typeof guideListViewSchema>;

export function parseGuideListSearchParams(searchParams: URLSearchParams) {
  return guideListOptionsSchema.parse({
    view: searchParams.get("view") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}
