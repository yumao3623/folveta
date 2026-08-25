import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Circle,
  CircleUserRound,
  FlaskConical,
  LibraryBig,
  Search,
  Target,
  Upload,
} from "lucide-react";

export type AssessmentTopic = {
  id: string;
  title: string;
  href: string;
};

function TopicIcon({ index }: { index: number }) {
  const icons = [BookOpen, FlaskConical, BarChart3];
  const Icon = icons[index % icons.length];
  return <Icon aria-hidden="true" className="h-[17px] w-[17px]" strokeWidth={1.8} />;
}

export function AssessmentShell({
  guidePath,
  topics,
  activeTopicId,
  children,
}: {
  guidePath: string;
  topics: AssessmentTopic[];
  activeTopicId?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--text-secondary)]">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-[var(--line)]/70 bg-[var(--surface-container-low)] lg:flex">
        <div className="mb-7 px-6 pb-5 pt-8">
          <Link
            href="/"
            className="font-headline-md text-[24px] font-semibold text-[var(--accent-bright)]"
          >
            Folveta
          </Link>
        </div>
        <p className="mb-3 px-6 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Study Topics
        </p>
        <nav className="flex-1 space-y-1.5 px-3" aria-label="Study guide topics">
          {topics.slice(0, 5).map((topic, index) => {
            const active = topic.id === activeTopicId;
            return (
              <Link
                key={topic.id}
                href={topic.href}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center justify-between rounded-lg px-3 py-3 text-[14px] transition-[background-color,color,transform] active:translate-y-px ${
                  active
                    ? "bg-[var(--accent-soft)]/75 font-medium text-[var(--foreground)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-[0_1px_3px_rgba(24,29,24,0.04)] transition-colors ${
                      active
                        ? "bg-white/85 text-[var(--accent)]"
                        : "bg-white/55 text-[var(--text-muted)] group-hover:bg-white group-hover:text-[var(--accent)]"
                    }`}
                  >
                    <TopicIcon index={index} />
                  </span>
                  <span className="truncate">{topic.title}</span>
                </span>
                {active ? (
                  <Target aria-hidden="true" className="h-[17px] w-[17px] text-[var(--accent)]" strokeWidth={1.8} />
                ) : index === 0 ? (
                  <CheckCircle2 aria-hidden="true" className="h-[17px] w-[17px] text-[var(--text-faint)]" strokeWidth={1.8} />
                ) : (
                  <Circle aria-hidden="true" className="h-[15px] w-[15px] text-[var(--text-faint)]" strokeWidth={1.6} />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[var(--line)]/70 p-6">
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-bright)] px-4 text-[13px] font-semibold text-white shadow-[0_3px_10px_rgba(0,109,48,0.18)] transition-[background-color,box-shadow,transform] hover:bg-[var(--accent)] hover:shadow-[0_5px_14px_rgba(0,101,44,0.22)] active:translate-y-px"
          >
            <Upload aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Upload Document
          </Link>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center gap-3 border-b border-[var(--line)]/70 bg-[var(--surface)]/90 px-4 backdrop-blur-xl sm:px-6 lg:left-72">
          <Link
            href="/"
            className="font-headline-md text-[22px] font-semibold text-[var(--accent-bright)] lg:hidden"
          >
            Folveta
          </Link>
          <div className="hidden min-w-0 flex-1 items-center rounded-full border border-[var(--line)] bg-[var(--surface-container)] px-4 py-2 transition-colors focus-within:border-[var(--accent)] sm:flex sm:max-w-sm">
            <Search aria-hidden="true" className="mr-3 h-5 w-5 text-[var(--text-muted)]" strokeWidth={1.8} />
            <input
              aria-label="Search your knowledge"
              className="w-full bg-transparent text-[14px] text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-faint)]"
              placeholder="Search your knowledge..."
              readOnly
            />
          </div>
          <nav className="ml-auto hidden items-center gap-5 sm:flex" aria-label="Assessment navigation">
            <Link
              href={guidePath}
              className="rounded-md px-2 py-2 text-label-sm uppercase text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              Study Guide
            </Link>
            <span className="flex items-center gap-1.5 px-2 py-2 text-label-sm uppercase text-[var(--text-muted)]">
              <LibraryBig aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.8} />
              Quick Check
            </span>
          </nav>
          <button
            type="button"
            aria-label="Profile"
            disabled
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_2px_8px_rgba(0,101,44,0.18)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <CircleUserRound aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </header>
        <div className="min-h-screen pt-20">{children}</div>
      </div>
    </main>
  );
}
