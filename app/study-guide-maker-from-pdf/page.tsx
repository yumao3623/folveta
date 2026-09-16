import type { Metadata } from "next";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/styles";
import { PublicPageLayout } from "@/components/public-page-layout";
import { AssetIllustration, type FolvetaAsset } from "@/components/ui/asset-illustration";

export const metadata: Metadata = {
  title: "Study Guide Maker from PDF Files",
  description:
    "Turn a course PDF into a structured Study Guide with priorities, key concepts, definitions, source references, and an optional Quick Check.",
  alternates: { canonical: "/study-guide-maker-from-pdf" },
  openGraph: {
    type: "website",
    url: "/study-guide-maker-from-pdf",
    title: "Study Guide Maker from PDF Files | Folveta",
    description:
      "Turn a course PDF into a structured Study Guide with priorities, key concepts, definitions, source references, and an optional Quick Check.",
  },
  twitter: { card: "summary_large_image" },
};

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

function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Study Guide Maker from PDF Files",
    description: metadata.description,
    url: "https://folveta.com/study-guide-maker-from-pdf",
    isPartOf: { "@type": "WebSite", name: "Folveta", url: "https://folveta.com/" },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function StudyGuideMakerFromPdfPage() {
  return (
    <>
      <JsonLd />
      <PublicPageLayout
        label="PDF workflow"
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
              <Link className={buttonClassName({ size: "lg" })} href="/#upload">
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

          <section className="public-page__section rounded-[32px] bg-[var(--source-blue)] p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
              From PDF to a study plan you can check
            </h2>
            <ol className="mt-6 grid gap-6">
              {workflow.map((step) => (
                <li key={step.title} className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[108px_minmax(0,1fr)] sm:gap-6">
                  <AssetIllustration asset={step.asset} className="w-full" sizes="108px" />
                  <div>
                  <h3 className="text-lg font-extrabold text-[var(--foreground)]">
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
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
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
              <h2 className="mt-3 text-lg font-extrabold text-[var(--foreground)]">
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
            <h2 className="text-2xl font-extrabold text-[var(--foreground)]">
              A focused PDF workflow, backed by the full product
            </h2>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              This page is for the specific task of making a guide from a PDF.
              For the broader <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/">Study Guide Maker</Link>,
              Folveta also supports Word, Excel, PowerPoint, and common image
              files. Review <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/pricing">plans and monthly limits</Link> or
              read more about <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/about">the product boundaries</Link> before you begin.
            </p>
          </section>
      </PublicPageLayout>
    </>
  );
}
