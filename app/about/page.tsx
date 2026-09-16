import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { PublicPageLayout } from "@/components/public-page-layout";

export const metadata: Metadata = {
  title: "About",
  description: "Learn what Study Guide Maker does, who it is for, and the product boundaries of the current MVP.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PublicPageLayout
      label="About"
      title="One clear Study Guide from the course files you already have"
      description="Study Guide Maker is built for college students who have too much course material and too little time to reorganize it before an exam."
      asset="guide"
    >
      <div className="grid gap-10 border-t-2 border-[var(--border-soft)] pt-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="public-page__prose space-y-7 text-lg leading-8 text-[var(--text-secondary)]">
            <p>The current product accepts PDF, Word, Excel, PowerPoint, and common image files and turns them into a structured, priority-aware Study Guide. It can show key concepts, definitions, relationships, common confusions, source references, and visible material gaps.</p>
            <p>After reviewing the guide, a student can optionally take a short Quick Check. Its purpose is narrow: identify a sampled mistake and return the student to the relevant guide section. It is not a mock exam, mastery system, exam predictor, AI tutor, or flashcard platform.</p>
          </div>
          <section className="public-page__section rounded-[28px] bg-[var(--source-blue)] p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Product boundaries</h2>
            <ul className="mt-5 space-y-4 leading-7 text-[var(--text-secondary)]">
              <li>Guide content is based on uploaded materials rather than open-web supplementation.</li>
              <li>Priority bands are study suggestions, not probabilities of appearing on an exam.</li>
              <li>Source references support spot-checking but do not prove complete course coverage.</li>
              <li>Common image files are accepted. Scanned pages, handwriting, charts, and diagrams may remain visible gaps when reliable text cannot be extracted.</li>
            </ul>
          </section>
      </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className={buttonClassName({ size: "lg" })} href="/#upload">Make My Study Guide</Link>
            <Link className={buttonClassName({ variant: "secondary", size: "lg" })} href="/study/demo">See the Example Guide</Link>
          </div>
    </PublicPageLayout>
  );
}
