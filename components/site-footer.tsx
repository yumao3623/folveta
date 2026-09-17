import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-[var(--border-soft)] bg-[var(--surface-subtle)]">
      <div className="mx-auto grid max-w-[1140px] gap-10 px-5 py-12 text-sm text-[var(--text-muted)] sm:px-8 lg:grid-cols-[minmax(240px,1.15fr)_2fr] lg:gap-16">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-[310px] leading-6">Turn course files into a clear Study Guide, then return to the source behind every review task.</p>
        </div>
        <nav className="site-footer__groups grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4" aria-label="Supporting pages">
          <div><p>Product</p><Link href="/#upload">Create a Guide</Link><Link href="/study/demo">Example guide</Link><Link href="/pricing">Pricing</Link></div>
          <div><p>Learn</p><Link href="/how-to-make-a-study-guide">Study guide method</Link><Link href="/study-guide-maker-from-pdf">PDF workflow</Link></div>
          <div><p>Company</p><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/refunds">Refunds</Link></div>
          <div><p>Legal</p><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        </nav>
      </div>
    </footer>
  );
}
