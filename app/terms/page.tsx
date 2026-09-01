import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using Folveta Study Guide Maker with course files, Study Guides, Quick Checks, and subscriptions.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Terms</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">Terms of use</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: September 1, 2026</p>

          <div className="mt-10 space-y-10 text-stone-700">
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Use of course materials</h2>
              <p className="mt-4 leading-7">Only upload materials you are authorized to use and process. Do not upload confidential records, another person&apos;s sensitive personal information, or content that you do not have permission to submit.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Educational assistance, not a guarantee</h2>
              <p className="mt-4 leading-7">Study Guides and Quick Checks are study aids generated from the available uploaded evidence. They may contain omissions, incomplete interpretations, or errors. They do not guarantee complete course coverage, exam readiness, a particular grade, or prediction of exam content.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Your responsibility</h2>
              <p className="mt-4 leading-7">Review important claims against your original course materials and follow the academic-integrity rules of your school and course. The product should not replace instructor guidance or required reading.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Service limits</h2>
              <p className="mt-4 leading-7">The service accepts bounded PDF, Word, Excel, PowerPoint, legacy Office, and common image inputs. It may reject malformed, locked, duplicate, oversized, or unreadable files. Scanned pages, handwriting, or visual-only content can remain a grounding gap when reliable text cannot be extracted.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Availability</h2>
              <p className="mt-4 leading-7">Folveta is provided as an online service and may be updated, paused, or unavailable from time to time. We do not offer a service-level guarantee or promise continuous availability.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Subscriptions and cancellation</h2>
              <p className="mt-4 leading-7">Folveta Pro is a monthly subscription with the quota shown on our <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/pricing">Pricing</Link> page. You can cancel at any time. Access continues through the end of the paid billing period, and cancellations do not receive a prorated refund. See our <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/refunds">Refund Policy</Link> for details.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Contact</h2>
              <p className="mt-4 leading-7">For support, subscription, or privacy requests, contact us at <a className="font-medium text-[var(--accent)] underline underline-offset-4" href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a>.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
