import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageLayout } from "@/components/public-page-layout";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using Folveta Study Guide Maker with course files, Study Guides, Quick Checks, and subscriptions.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicPageLayout label="Terms" title="Terms of use" asset="source" updated="Last updated: September 1, 2026">
          <div className="public-page__prose max-w-[800px] space-y-10 border-t-2 border-[var(--border-soft)] pt-10 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Use of course materials</h2>
              <p className="mt-4 leading-7">Only upload materials you are authorized to use and process. Do not upload confidential records, another person&apos;s sensitive personal information, or content that you do not have permission to submit.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Educational assistance, not a guarantee</h2>
              <p className="mt-4 leading-7">Study Guides and Quick Checks are study aids generated from the available uploaded evidence. They may contain omissions, incomplete interpretations, or errors. They do not guarantee complete course coverage, exam readiness, a particular grade, or prediction of exam content.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Your responsibility</h2>
              <p className="mt-4 leading-7">Review important claims against your original course materials and follow the academic-integrity rules of your school and course. The product should not replace instructor guidance or required reading.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Service limits</h2>
              <p className="mt-4 leading-7">The service accepts bounded PDF, Word, Excel, PowerPoint, legacy Office, and common image inputs. It may reject malformed, locked, duplicate, oversized, or unreadable files. Scanned pages, handwriting, or visual-only content can remain a grounding gap when reliable text cannot be extracted.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Availability</h2>
              <p className="mt-4 leading-7">Folveta is provided as an online service and may be updated, paused, or unavailable from time to time. We do not offer a service-level guarantee or promise continuous availability.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Subscriptions and cancellation</h2>
              <p className="mt-4 leading-7">Folveta Pro is a monthly subscription with the quota shown on our <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/pricing">Pricing</Link> page. You can cancel at any time. Access continues through the end of the paid billing period, and cancellations do not receive a prorated refund. See our <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/refunds">Refund Policy</Link> for details.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Contact</h2>
              <p className="mt-4 leading-7">For support, subscription, or privacy requests, contact us at <a className="font-medium text-[var(--accent)] underline underline-offset-4" href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a>.</p>
            </section>
          </div>
    </PublicPageLayout>
  );
}
