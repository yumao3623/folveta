import type { Metadata } from "next";
import { PublicPageLayout } from "@/components/public-page-layout";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Folveta's policy for monthly subscription cancellations and refund requests.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <PublicPageLayout label="Refund Policy" title="Refunds and subscription cancellation" asset="heart" updated="Last updated: September 1, 2026">
          <div className="public-page__prose max-w-[800px] space-y-10 border-t-2 border-[var(--border-soft)] pt-10 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Monthly subscriptions</h2>
              <p className="mt-4 leading-7">Folveta Pro is billed monthly. You may cancel at any time from the subscription management area. Your Pro access and monthly quota continue through the end of the current paid billing period, and the subscription will not renew after that date.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Cancellation refunds</h2>
              <p className="mt-4 leading-7">We do not provide prorated refunds for unused time after a cancellation. Canceling a subscription stops its future renewal and does not undo access already provided during the paid period.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">When to contact us</h2>
              <p className="mt-4 leading-7">If you believe you were charged twice, charged by mistake, or experienced a material service failure, email <a className="font-medium text-[var(--accent)] underline underline-offset-4" href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a> with the email used for your subscription and a short description. We review those requests case by case.</p>
            </section>
            <section>
              <h2 className="text-2xl font-extrabold text-[var(--foreground)]">Payment processing</h2>
              <p className="mt-4 leading-7">Payments and eligible refunds are processed through Paddle, Folveta&apos;s merchant of record. Your statutory consumer rights are not limited by this policy.</p>
            </section>
          </div>
    </PublicPageLayout>
  );
}
