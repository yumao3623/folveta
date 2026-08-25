"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  return <section className="border-t-2 border-[var(--accent)] bg-white p-6 sm:p-8">
    <p className="text-label-sm uppercase text-[var(--muted)]">Generation</p>
    <h2 className="mt-3 text-2xl font-bold text-[var(--foreground)]">Build your Study Guide</h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">The pipeline extracts topics source by source, merges them, writes structured sections, then validates grounding and references.</p>
    {generating && <div className="mt-5 rounded-2xl bg-[var(--accent-soft)] p-5" aria-live="polite">
      <p className="font-semibold text-emerald-950">{stageLabels[stage ?? state] ?? "Generating Study Guide"}</p>
      <p className="mt-1 text-sm text-emerald-800">This page checks progress automatically. Successful parsing is preserved if generation needs a retry.</p>
    </div>}
    {error && <div role="alert" className="mt-5 rounded-2xl bg-[var(--danger-soft)] p-5 text-sm text-[var(--danger)]"><strong>Generation failed:</strong> {error}</div>}
    <button type="button" onClick={generate} disabled={!canGenerate || generating} className="mt-5 rounded bg-[var(--accent-bright)] px-6 py-3 text-sm font-bold text-white enabled:hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50">
      {generating ? "Generating…" : state === "failed_retryable" ? "Retry Study Guide generation" : "Generate Study Guide"}
    </button>
    {!canGenerate && <p className="mt-3 text-sm text-[var(--danger)]">At least one source with readable text is required.</p>}
  </section>;
}
