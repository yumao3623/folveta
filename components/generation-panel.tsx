"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Progress } from "@/components/ui/feedback";

const stageLabels: Record<string, string> = {
  extracting_topics: "Extracting topics from each source",
  merging_topics: "Merging overlapping topics",
  generating_guide: "Writing structured Study Guide topics",
  verifying_guide: "Checking claims and source references",
  guide_ready: "Study Guide ready",
};

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
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function poll() {
    const response = await fetch(`/api/sessions/${sessionId}/status`, { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.session) {
      setState(payload.session.state);
      setStage(payload.session.current_stage);
      if (payload.session.error_message) setError(payload.session.error_message);
      if (payload.session.state === "guide_ready") {
        if (timer.current) clearInterval(timer.current);
        router.refresh();
      }
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setState("extracting_topics");
    setStage("extracting_topics");
    timer.current = setInterval(() => void poll(), 2000);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/generate`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Study Guide generation failed.");
      setState("guide_ready");
      setStage("guide_ready");
      router.refresh();
    } catch (reason) {
      setState("failed_retryable");
      setError(reason instanceof Error ? reason.message : "Study Guide generation failed.");
    } finally {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setBusy(false);
    }
  }

  const generating = busy || ["extracting_topics", "merging_topics", "generating_guide", "verifying_guide"].includes(state);
  return <section className="ui-surface ui-surface--elevated border-t-2 border-t-[var(--primary)] p-6 sm:p-8">
    <p className="text-label-sm text-[var(--muted)]">Generation</p>
    <h2 className="mt-3 text-2xl font-bold text-[var(--foreground)]">Build your Study Guide</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">The pipeline extracts topics source by source, merges them, writes structured sections, then validates grounding and references.</p>
    {generating && <Alert tone="success" className="mt-5" aria-live="polite">
      <p className="font-semibold">{stageLabels[stage ?? state] ?? "Generating Study Guide"}</p>
      <p className="mt-1 text-sm">This page checks progress automatically. Successful parsing is preserved if generation needs a retry.</p>
      <div className="mt-3"><Progress label="Study Guide generation in progress" /></div>
    </Alert>}
    {error && <Alert tone="destructive" className="mt-5"><strong>Generation failed:</strong> {error}</Alert>}
    <Button onClick={generate} disabled={!canGenerate || generating} loading={generating} loadingLabel="Generating Study Guide..." size="lg" className="mt-5">
      <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
      {state === "failed_retryable" ? "Retry Study Guide generation" : "Generate Study Guide"}
    </Button>
    {!canGenerate && <p className="mt-3 text-sm text-[var(--danger)]">At least one source with readable text is required.</p>}
  </section>;
}
