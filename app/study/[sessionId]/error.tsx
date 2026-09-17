"use client";

import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { StudyIcon } from "@/components/ui/study-icon";

export default function StudyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:py-12">
    <BrandMark />
    <section className="py-14 text-center" role="alert">
    <StudyIcon name="error" size={32} animated />
    <h1 className="mt-6 text-3xl font-bold text-[var(--foreground)]">The Study Guide workspace could not load.</h1>
    <p className="mt-4 leading-7 text-[var(--muted)]">Your uploaded files remain private. Retry the workspace; if generation failed, the visible stage error will remain available.</p>
    <Button onClick={reset} size="lg" className="mt-7">Try again</Button>
    </section>
  </main>;
}
