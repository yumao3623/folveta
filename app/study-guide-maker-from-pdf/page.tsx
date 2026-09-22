import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { PublicPageLayout } from "@/components/public-page-layout";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";
import { StructuredData } from "@/components/structured-data";
import { publicPageMetadata, publicPageSchema } from "@/lib/seo";
import { MVP_LIMITS, formatMegabytes } from "@/lib/config";
import { BILLING_PLANS } from "@/lib/billing/config";
import { PublicUploadPanel } from "@/components/public-upload";

const page = {
  title: "PDF to Study Guide: Upload and Start Free",
  description: "Turn a readable course PDF into a Study Guide with key concepts, page references, visible gaps, and Quick Check. See file limits and start uploading.",
  path: "/study-guide-maker-from-pdf",
};
export const metadata = publicPageMetadata(page);

const workflow = [
  {
    title: "Upload a readable course PDF",
    asset: "material" as FolvetaAsset,
    description:
      "Start with the lecture handout, reading, or other course PDF you want to organize before studying.",
  },
  {
    title: "Review source evidence and gaps",
    asset: "source" as FolvetaAsset,
    description:
      "Folveta keeps material it cannot reliably extract visible as an evidence gap instead of filling it in.",
  },
  {
    title: "Study the organized guide",
    asset: "guide" as FolvetaAsset,
    description:
      "Use the priorities, concepts, definitions, relationships, and source references to decide what to review next.",
  },
];

export default function StudyGuideMakerFromPdfPage() {
  return (
    <>
      <StructuredData data={publicPageSchema(page)} />
      <PublicPageLayout
        label="PDF workflow"
        breadcrumbLabel={page.title}
        title="Study Guide Maker from PDF files"
        asset="material"
        description={(
          <p>
              Turn a readable course PDF into one structured Study Guide, so
              you can see what to study first, what to review next, and where
              each point came from in the source.
          </p>
        )}
        actions={(
          <>
              <Link className={buttonClassName({ size: "lg" })} href="#upload">
                Make a Guide from PDF
              </Link>
              <Link
                className={buttonClassName({ variant: "secondary", size: "lg" })}
                href="/study/demo"
              >
                See an Example Guide
              </Link>
          </>
        )}
      >
          <section id="upload" className="mb-12 scroll-mt-24" aria-labelledby="pdf-upload-heading">
            <h2 id="pdf-upload-heading" className="text-2xl font-bold">Make a study guide from your PDF</h2>
            <p className="mt-3 mb-6 max-w-3xl leading-7 text-[var(--text-secondary)]">Add a readable PDF below, check your file queue, and continue to generation. You can include related course documents or slides in the same guide. Free accounts include {BILLING_PLANS.free.monthlyStudyGuides} successful guides per month.</p>
            <PublicUploadPanel />
          </section>
          <section className="mb-10 max-w-3xl leading-7 text-[var(--text-secondary)]" aria-labelledby="pdf-ready-heading">
            <h2 id="pdf-ready-heading" className="text-2xl font-bold text-[var(--foreground)]">Before you upload your PDF</h2>
            <p className="mt-4">Choose a course handout, assigned reading, or text-based lecture PDF. Try selecting and copying a paragraph in your PDF viewer: readable text is a useful first check, although it does not guarantee that every page will parse correctly.</p>
            <p className="mt-4">Each file can be up to {formatMegabytes(MVP_LIMITS.maxFileBytes)}. Free supports up to {BILLING_PLANS.free.maxFiles} files and {BILLING_PLANS.free.maxUnits} source units per Guide; one PDF page counts as one unit. Combined text limits also apply. Check <Link href="/pricing" className="text-link">Free and Pro limits</Link> before uploading a long reading.</p>
            <p className="mt-4">Use files you have permission to process. See <Link href="/privacy" className="text-link">file privacy and retention</Link> for how your materials are handled.</p>
          </section>
          <section className="public-page__section rounded-[32px] bg-[var(--source-blue)] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              From PDF to a study plan you can check
            </h2>
            <ol className="mt-6 grid gap-6">
              {workflow.map((step) => (
                <li key={step.title} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[108px_minmax(0,1fr)] sm:gap-6">
                  <AssetIllustration asset={step.asset} className="w-full" sizes="108px" />
                  <div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[680px] text-[15px] leading-7 text-[var(--text-secondary)]">
                    {step.description}
                  </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">
                What your PDF Study Guide can include
              </h2>
              <ul className="mt-5 list-disc space-y-4 pl-5 text-[15px] leading-7 text-[var(--text-secondary)] marker:text-[var(--primary)]">
                <li>
                  Study First, Study Next, and Review If Time priorities.
                </li>
                <li>
                  Key concepts, definitions, processes, and relationships from the uploaded material.
                </li>
                <li>
                  Common confusions, visible material gaps, and page references for spot-checking.
                </li>
                <li>
                  An optional Quick Check that maps a sampled wrong answer back to the relevant guide section.
                </li>
              </ul>
            </div>
            <aside className="public-page__section rounded-[28px] bg-[var(--warning-soft)] p-6">
              <AssetIllustration asset="source" className="mx-auto w-[150px]" sizes="150px" />
              <h2 className="mt-3 text-lg font-bold text-[var(--foreground)]">
                Check important details
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Scanned or image-only pages, handwriting, charts, and diagrams
                may remain visible evidence gaps. Check important claims against
                the original PDF.
              </p>
            </aside>
          </section>

          <section className="mt-12 border-t-2 border-[var(--border-soft)] pt-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Use the page references to check the guide</h2>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-[var(--text-secondary)]">
              <li>Choose an important definition or explanation in the generated guide.</li>
              <li>Read its source excerpt and page reference, then open that page in your original PDF.</li>
              <li>Check any conditions, exceptions, equations, or diagram labels that may change the meaning.</li>
              <li>Keep unresolved points on your review list and add missing course material before relying on them.</li>
            </ol>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">A reference helps you verify a claim; it does not prove that the guide covers the entire PDF. Use the <Link href="/how-to-make-a-study-guide#review-checklist" className="text-link">study guide review checklist</Link> to check what is ready and what still needs work.</p>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">If a topic needs more explanation, copy the <Link href="/how-to-make-a-study-guide#study-guide-template" className="text-link">reusable study guide topic template</Link> into your notes and complete it alongside the original PDF.</p>
          </section>

          <section className="mt-12" aria-labelledby="pdf-questions-heading">
            <h2 id="pdf-questions-heading" className="text-2xl font-bold text-[var(--foreground)]">Questions about making a study guide from a PDF</h2>
            <div className="faq-list mt-6">
              <details><summary>What if my PDF is scanned or image-only?</summary><p>Folveta may be unable to extract reliable text from scanned pages. Use a text-based copy or run OCR with a tool you trust, check the extracted text, and upload the readable version. Unreadable pages can remain visible gaps; Folveta does not promise complete diagram or handwriting recognition.</p></details>
              <details><summary>Can I combine more than one PDF?</summary><p>Yes, within your plan&apos;s file, source-unit, and text limits. Group related material from the same course topic so you can check the resulting guide against a clear source set. Avoid duplicate copies of the same reading.</p></details>
              <details><summary>Is this a PDF summary or a study guide?</summary><p>The result organizes supported material into topics, priorities, explanations, and review targets. It can also include definitions, relationships, common confusions, and source references. The guide stays in Folveta; the original PDF remains your reference.</p></details>
              <details><summary>What should I do after reading the guide?</summary><p>Try answering the practice prompts without looking, or take the optional Quick Check. Return to the relevant guide section after a mistake, then verify it in the PDF. A small question sample cannot assess everything in your course.</p></details>
            </div>
          </section>

          <section className="mt-12 border-t-2 border-[var(--border-soft)] pt-8">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">
              Ready to make a guide from your PDF?
            </h2>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              Start with one readable course PDF in the <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/">Study Guide Maker</Link>.
              Folveta also supports Word, Excel, PowerPoint, and common image
              files. Review <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/pricing">plans and monthly limits</Link> or
              read more about <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/about">the product boundaries</Link> before you begin.
            </p>
            <div className="mt-6 flex flex-wrap gap-3"><Link href="#upload" className={buttonClassName({ size: "lg" })}>Upload my course PDF</Link><Link href="/study/demo" className={buttonClassName({ variant: "secondary", size: "lg" })}>Explore the example guide</Link></div>
          </section>
      </PublicPageLayout>
    </>
  );
}
