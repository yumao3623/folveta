import type { SearchOptions } from "@/lib/schemas/library-search";
import { getSupabaseAuth } from "@/lib/server/supabase-auth";

export type KnowledgeSearchResultType = "guide" | "topic" | "source";

type SearchRpcRow = {
  result_type: KnowledgeSearchResultType;
  result_id: string;
  guide_id: string | null;
  session_id: string;
  source_id: string | null;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  rank: number;
  total_count: number;
};

export type KnowledgeSearchResult = {
  type: KnowledgeSearchResultType;
  id: string;
  guideId: string | null;
  sessionId: string;
  sourceId: string | null;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  href: string;
};

export type KnowledgeSearchPage = {
  results: KnowledgeSearchResult[];
  page: number;
  limit: number;
  total: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

function resultHref(row: SearchRpcRow) {
  if (row.result_type === "topic") return `/study/${row.session_id}#${encodeURIComponent(row.result_id)}`;
  if (row.guide_id) return `/api/guides/${row.guide_id}/reopen`;
  return `/study/${row.session_id}`;
}

export function toKnowledgeSearchResult(row: SearchRpcRow): KnowledgeSearchResult {
  return {
    type: row.result_type,
    id: row.result_id,
    guideId: row.guide_id,
    sessionId: row.session_id,
    sourceId: row.source_id,
    title: row.title,
    subtitle: row.subtitle,
    excerpt: row.excerpt?.replace(/[{}\[\]"]/g, " ").replace(/\s+/g, " ").trim() || null,
    href: resultHref(row),
  };
}

export async function searchOwnedKnowledge(options: SearchOptions): Promise<KnowledgeSearchPage> {
  const offset = (options.page - 1) * options.limit;
  const supabase = await getSupabaseAuth();
  const { data, error } = await supabase.rpc("search_owned_knowledge", {
    search_query: options.q,
    result_limit: options.limit,
    result_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []) as SearchRpcRow[];
  const total = Number(rows[0]?.total_count ?? 0);
  return {
    results: rows.map(toKnowledgeSearchResult),
    page: options.page,
    limit: options.limit,
    total,
    hasPreviousPage: options.page > 1,
    hasNextPage: offset + rows.length < total,
  };
}
