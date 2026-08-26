import Link from "next/link";
import { BookOpen, CalendarDays, Clock3, Files, History } from "lucide-react";
import { GuideManagementActions } from "@/components/guide-management-actions";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/styles";
import type { GuideSummary } from "@/lib/server/guides";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function stateLabel(state: string) {
  const labels: Record<string, string> = {
    guide_ready: "Guide ready",
    ready_with_gaps: "Ready with gaps",
    failed_retryable: "Needs retry",
    failed_terminal: "Needs attention",
  };
  return labels[state] ?? state.replaceAll("_", " ");
}

export function GuideSummaryCard({ guide, manage = true }: { guide: GuideSummary; manage?: boolean }) {
  return (
    <article className="ui-surface ui-surface--interactive flex h-full min-w-0 flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={guide.archivedAt ? "neutral" : "success"}>{guide.archivedAt ? "Archived" : stateLabel(guide.state)}</Badge>
            <span className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
              <Files className="h-3.5 w-3.5" strokeWidth={1.8} />
              {guide.sourceCount} source{guide.sourceCount === 1 ? "" : "s"}
            </span>
          </div>
          <h2 className="mt-3 min-w-0 font-headline-md text-[20px] font-semibold leading-7 text-[var(--foreground)]">
            {guide.archivedAt ? guide.title : (
              <Link href={`/api/guides/${guide.id}/reopen`} className="rounded-sm hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2">
                {guide.title}
              </Link>
            )}
          </h2>
        </div>
        {manage && <GuideManagementActions archived={Boolean(guide.archivedAt)} guideId={guide.id} title={guide.title} />}
      </div>

      <dl className="mt-5 grid gap-2 text-[12px] text-[var(--muted)] sm:grid-cols-3">
        <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Created</dt><dd>Created {formatDate(guide.createdAt)}</dd></div>
        <div className="flex items-center gap-2"><History className="h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Updated</dt><dd>Updated {formatDate(guide.updatedAt)}</dd></div>
        <div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Last opened</dt><dd>Opened {formatDate(guide.lastAccessedAt)}</dd></div>
      </dl>

      {!guide.archivedAt && (
        <div className="mt-auto pt-5">
          <Link href={`/api/guides/${guide.id}/reopen`} className={buttonClassName({ variant: "secondary", size: "sm" })}>
            <BookOpen className="h-4 w-4" strokeWidth={1.8} /> Open Guide
          </Link>
        </div>
      )}
    </article>
  );
}
