import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { buttonClassName } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Checkout canceled", robots: { index: false, follow: false } };

export default function BillingCancelPage() {
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-[640px]"><BrandMark /><section className="py-14 text-center"><CartoonIcon name="history" size={96} /><h1 className="mt-6 text-3xl font-extrabold">Checkout canceled</h1><p className="mt-4 leading-7 text-[var(--muted)]">No subscription was activated. Your existing Folveta workspace is unchanged.</p><Link href="/pricing" className={buttonClassName({ variant: "secondary", className: "mt-7" })}>Return to pricing</Link></section></div></main>;
}
