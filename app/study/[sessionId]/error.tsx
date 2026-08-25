"use client";

export default function StudyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto max-w-xl px-5 py-24 text-center">
    <h1 className="text-3xl font-semibold text-stone-950">The Study Guide workspace could not load.</h1>
    <p className="mt-4 leading-7 text-stone-600">Your uploaded files remain private. Retry the workspace; if generation failed, the visible stage error will remain available.</p>
    <button type="button" onClick={reset} className="mt-7 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white">Try again</button>
  </main>;
}
