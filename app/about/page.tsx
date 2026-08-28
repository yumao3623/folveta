import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About",
  description: "Learn what Study Guide Maker does, who it is for, and the product boundaries of the current MVP.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">About</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">One clear Study Guide from the course files you already have</h1>
          <div className="mt-8 space-y-7 text-lg leading-8 text-stone-700">
            <p>Study Guide Maker is built for college students who have too much course material and too little time to reorganize it before an exam.</p>
            <p>The current product accepts PDF, Word, Excel, PowerPoint, and common image files and turns them into a structured, priority-aware Study Guide. It can show key concepts, definitions, relationships, common confusions, source references, and visible material gaps.</p>
            <p>After reviewing the guide, a student can optionally take a short Quick Check. Its purpose is narrow: identify a sampled mistake and return the student to the relevant guide section. It is not a mock exam, mastery system, exam predictor, AI tutor, or flashcard platform.</p>
          </div>
          <section className="mt-12 border-t border-[var(--line)] pt-8">
            <h2 className="text-2xl font-semibold text-stone-950">Product boundaries</h2>
            <ul className="mt-5 space-y-3 leading-7 text-stone-700">
              <li>Guide content is based on uploaded materials rather than open-web supplementation.</li>
              <li>Priority bands are study suggestions, not probabilities of appearing on an exam.</li>
              <li>Source references support spot-checking but do not prove complete course coverage.</li>
              <li>Common image files are accepted. Scanned pages, handwriting, charts, and diagrams may remain visible gaps when reliable text cannot be extracted.</li>
            </ul>
          </section>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link className={buttonClassName({ size: "lg" })} href="/#upload">Make My Study Guide</Link>
            <Link className={buttonClassName({ variant: "secondary", size: "lg" })} href="/study/demo">See the Example Guide</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
