import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)]/55 bg-white/85">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-5 px-5 py-8 text-sm text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>
          <span className="font-semibold text-[var(--accent)]">Folveta</span>{" "}
          turns supported course files into a structured study guide.
        </p>
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2"
          aria-label="Supporting pages"
        >
          <Link
            className="rounded px-1 py-1 transition-colors hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/study/demo"
          >
            Example guide
          </Link>
          <Link
            className="rounded px-1 py-1 transition-colors hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/about"
          >
            About
          </Link>
          <Link
            className="rounded px-1 py-1 transition-colors hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link
            className="rounded px-1 py-1 transition-colors hover:text-[var(--accent)] active:text-[var(--accent-bright)]"
            href="/terms"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
