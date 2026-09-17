import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { PublicPageLayout } from "@/components/public-page-layout";
import { StructuredData } from "@/components/structured-data";
import { publicPageMetadata, publicPageSchema } from "@/lib/seo";

const page = {
  title: "About Folveta and Its Study Guide Maker",
  description: "Learn how Folveta turns course files into source-linked Study Guides, who it helps, and the limits of AI-assisted organization and Quick Check.",
  path: "/about",
};
export const metadata = publicPageMetadata(page);

export default function AboutPage() {
  return (
    <><StructuredData data={publicPageSchema(page, "AboutPage")} /><PublicPageLayout
      label="About"
      breadcrumbLabel={page.title}
      title="One clear Study Guide from the course files you already have"
      description="Folveta is a Study Guide Maker for college students who want to organize their course material before an exam and keep important claims connected to their sources."
      asset="guide"
    >
      <div className="grid gap-10 border-t-2 border-[var(--border-soft)] pt-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="public-page__prose space-y-7 text-lg leading-8 text-[var(--text-secondary)]">
            <p>Folveta accepts PDF, Word, Excel, PowerPoint, and common image files and turns them into a structured, priority-aware Study Guide. It can show key concepts, definitions, relationships, common confusions, source references, and visible material gaps.</p>
            <p>After reviewing the guide, a student can optionally take a short Quick Check. Its purpose is narrow: identify a sampled mistake and return the student to the relevant guide section. It is not a mock exam, mastery system, exam predictor, AI tutor, or flashcard platform.</p>
          </div>
          <section className="public-page__section rounded-[28px] bg-[var(--source-blue)] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Product boundaries</h2>
            <ul className="mt-5 space-y-4 leading-7 text-[var(--text-secondary)]">
              <li>Guide content is based on uploaded materials rather than open-web supplementation.</li>
              <li>Priority bands are study suggestions, not probabilities of appearing on an exam.</li>
              <li>Source references support spot-checking but do not prove complete course coverage.</li>
              <li>Common image files are accepted. Scanned pages, handwriting, charts, and diagrams may remain visible gaps when reliable text cannot be extracted.</li>
            </ul>
          </section>
      </div>
          <section className="mt-10 border-t-2 border-[var(--border-soft)] pt-8">
            <h2 className="text-2xl font-bold">Choose a starting point</h2>
            <p className="mt-4 max-w-3xl leading-7 text-[var(--text-secondary)]">Read <Link href="/how-to-make-a-study-guide" className="text-link">how to make a study guide</Link> if you are deciding what a useful guide should contain. If your material is a handout or reading, the <Link href="/study-guide-maker-from-pdf" className="text-link">PDF study guide workflow</Link> explains file preparation and unreadable pages.</p>
            <p className="mt-4 max-w-3xl leading-7 text-[var(--text-secondary)]">Before uploading, compare <Link href="/pricing" className="text-link">plans and monthly limits</Link> and review <Link href="/privacy" className="text-link">how Folveta handles your files</Link>. For a product question, <Link href="/contact" className="text-link">contact support</Link>.</p>
          </section>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link className={buttonClassName({ size: "lg" })} href="/#upload">Make My Study Guide</Link>
            <Link className={buttonClassName({ variant: "secondary", size: "lg" })} href="/study/demo">See the Example Guide</Link>
          </div>
    </PublicPageLayout></>
  );
}
