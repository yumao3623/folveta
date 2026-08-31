import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

export default function BillingSuccessPage() {
  return <main className="min-h-screen bg-[var(--background)] px-5 py-16 sm:px-8"><section className="mx-auto max-w-[640px] ui-surface ui-surface--elevated p-7 sm:p-10"><CheckCircle2 className="h-10 w-10 text-[var(--success)]" /><h1 className="mt-5 text-3xl font-semibold">Payment received</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Your subscription is being confirmed. Folveta activates Pro access from a verified Paddle webhook, so a short delay is expected.</p><Link href="/profile" className="mt-7 inline-flex items-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white">View billing status</Link></section></main>;
}
