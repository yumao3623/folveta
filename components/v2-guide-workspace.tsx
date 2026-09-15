import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  BrainCircuit,
  CircleHelp,
  ClipboardCheck,
  FileText,
  GitBranch,
  KeyRound,
  ListChecks,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import type { V2Guide } from "@/lib/ai/generation-v2";
import { guideSectionAnchor } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { IconFrame } from "@/components/ui/icon-frame";
import { buttonClassName } from "@/components/ui/styles";
import { SourceReference } from "@/components/source-reference";

const priorityMeta = {
  study_first: { label: "Study First", tone: "primary" as const },
  study_next: { label: "Study Next", tone: "source" as const },
  review_if_time: { label: "Review If Time", tone: "neutral" as const },
};

function LearningBlock({
  id,
  title,
  items,
  icon,
  tone = "neutral",
}: {
  id?: string;
  title: string;
  items?: string[];
  icon: ReactNode;
  tone?: "neutral" | "primary" | "source" | "warning";
}) {
  if (!items?.length) return null;
  return (
    <section id={id} className="scroll-mt-28 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5">
      <div className="flex items-center gap-3">
        <IconFrame size="sm" tone={tone}>{icon}</IconFrame>
        <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5 text-[15px] leading-6 text-[var(--text-secondary)]">
        {items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" /><span>{item}</span></li>)}
      </ul>
    </section>
  );
}

export function V2GuideWorkspace({
  guide,
  displayTitle,
  quickCheckHref,
  isDemo = false,
}: {
  guide: V2Guide;
  displayTitle: string;
  quickCheckHref: string;
  isDemo?: boolean;
}) {
  const uniqueSources = new Set(guide.sections.flatMap((section) => section.source_refs.map((reference) => reference.source_id))).size;
  const sectionById = new Map(guide.sections.map((section) => [section.id, section]));
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-secondary)]">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-[var(--line)] bg-[var(--surface-container-low)] lg:flex">
        <div className="px-6 pb-6 pt-8">
          <Link href="/" className="font-headline-md text-[24px] font-semibold text-[var(--accent-bright)]">Folveta</Link>
          <p className="mt-7 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">Study map</p>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-5" aria-label="Study guide topics">
          <a href="#overview" className="flex items-center gap-3 rounded-lg bg-[var(--accent-soft)]/60 px-3 py-3 text-sm font-medium text-[var(--foreground)]">
            <IconFrame size="sm" active><BookOpen className="h-4 w-4" /></IconFrame>Overview
          </a>
          {guide.sections.map((section) => <a key={section.id} href={`#${guideSectionAnchor(section.id)}`} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]">
            <Target className="h-4 w-4 shrink-0 text-[var(--primary)]" /><span className="truncate">{section.title}</span>
          </a>)}
        </nav>
        <div className="border-t border-[var(--line)] p-6">
          <Link href="/" className={buttonClassName({ className: "w-full" })}><Upload className="h-4 w-4" />Upload materials</Link>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between gap-3 border-b border-[var(--line)]/70 bg-[var(--surface)]/90 px-4 backdrop-blur-xl sm:px-6 lg:left-72">
          <Link href="/" className="font-headline-md text-[22px] font-semibold text-[var(--primary)] lg:hidden">Folveta</Link>
          <nav className="ml-auto flex items-center gap-2" aria-label="Workspace navigation">
            <a href="#overview" className={buttonClassName({ variant: "soft", size: "sm" })}><BookOpen className="h-4 w-4" />Guide</a>
            <Link href={quickCheckHref} aria-label="Quick Check" className={buttonClassName({ variant: "ghost", size: "sm" })}><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">Quick Check</span></Link>
          </nav>
        </header>

        <nav className="ui-mobile-nav fixed left-0 right-0 top-20 z-30 flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 lg:hidden" aria-label="Study guide topics">
          <a href="#overview" className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })}>Overview</a>
          {guide.sections.map((section) => <a key={section.id} href={`#${guideSectionAnchor(section.id)}`} className={buttonClassName({ variant: "ghost", size: "sm", className: "shrink-0" })}>{section.title}</a>)}
        </nav>

        <div className="min-h-screen pt-[8.25rem] lg:pt-20">
          <div id="overview" className="mx-auto w-full max-w-[1120px] scroll-mt-32 px-5 pb-16 sm:px-8">
            <section className="border-b border-[var(--border)] pb-9 pt-10 sm:pt-12">
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="source">Study Guide · V2</Badge>
                <span className="font-mono-caption text-xs text-[var(--text-muted)]">{isDemo ? "Example guide" : `Generated ${new Date(guide.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</span>
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-[38px] font-extrabold leading-[1.1] text-[var(--foreground)] sm:text-[48px]">{displayTitle}</h1>
              <p className="mt-4 max-w-3xl text-[17px] leading-7 text-[var(--text-secondary)]">A priority-first learning path assembled from evidence in your uploaded materials. Priorities are study suggestions, not exam predictions.</p>
              <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--source-blue-strong)]" /><dt className="sr-only">Coverage</dt><dd>{guide.coverage.covered_units} of {guide.coverage.readable_units} readable units represented</dd></div>
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /><dt className="sr-only">Topics</dt><dd>{guide.sections.length} focused topic{guide.sections.length === 1 ? "" : "s"}</dd></div>
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--muted)]" /><dt className="sr-only">Sources</dt><dd>{uniqueSources} cited source{uniqueSources === 1 ? "" : "s"}</dd></div>
              </dl>
              <div className="mt-7"><Link href={quickCheckHref} className={buttonClassName()}><Sparkles className="h-4 w-4" />Start Quick Check</Link></div>
            </section>

            {guide.generation_status === "complete_with_gaps" && <section className="mt-7 flex gap-3 rounded-xl border border-[#ead695] bg-[var(--warning-soft)] p-4 text-sm" role="status">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-800" />
              <div><p className="font-semibold text-amber-950">Guide delivered with material gaps</p><p className="mt-1 leading-6 text-amber-900">The available sections remain source-grounded. Review the gap details before relying on coverage.</p></div>
            </section>}

            {guide.coverage.gaps.length > 0 && <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-[var(--foreground)]">Review {guide.coverage.gaps.length} material gap{guide.coverage.gaps.length === 1 ? "" : "s"}</summary>
              <ul className="mt-3 space-y-2 text-[var(--muted)]">{guide.coverage.gaps.map((gap, index) => <li key={`${gap.code}-${gap.partition_id ?? gap.source_id ?? index}`}>{gap.message}</li>)}</ul>
            </details>}

            <section className="py-10" aria-labelledby="study-map-heading">
              <div className="flex items-center gap-3"><IconFrame tone="primary"><Target className="h-5 w-5" /></IconFrame><div><p className="text-label-sm text-[var(--primary)]">Recommended sequence</p><h2 id="study-map-heading" className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">Your study map</h2></div></div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">{guide.study_map.map((item, index) => {
                const section = sectionById.get(item.section_id)!;
                const meta = priorityMeta[item.priority];
                return <a key={item.section_id} href={`#${guideSectionAnchor(item.section_id)}`} className="ui-surface ui-surface--elevated p-5 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between gap-3"><Badge tone={meta.tone}>{meta.label}</Badge><span className="font-mono-caption text-xs text-[var(--text-faint)]">{String(index + 1).padStart(2, "0")}</span></div>
                  <h3 className="mt-4 font-semibold text-[var(--foreground)]">{section.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.why_this_matters}</p>
                </a>;
              })}</div>
            </section>

            <section className="space-y-7" aria-label="Study Guide sections">
              {guide.sections.map((section) => {
                const meta = priorityMeta[section.priority];
                return <article key={section.id} id={guideSectionAnchor(section.id)} className="ui-surface ui-surface--elevated scroll-mt-28 p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><Badge tone={meta.tone}>{meta.label}</Badge><h2 className="mt-3 font-headline-md text-3xl font-semibold text-[var(--foreground)]">{section.title}</h2></div><Target className="h-6 w-6 text-[var(--primary)]" /></div>
                  <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[var(--text-secondary)]"><strong className="text-[var(--foreground)]">Why this matters: </strong>{section.focus_reason}</p>

                  <section id={guideSectionAnchor(section.id, "concise_explanation", section.id)} className="mt-7 scroll-mt-28">
                    <h3 className="text-label-sm text-[var(--primary)]">Evidence-backed explanation</h3>
                    <div className="mt-3 space-y-5">{section.explanation.map((claim) => <div key={claim.id}><p className="text-[16px] leading-7 text-[var(--text-secondary)]">{claim.text}</p>{claim.source_refs.length > 0 && <div className="mt-3 grid gap-2" role="group" aria-label="Source references">{claim.source_refs.map((reference) => <SourceReference key={reference.span_id} reference={reference} />)}</div>}</div>)}</div>
                  </section>

                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    <LearningBlock title="Review targets" items={section.review_targets} icon={<ListChecks className="h-4 w-4" />} tone="primary" />
                    <LearningBlock id={section.key_concepts?.length ? guideSectionAnchor(section.id, "key_concept", `${section.id}-key_concept-1`) : undefined} title="Key concepts" items={section.key_concepts} icon={<KeyRound className="h-4 w-4" />} tone="source" />
                    <LearningBlock id={section.definitions?.length ? guideSectionAnchor(section.id, "definition", `${section.id}-definition-1`) : undefined} title="Definitions" items={section.definitions} icon={<BookOpen className="h-4 w-4" />} />
                    <LearningBlock id={section.processes_relationships?.length ? guideSectionAnchor(section.id, "process_relationship", `${section.id}-process_relationship-1`) : undefined} title="Processes & relationships" items={section.processes_relationships} icon={<GitBranch className="h-4 w-4" />} tone="primary" />
                    <LearningBlock id={section.common_confusions?.length ? guideSectionAnchor(section.id, "common_confusion", `${section.id}-common_confusion-1`) : undefined} title="Common confusions" items={section.common_confusions} icon={<CircleHelp className="h-4 w-4" />} tone="warning" />
                    <LearningBlock title="Practice prompts" items={section.practice_prompts} icon={<BrainCircuit className="h-4 w-4" />} tone="source" />
                  </div>

                  {section.gaps.length > 0 && <ul className="mt-6 space-y-2 border-t border-[var(--border-soft)] pt-5 text-sm text-[var(--muted)]">{section.gaps.map((gap, index) => <li key={`${gap.code}-${index}`}>{gap.message}</li>)}</ul>}
                </article>;
              })}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
