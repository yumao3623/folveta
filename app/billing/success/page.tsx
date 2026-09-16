import type { Metadata } from "next";
import Link from "next/link";
import { CartoonIcon } from "@/components/ui/cartoon-icon";
import { BrandMark } from "@/components/brand-mark";
import { buttonClassName } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

export default function BillingSuccessPage() {
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-[640px]"><BrandMark /><section className="py-14 text-center"><CartoonIcon name="check" size={96} /><h1 className="mt-6 text-3xl font-extrabold">Payment received</h1><p className="mt-4 leading-7 text-[var(--muted)]">Your subscription is being confirmed. Folveta activates Pro access from a verified Paddle webhook, so a short delay is expected.</p><Link href="/profile" className={buttonClassName({ className: "mt-7" })}><CartoonIcon name="profile" size={24} /> View billing status</Link></section></div></main>;
}
