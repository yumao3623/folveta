"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock3,
  FileCheck2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AssessmentShell, type AssessmentTopic } from "@/components/assessment-shell";
import { QuickCheckResultView } from "@/components/quick-check-result";
import { Button } from "@/components/ui/button";
import { Alert, Progress } from "@/components/ui/feedback";
import { IconFrame } from "@/components/ui/icon-frame";
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
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[900px] items-center px-5 py-10 sm:px-8">
          <section className="ui-surface ui-surface--elevated w-full px-6 py-8 sm:px-10 sm:py-11">
            <IconFrame size="lg" tone="primary">
              <Sparkles aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
            </IconFrame>
            <p className="mt-7 text-label-sm uppercase tracking-[0.14em] text-[var(--accent)]">Optional learning check</p>
            <h1 className="mt-3 font-display text-[42px] font-extrabold leading-[1.08] text-[var(--foreground)] sm:text-[48px]">
              Quick Check
            </h1>
            <p className="mt-4 max-w-2xl text-[17px] leading-7 text-[var(--text-secondary)]">
              Test a focused sample from this Study Guide, then return directly to the sections that need another pass.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-container-low)] p-4">
                <FileCheck2 aria-hidden="true" className="h-5 w-5 text-[var(--accent)]" strokeWidth={1.8} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">{count} questions</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-container-low)] p-4">
                <Clock3 aria-hidden="true" className="h-5 w-5 text-[var(--tertiary)]" strokeWidth={1.8} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">About 5 minutes</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-container-low)] p-4">
                <ShieldCheck aria-hidden="true" className="h-5 w-5 text-[var(--warning)]" strokeWidth={1.8} />
                <span className="text-[14px] font-medium text-[var(--foreground)]">Source grounded</span>
              </div>
            </div>
            <div className="mt-7 border-l-2 border-[var(--secondary-fixed-dim)] bg-[var(--secondary-container)]/18 px-5 py-4 text-[14px] leading-6 text-[var(--text-secondary)]">
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
                <PlayCircle aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
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
      <div className="relative min-h-[calc(100vh-5rem)] overflow-hidden px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
        <div className="relative z-10 mx-auto flex w-full max-w-[800px] flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Question {currentIndex + 1} of {quickCheck.question_count}
            </p>
            <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-[var(--surface-container-low)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tertiary)] shadow-[0_2px_8px_rgba(24,29,24,0.04)] sm:self-auto">
              <BookOpen aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
              <span className="truncate">Related to: {relatedTopic}</span>
            </span>
          </div>

          <div className="mt-6">
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

          <section className="py-10 sm:py-12">
            <fieldset>
              <legend className="mx-auto block max-w-[720px] text-center font-headline-lg text-[28px] font-bold leading-[1.25] text-[var(--foreground)] sm:text-[32px]">
                {question.stem}
              </legend>
              <p className="mx-auto mt-4 max-w-[580px] text-center text-[14px] leading-6 text-[var(--text-muted)]">
                Choose the single best answer supported by your course materials.
              </p>
              <div className="mt-9 space-y-3">
                {question.options.map((option) => {
                  const checked = answers[question.id] === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`group relative flex min-h-[74px] cursor-pointer items-center gap-4 overflow-hidden rounded-lg border bg-white px-5 py-4 shadow-[var(--shadow-xs)] transition-[background-color,border-color,box-shadow,transform] focus-within:outline focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)] active:translate-y-px sm:gap-5 sm:px-6 ${
                        checked
                          ? "border-[var(--accent-bright)] bg-[var(--surface-bright)] shadow-[0_5px_16px_rgba(24,29,24,0.07)] ring-1 ring-[var(--accent-bright)]"
                          : "border-[var(--line-soft)] hover:border-[var(--accent)]/55 hover:bg-[var(--surface-bright)] hover:shadow-[0_5px_16px_rgba(24,29,24,0.065)]"
                      }`}
                    >
                      <span className={`absolute bottom-0 left-0 top-0 w-1 transition-colors ${checked ? "bg-[var(--accent-bright)]" : "bg-transparent group-hover:bg-[var(--accent-bright)]/35"}`} />
                      <input
                        type="radio"
                        name={question.id}
                        value={option.id}
                        checked={checked}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${checked ? "bg-[var(--accent-bright)] text-white" : "bg-[var(--surface-container)] text-[var(--text-muted)] group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)]"}`}>
                        {option.id}
                      </span>
                      <span className="min-w-0 flex-1 text-[16px] leading-7 text-[var(--text-secondary)] sm:text-[17px]">{option.text}</span>
                      {checked ? (
                        <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--accent-bright)]" strokeWidth={2} />
                      ) : (
                        <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--text-faint)]/45 group-hover:text-[var(--accent)]/45" strokeWidth={1.6} />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {error && (
            <Alert tone="destructive" className="mb-4">{error}</Alert>
          )}

          <div className="flex flex-col gap-4 border-t border-[var(--line)]/55 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] text-[var(--text-muted)]">{answeredCount} of {quickCheck.question_count} answered</p>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                disabled={currentIndex === 0 || busy}
                variant="secondary"
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
                >
                  Submit answers
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIndex((index) => Math.min(quickCheck.question_count - 1, index + 1))}
                  disabled={!currentAnswered || busy}
                >
                  Next
                  <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="fixed right-8 top-1/3 hidden w-[190px] rounded-lg border border-[var(--line-soft)] bg-white/88 p-4 shadow-[0_3px_12px_rgba(24,29,24,0.045)] 2xl:block">
          <p className="border-b border-[var(--line)]/60 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Study note</p>
          <p className="mt-3 text-[13px] leading-5 text-[var(--text-secondary)]">
            This question checks the Guide&apos;s {sectionLabel(question.related_section.section_type)} section for {relatedTopic}.
          </p>
        </aside>
      </div>
    </AssessmentShell>
  );
}
