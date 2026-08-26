import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How the current Study Guide Maker MVP handles uploaded files, generated study data, session access, and retention.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Privacy</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">How the current MVP handles study materials</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: August 26, 2026</p>

          <div className="mt-10 space-y-10 text-stone-700">
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Data the product processes</h2>
              <p className="mt-4 leading-7">The current implementation processes uploaded file metadata, original PDF or PPTX files, extracted page or slide text, generated Study Guides, Quick Check questions, selected answers, and Quick Check results.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">How it is used</h2>
              <p className="mt-4 leading-7">Uploaded content is parsed and sent through configured model services to create and verify the Study Guide and optional Quick Check. The product is designed to use uploaded-course evidence rather than silently adding open-web content.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Storage and access</h2>
              <p className="mt-4 leading-7">Original files are uploaded to a private Supabase Storage bucket. Session records and generated artifacts are stored in Supabase Postgres. Anonymous browser access uses a high-entropy token in an HttpOnly, SameSite=Lax cookie; only its hash is stored. If you create an account, Supabase Auth becomes the owner of claimed and newly created study data.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Retention status</h2>
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-5 leading-7 text-amber-950">
                Anonymous access expires after 7 days by default. Account-owned study data does not use that anonymous expiry. Deleting a Guide makes its aggregate unavailable immediately and marks it eligible for permanent cleanup after 30 days; it does not prove that physical deletion has already occurred. The repository includes a protected cleanup endpoint that removes private files before database records, but deployment scheduling, retries, and production deletion behavior are not yet verified. Full account deletion and a privacy-request channel are not currently available. Until those operations are deployed and verified, do not upload sensitive personal information.
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Analytics and advertising</h2>
              <p className="mt-4 leading-7">The current code does not include GA4, advertising pixels, behavioral session recording, or marketing trackers. If analytics is added for production, this page must be updated before collection begins.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Support and data requests</h2>
              <p className="mt-4 leading-7">A production support and privacy-request channel has not yet been configured. It must be published before production deployment; no placeholder email address is presented as a real contact method.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
