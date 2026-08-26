import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, FileText, Search, TextSearch } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH, searchOptionsSchema } from "@/lib/schemas/library-search";
import { getCurrentUser } from "@/lib/server/auth";
import { searchOwnedKnowledge, type KnowledgeSearchResult } from "@/lib/server/knowledge-search";

export const metadata: Metadata = { title: "Search your knowledge", robots: { index: false, follow: false } };

function firstValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function resultIcon(type: KnowledgeSearchResult["type"]) {
  if (type === "guide") return <BookOpen className="h-5 w-5" strokeWidth={1.8} />;
  if (type === "topic") return <TextSearch className="h-5 w-5" strokeWidth={1.8} />;
  return <FileText className="h-5 w-5" strokeWidth={1.8} />;
}
function resultLabel(type: KnowledgeSearchResult["type"]) { return type[0].toUpperCase() + type.slice(1); }
function searchHref(q: string, page: number) { return `/search?${new URLSearchParams({ q, page: String(page) }).toString()}`; }

function SearchResultRow({ result }: { result: KnowledgeSearchResult }) {
  return (
    <article className="border-b border-[var(--border-soft)] py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-4">
        <span className="ui-icon-frame ui-icon-frame--md ui-icon-frame--primary shrink-0">{resultIcon(result.type)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><Badge tone={result.type === "source" ? "source" : "primary"}>{resultLabel(result.type)}</Badge>{result.subtitle && <span className="truncate text-[12px] text-[var(--muted)]">{result.subtitle}</span>}</div>
          <h2 className="mt-2 break-words text-[17px] font-semibold"><Link href={result.href} className="rounded-sm text-[var(--foreground)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">{result.title}</Link></h2>
          {result.excerpt && <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-[var(--muted)]">{result.excerpt}</p>}
        </div>
      </div>
    </article>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/search");
  const query = await searchParams;
  const rawQuery = firstValue(query.q)?.trim() ?? "";
  const parsed = searchOptionsSchema.safeParse({ q: rawQuery, page: firstValue(query.page), limit: undefined });
  const validationMessage = rawQuery && !parsed.success ? `Enter between ${SEARCH_QUERY_MIN_LENGTH} and ${SEARCH_QUERY_MAX_LENGTH} characters.` : null;
  const result = parsed.success ? await searchOwnedKnowledge(parsed.data) : null;

  return (
    <WorkspaceShell active="search">
      <div className="mx-auto w-full max-w-[880px]">
        <header className="border-b border-[var(--border)] pb-7">
          <p className="text-label-sm text-[var(--primary)]">Private workspace search</p>
          <h1 className="mt-2 font-display text-[36px] font-extrabold leading-tight text-[var(--foreground)] sm:text-[44px]">Search your knowledge</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[var(--muted)]">Find Guides, topics, filenames, and source text owned by your account.</p>
        </header>
        <form action="/search" className="mt-6" role="search">
          <label htmlFor="knowledge-query" className="sr-only">Search your Guides and source materials</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--muted)]" /><Input id="knowledge-query" name="q" type="search" defaultValue={rawQuery} minLength={SEARCH_QUERY_MIN_LENGTH} maxLength={SEARCH_QUERY_MAX_LENGTH} placeholder="Search Guides, topics, and sources" className="pl-11" state={validationMessage ? "error" : "default"} aria-describedby={validationMessage ? "search-error" : undefined} /></div>
            <button type="submit" className={buttonClassName()}><Search className="h-4 w-4" /> Search</button>
          </div>
          {validationMessage && <p id="search-error" role="alert" className="mt-2 text-[13px] text-[var(--destructive)]">{validationMessage}</p>}
        </form>

        <section className="mt-7" aria-live="polite" aria-label="Knowledge search results">
          {!rawQuery ? (
            <EmptyState icon={<Search className="h-5 w-5" />} title="Search your workspace" description="Use a Guide title, topic, concept, source filename, or phrase from your uploaded materials." />
          ) : validationMessage ? null : result?.results.length ? (
            <><div className="mb-4 flex items-center justify-between gap-4"><p className="text-[13px] text-[var(--muted)]">{result.total} result{result.total === 1 ? "" : "s"}</p><p className="text-[12px] text-[var(--muted)]">Page {result.page}</p></div><div className="ui-surface ui-surface--base p-5 sm:p-6">{result.results.map((item) => <SearchResultRow key={`${item.type}-${item.id}`} result={item} />)}</div></>
          ) : (
            <EmptyState icon={<Search className="h-5 w-5" />} title="No results" description={`Nothing in your active Guides or source materials matched "${rawQuery}".`} />
          )}
        </section>
        {result && (result.hasPreviousPage || result.hasNextPage) && <nav className="mt-5 flex items-center justify-between" aria-label="Search result pages">{result.hasPreviousPage ? <Link href={searchHref(rawQuery, result.page - 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Previous</Link> : <span />}<span className="text-[12px] text-[var(--muted)]">Page {result.page}</span>{result.hasNextPage ? <Link href={searchHref(rawQuery, result.page + 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Next</Link> : <span />}</nav>}
      </div>
    </WorkspaceShell>
  );
}
