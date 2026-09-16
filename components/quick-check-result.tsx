import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AssessmentShell, type AssessmentTopic } from "@/components/assessment-shell";
import { SourceReference } from "@/components/source-reference";
import { Badge } from "@/components/ui/badge";
import { AssetIllustration } from "@/components/ui/asset-illustration";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { buttonClassName } from "@/components/ui/styles";
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
      <div className="mx-auto flex w-full max-w-[1080px] flex-col px-5 pb-20 pt-8 sm:px-8 sm:pt-10 xl:px-10">
        <header className="result-hero relative grid items-center gap-5 border-b-2 border-[var(--line)] pb-8 sm:grid-cols-[minmax(0,1fr)_180px]" data-state={result.wrong_items.length === 0 ? "success" : "complete"}>
          <div>
          <p className="text-label-sm text-[var(--accent)]">Quick Check result</p>
          <h1 className="mt-3 font-display text-[40px] font-extrabold leading-[1.08] text-[var(--foreground)] sm:text-[48px]">
            Quick Check complete
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[var(--text-secondary)] sm:text-[17px]">
            {result.wrong_items.length === 0
              ? "You answered every sampled question correctly. Keep using the Study Guide priorities for topics this short check did not sample."
              : `You answered ${result.correct_count} of ${result.scored_count} sampled questions correctly. Review the ${result.review_topics.length} related ${result.review_topics.length === 1 ? "topic" : "topics"} below before moving on.`}
          </p>
          </div>
          <AssetIllustration asset={result.wrong_items.length === 0 ? "heart" : "quick-check"} className="result-hero__art mx-auto h-40 w-40 sm:h-48 sm:w-48" priority sizes="(max-width: 640px) 160px, 192px" />
        </header>

        <section className="grid gap-8 py-8 md:grid-cols-[250px_minmax(0,1fr)] lg:gap-12">
          <div className="result-score flex items-center gap-5 rounded-3xl bg-[var(--primary-soft)] p-5 text-left md:sticky md:top-28 md:min-h-[280px] md:self-start md:flex-col md:justify-center md:p-7 md:text-center" data-state="complete">
            <div className="relative flex h-28 w-28 shrink-0 flex-col items-center justify-center md:h-36 md:w-36">
              <CartoonIcon name={accuracy === 100 ? "success" : "check"} size={52} animated />
              <p className="mt-2 font-display text-[38px] font-extrabold leading-none text-[var(--foreground)] md:text-[44px]">
                {result.correct_count}
                <span className="text-[18px] font-semibold text-[var(--text-muted)]">/{result.scored_count}</span>
              </p>
            </div>
            <div><p className="text-[12px] font-semibold text-[var(--muted)]">Score summary</p><h2 className="mt-1 font-headline-md text-[22px] font-semibold text-[var(--foreground)]">{scoreLabel(accuracy)}</h2><p className="mt-1 text-[13px] font-medium text-[var(--text-muted)]">{accuracy}% accuracy</p></div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 border-b border-[var(--line)]/70 pb-4">
              <CartoonIcon name="history" size={44} animated />
              <div><p className="text-[12px] font-semibold text-[var(--source-blue-strong)]">Next study action</p><h2 className="font-headline-md text-[24px] font-semibold text-[var(--foreground)]">Learning Loop</h2></div>
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
                    className="result-review group relative rounded-2xl border-2 border-[var(--destructive)] bg-[var(--danger-soft)] p-5"
                    data-state="review"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="destructive">
                            Needs review
                          </Badge>
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
                        className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })}
                      >
                        Review Section
                        <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {result.understood_items.length > 0 && (
                <div className="result-review flex items-center justify-between gap-4 rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] px-5 py-4 text-[14px]" data-state="success">
                  <div>
                    <Badge tone="success" className="mr-2">
                      Performed well
                    </Badge>
                    Sampled questions Q{result.understood_items.map((item) => (questionsById.get(item.question_id)?.index ?? 0) + 1).join(", Q")}
                  </div>
                  <CartoonIcon name="success" size={38} animated className="shrink-0" />
                </div>
              )}
            </div>
          </div>
        </section>

        {result.wrong_items.length > 0 && (
          <section className="border-t border-[var(--line)]/70 pt-10">
            <div className="mb-7 flex items-center gap-3">
              <CartoonIcon name="help" size={44} animated />
              <div>
                <p className="text-label-sm text-[var(--warning)]">Review details</p>
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
                  <article key={question.id} className="border-t border-[var(--border)] pt-7">
                    <p className="text-label-sm text-[var(--warning)]">
                      Question {index + 1} / {topicNames[question.topic_id] ?? "Related Guide topic"}
                    </p>
                    <h3 className="mt-3 max-w-3xl font-headline-md text-[21px] font-semibold leading-[1.4] text-[var(--foreground)]">
                      {question.stem}
                    </h3>
                    <dl className="mt-5 grid gap-3 text-[14px] sm:grid-cols-2">
                      <div className="result-review rounded-2xl border-2 border-[var(--destructive)] bg-[var(--danger-soft)] p-4" data-state="review">
                        <dt className="flex items-center gap-2 font-semibold text-[var(--danger)]"><CartoonIcon name="error" size={26} />Your answer</dt>
                        <dd className="mt-2 leading-6 text-[var(--text-secondary)]">{selected ? `${selected.id}. ${selected.text}` : "No answer"}</dd>
                      </div>
                      <div className="result-review rounded-2xl border-2 border-[var(--primary)] bg-[var(--accent-soft)] p-4" data-state="success">
                        <dt className="flex items-center gap-2 font-semibold text-[var(--accent)]"><CartoonIcon name="success" size={26} />Correct answer</dt>
                        <dd className="mt-2 leading-6 text-[var(--text-secondary)]">{correct ? `${correct.id}. ${correct.text}` : question.correct_option_id}</dd>
                      </div>
                    </dl>
                    <div className="mt-5 text-[14px] leading-6 text-[var(--text-secondary)]">
                      <p className="mb-2 text-label-sm text-[var(--text-muted)]">Why</p>
                      {question.explanation.map((claim) => <p key={claim.id}>{claim.text}</p>)}
                    </div>
                    <div className="mt-5 grid gap-2">
                      {question.source_refs.map((reference) => <SourceReference key={reference.span_id} reference={reference} />)}
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Link
                        href={reviewHref}
                        className={buttonClassName({ size: "sm" })}
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
            className={buttonClassName({ variant: "secondary", size: "lg", className: "shrink-0" })}
          >
            Return to Study Guide
            <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </Link>
        </footer>
      </div>
    </AssessmentShell>
  );
}
