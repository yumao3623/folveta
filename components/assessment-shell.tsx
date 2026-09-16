import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CartoonIcon, type CartoonIconName } from "@/components/ui/cartoon-icon";
import { buttonClassName } from "@/components/ui/styles";
import { BrandMark } from "@/components/brand-mark";

export type AssessmentTopic = {
  id: string;
  title: string;
  href: string;
};

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
    <main className="learning-shell min-h-screen bg-[var(--background)] text-[var(--text-secondary)]">
      <aside className="learning-sidebar fixed left-0 top-0 z-50 hidden h-full w-72 flex-col border-r border-[var(--line)] bg-[var(--surface)] xl:flex">
        <div className="mb-7 px-6 pb-5 pt-8">
          <BrandMark />
        </div>
        <p className="mb-3 px-6 text-label-sm uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Study Topics
        </p>
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-3" aria-label="Study guide topics">
          {topics.slice(0, 5).map((topic, index) => {
            const active = topic.id === activeTopicId;
            return (
              <Link
                key={topic.id}
                href={topic.href}
                aria-current={active ? "page" : undefined}
                className={`learning-nav-item group flex items-center justify-between rounded-2xl px-3 py-3 text-[14px] transition-[background-color,color,transform] active:translate-y-px ${
                  active
                    ? "bg-[var(--accent-soft)]/75 font-medium text-[var(--foreground)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <CartoonIcon name={(["guide", "source", "target"] as CartoonIconName[])[index % 3]} size={40} animated className="shrink-0" />
                  <span className="truncate">{topic.title}</span>
                </span>
                {active && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[var(--line)]/70 p-6">
          <Link
            href="/"
            className={buttonClassName({ className: "w-full" })}
          >
            <CartoonIcon name="upload" size={26} />
            Upload Document
          </Link>
        </div>
      </aside>

      <div className="learning-main xl:pl-72">
        <header className="learning-header fixed left-0 right-0 top-0 z-40 flex h-20 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6 xl:left-72">
          <BrandMark compact className="xl:hidden" />
          <nav className="ml-auto flex items-center gap-2" aria-label="Assessment navigation">
            <Link
              href={guidePath}
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Study Guide
            </Link>
            <span className="hidden items-center gap-1.5 px-2 py-2 text-label-sm font-bold text-[var(--primary)] sm:flex" aria-current="page">
              <CartoonIcon name="check" size={32} />
              Quick Check
            </span>
          </nav>
        </header>
        <nav
          className="learning-mobile-nav ui-mobile-nav fixed left-0 right-0 top-20 z-30 flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 xl:hidden"
          aria-label="Study guide topics"
        >
          <span className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })} aria-current="page">
            Quick Check
          </span>
          {topics.map((topic) => {
            const active = topic.id === activeTopicId;
            return (
              <Link
                key={topic.id}
                href={topic.href}
                aria-current={active ? "page" : undefined}
                className={buttonClassName({
                  variant: active ? "soft" : "ghost",
                  size: "sm",
                  className: "shrink-0",
                })}
              >
                {topic.title}
              </Link>
            );
          })}
        </nav>
        <div className="min-h-screen pt-[8.25rem] xl:pt-20">{children}</div>
      </div>
    </main>
  );
}
