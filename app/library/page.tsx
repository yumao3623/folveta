import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FolderOpen, Presentation } from "lucide-react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClassName } from "@/components/ui/styles";
import { libraryListOptionsSchema, type LibraryListOptions } from "@/lib/schemas/library-search";
import { getCurrentUser } from "@/lib/server/auth";
import { listOwnedSources, type LibraryItem } from "@/lib/server/library";

export const metadata: Metadata = { title: "Library", robots: { index: false, follow: false } };

function firstValue(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function libraryHref(options: LibraryListOptions, page: number) {
  return `/library?${new URLSearchParams({ type: options.type, sort: options.sort, page: String(page) }).toString()}`;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
function statusLabel(status: string) {
  const labels: Record<string, string> = { uploading: "Uploading", uploaded: "Uploaded", parsing: "Processing", ready: "Ready", ready_with_gaps: "Ready with gaps", cannot_use: "Could not process" };
  return labels[status] ?? status.replaceAll("_", " ");
}

function SourceRow({ source }: { source: LibraryItem }) {
  const SourceIcon = source.kind === "pdf" ? FileText : Presentation;
  return (
    <article className="border-b border-[var(--border-soft)] py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-4">
        <span className="ui-icon-frame ui-icon-frame--md ui-icon-frame--source shrink-0"><SourceIcon className="h-5 w-5" strokeWidth={1.8} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-[16px] font-semibold text-[var(--foreground)]">{source.filename}</h2>
            <Badge tone="source">{source.kind.toUpperCase()}</Badge>
            <Badge tone={source.status === "cannot_use" ? "warning" : "neutral"}>{statusLabel(source.status)}</Badge>
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--muted)]">
            <div><dt className="sr-only">Uploaded</dt><dd>Uploaded {formatDate(source.createdAt)}</dd></div>
            <div><dt className="sr-only">Units</dt><dd>{source.unitCount} {source.kind === "pdf" ? "page" : "slide"}{source.unitCount === 1 ? "" : "s"}</dd></div>
            {source.readableUnitCount !== source.unitCount && <div><dt className="sr-only">Readable units</dt><dd>{source.readableUnitCount} readable</dd></div>}
          </dl>
          <div className="mt-3 text-[13px] text-[var(--muted)]">
            {source.relatedGuide ? source.relatedGuide.archived ? (
              <span>Related Guide: <Link href="/my-guides?view=archived" className="font-medium text-[var(--foreground)] underline decoration-[var(--border-strong)] underline-offset-4">{source.relatedGuide.title}</Link> <Badge>Archived</Badge></span>
            ) : (
              <span>Related Guide: <Link href={`/api/guides/${source.relatedGuide.id}/reopen`} className="font-medium text-[var(--primary)] underline decoration-[var(--primary-soft-hover)] underline-offset-4">{source.relatedGuide.title}</Link></span>
            ) : <span>No generated Guide yet</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/library");
  const query = await searchParams;
  const parsed = libraryListOptionsSchema.safeParse({ type: firstValue(query.type), sort: firstValue(query.sort), page: firstValue(query.page), limit: undefined });
  const options = parsed.success ? parsed.data : { type: "all" as const, sort: "newest" as const, page: 1, limit: 12 };
  const result = await listOwnedSources(user.id, options);

  return (
    <WorkspaceShell active="library">
      <div className="mx-auto w-full max-w-[960px]">
        <header className="border-b border-[var(--border)] pb-7">
          <p className="text-label-sm text-[var(--primary)]">Your source materials</p>
          <h1 className="mt-2 font-display text-[36px] font-extrabold leading-tight text-[var(--foreground)] sm:text-[44px]">Library</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[var(--muted)]">Browse the PDF, Office, PowerPoint, and image materials already uploaded to your Guides.</p>
        </header>
        <form className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,200px)_auto]" action="/library">
          <label className="text-[13px] font-medium text-[var(--foreground)]">File type<select name="type" defaultValue={options.type} className="ui-field-control mt-2"><option value="all">All files</option><option value="pdf">PDF</option><option value="docx">Word</option><option value="xlsx">Excel</option><option value="pptx">PowerPoint</option><option value="image">Image</option><option value="ppt">Legacy PPT</option></select></label>
          <label className="text-[13px] font-medium text-[var(--foreground)]">Sort by<select name="sort" defaultValue={options.sort} className="ui-field-control mt-2"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Filename</option></select></label>
          <button type="submit" className={buttonClassName({ variant: "secondary", className: "self-end" })}>Apply</button>
        </form>
        <section className="mt-7 ui-surface ui-surface--base p-5 sm:p-6" aria-label="Uploaded source materials">
          {result.sources.length ? result.sources.map((source) => <SourceRow key={source.id} source={source} />) : (
          <EmptyState icon={<FolderOpen className="h-5 w-5" />} title="No source materials" description={options.type === "all" ? "Upload course material while creating a Guide and it will appear here." : `No ${options.type.toUpperCase()} files match this Library filter.`} action={<Link href="/#upload" className={buttonClassName({ size: "sm" })}>Upload material</Link>} />
          )}
        </section>
        {(result.hasPreviousPage || result.hasNextPage) && <nav className="mt-5 flex items-center justify-between" aria-label="Library pages">{result.hasPreviousPage ? <Link href={libraryHref(options, result.page - 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Previous</Link> : <span />}<span className="text-[12px] text-[var(--muted)]">Page {result.page}</span>{result.hasNextPage ? <Link href={libraryHref(options, result.page + 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Next</Link> : <span />}</nav>}
      </div>
    </WorkspaceShell>
  );
}
