import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Home,
  LockKeyhole,
  PlayCircle,
  Presentation,
  Sparkles,
  Upload,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";
import { IconFrame } from "@/components/ui/icon-frame";
import { buttonClassName } from "@/components/ui/styles";
import { AuthNavigation } from "@/lib/auth-navigation";
import { MVP_LIMITS, formatMegabytes } from "@/lib/config";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const title = "Folveta | Study Guide Maker";
const description =
  "Turn text-based PDFs and PowerPoint slides into a clear, source-grounded study guide with priorities, key concepts, and an optional Quick Check.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description },
};

const FAQ_ITEMS = [
  [
    "What files can I use with this study guide maker?",
    `The current MVP accepts up to ${MVP_LIMITS.maxFiles} text-based PDF or PPTX files, up to ${formatMegabytes(MVP_LIMITS.maxFileBytes)} each and ${MVP_LIMITS.maxTotalUnits} pages or slides combined.`,
  ],
  [
    "What does the generated Study Guide include?",
    "The guide organizes topics into study-priority bands and can include concise explanations, key concepts, definitions, processes, relationships, common confusions, material gaps, and page or slide references when supported.",
  ],
  [
    "Does the product add facts from the open web?",
    "No. Guide claims and Quick Check questions are built from the uploaded course material. Unsupported evidence stays visible.",
  ],
  [
    "Can it read scanned PDFs or handwriting?",
    "Not in the current MVP. Files need reliable selectable text. Image-only pages and visual-only content are shown as gaps instead of being guessed.",
  ],
  [
    "What is Quick Check?",
    "Quick Check is an optional five-question multiple-choice check based on the current Study Guide. Mistakes link back to the relevant guide section for review.",
  ],
] as const;

function JsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: absoluteUrl("/"),
        description,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\u003c"),
      }}
    />
  );
}

const navItem =
  "group flex items-center gap-3 rounded-lg px-3 py-3 text-[14px] text-[var(--text-secondary)] transition-[background-color,color,transform] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)] active:translate-y-px";

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <IconFrame
      size="sm"
      className="bg-white/70 group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary-hover)]"
    >
      {children}
    </IconFrame>
  );
}

function LandingSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-[var(--line)]/55 bg-[var(--surface-container-low)] lg:flex">
      <div className="mb-7 px-6 pb-5 pt-8">
        <Link
          href="/"
          className="font-headline-md text-[24px] font-semibold text-[var(--accent-bright)]"
        >
          Folveta
        </Link>
      </div>
      <p className="mb-3 px-6 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
        Workspace
      </p>
      <nav className="flex-1 space-y-1.5 px-3" aria-label="Landing sections">
        <a
          href="#overview"
          aria-current="page"
          className={`${navItem} bg-[var(--accent-soft)]/60 font-medium text-[var(--foreground)]`}
        >
          <NavIcon>
            <Home className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </NavIcon>
          Overview
        </a>
        <a href="#upload" className={navItem}>
          <NavIcon>
            <Upload className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </NavIcon>
          Upload Workspace
        </a>
        <Link href="/study/demo" className={navItem}>
          <NavIcon>
            <BookOpen className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </NavIcon>
          Example Guide
        </Link>
      </nav>
      <div className="mt-auto border-t border-[var(--line)]/55 p-6">
        <a
          href="#upload"
          className={buttonClassName({ className: "w-full" })}
        >
          <Upload className="h-[18px] w-[18px]" strokeWidth={1.8} />
          Upload Document
        </a>
      </div>
    </aside>
  );
}

function LandingHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-[var(--line)]/40 bg-white/85 px-5 backdrop-blur-xl sm:px-8 lg:left-72 lg:px-12">
      <Link
        href="/"
        className="font-headline-md text-[22px] font-semibold text-[var(--accent-bright)] lg:hidden"
      >
        Folveta
      </Link>
      <div className="hidden items-center gap-2 text-[14px] text-[var(--text-muted)] lg:flex">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.8} />
        Study Guide Maker
      </div>
      <nav
        className="ml-auto flex items-center gap-1 sm:gap-3"
        aria-label="Primary navigation"
      >
        <Link
          href="/study/demo"
          className={buttonClassName({ variant: "soft", size: "sm" })}
        >
          Example guide
        </Link>
        <span className="hidden sm:inline">
          <Link
            href="/about"
            className={buttonClassName({ variant: "ghost", size: "sm" })}
          >
            About
          </Link>
        </span>
        <AuthNavigation />
      </nav>
    </header>
  );
}

function TransformationPreview() {
  return (
    <div className="relative min-h-[350px] overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white p-5 shadow-[var(--shadow-md)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--primary)]" />
      <div className="relative flex min-h-[294px] items-center gap-3 sm:gap-5">
        <div className="w-[34%] space-y-3">
          <p className="text-[11px] font-semibold text-[var(--faint)]">Course materials</p>
          <PreviewFile name="Lecture 4.pdf" type="pdf" className="-rotate-2" />
          <PreviewFile
            name="Metabolism.pptx"
            type="pptx"
            className="translate-x-1 rotate-1"
          />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <IconFrame tone="primary" size="lg" className="shadow-[var(--shadow-sm)]">
            <ArrowRight className="h-6 w-6" strokeWidth={1.8} />
          </IconFrame>
          <span className="hidden text-center text-[10px] font-semibold text-[var(--faint)] sm:block">
            Structured
          </span>
        </div>
        <div className="w-[48%] rounded-lg border border-[var(--border-soft)] bg-white p-4 shadow-[var(--shadow-sm)] sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-[var(--primary)]">Study Guide</p>
            <Badge tone="source" className="hidden sm:inline-flex">2 sources</Badge>
          </div>
          <p className="mt-2 font-headline-md text-[17px] font-semibold leading-[1.25] text-[var(--foreground)] sm:text-[19px]">
            Cellular respiration
          </p>
          <div className="mt-4 rounded-md bg-[var(--primary-soft)] p-3">
            <p className="text-[10px] font-semibold text-[var(--primary-hover)]">Study first</p>
            <p className="mt-1 text-[11px] font-medium leading-4 text-[var(--foreground)] sm:text-[12px]">
              Connect electron transport, the proton gradient, and ATP production.
            </p>
          </div>
          <div className="mt-4 space-y-2.5">
            {["Chemiosmosis", "ATP synthase"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-[10px] font-medium text-[var(--text-secondary)] sm:text-[11px]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" strokeWidth={2} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge tone="source">Slide 18</Badge>
            <Badge tone="source">Page 7</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewFile({
  name,
  type,
  className,
}: {
  name: string;
  type: "pdf" | "pptx";
  className: string;
}) {
  return (
    <div
      className={`${className} rounded-lg border border-[var(--line-soft)] bg-white p-3 shadow-[0_4px_14px_rgba(24,29,24,0.08)]`}
    >
      <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--text-secondary)]">
        {type === "pdf" ? (
          <FileText className="h-4 w-4 text-red-600" strokeWidth={1.8} />
        ) : (
          <Presentation
            className="h-4 w-4 text-[var(--tertiary)]"
            strokeWidth={1.8}
          />
        )}
        {name}
      </div>
      <p className="mt-2 line-clamp-2 text-[9px] leading-3.5 text-[var(--faint)] sm:text-[10px]">
        {type === "pdf" ? "Cellular respiration and energy transfer" : "Electron transport and chemiosmosis"}
      </p>
    </div>
  );
}

function ProductDetails() {
  const items = [
    ["01", "Study first", "See what deserves your attention now."],
    [
      "02",
      "Key concepts",
      "Keep definitions and relationships close to the source.",
    ],
    [
      "03",
      "Visible uncertainty",
      "Gaps and conflicts stay visible instead of becoming guesses.",
    ],
    [
      "04",
      "Source references",
      "Open the page or slide behind an important claim.",
    ],
  ];
  return (
    <>
      <section className="border-y border-[var(--line)]/55 bg-white/80">
        <div className="mx-auto grid w-full max-w-[1140px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-12 lg:py-20">
          <div>
            <p className="text-label-sm uppercase tracking-[0.12em] text-[var(--accent)]">
              The primary result
            </p>
            <h2 className="mt-4 max-w-md font-headline-lg text-[32px] font-bold leading-[1.2] text-[var(--foreground)]">
              A study document built for review, not another generic summary.
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {items.map(([num, heading, copy]) => (
              <article
                key={heading}
                className="border-t border-[var(--accent)]/70 pt-4"
              >
                <p className="font-mono-caption text-[12px] text-[var(--accent)]">
                  {num}
                </p>
                <h3 className="mt-2 font-headline-md text-[20px] font-semibold text-[var(--foreground)]">
                  {heading}
                </h3>
                <p className="mt-2 leading-7 text-[var(--text-secondary)]">
                  {copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto w-full max-w-[1140px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-label-sm uppercase tracking-[0.12em] text-[var(--accent)]">
              Evidence boundary
            </p>
            <h2 className="mt-4 font-headline-lg text-[32px] font-bold leading-[1.2] text-[var(--foreground)]">
              The materials remain the source of truth.
            </h2>
          </div>
          <div className="space-y-5 text-[17px] leading-8 text-[var(--text-secondary)]">
            <p>
              Folveta does not silently supplement your guide with open-web
              facts or predict your exam.
            </p>
            <p>
              Unsupported claims, parsing gaps, conflicts, and limited evidence
              remain part of the document so you can study with the right level
              of confidence.
            </p>
          </div>
        </div>
      </section>
      <section className="border-t border-[var(--line)]/55">
        <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="text-label-sm uppercase tracking-[0.12em] text-[var(--accent)]">
            Questions before you upload
          </p>
          <h2 className="mt-4 font-headline-lg text-[32px] font-bold text-[var(--foreground)]">
            A few useful boundaries.
          </h2>
          <div className="mt-8 divide-y divide-[var(--line-soft)] border-y border-[var(--line-soft)]">
            {FAQ_ITEMS.map(([question, answer]) => (
              <details key={question} className="group py-5">
                <summary className="flex list-none items-center justify-between gap-5 pr-2 font-semibold text-[var(--foreground)] transition-colors hover:text-[var(--accent)]">
                  <span>{question}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--accent)] transition-transform group-open:rotate-90">
                    <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl leading-7 text-[var(--text-secondary)]">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <LandingSidebar />
      <div className="lg:pl-72">
        <LandingHeader />
        <main className="min-h-screen bg-[var(--background)] pt-20">
          <div className="px-5 sm:px-8 lg:px-12">
            <section id="overview" className="mx-auto w-full max-w-[1140px] border-b border-[var(--border-soft)] py-8 sm:py-14 lg:py-16">
              <div className="grid items-center gap-10 lg:min-h-[420px] lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                <div className="max-w-xl">
                  <Badge tone="primary">Study Guide Maker</Badge>
                  <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[1.06] text-[var(--foreground)] sm:text-[48px]">
                    Turn course material into a Guide you can actually study.
                  </h1>
                  <p className="mt-5 max-w-lg text-[17px] leading-[1.65] text-[var(--text-secondary)]">
                    Upload text-based PDFs and lecture slides. Folveta organizes
                    the supported material into priorities, key concepts,
                    relationships, and source-linked review notes.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-2 sm:gap-3">
                    <a
                      href="#upload"
                      className={buttonClassName({ className: "shrink-0" })}
                    >
                      <Upload className="h-[17px] w-[17px]" strokeWidth={1.8} />
                      Create Guide
                    </a>
                    <Link
                      href="/study/demo"
                      className={buttonClassName({
                        variant: "ghost",
                        className: "group min-w-0",
                      })}
                    >
                      <PlayCircle
                        className="h-[18px] w-[18px] text-[var(--accent)]"
                        strokeWidth={1.8}
                      />
                      See how it works
                    </Link>
                  </div>
                  <div className="mt-7 flex flex-wrap gap-x-3 gap-y-2 text-[11px] font-medium text-[var(--muted)] sm:gap-x-5 sm:text-[12px]">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />PDF + PPTX</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />Source grounded</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--primary)]" />Private upload</span>
                  </div>
                </div>
                <div className="hidden lg:block"><TransformationPreview /></div>
              </div>
            </section>
            <section
              id="upload"
              className="mx-auto w-full max-w-[1140px] scroll-mt-24 py-12 sm:py-16 lg:py-20"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
                <div>
                  <div className="mb-7">
                    <p className="text-label-sm text-[var(--primary)]">Your materials</p>
                    <h2 className="mt-2 font-headline-md text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">Upload Workspace</h2>
                    <p className="mt-2 max-w-xl text-[14px] leading-6 text-[var(--muted)]">Add readable course files, review the queue, then continue to generation.</p>
                  </div>
                  <UploadPanel />
                </div>
                <aside className="space-y-6 border-t border-[var(--border-soft)] pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-2">
                  <div>
                    <p className="text-label-sm uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      Supported now
                    </p>
                    <div className="mt-4 space-y-3">
                      <p className="flex items-center gap-3 text-[14px]">
                        <FileText
                          className="h-5 w-5 text-red-600"
                          strokeWidth={1.8}
                        />
                        Text-based PDF
                      </p>
                      <p className="flex items-center gap-3 text-[14px]">
                        <Presentation
                          className="h-5 w-5 text-[var(--tertiary)]"
                          strokeWidth={1.8}
                        />
                        PowerPoint PPTX
                      </p>
                    </div>
                  </div>
                  <div className="ui-surface ui-surface--info p-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole
                        className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--accent)]"
                        strokeWidth={1.8}
                      />
                      <p className="text-[13px] leading-[1.6] text-[var(--text-muted)]">
                        Uploads use private signed storage. Image-only pages
                        remain visible as evidence gaps rather than being
                        guessed.
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[var(--line-soft)] pt-5 text-[12px]">
                    <div>
                      <dt className="text-[var(--text-muted)]">Files</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        Up to {MVP_LIMITS.maxFiles}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Per file</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        {formatMegabytes(MVP_LIMITS.maxFileBytes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Combined</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        {MVP_LIMITS.maxTotalUnits} units
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--text-muted)]">Formats</dt>
                      <dd className="mt-1 font-semibold text-[var(--foreground)]">
                        PDF, PPTX
                      </dd>
                    </div>
                  </dl>
                </aside>
              </div>
              <div className="mt-10 lg:hidden">
                <p className="mb-3 text-label-sm text-[var(--muted)]">What Folveta builds</p>
                <TransformationPreview />
              </div>
            </section>
          </div>
          <ProductDetails />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
