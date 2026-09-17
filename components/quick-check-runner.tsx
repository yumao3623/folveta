"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Circle,
} from "lucide-react";
import { AssessmentShell, type AssessmentTopic } from "@/components/assessment-shell";
import { QuickCheckResultView } from "@/components/quick-check-result";
import { Button } from "@/components/ui/button";
import { Alert, Progress } from "@/components/ui/feedback";
import { AssetIllustration } from "@/components/ui/asset-illustration";
import { StudyIcon } from "@/components/ui/study-icon";
import { buttonClassName } from "@/components/ui/styles";
import {
  scoreQuickCheck,
  type OptionId,
  type QuickCheck,
  type QuickCheckResult,
  type TakingQuickCheck,
} from "@/lib/schemas";

function titleFromId(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function sectionLabel(value: string) {
  return value.replaceAll("_", " ");
}

function topicMap(topics: AssessmentTopic[]) {
  return Object.fromEntries(topics.map((topic) => [topic.id, topic.title]));
}

export function QuickCheckRunner({
  sessionId,
  initialQuickCheck,
  demoQuickCheck,
  topics = [],
}: {
  sessionId: string;
  initialQuickCheck: TakingQuickCheck | null;
  demoQuickCheck?: QuickCheck;
  topics?: AssessmentTopic[];
}) {
  const router = useRouter();
  const [quickCheck, setQuickCheck] = useState(initialQuickCheck);
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [answers, setAnswers] = useState<Record<string, OptionId>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<QuickCheckResult | null>(null);
  const guidePath = `/study/${sessionId}`;

  const sourceQuestions = quickCheck?.questions ?? demoQuickCheck?.questions ?? [];
  const fallbackTopics = [...new Set(sourceQuestions.map((question) => question.topic_id))].map((id) => ({
    id,
    title: titleFromId(id),
    href: `${guidePath}#topic-${id}`,
  }));
  const shellTopics = topics.length > 0 ? topics : fallbackTopics;
  const topicNames = topicMap(shellTopics);

  useEffect(() => {
    if (started || demoResult) window.scrollTo({ top: 0 });
  }, [currentIndex, demoResult, started]);

  async function start() {
    setError(null);
    if (quickCheck) {
      setStarted(true);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/quick-check`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionCount: 5 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Quick Check generation failed.");
      }
      setQuickCheck(payload.quickCheck);
      setStarted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quick Check generation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!quickCheck) return;
    const selectedAnswers = quickCheck.questions.map((question) => ({
      question_id: question.id,
      selected_option_id: answers[question.id],
    }));
    if (selectedAnswers.some((answer) => !answer.selected_option_id)) {
      setError("Answer every question before submitting.");
      return;
    }
    if (demoQuickCheck) {
      setDemoResult(
        scoreQuickCheck(
          demoQuickCheck,
          selectedAnswers as Array<{ question_id: string; selected_option_id: OptionId }>,
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/quick-check/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quickCheckId: quickCheck.id, answers: selectedAnswers }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Quick Check submission failed.");
      }
      router.push(payload.resultPath);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Quick Check submission failed.");
      setBusy(false);
    }
  }

  if (demoQuickCheck && demoResult) {
    return (
      <QuickCheckResultView
        quickCheck={demoQuickCheck}
        result={demoResult}
        answers={answers}
        topicNames={topicNames}
        topics={shellTopics}
        guidePath={guidePath}
      />
    );
  }

  if (!started) {
    const count = quickCheck?.question_count ?? 5;
    return (
      <AssessmentShell guidePath={guidePath} topics={shellTopics} activeTopicId={shellTopics[0]?.id}>
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[1020px] items-center px-5 py-8 sm:px-8 sm:py-10">
          <section className="assessment-intro relative grid w-full items-center gap-5 sm:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0">
            <p className="pr-28 text-label-sm text-[var(--accent)] sm:pr-0">Optional learning check</p>
            <h1 className="mt-3 pr-28 font-display text-[38px] font-bold leading-[1.08] text-[var(--foreground)] sm:pr-0 sm:text-[48px]">
              Quick Check
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-7 text-[var(--text-secondary)]">
              Test a focused sample from this Study Guide, then return directly to the sections that need another pass.
            </p>
            <div className="assessment-facts mt-7 flex flex-wrap gap-x-5 gap-y-3 border-y-2 border-[var(--border-soft)] py-5">
              <div className="flex items-center gap-2">
                <StudyIcon name="check" size={22} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">{count} questions</span>
              </div>
              <div className="flex items-center gap-2">
                <StudyIcon name="history" size={22} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">About 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <StudyIcon name="source" size={22} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">Source grounded</span>
              </div>
            </div>
            <div className="mt-6 text-[14px] leading-6 text-[var(--text-muted)]">
              Results appear only after submission. This short sample does not certify mastery or predict an exam score.
            </div>
            {error && (
              <Alert tone="destructive" className="mt-5">{error}</Alert>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                onClick={start}
                disabled={busy}
                loading={busy}
                loadingLabel="Creating supported questions..."
                size="lg"
              >
                <StudyIcon name="check" size={26} />
                Start Quick Check
              </Button>
              <Link
                href={guidePath}
                className={buttonClassName({ variant: "secondary", size: "lg" })}
              >
                <ArrowLeft aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
                Back to Study Guide
              </Link>
            </div>
            </div>
            <AssetIllustration asset="quick-check" className="assessment-illustration absolute right-0 top-0 h-28 w-28 sm:static sm:mx-auto sm:h-64 sm:w-64" priority sizes="(max-width: 640px) 112px, 256px" />
          </section>
        </div>
      </AssessmentShell>
    );
  }

  if (!quickCheck) return null;

  const question = quickCheck.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === quickCheck.question_count;
  const currentAnswered = Boolean(answers[question.id]);
  const lastQuestion = currentIndex === quickCheck.question_count - 1;
  const relatedTopic = topicNames[question.topic_id] ?? titleFromId(question.topic_id);

  return (
    <AssessmentShell guidePath={guidePath} topics={shellTopics} activeTopicId={question.topic_id}>
      <div className="assessment-stage relative min-h-[calc(100dvh-4rem)] px-5 pb-24 pt-5 sm:px-8 sm:py-9 lg:px-10">
        <div className="relative z-10 mx-auto flex w-full max-w-[800px] flex-col">
          <h1 className="sr-only">Quick Check question {currentIndex + 1} of {quickCheck.question_count}</h1>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-semibold text-[var(--text-muted)]">
              Question {currentIndex + 1} of {quickCheck.question_count}
            </p>
            <span className="inline-flex min-w-0 max-w-[68%] items-center gap-2 rounded-md bg-[var(--source-blue)] px-3 py-1.5 text-[11px] font-semibold text-[var(--source-blue-strong)]">
              <StudyIcon name="guide" size={16} />
              <span className="truncate">Related to: {relatedTopic}</span>
            </span>
          </div>

          <div className="mt-4">
            <Progress
              label={`${currentIndex + 1} of ${quickCheck.question_count}`}
              value={((currentIndex + 1) / quickCheck.question_count) * 100}
            />
          </div>

          {quickCheck.limited_sample && (
            <Alert tone="warning" className="mt-5">
              Only {quickCheck.question_count} questions passed every evidence and quality check, so this is a shorter sample.
            </Alert>
          )}

          <section key={question.id} data-direction={direction} className="quick-question-enter py-6 sm:py-10">
            <fieldset>
              <legend className="mx-auto block max-w-[720px] text-center font-headline-lg text-[24px] font-bold leading-[1.28] text-[var(--foreground)] sm:text-[32px]">
                {question.stem}
              </legend>
              <p className="mx-auto mt-3 max-w-[580px] text-center text-[14px] leading-6 text-[var(--text-muted)]">
                Choose the single best answer supported by your course materials.
              </p>
              <div className="mt-6 space-y-3 sm:mt-8">
                {question.options.map((option) => {
                  const checked = answers[question.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      data-selected={checked || undefined}
                      data-state={checked ? "selected" : "idle"}
                      className={`quick-answer group relative flex min-h-[68px] scroll-mt-24 scroll-mb-28 cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-[background-color,border-color,box-shadow,transform] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)] sm:min-h-[76px] sm:gap-5 sm:px-6 sm:py-4 ${
                        checked
                          ? "border-[var(--accent-bright)] bg-[var(--primary-soft)]/35 shadow-[0_5px_16px_rgba(24,29,24,0.07)] ring-1 ring-[var(--accent-bright)]"
                          : "border-[var(--line-soft)] hover:border-[var(--accent)]/55 hover:bg-[var(--surface-bright)] hover:shadow-[0_5px_16px_rgba(24,29,24,0.065)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={checked}
                        disabled={busy}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      <span className={`quick-answer__marker flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[14px] font-bold sm:h-10 sm:w-10 ${checked ? "bg-[var(--accent-bright)] text-white" : "bg-[var(--surface-container)] text-[var(--text-muted)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]"}`}>
                        {option.id}
                      </span>
                      <span className="min-w-0 flex-1 text-[16px] leading-7 text-[var(--text-secondary)] sm:text-[17px]">{option.text}</span>
                      {checked ? (
                        <StudyIcon name="check" size={22} animated className="shrink-0" />
                      ) : (
                        <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--text-faint)]/45 group-hover:text-[var(--accent)]/45" strokeWidth={1.6} />
                      )}
                    </label>
                  );
                })}
              </div>
              <aside className="mt-6 flex items-start gap-3 border-l-2 border-[var(--source-blue-strong)] bg-[var(--source-blue)] px-4 py-3 text-[13px] leading-5 text-[#214e72]">
                <StudyIcon name="source" size={20} className="shrink-0" />
                <p><strong>Study note:</strong> This question checks the Guide&apos;s {sectionLabel(question.related_section.section_type)} section for {relatedTopic}.</p>
              </aside>
            </fieldset>
          </section>

          {error && (
            <Alert tone="destructive" className="mb-4">{error}</Alert>
          )}

          <div className="assessment-toolbar fixed bottom-0 left-0 right-0 z-30 flex items-center border-t border-[var(--line)] bg-white px-4 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:justify-between sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-5 lg:left-60">
            <p className="hidden text-[13px] text-[var(--text-muted)] sm:block">{answeredCount} of {quickCheck.question_count} answered</p>
            <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center">
              <Button
                onClick={() => { setDirection("backward"); setCurrentIndex((index) => Math.max(0, index - 1)); }}
                disabled={currentIndex === 0 || busy}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                Previous
              </Button>
              {lastQuestion ? (
                <Button
                  onClick={submit}
                  disabled={!allAnswered || busy}
                  loading={busy}
                  loadingLabel="Checking..."
                  className="w-full sm:w-auto"
                >
                  Submit answers
                  <StudyIcon name="check" size={24} />
                </Button>
              ) : (
                <Button
                  onClick={() => { setDirection("forward"); setCurrentIndex((index) => Math.min(quickCheck.question_count - 1, index + 1)); }}
                  disabled={!currentAnswered || busy}
                  className="w-full sm:w-auto"
                >
                  Next
                  <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              )}
            </div>
          </div>
        </div>

      </div>
    </AssessmentShell>
  );
}
