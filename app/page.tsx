import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Play } from "lucide-react";
import { AssetIllustration } from "@/components/ui/asset-illustration";
import { StudyIcon } from "@/components/ui/study-icon";
import { SiteFooter } from "@/components/site-footer";
import { PublicUploadPanel, PublicUploadLimits } from "@/components/public-upload";
import { StudyLoopPreview } from "@/components/study-loop-preview";
import { RecentGuides } from "@/components/recent-guides";
import { SiteHeader } from "@/components/site-header";
import { MVP_LIMITS, formatMegabytes } from "@/lib/config";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { publicPageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/structured-data";
import { BILLING_PLANS } from "@/lib/billing/config";
import { PublicViewerProvider } from "@/components/public-viewer";

const description = "Make a study guide from PDFs, notes, and slides. Organize key concepts, check source references, and review with an optional Quick Check.";
export const metadata = publicPageMetadata({ title: "Study Guide Maker for Course Files", description, path: "/" });
const FAQ_ITEMS = [
  ["What files can I use with this study guide maker?", `Use PDF, Word, Excel, PowerPoint, and common image files, up to ${formatMegabytes(MVP_LIMITS.maxFileBytes)} each. Free allows ${BILLING_PLANS.free.maxFiles} files and ${BILLING_PLANS.free.maxUnits} source units per Guide; Pro has higher limits. For PDFs, one page is one source unit.`],
  ["Can I try Folveta for free?", `You can begin with the upload workspace or explore the example Guide. The Free account plan includes ${BILLING_PLANS.free.monthlyStudyGuides} successful Study Guides per month. Compare plans and limits on the Pricing page before starting a larger set of files.`],
  ["What does the generated Study Guide include?", "The guide organizes topics into study-priority bands and can include concise explanations, key concepts, definitions, processes, relationships, common confusions, material gaps, and page or slide references when supported."],
  ["How does this AI study guide maker use my files?", "Folveta works as a study guide generator for the course files you choose. It organizes uploaded material into source-linked sections and review priorities without pulling in open-web facts. Verify important claims against the cited page or slide."],
  ["Can it read scanned PDFs or handwriting?", "Common image files are supported through a constrained visual-text extraction step. Scanned or image-only pages inside PDFs, and visual-only charts or diagrams, may still be shown as material gaps when reliable text cannot be extracted."],
  ["What is Quick Check?", "Quick Check is an optional five-question multiple-choice check based on the current Study Guide. Mistakes link back to the relevant guide section for review."],
] as const;

function JsonLd() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": absoluteUrl("/#website"), name: SITE_NAME, url: absoluteUrl("/"), inLanguage: "en" },
    { "@type": "WebApplication", "@id": absoluteUrl("/#application"), name: SITE_NAME, url: absoluteUrl("/"), description, applicationCategory: "EducationalApplication", operatingSystem: "Web" },
    { "@type": "WebPage", "@id": absoluteUrl("/#webpage"), name: "Study Guide Maker for Course Files", url: absoluteUrl("/"), description, isPartOf: { "@id": absoluteUrl("/#website") }, mainEntity: { "@id": absoluteUrl("/#application") } },
  ] };
  return <StructuredData data={jsonLd} />;
}

function UploadSupport() {
  return (
    <aside className="upload-support">
      <AssetIllustration asset="source" sizes="160px" />
      <h3>The materials remain the source of truth.</h3>
      <p>Folveta does not silently supplement your guide with open-web facts or predict your exam.</p>
      <div className="upload-support__formats">
        <span><StudyIcon name="material" size={24} /> PDF</span>
        <span><StudyIcon name="guide" size={24} /> Office</span>
        <span><StudyIcon name="upload" size={24} /> Images</span>
      </div>
      <p className="upload-support__note">
        <StudyIcon name="locked" size={24} />
        <span>
          Uploads use private signed storage. <Link href="/privacy">Privacy and retention details</Link>
        </span>
      </p>
      <PublicUploadLimits />
      <Link href="/pricing" className="text-link">Compare plans and limits <ArrowRight /></Link>
      <Link href="/study-guide-maker-from-pdf" className="text-link">See the PDF study guide workflow <ArrowRight /></Link>
    </aside>
  );
}

export default function HomePage() {
  return (
    <PublicViewerProvider>
      <JsonLd />
      <SiteHeader />
      <main className="landing-main">
        <section className="duo-hero" id="overview">
          <div className="duo-hero__copy">
            <p className="eyebrow">Study Guide Maker for real course material</p>
            <h1>Study Guide Maker<br className="hero-desktop-break" /> for your course files.</h1>
            <p className="duo-hero__lede">Turn PDFs, lecture notes, and slides into a clear, source-linked Study Guide with the topics worth reviewing first.</p>
            <div className="duo-hero__actions">
              <a href="#upload" className="ui-button ui-button--primary ui-button--lg">
                <StudyIcon name="upload" size={24} /> Build my Guide
              </a>
              <Link href="/study/demo" className="ui-button ui-button--secondary ui-button--lg">
                <Play aria-hidden="true" /> See how it works
              </Link>
            </div>
            <div className="status-chips">
              <span><Check />Source-linked</span>
              <span><Check />Private files</span>
              <span><Check />Quick Check included</span>
            </div>
          </div>
          <div className="duo-hero__visual">
            <div className="duo-orbit duo-orbit--one" />
            <div className="duo-orbit duo-orbit--two" />
            <AssetIllustration asset="material" priority sizes="(max-width: 767px) 75vw, 440px" className="duo-hero__illustration" />
          </div>
        </section>
        <section className="landing-section landing-section--preview">
          <StudyLoopPreview />
        </section>
        <section className="landing-section landing-section--upload" id="upload">
          <div className="section-heading">
            <div><p className="eyebrow">Your materials</p><h2>Upload Workspace</h2></div>
            <p>Add readable course files, review the queue, then continue to generation.</p>
          </div>
          <div className="upload-layout">
            <div><PublicUploadPanel /></div>
            <UploadSupport />
          </div>
        </section>
        <div className="landing-section"><RecentGuides /></div>
        <section className="landing-section landing-section--workflow">
          <div className="section-heading">
            <div><p className="eyebrow">From material to review</p><h2>Build a guide you can check.</h2></div>
            <p>Keep the original material close as you organize, review, and practise.</p>
          </div>
          <ol className="mt-7 grid gap-8 md:grid-cols-3">
            <li><h3 className="text-xl font-bold">1. Start with your sources</h3><p className="mt-3 leading-7 text-[var(--text-secondary)]">Add the files for the topic you are studying. For a handout or reading, follow the <Link href="/study-guide-maker-from-pdf" className="text-link">PDF to Study Guide workflow</Link>.</p></li>
            <li><h3 className="text-xl font-bold">2. Review the structure</h3><p className="mt-3 leading-7 text-[var(--text-secondary)]">Check key concepts, priorities, and source references. Our guide to <Link href="/how-to-make-a-study-guide" className="text-link">making a useful study guide</Link> shows what to keep and what to verify.</p></li>
            <li><h3 className="text-xl font-bold">3. Find your next review task</h3><p className="mt-3 leading-7 text-[var(--text-secondary)]">Try the optional Quick Check and return to the section behind a mistake. Read <Link href="/about" className="text-link">Folveta&apos;s product boundaries</Link> before relying on the result.</p></li>
          </ol>
        </section>
        <section className="landing-section landing-section--faq">
          <div className="section-heading">
            <div><p className="eyebrow">Questions before you upload</p><h2>A few useful boundaries.</h2></div>
          </div>
          <div className="faq-list">
            {FAQ_ITEMS.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<ChevronDown aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </PublicViewerProvider>
  );
}
