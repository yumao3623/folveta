import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Folveta Study Guide Maker plans: Free includes 2 Study Guides per month, and Folveta Pro includes 10 for US$12 per month.",
  alternates: { canonical: "/pricing" },
};

const plans = [
  { name: "Free", price: "US$0", detail: "2 successful Study Guides each month", items: ["2 successful Study Guide generations per month", "Quick Check included", "Source-grounded Study Guides"] },
  { name: "Folveta Pro", price: "US$12", detail: "per month", items: ["10 successful Study Guide generations per month", "Quick Check included", "Cancel anytime; access continues through the paid period"] },
];

export default function PricingPage() {
  return <>
    <main className="flex-1 bg-[var(--background)]">
      <div className="mx-auto w-full max-w-[960px] px-5 py-12 sm:px-8 sm:py-20">
        <Link className="font-display text-2xl font-extrabold tracking-tight text-[var(--accent)]" href="/">Folveta</Link>
        <p className="mt-12 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)]">Pricing</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-tight text-[var(--foreground)] sm:text-5xl">Simple limits for focused study.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-secondary)]">Each successful Study Guide generation uses one monthly quota. Quick Check is included with your guide and does not use a separate quota.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {plans.map((plan) => <section key={plan.name} className="rounded-lg border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)] sm:p-8">
            <h2 className="font-headline-md text-2xl font-semibold text-[var(--foreground)]">{plan.name}</h2>
            <p className="mt-5 font-display text-4xl font-extrabold text-[var(--foreground)]">{plan.price}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{plan.detail}</p>
            <ul className="mt-7 space-y-4 text-[15px] leading-6 text-[var(--text-secondary)]">
              {plan.items.map((item) => <li key={item} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={2} />{item}</li>)}
            </ul>
          </section>)}
        </div>
        <section className="mt-10 border-t border-[var(--line)] pt-8 text-[15px] leading-7 text-[var(--text-secondary)]">
          <h2 className="font-headline-md text-xl font-semibold text-[var(--foreground)]">Subscription and refunds</h2>
          <p className="mt-3">Folveta Pro is a monthly subscription. You can cancel anytime, and your access continues through the end of the paid billing period. Cancellation does not create a prorated refund. For duplicate or accidental charges, or a material service failure, contact support so we can review the case.</p>
          <p className="mt-3"><Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/refunds">Read the Refund Policy</Link> or <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/contact">contact support</Link>.</p>
        </section>
      </div>
    </main>
    <SiteFooter />
  </>;
}
