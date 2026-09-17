import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudyIcon, type StudyIconName } from "@/components/ui/study-icon";
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
      <aside className="learning-sidebar fixed left-0 top-0 z-50 hidden h-full w-60 flex-col border-r border-[var(--line)] bg-[var(--surface)] lg:flex">
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
                className={`learning-nav-item group flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] transition-[background-color,color,transform] active:translate-y-px ${
                  active
                    ? "bg-[var(--accent-soft)]/75 font-medium text-[var(--foreground)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-container-high)] hover:text-[var(--foreground)]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <StudyIcon name={(["guide", "source", "target"] as StudyIconName[])[index % 3]} size={20} className="shrink-0" />
                  <span className="truncate">{topic.title}</span>
                </span>
                {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[var(--line)]/70 p-6">
          <Link
            href="/"
            className={buttonClassName({ className: "w-full" })}
          >
            <StudyIcon name="upload" size={26} />
            Upload Document
          </Link>
        </div>
      </aside>

      <div className="learning-main lg:pl-60">
        <header className="learning-header fixed left-0 right-0 top-0 z-40 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6 lg:left-60">
          <BrandMark compact className="lg:hidden" />
          <nav className="ml-auto flex items-center gap-2" aria-label="Assessment navigation">
            <Link
              href={guidePath}
              className={buttonClassName({ variant: "secondary", size: "sm" })}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Study Guide
            </Link>
            <span className="hidden items-center gap-1.5 px-2 py-2 text-label-sm font-bold text-[var(--primary)] sm:flex" aria-current="page">
              <StudyIcon name="check" size={20} />
              Quick Check
            </span>
          </nav>
        </header>
        <div className="min-h-screen pt-16">{children}</div>
      </div>
    </main>
  );
}
