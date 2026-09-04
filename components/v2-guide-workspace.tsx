import Link from "next/link";
import { ArrowLeft, BookOpen, FileText, Target } from "lucide-react";
import type { V2Guide } from "@/lib/ai/generation-v2";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/styles";

const priorityLabel = {
  study_first: "Study First",
  study_next: "Study Next",
  review_if_time: "Review If Time",
} as const;

export function V2GuideWorkspace({ guide, displayTitle }: { guide: V2Guide; displayTitle: string }) {
  return <main className="min-h-screen bg-[var(--background)]">
    <header className="border-b border-[var(--border-soft)] bg-white/90 backdrop-blur-xl">
      <div className="editorial-page flex h-20 items-center justify-between gap-4">
        <Link href="/" className="font-headline-md text-[22px] font-semibold text-[var(--primary)]">Folveta</Link>
        <Link href="/" className={buttonClassName({ variant: "ghost", size: "sm" })}><ArrowLeft className="h-4 w-4" />New upload</Link>
      </div>
    </header>
    <div className="editorial-page max-w-5xl py-9 sm:py-12">
      <Badge tone="primary">Study Guide</Badge>
      <h1 className="mt-4 text-4xl font-bold text-[var(--foreground)] sm:text-5xl">{displayTitle}</h1>
      <p className="mt-4 max-w-3xl text-[17px] leading-7 text-[var(--muted)]">Priorities are ordered from evidence in your uploaded materials. They are study suggestions, not exam predictions.</p>
      <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--source-blue-strong)]" /><dt className="sr-only">Coverage</dt><dd>{guide.coverage.covered_units} of {guide.coverage.readable_units} readable source units covered</dd></div>
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /><dt className="sr-only">Sections</dt><dd>{guide.sections.length} study section{guide.sections.length === 1 ? "" : "s"}</dd></div>
      </dl>
      {guide.generation_status === "complete_with_gaps" && <section className="mt-8 border-l-2 border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm" role="status">Some supplied material could not be included. Delivered sections remain readable and source-grounded.</section>}
      <section className="mt-10 space-y-6" aria-label="Study Guide sections">
        {guide.sections.map((section) => <article key={section.id} className="ui-surface ui-surface--elevated p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="flex items-center gap-2"><Target className="h-5 w-5 text-[var(--primary)]" /><Badge tone="primary">{priorityLabel[section.priority]}</Badge></div><h2 className="mt-3 font-headline-md text-2xl font-semibold text-[var(--foreground)]">{section.title}</h2></div>
          </div>
          <p className="mt-4 text-[16px] leading-7 text-[var(--text-secondary)]"><strong className="text-[var(--foreground)]">Why this matters: </strong>{section.focus_reason}</p>
          <div className="mt-5 space-y-4">{section.explanation.map((claim) => <div key={claim.id}><p className="text-[16px] leading-7 text-[var(--text-secondary)]">{claim.text}</p><ul className="mt-3 flex flex-wrap gap-2" aria-label="Source references">{claim.source_refs.map((reference) => <li key={reference.span_id} className="rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]"><strong className="text-[var(--foreground)]">{reference.source_name}</strong> · {reference.locator.kind} {reference.locator.number}: {reference.excerpt}</li>)}</ul></div>)}</div>
          {section.gaps.length > 0 && <ul className="mt-5 space-y-2 border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--muted)]">{section.gaps.map((gap, index) => <li key={`${gap.code}-${index}`}>{gap.message}</li>)}</ul>}
        </article>)}
      </section>
    </div>
  </main>;
}
