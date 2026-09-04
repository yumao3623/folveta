"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Progress } from "@/components/ui/feedback";
import { IconFrame } from "@/components/ui/icon-frame";

const stageLabels: Record<string, string> = {
  extracting_topics: "Extracting topics from your materials",
  merging_topics: "Organizing related topics",
  planning: "Organizing topics from your materials",
  generating_guide: "Writing your Study Guide",
  verifying_guide: "Checking the Guide against your materials",
  checking_grounding: "Checking the Guide against your materials",
  finalizing: "Finishing your Study Guide",
};

const activeStatuses = new Set(["queued", "running", "retrying", "preparing", "generating"]);

export type GenerationSnapshot = {
  run_id: string | null;
  status: string;
  stage: string | null;
  progress_percent: number | null;
  failure_category: string | null;
  retry_allowed: boolean;
  support_id: string | null;
};

function normalizeProgress(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

export function commitGenerationSnapshot(
  previous: GenerationSnapshot | null,
  incoming: GenerationSnapshot | null,
) {
  if (!incoming) return null;
  const progress = normalizeProgress(incoming.progress_percent);
  if (!previous || previous.run_id !== incoming.run_id) {
    return { ...incoming, progress_percent: progress };
  }
  const previousProgress = normalizeProgress(previous.progress_percent);
  return {
    ...incoming,
    progress_percent: previousProgress === null
      ? progress
      : progress === null
        ? previousProgress
        : Math.max(previousProgress, progress),
  };
}

export function isGenerationActive(state: string, busy: boolean) {
  return busy || activeStatuses.has(state) || [
    "extracting_topics",
    "merging_topics",
    "generating_guide",
    "verifying_guide",
  ].includes(state);
}

export function generationStatusLabel(generation: GenerationSnapshot | null, fallbackState: string) {
  if (!generation) return stageLabels[fallbackState] ?? "Preparing your Study Guide";
  if (generation.status === "queued") return "Preparing your Study Guide";
  if (generation.status === "retrying") return "Restoring generation progress";
  return stageLabels[generation.stage ?? ""] ?? "Building your Study Guide";
}

export function generationFailureMessage(category: string | null, retryAllowed: boolean) {
  if (category === "source") return "We could not find enough readable material to complete this Guide.";
  if (category === "validation") return "The Guide could not be safely completed from these materials.";
  return retryAllowed
    ? "Generation could not finish this time. Your materials and completed work are saved."
    : "Generation could not be completed with these materials.";
}

export function GenerationPanel({
  sessionId,
  canGenerate,
  initialState,
  initialError,
}: {
  sessionId: string;
  canGenerate: boolean;
  initialState: string;
  initialError: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [generation, setGeneration] = useState<GenerationSnapshot | null>(null);
  const [hasError, setHasError] = useState(Boolean(initialError));
  const [connectionError, setConnectionError] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestInFlight = useRef(false);
  const pollInFlight = useRef(false);
  const refreshedRun = useRef<string | null>(null);

  const poll = useCallback(async () => {
    if (pollInFlight.current) return;
    pollInFlight.current = true;
    try {
      const response = await fetch(`/api/sessions/${sessionId}/status`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) throw new Error("STATUS_UNAVAILABLE");

      const nextGeneration = (payload.generation ?? null) as GenerationSnapshot | null;
      setGeneration((current) => commitGenerationSnapshot(current, nextGeneration));
      setState((current) => payload.guide_ready ? "guide_ready" : nextGeneration?.status ?? payload.session?.state ?? current);
      setHasError(nextGeneration?.status === "failed" || ["failed_retryable", "failed_terminal"].includes(payload.session?.state));
      setConnectionError(false);

      if (payload.guide_ready) {
        const runId = nextGeneration?.run_id ?? "guide_ready";
        if (refreshedRun.current !== runId) {
          refreshedRun.current = runId;
          router.refresh();
        }
      }
    } catch {
      setConnectionError(true);
    } finally {
      pollInFlight.current = false;
    }
  }, [router, sessionId]);

  const generating = isGenerationActive(generation?.status ?? state, busy);

  useEffect(() => {
    const initial = setTimeout(() => void poll(), 0);
    if (!generating) return;
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [generating, poll]);

  const generate = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setHasError(false);
    setConnectionError(false);
    setGeneration({
      run_id: null,
      status: "queued",
      stage: null,
      progress_percent: 0,
      failure_category: null,
      retry_allowed: false,
      support_id: null,
    });
    try {
      const response = await fetch(`/api/sessions/${sessionId}/generate`, { method: "POST" });
      const payload = await response.json().catch(() => null);
      if (!response.ok && payload?.error?.code !== "GENERATION_IN_PROGRESS") {
        setGeneration(null);
        setState("failed_retryable");
        setHasError(true);
        return;
      }
      if (payload?.generation) {
        setGeneration((current) => commitGenerationSnapshot(current, payload.generation));
      }
      await poll();
    } catch {
      // The start may have succeeded before the response was lost. Observe before offering another start.
      setConnectionError(true);
      await poll();
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }, [poll, sessionId]);

  const failed = generation?.status === "failed" || generation?.status === "unable_to_generate" || ["failed_retryable", "failed_terminal"].includes(state);
  const retryAllowed = generation?.retry_allowed ?? state === "failed_retryable";
  const buttonDisabled = !canGenerate || generating || (failed && !retryAllowed);

  return <section className="ui-surface ui-surface--elevated p-6 sm:p-8">
    <div className="flex items-center gap-3"><IconFrame tone="primary" size="lg"><Sparkles className="h-6 w-6" strokeWidth={1.8} /></IconFrame><div><p className="text-label-sm text-[var(--primary)]">Generation</p><h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">Build your Study Guide</h2></div></div>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">The pipeline extracts topics source by source, merges them, writes structured sections, then validates grounding and references.</p>
    {generating && <Alert tone="success" className="mt-5" aria-live="polite">
      <p className="font-semibold">{generationStatusLabel(generation, state)}</p>
      <p className="mt-1 text-sm">You can leave this page. Your Study Guide will continue building, and progress will be here when you return.</p>
      <div className="mt-3"><Progress label="Study Guide generation progress" value={generation?.progress_percent ?? undefined} /></div>
    </Alert>}
    {connectionError && <Alert tone="warning" className="mt-5" aria-live="polite">We could not refresh progress just now. We will keep checking automatically.</Alert>}
    {hasError && failed && <Alert tone="destructive" className="mt-5">
      <strong>Generation failed:</strong> {generationFailureMessage(generation?.failure_category ?? null, retryAllowed)}
      {generation?.support_id && <p className="mt-1 text-sm">Support ID: {generation.support_id}</p>}
    </Alert>}
    <Button onClick={generate} disabled={buttonDisabled} loading={generating} loadingLabel="Generating Study Guide..." size="lg" className="mt-5">
      <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
      {failed && retryAllowed ? "Retry Study Guide generation" : "Generate Study Guide"}
    </Button>
    {!canGenerate && <p className="mt-3 text-sm text-[var(--danger)]">At least one source with readable text is required.</p>}
  </section>;
}
