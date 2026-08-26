import Link from "next/link";
import { BookOpen, LogIn, Plus } from "lucide-react";
import { GuideSummaryCard } from "@/components/guide-summary-card";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClassName } from "@/components/ui/styles";
import { getCurrentUser } from "@/lib/server/auth";
import { listRecentGuides } from "@/lib/server/guides";

export async function RecentGuides() {
  const user = await getCurrentUser();
  const result = user ? await listRecentGuides(user.id, 4) : null;
  return (
    <section id="recent-guides" className="mx-auto w-full max-w-[1140px] scroll-mt-24 border-t border-[var(--border-soft)] py-12 sm:py-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-sm text-[var(--primary)]">Your workspace</p>
          <h2 className="mt-2 font-headline-md text-[28px] font-semibold text-[var(--foreground)]">Recent Guides</h2>
        </div>
        {user && result?.guides.length ? (
          <Link href="/my-guides" className={buttonClassName({ variant: "ghost", size: "sm" })}>View My Guides</Link>
        ) : null}
      </div>

      {!user ? (
        <EmptyState
          icon={<LogIn className="h-5 w-5" strokeWidth={1.8} />}
          title="Sign in to see recent Guides"
          description="Your account-owned Guides will appear here. No sample or public Guide is substituted."
          action={<Link href="/auth?next=/my-guides" className={buttonClassName({ size: "sm" })}>Sign in</Link>}
        />
      ) : result?.guides.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {result.guides.map((guide) => <GuideSummaryCard key={guide.id} guide={guide} manage={false} />)}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" strokeWidth={1.8} />}
          title="No Guides yet"
          description="Create a Guide from your own course materials and it will appear here."
          action={<a href="#upload" className={buttonClassName({ size: "sm" })}><Plus className="h-4 w-4" /> Create Guide</a>}
        />
      )}
    </section>
  );
}
