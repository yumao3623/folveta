import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  BarChart3,
  BookOpen,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  FileText,
  FlaskConical,
  GitBranch,
  Lightbulb,
  NotebookText,
  Sparkles,
  Target,
  TriangleAlert,
  Upload,
  type LucideIcon,
} from "lucide-react";
import {
  guideSectionAnchor,
  type GroundedClaim,
  type Guide,
  type GuideTopic,
  type Priority,
  type SourceReference,
} from "@/lib/schemas";
import { SourceReference as SourceReferenceView } from "@/components/source-reference";
import { Badge } from "@/components/ui/badge";
import { IconFrame } from "@/components/ui/icon-frame";
import { buttonClassName } from "@/components/ui/styles";
import { AuthNavigation } from "@/lib/auth-navigation";

const priorityMeta: Record<Priority, { label: string; icon: string }> = {
  study_first: { label: "Study first", icon: "target" },
  study_next: { label: "Study next", icon: "check_circle" },
  review_if_time: { label: "Review if time", icon: "radio_button_unchecked" },
};

const iconGlyphs: Record<string, LucideIcon> = {
  menu_book: BookOpen,
  target: Target,
  science: FlaskConical,
  analytics: BarChart3,
  lightbulb: Lightbulb,
  check_circle: CheckCircle2,
  radio_button_unchecked: Circle,
  upload_file: Upload,
  bookmark_star: BookmarkCheck,
  notes: NotebookText,
  account_tree: GitBranch,
  warning: TriangleAlert,
  source: FileText,
  sparkle: Sparkles,
  arrow_right: ArrowRight,
};

function Icon({
  name,
  children,
  className = "",
}: {
  name?: string;
  children?: string;
  className?: string;
}) {
  const icon = name ?? children ?? "circle";
  const Glyph = iconGlyphs[icon] ?? Circle;
  return (
    <Glyph
      aria-hidden="true"
      className={`h-[1em] w-[1em] shrink-0 ${className}`}
      strokeWidth={1.8}
    />
  );
}

function ClaimList({
  claims,
  compact = false,
}: {
  claims: GroundedClaim[];
  compact?: boolean;
}) {
  if (!claims.length) return null;
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {claims.map((claim) => (
        <li
          id={`claim-${claim.id}`}
          key={claim.id}
          className={`relative pl-5 ${compact ? "text-[14px] leading-[1.55]" : "text-[16px] leading-[1.65]"} text-[var(--text-secondary)]`}
        >
          <span className="absolute left-0 top-[0.72em] h-1.5 w-1.5 rounded-full bg-[var(--accent-bright)]" />
          {claim.text}
        </li>
      ))}
    </ul>
  );
}

function SourceChip({ reference }: { reference: SourceReference }) {
  const kind =
    reference.locator.kind === "page"
      ? "Pg"
      : reference.locator.kind === "slide"
        ? "Slide"
        : "Section";
  return (
    <Badge tone="source">
      <Icon className="text-[13px]" name="source" />
      {kind} {reference.locator.number}
    </Badge>
  );
}

function SectionHeading({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="mb-6 flex items-center gap-3 border-b border-[var(--border-soft)] pb-4">
      <IconFrame tone="primary">
        <Icon className="text-[18px]" name={icon} />
      </IconFrame>
      <h2 className="font-headline-md text-[24px] font-semibold leading-[1.3] text-[var(--foreground)]">
        {title}
      </h2>
    </div>
  );
}

function MarginNote({
  label,
  children,
  tone = "accent",
}: {
  label: string;
  children: ReactNode;
  tone?: "accent" | "amber" | "blue";
}) {
  const color =
    tone === "amber"
      ? "text-[var(--warning)]"
      : tone === "blue"
        ? "text-[var(--tertiary)]"
        : "text-[var(--accent)]";
  return (
    <aside className="border-b border-[var(--border-soft)] py-4 last:border-b-0">
      <div
        className={`mb-2 text-[11px] font-semibold ${color}`}
      >
        {label}
      </div>
      <div className="text-[13px] leading-[1.5] text-[var(--text-secondary)]">
        {children}
      </div>
    </aside>
  );
}

function ConceptCard({
  name,
  explanation,
  reference,
}: {
  name: string;
  explanation: GroundedClaim[];
  reference?: SourceReference;
}) {
  return (
    <div className="ui-surface ui-surface--interactive flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <IconFrame size="sm" tone="primary"><Lightbulb className="h-4 w-4" strokeWidth={1.8} /></IconFrame>
        <h3 className="font-headline-md text-[18px] font-semibold leading-[1.35] text-[var(--foreground)]">{name}</h3>
      </div>
      <div className="mt-3 flex-1">
        <ClaimList claims={explanation} compact />
      </div>
      {reference && (
        <div className="mt-4">
          <SourceChip reference={reference} />
        </div>
      )}
    </div>
  );
}

function TopicDetails({
  topic,
  index,
  lead = false,
}: {
  topic: GuideTopic;
  index: number;
  lead?: boolean;
}) {
  const firstReference = topic.source_references[0];
  return (
    <article
      id={guideSectionAnchor(topic.id)}
      className="guide-anchor border-t border-[var(--line)] pt-12"
    >
      {!lead && (
        <>
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-label-sm text-[var(--accent)]">
                {priorityMeta[topic.priority].label} · Topic {index + 1}
              </p>
              <h2 className="mt-2 max-w-3xl font-headline-lg text-[32px] font-bold leading-[1.2] text-[var(--foreground)]">
                {topic.title}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--surface-container-low)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">
              <Icon
                className="text-[14px]"
                name={priorityMeta[topic.priority].icon}
              />
              {priorityMeta[topic.priority].label}
            </span>
          </div>
          <p className="mb-10 border-l-2 border-[var(--primary)] bg-[var(--primary-soft)]/55 px-5 py-4 text-[15px] leading-7 text-[var(--text-secondary)]">
            <span className="mr-2 text-label-sm text-[var(--primary-hover)]">
              Why focus here
            </span>
            {topic.focus_reason}
          </p>
        </>
      )}
      {topic.explanation.length > 0 && (
        <section className="mb-12">
          <SectionHeading title="Study notes" icon="notes" />
          <ClaimList claims={topic.explanation} />
        </section>
      )}
      {!lead && topic.key_concepts.length > 0 && (
        <section className="mb-12">
          <SectionHeading title="Key Concepts" icon="lightbulb" />
          <div className="grid gap-6 md:grid-cols-2">
            {topic.key_concepts.map((concept) => (
              <ConceptCard
                key={concept.id}
                name={concept.name}
                explanation={concept.explanation}
                reference={firstReference}
              />
            ))}
          </div>
        </section>
      )}
      {topic.processes_relationships.length > 0 && (
        <section className="mb-12">
          <SectionHeading
            title="Processes / Relationships"
            icon="account_tree"
          />
          <div className="ui-surface ui-surface--info p-5 sm:p-6">
            <ClaimList claims={topic.processes_relationships} />
          </div>
        </section>
      )}
      {topic.definitions.length > 0 && (
        <section className="mb-12">
          <SectionHeading title="Glossary" icon="menu_book" />
          <dl className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
            {topic.definitions.map((definition) => (
              <div
                id={guideSectionAnchor(topic.id, "definition", definition.id)}
                key={definition.id}
                className="grid gap-3 py-5 sm:grid-cols-[13rem_1fr] sm:gap-8"
              >
                <dt className="font-body-lg text-[18px] font-semibold text-[var(--foreground)]">
                  {definition.term}
                </dt>
                <dd>
                  <ClaimList claims={definition.definition} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {topic.common_confusions.length > 0 && (
        <section className="ui-surface ui-surface--warning mb-12 p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <IconFrame tone="warning"><Icon className="text-[20px]" name="warning" /></IconFrame>
            <h3 className="font-headline-md text-[19px] font-semibold text-[var(--foreground)]">
              Common Confusions
            </h3>
          </div>
          {topic.common_confusions.map((item) => (
            <div
              id={guideSectionAnchor(topic.id, "common_confusion", item.id)}
              key={item.id}
              className="mb-6 last:mb-0"
            >
              <p className="text-label-sm text-[var(--warning)]">
                Common mix-up
              </p>
              <div className="mt-2">
                <ClaimList claims={item.confusion} compact />
              </div>
              <p className="mb-2 mt-5 text-label-sm text-[var(--accent)]">
                Clarification
              </p>
              <ClaimList claims={item.clarification} compact />
            </div>
          ))}
        </section>
      )}
      {topic.source_references.length > 0 && (
        <section id={lead ? "sources" : undefined} className="mb-4 scroll-mt-36">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-label-sm text-[var(--text-muted)]">
              Source evidence · {topic.source_references.length}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {topic.source_references.slice(0, 4).map((reference) => (
                <SourceChip key={reference.span_id} reference={reference} />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            {topic.source_references.map((reference) => (
              <SourceReferenceView
                key={reference.span_id}
                reference={reference}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export function GuideWorkspace({
  displayTitle,
  guide,
  isDemo = false,
  quickCheckHref,
  reviewQuestion,
}: {
  displayTitle?: string;
  guide: Guide;
  isDemo?: boolean;
  quickCheckHref?: string;
  reviewQuestion?: string;
}) {
  const firstTopic =
    guide.topics.find((topic) => topic.priority === "study_first") ??
    guide.topics[0];
  const stageTopics = guide.topics.slice(0, 3);
  const allReferences = guide.topics.flatMap(
    (topic) => topic.source_references,
  );
  const uniqueReferences = allReferences.filter(
    (reference, index, refs) =>
      refs.findIndex((item) => item.span_id === reference.span_id) === index,
  );
  const priorities = Object.keys(priorityMeta) as Priority[];
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-secondary)]">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-[var(--line)] bg-[var(--surface-container-low)] lg:flex">
        <div className="mb-7 flex items-center bg-transparent px-6 pb-5 pt-8">
          <Link
            href="/"
            className="font-headline-md text-[24px] font-semibold text-[var(--accent-bright)]"
          >
            Folveta
          </Link>
        </div>
        <div className="mb-3 px-6 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Study Topics
        </div>
        <nav
          className="flex-1 space-y-1.5 px-3"
          aria-label="Study guide topics"
        >
          <a
            href="#overview"
            aria-current="page"
            className="group flex cursor-pointer items-center justify-between rounded-lg bg-[var(--accent-soft)]/60 px-3 py-3 text-[14px] font-medium text-[var(--foreground)] transition-[background-color,color,transform] hover:bg-[var(--accent-soft)] active:translate-y-px"
          >
            <span className="flex items-center gap-3">
              <IconFrame size="sm" active>
                <Icon className="text-[17px]" name="menu_book" />
              </IconFrame>
              Overview
            </span>
            <Icon className="text-[18px] text-[var(--accent)]" name="target" />
          </a>
          {priorities.map((priority) =>
            guide.topics
              .filter((topic) => topic.priority === priority)
              .map((topic) => (
                <a
                  key={topic.id}
                  href={`#${guideSectionAnchor(topic.id)}`}
                  className="group flex cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-[14px] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)] active:translate-y-px"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <IconFrame size="sm" className="bg-white/70 group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary-hover)]">
                      <Icon
                        className="text-[17px]"
                        name={
                          priority === "study_first"
                            ? "science"
                            : priority === "study_next"
                              ? "analytics"
                              : "lightbulb"
                        }
                      />
                    </IconFrame>
                    <span className="truncate">{topic.title}</span>
                  </span>
                  <Icon
                    className="text-[18px] text-[var(--text-faint)]"
                    name={priorityMeta[priority].icon}
                  />
                </a>
              )),
          )}
        </nav>
        <div className="mt-auto border-t border-[var(--line)] p-6">
          <Link
            href="/"
            className={buttonClassName({ className: "w-full" })}
          >
            <Icon className="text-[18px]" name="upload_file" />
            Upload Document
          </Link>
        </div>
      </aside>
      <div className="lg:pl-72">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between gap-3 border-b border-[var(--line)]/70 bg-[var(--surface)]/90 px-4 backdrop-blur-xl sm:px-6 lg:left-72 lg:px-6">
          <Link
            href="/"
            className="font-headline-md text-[22px] font-semibold text-[var(--primary)] lg:hidden"
          >
            Folveta
          </Link>
          <nav
            className="ml-auto flex items-center gap-1 sm:gap-2"
            aria-label="Workspace navigation"
          >
            <a
              href="#overview"
              className={buttonClassName({ variant: "soft", size: "sm" })}
            >
              <Icon className="text-[15px]" name="menu_book" /> Guide
            </a>
            <a
              href="#sources"
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              <Icon className="text-[15px]" name="source" /> Sources
            </a>
            {quickCheckHref && (
              <span className="hidden sm:inline">
                <Link
                  href={quickCheckHref}
                  className={buttonClassName({
                    variant: "ghost",
                    size: "sm",
                  })}
                >
                  <Icon className="text-[15px]" name="sparkle" /> Quick Check
                </Link>
              </span>
            )}
            {!isDemo && <AuthNavigation nextPath={`/study/${guide.session_id}`} />}
          </nav>
        </header>
        <nav
          className="ui-mobile-nav fixed left-0 right-0 top-20 z-30 flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 lg:hidden"
          aria-label="Study guide topics"
        >
          <a href="#overview" className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })}>
            Overview
          </a>
          {quickCheckHref && (
            <Link href={quickCheckHref} className={buttonClassName({ variant: "secondary", size: "sm", className: "shrink-0" })}>
              <Sparkles className="h-4 w-4" strokeWidth={1.8} /> Quick Check
            </Link>
          )}
          {guide.topics.map((topic) => (
            <a
              key={topic.id}
              href={`#${guideSectionAnchor(topic.id)}`}
              className={buttonClassName({ variant: "ghost", size: "sm", className: "shrink-0" })}
            >
              {topic.title}
            </a>
          ))}
        </nav>
        <main className="min-h-screen bg-[var(--background)] pt-[8.25rem] lg:pt-20">
          <div
            id="overview"
            className="mx-auto flex w-full max-w-[1140px] flex-col px-6"
          >
            <div className="pb-7 pt-10 sm:pt-12">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <Badge tone="source">
                  Study Guide
                </Badge>
                <span className="font-mono-caption text-[12px] font-medium text-[var(--text-muted)]">
                  {isDemo
                    ? "Example guide"
                    : `Updated ${new Date(guide.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}{" "}
                  · {guide.source_count} source
                  {guide.source_count === 1 ? "" : "s"}
                </span>
              </div>
              <h1 className="max-w-4xl font-display text-[38px] font-extrabold leading-[1.1] text-[var(--foreground)] sm:text-[48px]">
                {displayTitle ?? guide.title}
              </h1>
              <p className="mt-4 max-w-3xl font-body-lg text-[18px] leading-[1.6] text-[var(--text-secondary)]">
                {guide.priority_method_summary}
              </p>
              <dl className="mt-6 flex flex-wrap gap-x-7 gap-y-3 text-[13px]">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--source-blue-strong)]" /><dt className="sr-only">Sources</dt><dd><strong className="text-[var(--foreground)]">{guide.source_count}</strong> sources</dd></div>
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--primary)]" /><dt className="sr-only">Topics</dt><dd><strong className="text-[var(--foreground)]">{guide.topics.length}</strong> study topics</dd></div>
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-[var(--warning)]" /><dt className="sr-only">Priority</dt><dd>Priority is a <strong className="text-[var(--foreground)]">study suggestion</strong></dd></div>
              </dl>
            </div>
            <div className="border-t border-[var(--line)]/70" />
            {reviewQuestion && (
              <section
                className="mt-6 border-l-2 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-[14px]"
                role="status"
              >
                Reviewing because of Quick Check question {reviewQuestion}. The
                related section is highlighted below.
              </section>
            )}
            <div className="grid gap-12 pb-20 pt-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
              <div className="min-w-0">
                <section className="relative mb-16">
                  <div className="absolute -bottom-5 -left-1 top-5 w-1 rounded-full bg-[var(--primary)]" />
                  <div className="ui-surface ui-surface--elevated relative overflow-hidden p-6 sm:p-8">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <IconFrame size="lg" tone="primary"><Icon className="text-[22px]" name="bookmark_star" /></IconFrame>
                        <div><p className="text-[11px] font-semibold text-[var(--primary)]"><span className="sm:hidden">Start here</span><span className="hidden sm:inline">Recommended starting point</span></p><h2 className="font-headline-md text-[25px] font-semibold">Study First</h2></div>
                      </div>
                      <Badge tone="primary">Priority 01</Badge>
                    </div>
                    <p className="text-[16px] leading-[1.65] text-[var(--text-secondary)]">
                      {firstTopic.focus_reason}{" "}
                      {firstTopic.explanation[0]?.text && (
                        <>
                          <span>Start with the core idea: </span>
                          <mark className="highlight-mark font-medium text-[var(--foreground)]">
                            {firstTopic.explanation[0].text}
                          </mark>
                        </>
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {firstTopic.source_references
                        .slice(0, 3)
                        .map((reference) => (
                          <SourceChip
                            key={reference.span_id}
                            reference={reference}
                          />
                        ))}
                    </div>
                  </div>
                </section>
                {firstTopic.key_concepts.length > 0 && (
                  <section className="mb-16">
                    <SectionHeading title="Key Concepts" icon="lightbulb" />
                    <div className="grid gap-6 md:grid-cols-2">
                      {firstTopic.key_concepts.map((concept) => (
                        <ConceptCard
                          key={concept.id}
                          name={concept.name}
                          explanation={concept.explanation}
                          reference={firstTopic.source_references[0]}
                        />
                      ))}
                    </div>
                  </section>
                )}
                {stageTopics.length > 1 && (
                  <section className="mb-16">
                    <SectionHeading title="Study Path" icon="account_tree" />
                    <div className="ui-surface ui-surface--subtle relative flex flex-col items-stretch justify-between gap-2 p-5 md:flex-row md:items-center md:gap-3 lg:p-6">
                      {stageTopics.map((topic, index) => (
                        <div key={topic.id} className="contents">
                          <div className="relative flex flex-1 items-center gap-3 rounded-md bg-white p-3 shadow-[var(--shadow-xs)] md:flex-col md:px-2 md:py-4 md:text-center">
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-headline-md text-[18px] font-semibold ${index === 0 ? "bg-[var(--primary)] text-white" : index === 1 ? "bg-[var(--source-blue)] text-[var(--source-blue-strong)]" : "bg-[var(--warning-soft)] text-[var(--warning)]"}`}>
                              {index + 1}
                            </div>
                            <div className="min-w-0"><h3 className="text-label-sm text-[var(--foreground)]">{topic.title}</h3><p className="mt-1 text-[12px] text-[var(--muted)]">{priorityMeta[topic.priority].label}</p></div>
                          </div>
                          {index < stageTopics.length - 1 && <><ArrowDown className="mx-auto h-4 w-4 text-[var(--border-strong)] md:hidden" /><ArrowRight className="hidden h-4 w-4 shrink-0 text-[var(--border-strong)] md:block" /></>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                <TopicDetails topic={firstTopic} index={0} lead />
                {guide.topics.slice(1).map((topic, index) => (
                  <TopicDetails
                    key={topic.id}
                    topic={topic}
                    index={index + 1}
                  />
                ))}
                {guide.overall_gaps.length > 0 && (
                  <section className="mt-10 rounded-lg border border-[var(--secondary-fixed-dim)]/35 bg-[var(--secondary-container)]/20 p-6">
                    <div className="mb-3 flex items-center gap-3 text-[var(--warning)]">
                      <Icon className="text-[22px]" name="warning" />
                      <h2 className="font-body-lg text-[18px] font-bold">
                        Material gaps
                      </h2>
                    </div>
                    <ClaimList claims={guide.overall_gaps} compact />
                  </section>
                )}
              </div>
              <div className="hidden lg:block">
                <div className="ui-surface ui-surface--subtle sticky top-24 px-4 py-1">
                  <p className="border-b border-[var(--border-soft)] py-4 font-headline-md text-[16px] font-semibold text-[var(--foreground)]">Guide context</p>
                  <MarginNote label="Study cue">
                    {firstTopic.focus_reason}
                  </MarginNote>
                  {guide.source_issues.slice(0, 2).map((issue) => (
                    <MarginNote
                      key={`${issue.source_id}-${issue.code}`}
                      label="Source note"
                      tone="amber"
                    >
                      <strong>{issue.source_name ?? "Source"}</strong>
                      <br />
                      {issue.message}
                    </MarginNote>
                  ))}
                  {guide.overall_gaps[0] && (
                    <MarginNote label="Evidence boundary" tone="blue">
                      {guide.overall_gaps[0].text}
                    </MarginNote>
                  )}
                  <MarginNote label="Sources">
                    <div className="flex flex-wrap gap-2">
                      {uniqueReferences.slice(0, 6).map((reference) => (
                        <SourceChip
                          key={reference.span_id}
                          reference={reference}
                        />
                      ))}
                    </div>
                  </MarginNote>
                </div>
              </div>
            </div>
            {quickCheckHref && (
              <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
                <div>
                  <p className="text-label-sm text-[var(--text-muted)]">
                    Optional learning check
                  </p>
                  <p className="mt-1 text-[14px] text-[var(--text-muted)]">
                    5 questions · about 5 minutes
                  </p>
                </div>
                <Link
                  href={quickCheckHref}
                  className={buttonClassName()}
                >
                  Open Quick Check{" "}
                  <Icon className="text-[17px]" name="arrow_right" />
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </main>
  );
}
