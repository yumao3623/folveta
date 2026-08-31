import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PaddlePricing } from "@/components/paddle-pricing";
import { getCurrentUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Pricing",
  robots: { index: false, follow: false },
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  return <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-8 sm:py-12">
    <div className="mx-auto w-full max-w-[960px]">
      <Link href={user ? "/profile" : "/"} className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"><ArrowLeft className="h-4 w-4" />Back</Link>
      <header className="mt-10 max-w-2xl"><p className="text-label-sm text-[var(--primary)]">Folveta billing</p><h1 className="mt-2 font-display text-[38px] font-extrabold leading-tight sm:text-[48px]">Choose your study pace</h1><p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Every plan keeps the core Study Guide workflow available. Upgrade when you need more room.</p></header>
      <div className="mt-9"><PaddlePricing userId={user?.id ?? null} userEmail={user?.email} /></div>
    </div>
  </main>;
}
