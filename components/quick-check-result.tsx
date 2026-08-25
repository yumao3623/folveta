import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
} from "lucide-react";
import { AssessmentShell, type AssessmentTopic } from "@/components/assessment-shell";
import { SourceReference } from "@/components/source-reference";
import type { OptionId, QuickCheck, QuickCheckResult } from "@/lib/schemas";

function scoreLabel(accuracy: number) {
  if (accuracy === 100) return "Complete sample";
  if (accuracy >= 80) return "Strong sample";
  if (accuracy >= 60) return "Solid start";
  return "Keep reviewing";
}

export function QuickCheckResultView({
  quickCheck,
  result,
  answers,
  topicNames,
  topics,
  guidePath,
}: {
  quickCheck: QuickCheck;
  result: QuickCheckResult;
  answers: Record<string, OptionId>;
  topicNames: Record<string, string>;
  topics: AssessmentTopic[];
  guidePath: string;
}) {
  const accuracy = Math.round((result.correct_count / result.scored_count) * 100);
  const questionsById = new Map(
    quickCheck.questions.map((question, index) => [question.id, { question, index }]),
  );
  const activeTopicId = result.review_topics[0]?.topic_id ?? quickCheck.questions[0]?.topic_id;

  return (
    <AssessmentShell guidePath={guidePath} topics={topics} activeTopicId={activeTopicId}>
      <div className="mx-auto flex w-full max-w-[1140px] flex-col px-5 pb-20 pt-10 sm:px-8 sm:pt-12 lg:px-10">
        <header className="relative border-b border-[var(--line)]/65 pb-9">
          <p className="text-label-sm uppercase tracking-[0.14em] text-[var(--accent)]">Quick Check result</p>
          <h1 className="mt-3 font-display text-[42px] font-extrabold leading-[1.08] text-[var(--foreground)] sm:text-[48px]">
            Quiz Complete.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[var(--text-secondary)] sm:text-[17px]">
            {result.wrong_items.length === 0
              ? "You answered every sampled question correctly. Keep using the Study Guide priorities for topics this short check did not sample."
              : `You answered ${result.correct_count} of ${result.scored_count} sampled questions correctly. Review the ${result.review_topics.length} related ${result.review_topics.length === 1 ? "topic" : "topics"} below before moving on.`}
          </p>
          <span className="absolute right-0 top-2 hidden text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-faint)] [writing-mode:vertical-rl] lg:block">
            Assessment / Review
          </span>
        </header>

        <section className="grid gap-8 py-10 md:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
          <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-[20px] bg-[var(--surface-container)] p-8 text-center">
            <div className="absolute inset-8 rounded-full border border-dashed border-[var(--accent)]/15" />
            <div className="relative flex h-40 w-40 items-center justify-center">
              <svg aria-hidden="true" className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="43" fill="none" stroke="var(--line-soft)" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="43"
                  fill="none"
                  stroke="var(--accent-bright)"
                  strokeDasharray={270.18}
                  strokeDashoffset={270.18 * (1 - accuracy / 100)}
                  strokeLinecap="round"
                  strokeWidth="6"
                />
              </svg>
              <p className="absolute font-display text-[44px] font-extrabold leading-none text-[var(--foreground)]">
                {result.correct_count}
                <span className="text-[22px] font-semibold text-[var(--text-muted)]">/{result.scored_count}</span>
              </p>
            </div>
            <h2 className="mt-5 font-headline-md text-[23px] font-semibold text-[var(--foreground)]">
              {scoreLabel(accuracy)}
            </h2>
            <p className="mt-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {accuracy}% accuracy
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 border-b border-[var(--line)]/70 pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-container)] text-[var(--tertiary)]">
                <RotateCcw aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <h2 className="font-headline-md text-[24px] font-semibold text-[var(--foreground)]">Learning Loop</h2>
            </div>
            <p className="mb-5 mt-5 text-[15px] leading-7 text-[var(--text-secondary)]">
              {result.review_topics.length === 0
                ? "No sampled concept needs immediate correction. The result still represents only this short check."
                : `${result.review_topics.length} ${result.review_topics.length === 1 ? "concept requires" : "concepts require"} a focused review in the Study Guide.`}
            </p>

            <div className="space-y-3">
              {result.review_topics.map((topic) => {
                const related = result.wrong_items.filter((item) => item.topic_id === topic.topic_id);
                const questionNumbers = related
                  .map((item) => questionsById.get(item.question_id))
                  .filter(Boolean)
                  .map((entry) => `Q${(entry?.index ?? 0) + 1}`);
                const firstEntry = related[0] ? questionsById.get(related[0].question_id) : undefined;
                const reviewHref = `${guidePath}?reviewTopic=${encodeURIComponent(topic.topic_id)}#${topic.section_anchors[0]}`;
                return (
                  <article
                    key={topic.topic_id}
                    className="group relative rounded-xl border border-[var(--line-soft)] bg-white p-5 shadow-[0_2px_10px_rgba(24,29,24,0.04)] transition-[border-color,box-shadow] hover:border-[var(--accent)]/45 hover:shadow-[0_5px_16px_rgba(24,29,24,0.07)]"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-md bg-[var(--danger-soft)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--danger)]">
                            Needs review
                          </span>
                          <span className="text-[12px] font-medium text-[var(--text-muted)]">{questionNumbers.join(", ")}</span>
                        </div>
                        <h3 className="mt-2 font-headline-md text-[21px] font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
                          {topicNames[topic.topic_id] ?? "Related Guide topic"}
                        </h3>
                        {firstEntry && (
                          <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[var(--text-secondary)]">
                            {firstEntry.question.explanation.map((claim) => claim.text).join(" ")}
                          </p>
                        )}
                      </div>
                      <Link
                        href={reviewHref}
                        className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--surface-container)] px-4 text-[13px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] active:translate-y-px"
                      >
                        Review Section
                        <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {result.understood_items.length > 0 && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--line-soft)]/75 bg-white/65 px-5 py-4 text-[14px] text-[var(--text-secondary)]">
                  <div>
                    <span className="mr-2 rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
                      Understood
                    </span>
                    Q{result.understood_items.map((item) => (questionsById.get(item.question_id)?.index ?? 0) + 1).join(", Q")}
                  </div>
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.8} />
                </div>
              )}
            </div>
          </div>
        </section>

        {result.wrong_items.length > 0 && (
          <section className="border-t border-[var(--line)]/70 pt-10">
            <div className="mb-7 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--warning-soft)] text-[var(--warning)]">
                <CircleAlert aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-label-sm uppercase tracking-[0.12em] text-[var(--warning)]">Review details</p>
                <h2 className="mt-1 font-headline-md text-[26px] font-semibold text-[var(--foreground)]">Correct the sampled gaps</h2>
              </div>
            </div>
            <div className="space-y-6">
              {result.wrong_items.map((item) => {
                const entry = questionsById.get(item.question_id);
                if (!entry) return null;
                const { question, index } = entry;
                const selected = question.options.find((option) => option.id === answers[question.id]);
                const correct = question.options.find((option) => option.id === question.correct_option_id);
                const reviewHref = `${guidePath}?reviewQuestion=${index + 1}&reviewTopic=${encodeURIComponent(question.topic_id)}#${question.related_section.anchor}`;
                return (
                  <article key={question.id} className="rounded-xl border border-[var(--line-soft)] bg-white p-5 shadow-[0_2px_10px_rgba(24,29,24,0.035)] sm:p-7">
                    <p className="text-label-sm uppercase tracking-[0.1em] text-[var(--warning)]">
                      Question {index + 1} / {topicNames[question.topic_id] ?? "Related Guide topic"}
                    </p>
                    <h3 className="mt-3 max-w-3xl font-headline-md text-[21px] font-semibold leading-[1.4] text-[var(--foreground)]">
                      {question.stem}
                    </h3>
                    <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
                      <div className="rounded-lg bg-[var(--danger-soft)]/55 p-4">
                        <dt className="font-semibold text-[var(--danger)]">Your answer</dt>
                        <dd className="mt-2 leading-6 text-[var(--text-secondary)]">{selected ? `${selected.id}. ${selected.text}` : "No answer"}</dd>
                      </div>
                      <div className="rounded-lg bg-[var(--accent-soft)] p-4">
                        <dt className="font-semibold text-[var(--accent)]">Correct answer</dt>
                        <dd className="mt-2 leading-6 text-[var(--text-secondary)]">{correct ? `${correct.id}. ${correct.text}` : question.correct_option_id}</dd>
                      </div>
                    </dl>
                    <div className="mt-5 text-[14px] leading-6 text-[var(--text-secondary)]">
                      <p className="mb-2 text-label-sm uppercase text-[var(--text-muted)]">Why</p>
                      {question.explanation.map((claim) => <p key={claim.id}>{claim.text}</p>)}
                    </div>
                    <div className="mt-5 grid gap-2">
                      {question.source_refs.map((reference) => <SourceReference key={reference.span_id} reference={reference} />)}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Link
                        href={reviewHref}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent-bright)] px-4 text-[13px] font-semibold text-white shadow-[0_3px_10px_rgba(0,109,48,0.14)] hover:bg-[var(--accent)] hover:shadow-[0_5px_14px_rgba(0,101,44,0.18)]"
                      >
                        Review this section
                        <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <footer className="mt-12 flex flex-col gap-4 border-t border-[var(--line)]/70 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-6 text-[var(--text-muted)]">{result.disclaimer}</p>
          <Link
            href={guidePath}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--surface-container)] px-6 text-[14px] font-semibold text-[var(--foreground)] shadow-[0_2px_8px_rgba(24,29,24,0.05)] hover:bg-[var(--secondary-container)] active:translate-y-px"
          >
            Return to Study Guide
            <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
        </footer>
      </div>
    </AssessmentShell>
  );
}
