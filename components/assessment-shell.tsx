import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Circle,
  FlaskConical,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { IconFrame } from "@/components/ui/icon-frame";
import { buttonClassName } from "@/components/ui/styles";

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
                  <IconFrame
                    size="sm"
                    active={active}
                    className={active ? "" : "bg-white/70 group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary-hover)]"}
                  >
                    <TopicIcon index={index} />
                  </IconFrame>
                  <span className="truncate">{topic.title}</span>
                </span>
                {active ? (
                  <Target aria-hidden="true" className="h-[17px] w-[17px] text-[var(--accent)]" strokeWidth={1.8} />
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
            className={buttonClassName({ className: "w-full" })}
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
          <nav className="ml-auto hidden items-center gap-5 sm:flex" aria-label="Assessment navigation">
            <Link
              href={guidePath}
              className="rounded-md px-2 py-2 text-label-sm uppercase text-[var(--accent)] hover:bg-[var(--accent-soft)]"
            >
              Study Guide
            </Link>
            <span className="flex items-center gap-1.5 px-2 py-2 text-label-sm uppercase text-[var(--text-muted)]">
              <Sparkles aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={1.8} />
              Quick Check
            </span>
          </nav>
        </header>
        <nav
          className="ui-mobile-nav fixed left-0 right-0 top-20 z-30 flex gap-2 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--surface)] px-4 py-2 lg:hidden"
          aria-label="Study guide topics"
        >
          <span className={buttonClassName({ variant: "soft", size: "sm", className: "shrink-0" })} aria-current="page">
            <Sparkles className="h-4 w-4" strokeWidth={1.8} /> Quick Check
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
        <div className="min-h-screen pt-[8.25rem] lg:pt-20">{children}</div>
      </div>
    </main>
  );
}
