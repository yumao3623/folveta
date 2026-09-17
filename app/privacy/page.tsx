import type { Metadata } from "next";
import { PublicPageLayout } from "@/components/public-page-layout";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How the current Study Guide Maker MVP handles uploaded files, generated study data, session access, and retention.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicPageLayout label="Privacy" title="How the current MVP handles study materials" asset="locked" updated="Last updated: September 1, 2026" heroDensity="compact">
          <div className="public-page__prose max-w-[800px] space-y-10 border-t-2 border-[var(--border-soft)] pt-10 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Data the product processes</h2>
              <p className="mt-4 leading-7">The current implementation processes uploaded file metadata, original course files, extracted source text, generated Study Guides, Quick Check questions, selected answers, and Quick Check results.</p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">How it is used</h2>
              <p className="mt-4 leading-7">Uploaded content is parsed and sent through configured model services to create and verify the Study Guide and optional Quick Check. The product is designed to use uploaded-course evidence rather than silently adding open-web content.</p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Storage and access</h2>
              <p className="mt-4 leading-7">Original files are uploaded to a private Supabase Storage bucket. Session records and generated artifacts are stored in Supabase Postgres. Anonymous browser access uses a high-entropy token in an HttpOnly, SameSite=Lax cookie; only its hash is stored. If you create an account, Supabase Auth becomes the owner of claimed and newly created study data.</p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Retention status</h2>
              <div className="public-page__section mt-4 rounded-[24px] bg-[var(--warning-soft)] p-6 leading-7 text-[var(--warning)]">
                Anonymous access expires after 7 days by default. Account-owned study data does not use that anonymous expiry. Deleting a Guide makes its aggregate unavailable immediately and marks it eligible for permanent cleanup after 30 days. A daily protected cleanup removes eligible private files before their database records. You can permanently delete your account from Profile; this removes your Study Guides, source files, Quick Checks, and account access. Paddle may retain billing records where required for its legal and audit obligations. Do not upload sensitive personal information.
              </div>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Analytics and advertising</h2>
              <p className="mt-4 leading-7">The current code does not include GA4, advertising pixels, behavioral session recording, or marketing trackers. If analytics is added for production, this page must be updated before collection begins.</p>
            </section>
            <section>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Support and data requests</h2>
              <p className="mt-4 leading-7">For support and privacy requests, email <a className="font-medium text-[var(--accent)] underline underline-offset-4" href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a>. Do not send sensitive course materials or payment-card details by email.</p>
            </section>
          </div>
    </PublicPageLayout>
  );
}
