import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { buttonClassName } from "@/components/ui/styles";

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
    description:
      "Start with the lecture handout, reading, or other course PDF you want to organize before studying.",
  },
  {
    title: "Review source evidence and gaps",
    description:
      "Folveta keeps material it cannot reliably extract visible as an evidence gap instead of filling it in.",
  },
  {
    title: "Study the organized guide",
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
      <main className="flex-1 bg-[var(--background)]">
        <div className="mx-auto w-full max-w-[960px] px-5 py-12 sm:px-8 sm:py-20">
          <Link
            className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]"
            href="/"
          >
            Folveta
          </Link>

          <section className="mt-12 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
              PDF workflow
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-[var(--foreground)] sm:text-5xl">
              Study Guide Maker from PDF files
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">
              Turn a readable course PDF into one structured Study Guide, so
              you can see what to study first, what to review next, and where
              each point came from in the source.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link className={buttonClassName({ size: "lg" })} href="/#upload">
                <FileText className="h-[18px] w-[18px]" strokeWidth={1.8} />
                Make a Guide from PDF
              </Link>
              <Link
                className={buttonClassName({ variant: "secondary", size: "lg" })}
                href="/study/demo"
              >
                See an Example Guide
              </Link>
            </div>
          </section>

          <section className="mt-14 border-t border-[var(--line)] pt-8">
            <h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">
              From PDF to a study plan you can check
            </h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {workflow.map((step, index) => (
                <li key={step.title} className="border-l-2 border-[var(--primary)] pl-4">
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[var(--foreground)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14 grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">
                What your PDF Study Guide can include
              </h2>
              <ul className="mt-5 space-y-3 text-[15px] leading-7 text-[var(--text-secondary)]">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
                  <span>Study First, Study Next, and Review If Time priorities.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
                  <span>Key concepts, definitions, processes, and relationships from the uploaded material.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
                  <span>Common confusions, visible material gaps, and page references for spot-checking.</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
                  <span>An optional Quick Check that maps a sampled wrong answer back to the relevant guide section.</span>
                </li>
              </ul>
            </div>
            <aside className="ui-surface ui-surface--info h-fit p-5">
              <ShieldCheck className="h-6 w-6 text-[var(--accent)]" strokeWidth={1.8} />
              <h2 className="mt-3 text-base font-semibold text-[var(--foreground)]">
                Check important details
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Scanned or image-only pages, handwriting, charts, and diagrams
                may remain visible evidence gaps. Check important claims against
                the original PDF.
              </p>
            </aside>
          </section>

          <section className="mt-14 border-t border-[var(--line)] pt-8">
            <h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
