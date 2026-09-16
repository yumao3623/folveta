import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Play } from "lucide-react";
import { AssetIllustration } from "@/components/ui/asset-illustration";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { SiteFooter } from "@/components/site-footer";
import { UploadPanel } from "@/components/upload-panel";
import { StudyLoopPreview } from "@/components/study-loop-preview";
import { RecentGuides } from "@/components/recent-guides";
import { BrandMark } from "@/components/brand-mark";
import { AuthNavigation } from "@/lib/auth-navigation";
import { MVP_LIMITS, formatMegabytes } from "@/lib/config";
import { absoluteUrl, SITE_NAME } from "@/lib/site";

const title = "Folveta | Study Guide Maker";
const description = "Turn course PDFs, Word, Excel, PowerPoint, and image materials into a clear, source-grounded study guide with priorities, key concepts, and an optional Quick Check.";
export const metadata: Metadata = { title: { absolute: title }, description, alternates: { canonical: "/" }, openGraph: { type: "website", url: "/", siteName: SITE_NAME, title, description }, twitter: { card: "summary_large_image", title, description } };
const FAQ_ITEMS = [
  ["What files can I use with this study guide maker?", `The current MVP accepts up to ${MVP_LIMITS.maxFiles} course files, up to ${formatMegabytes(MVP_LIMITS.maxFileBytes)} each and ${MVP_LIMITS.maxTotalUnits} source units combined.`],
  ["What does the generated Study Guide include?", "The guide organizes topics into study-priority bands and can include concise explanations, key concepts, definitions, processes, relationships, common confusions, material gaps, and page or slide references when supported."],
  ["Does the product add facts from the open web?", "No. Guide claims and Quick Check questions are built from the uploaded course material. Unsupported evidence stays visible."],
  ["Can it read scanned PDFs or handwriting?", "Common image files are supported through a constrained visual-text extraction step. Scanned or image-only pages inside PDFs, and visual-only charts or diagrams, may still be shown as material gaps when reliable text cannot be extracted."],
  ["What is Quick Check?", "Quick Check is an optional five-question multiple-choice check based on the current Study Guide. Mistakes link back to the relevant guide section for review."],
] as const;

function JsonLd() {
  const jsonLd = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebApplication", name: SITE_NAME, url: absoluteUrl("/"), description, applicationCategory: "EducationalApplication", operatingSystem: "Web" },
    { "@type": "FAQPage", mainEntity: FAQ_ITEMS.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
  ] };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />;
}

function Topbar() {
  return (
    <header className="duo-topbar">
      <BrandMark />
      <span className="duo-topbar__center">Study Guide Maker</span>
      <nav className="duo-topbar__nav" aria-label="Primary navigation">
        <Link href="/study/demo" className="ui-button ui-button--secondary ui-button--sm">Example guide</Link>
        <Link href="/about" className="duo-topbar__link">About</Link>
        <AuthNavigation />
      </nav>
    </header>
  );
}

function UploadSupport() {
  return (
    <aside className="upload-support">
      <AssetIllustration asset="source" sizes="160px" />
      <h3>The materials remain the source of truth.</h3>
      <p>Folveta does not silently supplement your guide with open-web facts or predict your exam.</p>
      <div className="upload-support__formats">
        <span><CartoonIcon name="material" size={24} /> PDF</span>
        <span><CartoonIcon name="guide" size={24} /> Office</span>
        <span><CartoonIcon name="upload" size={24} /> Images</span>
      </div>
      <p className="upload-support__note"><CartoonIcon name="locked" size={24} /> Uploads use private signed storage.</p>
      <dl>
        <div><dt>Files</dt><dd>Up to {MVP_LIMITS.maxFiles}</dd></div>
        <div><dt>Per file</dt><dd>{formatMegabytes(MVP_LIMITS.maxFileBytes)}</dd></div>
        <div><dt>Combined</dt><dd>{MVP_LIMITS.maxTotalUnits} units</dd></div>
      </dl>
      <Link href="/study-guide-maker-from-pdf" className="text-link">See the PDF study guide workflow <ArrowRight /></Link>
    </aside>
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />
      <Topbar />
      <main className="landing-main">
        <section className="duo-hero" id="overview">
          <div className="duo-hero__copy">
            <p className="eyebrow">Study Guide Maker for real course material</p>
            <h1>Make your notes<br className="hero-desktop-break" /> easier to study.</h1>
            <p className="duo-hero__lede">Upload course files and get a clear, source-linked Study Guide with the topics worth reviewing first.</p>
            <div className="duo-hero__actions">
              <a href="#upload" className="ui-button ui-button--primary ui-button--lg">
                <CartoonIcon name="upload" size={24} /> Build my Guide
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
            <span className="hero-doodle hero-doodle--star" aria-hidden="true">✦</span>
            <span className="hero-doodle hero-doodle--plus" aria-hidden="true">+</span>
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
            <UploadPanel />
            <UploadSupport />
          </div>
        </section>
        <div className="landing-section"><RecentGuides /></div>
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
    </>
  );
}
