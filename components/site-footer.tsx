import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer border-t-2 border-[var(--border-soft)] bg-[var(--surface-subtle)]">
      <div className="mx-auto grid max-w-[1140px] gap-8 px-5 py-10 text-sm text-[var(--text-muted)] sm:px-8 lg:grid-cols-[minmax(220px,1fr)_1.2fr] lg:gap-16">
        <div>
          <BrandMark />
          <p className="mt-3 max-w-[300px] leading-6">Folveta turns supported course files into a structured study guide.</p>
        </div>
        <nav
          className="grid grid-cols-2 gap-x-5 gap-y-2 self-center font-bold sm:grid-cols-4"
          aria-label="Supporting pages"
        >
          <Link
            className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/study/demo"
          >
            Example guide
          </Link>
          <Link
            className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/study-guide-maker-from-pdf"
          >
            PDF study guide
          </Link>
          <Link
            className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/about"
          >
            About
          </Link>
          <Link className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]" href="/pricing">Pricing</Link>
          <Link className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]" href="/refunds">Refunds</Link>
          <Link className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]" href="/contact">Contact</Link>
          <Link
            className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="rounded-xl px-2 py-2 transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/terms"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
