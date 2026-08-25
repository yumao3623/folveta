import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Terms",
  description: "Current pre-launch terms for using Study Guide Maker with course PDFs, PowerPoint slides, Study Guides, and Quick Checks.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Terms</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">Current pre-launch terms of use</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: August 25, 2026</p>

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
              <p className="mt-4 leading-7">The current MVP supports bounded text-based PDF and PPTX inputs. It may reject unsupported, locked, duplicate, image-only, oversized, or unreadable files. Features and limits may change before a production release.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Availability</h2>
              <p className="mt-4 leading-7">This repository represents a pre-launch MVP. No paid plan, service-level guarantee, refund policy, company size, or continuous availability promise is stated.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
