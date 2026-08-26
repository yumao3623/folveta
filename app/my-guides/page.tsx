import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Archive, ArrowLeft, BookOpen, CircleUserRound, Plus } from "lucide-react";
import { GuideSummaryCard } from "@/components/guide-summary-card";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClassName, cn } from "@/components/ui/styles";
import { guideListOptionsSchema } from "@/lib/schemas/guide-management";
import { getCurrentUser } from "@/lib/server/auth";
import { listOwnedGuides } from "@/lib/server/guides";

export const metadata: Metadata = {
  title: "My Guides",
  robots: { index: false, follow: false },
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(view: "active" | "archived", page: number) {
  const query = new URLSearchParams({ view, page: String(page) });
  return `/my-guides?${query.toString()}`;
}

export default async function MyGuidesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/my-guides");
  const query = await searchParams;
  const parsed = guideListOptionsSchema.safeParse({
    view: firstValue(query.view),
    page: firstValue(query.page),
    limit: undefined,
  });
  const options = parsed.success ? parsed.data : { view: "active" as const, page: 1, limit: 12 };
  const result = await listOwnedGuides(user.id, options);

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-7 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-[1080px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Study Guide Maker
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account workspace">
            <Link href="/account" className={buttonClassName({ variant: "ghost", size: "sm" })}>
              <CircleUserRound className="h-4 w-4" strokeWidth={1.8} /> Account
            </Link>
            <Link href="/#upload" className={buttonClassName({ size: "sm" })}>
              <Plus className="h-4 w-4" strokeWidth={1.8} /> New Guide
            </Link>
          </nav>
        </header>

        <section className="mt-8 border-b border-[var(--border)] pb-7 sm:mt-10">
          <p className="text-label-sm text-[var(--primary)]">Folveta workspace</p>
          <h1 className="mt-2 font-display text-[36px] font-extrabold leading-tight text-[var(--foreground)] sm:text-[44px]">My Guides</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-[var(--muted)]">Open and manage the Study Guides owned by your account.</p>
        </section>

        <nav className="mt-6 inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" aria-label="Guide status">
          {(["active", "archived"] as const).map((view) => (
            <Link
              key={view}
              href={pageHref(view, 1)}
              aria-current={options.view === view ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition-colors",
                options.view === view ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
              )}
            >
              {view === "active" ? <BookOpen className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {view === "active" ? "Active" : "Archived"}
            </Link>
          ))}
        </nav>

        <section className="py-7" aria-label={options.view === "active" ? "Active Guides" : "Archived Guides"}>
          {result.guides.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {result.guides.map((guide) => <GuideSummaryCard key={guide.id} guide={guide} />)}
            </div>
          ) : (
            <EmptyState
              icon={options.view === "active" ? <BookOpen className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
              title={options.view === "active" ? "No active Guides" : "No archived Guides"}
              description={options.view === "active" ? "Create a Guide from your course materials to start this workspace." : "Guides you archive will remain available here until you restore or delete them."}
              action={options.view === "active" ? <Link href="/#upload" className={buttonClassName({ size: "sm" })}><Plus className="h-4 w-4" /> Create Guide</Link> : undefined}
            />
          )}
        </section>

        {(result.hasPreviousPage || result.hasNextPage) && (
          <nav className="flex items-center justify-between border-t border-[var(--border-soft)] py-5" aria-label="Guide pages">
            {result.hasPreviousPage ? <Link href={pageHref(options.view, result.page - 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Previous</Link> : <span />}
            <span className="text-[12px] text-[var(--muted)]">Page {result.page}</span>
            {result.hasNextPage ? <Link href={pageHref(options.view, result.page + 1)} className={buttonClassName({ variant: "secondary", size: "sm" })}>Next</Link> : <span />}
          </nav>
        )}
      </div>
    </main>
  );
}
