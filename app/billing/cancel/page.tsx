import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Checkout canceled", robots: { index: false, follow: false } };

export default function BillingCancelPage() {
  return <main className="min-h-screen bg-[var(--background)] px-5 py-16 sm:px-8"><section className="mx-auto max-w-[640px] ui-surface ui-surface--base p-7 sm:p-10"><h1 className="text-3xl font-semibold">Checkout canceled</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">No subscription was activated. Your existing Folveta workspace is unchanged.</p><Link href="/pricing" className="mt-7 inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">Return to pricing</Link></section></main>;
}
