import { z } from "zod";

export const LIBRARY_DEFAULT_LIMIT = 12;
export const LIBRARY_MAX_LIMIT = 24;
export const SEARCH_DEFAULT_LIMIT = 12;
export const SEARCH_MAX_LIMIT = 24;
export const SEARCH_QUERY_MIN_LENGTH = 2;
export const SEARCH_QUERY_MAX_LENGTH = 100;

const pageSchema = z.coerce.number().int().min(1).default(1);
const boundedLibraryLimitSchema = z.coerce.number().int().min(1).max(LIBRARY_MAX_LIMIT).default(LIBRARY_DEFAULT_LIMIT);
const boundedSearchLimitSchema = z.coerce.number().int().min(1).max(SEARCH_MAX_LIMIT).default(SEARCH_DEFAULT_LIMIT);

export const libraryListOptionsSchema = z.object({
  type: z.enum(["all", "pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "image"]).default("all"),
  sort: z.enum(["newest", "oldest", "name"]).default("newest"),
  page: pageSchema,
  limit: boundedLibraryLimitSchema,
}).strict();

export const searchOptionsSchema = z.object({
  q: z.string().trim().min(SEARCH_QUERY_MIN_LENGTH).max(SEARCH_QUERY_MAX_LENGTH),
  page: pageSchema,
  limit: boundedSearchLimitSchema,
}).strict();

export type LibraryListOptions = z.infer<typeof libraryListOptionsSchema>;
export type SearchOptions = z.infer<typeof searchOptionsSchema>;

export function parseLibrarySearchParams(searchParams: URLSearchParams) {
  return libraryListOptionsSchema.parse({
    type: searchParams.get("type") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}

export function parseKnowledgeSearchParams(searchParams: URLSearchParams) {
  return searchOptionsSchema.parse({
    q: searchParams.get("q") ?? "",
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
}
