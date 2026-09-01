import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Folveta's policy for monthly subscription cancellations and refund requests.",
  alternates: { canonical: "/refunds" },
};

export default function RefundsPage() {
  return (
    <>
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-20">
          <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
          <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Refund Policy</p>
          <h1 className="mt-3 text-4xl font-semibold text-stone-950 sm:text-5xl">Refunds and subscription cancellation</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: September 1, 2026</p>
          <div className="mt-10 space-y-10 text-stone-700">
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Monthly subscriptions</h2>
              <p className="mt-4 leading-7">Folveta Pro is billed monthly. You may cancel at any time from the subscription management area. Your Pro access and monthly quota continue through the end of the current paid billing period, and the subscription will not renew after that date.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Cancellation refunds</h2>
              <p className="mt-4 leading-7">We do not provide prorated refunds for unused time after a cancellation. Canceling a subscription stops its future renewal and does not undo access already provided during the paid period.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">When to contact us</h2>
              <p className="mt-4 leading-7">If you believe you were charged twice, charged by mistake, or experienced a material service failure, email <a className="font-medium text-[var(--accent)] underline underline-offset-4" href="mailto:yumao3623@gmail.com">yumao3623@gmail.com</a> with the email used for your subscription and a short description. We review those requests case by case.</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-stone-950">Payment processing</h2>
              <p className="mt-4 leading-7">Payments and eligible refunds are processed through Paddle, Folveta&apos;s merchant of record. Your statutory consumer rights are not limited by this policy.</p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
