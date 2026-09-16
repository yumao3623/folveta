import type { Metadata } from "next";
import Link from "next/link";
import { PaddlePricing } from "@/components/paddle-pricing";
import { getCurrentUser } from "@/lib/server/auth";
import { getPaddlePriceId } from "@/lib/billing/config";
import { PublicPageLayout } from "@/components/public-page-layout";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Folveta Study Guide Maker plans: Free includes 2 Study Guides per month, and Folveta Pro includes 10 for US$12 per month.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  return <PublicPageLayout
    label="Pricing"
    title="Simple limits for focused study."
    description="Each successful Study Guide generation uses one monthly quota. Quick Check is included with your guide and does not use a separate quota."
    asset="quest"
  >
        <div className="public-page__pricing">
          <PaddlePricing userId={user?.id ?? null} userEmail={user?.email} priceId={getPaddlePriceId()} />
        </div>
        <section className="public-page__section mt-10 rounded-[28px] bg-[var(--source-blue)] p-6 text-[15px] leading-7 text-[var(--text-secondary)] sm:p-8">
          <h2 className="font-headline-md text-xl font-semibold text-[var(--foreground)]">Subscription and refunds</h2>
          <p className="mt-3">Folveta Pro is a monthly subscription. You can cancel anytime, and your access continues through the end of the paid billing period. Cancellation does not create a prorated refund. For duplicate or accidental charges, or a material service failure, contact support so we can review the case.</p>
          <p className="mt-3"><Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/refunds">Read the Refund Policy</Link> or <Link className="font-medium text-[var(--accent)] underline underline-offset-4" href="/contact">contact support</Link>.</p>
        </section>
  </PublicPageLayout>;
}
