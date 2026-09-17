import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { V2Guide } from "@/lib/ai/generation-v2";
import { BrandMark } from "@/components/brand-mark";
import { guideSectionAnchor } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";
import { StudyIcon, type StudyIconName } from "@/components/ui/study-icon";
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
  asset,
  tone = "neutral",
}: {
  id?: string;
  title: string;
  items?: string[];
  asset: FolvetaAsset;
  tone?: "neutral" | "primary" | "source" | "warning";
}) {
  if (!items?.length) return null;
  return (
    <section id={id} className={`study-block study-block--${tone} scroll-mt-36 py-5`}>
      <div className="flex items-center gap-3">
        <StudyIcon name={asset === "quick-check" ? "check" : asset === "quest" ? "lightbulb" : asset === "heart" ? "target" : asset === "locked" ? "help" : asset as StudyIconName} size={24} animated className="shrink-0" />
        <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
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
    <main className="learning-shell min-h-screen bg-[var(--background)] text-[var(--text-secondary)]">
      <aside className="learning-sidebar fixed left-0 top-0 z-50 hidden h-full w-60 flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex">
        <div className="px-6 pb-6 pt-8">
          <BrandMark />
          <p className="mt-7 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">Study map</p>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-5" aria-label="Study guide topics">
          <a href="#overview" aria-current="page" className="learning-nav-item flex items-center gap-3 rounded-lg bg-[var(--accent-soft)] px-3 py-2.5 text-sm font-bold text-[var(--foreground)]">
            <StudyIcon name="guide" size={20} className="shrink-0" />Overview
          </a>
          {guide.sections.map((section) => <a key={section.id} href={`#${guideSectionAnchor(section.id)}`} className="learning-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]">
            <StudyIcon name={section.priority === "study_first" ? "target" : section.priority === "study_next" ? "source" : "guide"} size={20} className="shrink-0" /><span className="min-w-0 truncate">{section.title}</span>
          </a>)}
        </nav>
        <div className="border-t border-[var(--line)] p-6">
          <Link href="/" className={buttonClassName({ className: "w-full" })}><StudyIcon name="upload" size={26} />Upload materials</Link>
        </div>
      </aside>

      <div className="learning-main lg:pl-60">
        <header className="learning-header fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6 lg:left-60">
          <BrandMark compact className="lg:hidden" />
          <nav className="ml-auto flex items-center gap-2" aria-label="Workspace navigation">
            <a href="#overview" className={buttonClassName({ variant: "soft", size: "sm" })}>Guide</a>
            <Link href={quickCheckHref} aria-label="Quick Check" className={buttonClassName({ variant: "secondary", size: "sm" })}>Quick Check</Link>
          </nav>
        </header>

        <nav className="learning-mobile-nav ui-mobile-nav fixed left-0 right-0 top-16 z-30 flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 lg:hidden" aria-label="Study guide topics">
          <a href="#overview" className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })}>Overview</a>
          {guide.sections.map((section) => <a key={section.id} href={`#${guideSectionAnchor(section.id)}`} className={buttonClassName({ variant: "ghost", size: "sm", className: "shrink-0" })}>{section.title}</a>)}
        </nav>

        <div className="min-h-screen pt-[7.25rem] lg:pt-16">
          <div id="overview" className="mx-auto w-full max-w-[1120px] scroll-mt-32 px-5 pb-16 sm:px-8">
            <section className="study-intro grid items-center gap-5 border-b-2 border-[var(--border)] pb-9 pt-8 sm:grid-cols-[minmax(0,1fr)_180px] sm:pt-10">
              <div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="source">Study Guide · V2</Badge>
                <span className="font-mono-caption text-xs text-[var(--text-muted)]">{isDemo ? "Example guide" : `Generated ${new Date(guide.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}</span>
              </div>
              <h1 className="mt-4 max-w-4xl font-display text-[34px] font-bold leading-[1.12] text-[var(--foreground)] sm:text-[42px]">{displayTitle}</h1>
              <p className="mt-4 max-w-3xl text-[17px] leading-7 text-[var(--text-secondary)]">A priority-first learning path assembled from evidence in your uploaded materials. Priorities are study suggestions, not exam predictions.</p>
              <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
                <div><dt className="sr-only">Coverage</dt><dd>{guide.coverage.covered_units} of {guide.coverage.readable_units} readable units represented</dd></div>
                <div><dt className="sr-only">Topics</dt><dd>{guide.sections.length} focused topic{guide.sections.length === 1 ? "" : "s"}</dd></div>
                <div><dt className="sr-only">Sources</dt><dd>{uniqueSources} cited source{uniqueSources === 1 ? "" : "s"}</dd></div>
              </dl>
              <div className="mt-7"><Link href={quickCheckHref} className={buttonClassName()}>Start Quick Check<ArrowRight className="h-4 w-4" /></Link></div>
              </div>
              <AssetIllustration asset="guide" className="study-intro__art mx-auto h-40 w-40 sm:h-48 sm:w-48" priority sizes="(max-width: 640px) 160px, 192px" />
            </section>

            {guide.generation_status === "complete_with_gaps" && <section className="mt-7 flex gap-3 rounded-xl border border-[#ead695] bg-[var(--warning-soft)] p-4 text-sm" role="status">
              <StudyIcon name="help" size={24} animated className="shrink-0" />
              <div><p className="font-semibold text-amber-950">Guide delivered with material gaps</p><p className="mt-1 leading-6 text-amber-900">The available sections remain source-grounded. Review the gap details before relying on coverage.</p></div>
            </section>}

            {guide.coverage.gaps.length > 0 && <details className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
              <summary className="cursor-pointer font-semibold text-[var(--foreground)]">Review {guide.coverage.gaps.length} material gap{guide.coverage.gaps.length === 1 ? "" : "s"}</summary>
              <ul className="mt-3 space-y-2 text-[var(--muted)]">{guide.coverage.gaps.map((gap, index) => <li key={`${gap.code}-${gap.partition_id ?? gap.source_id ?? index}`}>{gap.message}</li>)}</ul>
            </details>}

            <section className="py-10" aria-labelledby="study-map-heading">
              <div className="flex items-center gap-4"><StudyIcon name="target" size={28} animated className="shrink-0" /><div><p className="text-label-sm text-[var(--primary)]">Recommended sequence</p><h2 id="study-map-heading" className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">Your study map</h2></div></div>
              <div className="study-map mt-6 grid gap-3">{guide.study_map.map((item, index) => {
                const section = sectionById.get(item.section_id)!;
                const meta = priorityMeta[item.priority];
                return <a key={item.section_id} href={`#${guideSectionAnchor(item.section_id)}`} className="study-map__item flex items-center gap-4 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
                  <span className="study-map__number flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-soft)] text-xl font-bold text-[var(--primary)]">{index + 1}</span>
                  <div className="min-w-0 flex-1"><Badge tone={meta.tone}>{meta.label}</Badge><h3 className="mt-2 font-bold text-[var(--foreground)]">{section.title}</h3><p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.why_this_matters}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                </a>;
              })}</div>
            </section>

            <section className="space-y-7" aria-label="Study Guide sections">
              {guide.sections.map((section) => {
                const meta = priorityMeta[section.priority];
                return <article key={section.id} id={guideSectionAnchor(section.id)} className="study-section scroll-mt-36 border-t-2 border-[var(--border)] py-8 sm:py-10">
                  <div className="flex items-start justify-between gap-4"><div><Badge tone={meta.tone}>{meta.label}</Badge><h2 className="mt-3 font-headline-md text-3xl font-semibold text-[var(--foreground)]">{section.title}</h2></div><StudyIcon name="guide" size={28} animated className="shrink-0" /></div>
                  <p className="mt-4 max-w-3xl text-[16px] leading-7 text-[var(--text-secondary)]"><strong className="text-[var(--foreground)]">Why this matters: </strong>{section.focus_reason}</p>

                  <section id={guideSectionAnchor(section.id, "concise_explanation", section.id)} className="mt-7 scroll-mt-28">
                    <h3 className="text-label-sm text-[var(--primary)]">Evidence-backed explanation</h3>
                    <div className="mt-3 space-y-5">{section.explanation.map((claim) => <div key={claim.id}><p className="text-[16px] leading-7 text-[var(--text-secondary)]">{claim.text}</p>{claim.source_refs.length > 0 && <div className="mt-3 grid gap-2" role="group" aria-label="Source references">{claim.source_refs.map((reference) => <SourceReference key={reference.span_id} reference={reference} />)}</div>}</div>)}</div>
                  </section>

                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    <LearningBlock title="Review targets" items={section.review_targets} asset="quick-check" tone="primary" />
                    <LearningBlock id={section.key_concepts?.length ? guideSectionAnchor(section.id, "key_concept", `${section.id}-key_concept-1`) : undefined} title="Key concepts" items={section.key_concepts} asset="quest" tone="source" />
                    <LearningBlock id={section.definitions?.length ? guideSectionAnchor(section.id, "definition", `${section.id}-definition-1`) : undefined} title="Definitions" items={section.definitions} asset="guide" />
                    <LearningBlock id={section.processes_relationships?.length ? guideSectionAnchor(section.id, "process_relationship", `${section.id}-process_relationship-1`) : undefined} title="Processes & relationships" items={section.processes_relationships} asset="source" tone="primary" />
                    <LearningBlock id={section.common_confusions?.length ? guideSectionAnchor(section.id, "common_confusion", `${section.id}-common_confusion-1`) : undefined} title="Common confusions" items={section.common_confusions} asset="locked" tone="warning" />
                    <LearningBlock title="Practice prompts" items={section.practice_prompts} asset="heart" tone="source" />
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
