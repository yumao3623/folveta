import type { Metadata } from "next";
import Link from "next/link";
import { StudyIcon } from "@/components/ui/study-icon";
import { BrandMark } from "@/components/brand-mark";
import { buttonClassName } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Payment received", robots: { index: false, follow: false } };

export default function BillingSuccessPage() {
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8 sm:py-12"><div className="mx-auto max-w-[640px]"><BrandMark /><section className="py-14 text-center"><StudyIcon name="check" size={32} /><h1 className="mt-6 text-3xl font-bold">Payment received</h1><p className="mt-4 leading-7 text-[var(--muted)]">Your subscription is being confirmed. Folveta activates Pro access from a verified Paddle webhook, so a short delay is expected.</p><Link href="/profile" className={buttonClassName({ className: "mt-7" })}><StudyIcon name="profile" size={24} /> View billing status</Link></section></div></main>;
}
