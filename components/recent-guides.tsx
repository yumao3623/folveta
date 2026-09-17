"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/ui/feedback";
import { buttonClassName } from "@/components/ui/styles";
import { StudyIcon } from "@/components/ui/study-icon";
import { usePublicViewer } from "@/components/public-viewer";

const RecentGuideList = dynamic(() => import("@/components/recent-guide-list"), {
  loading: () => <p role="status" className="py-10 text-center text-[var(--muted)]">Loading your Guides…</p>,
});

export function RecentGuides() {
  const { viewer, status } = usePublicViewer();
  const user = viewer?.user;
  return (
    <section id="recent-guides" className="mx-auto w-full max-w-[1140px] scroll-mt-24 border-t border-[var(--border-soft)] py-12 sm:py-16">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-sm text-[var(--primary)]">Your workspace</p>
          <h2 className="mt-2 font-headline-md text-[28px] font-semibold text-[var(--foreground)]">Recent Guides</h2>
        </div>
        {user ? (
          <Link href="/my-guides" prefetch={false} className={buttonClassName({ variant: "ghost", size: "sm" })}>View My Guides</Link>
        ) : null}
      </div>

      {status === "loading" ? <p role="status" className="py-10 text-center text-[var(--muted)]">Loading your workspace…</p> : status === "error" ? (
        <p role="alert" className="py-10 text-center text-[var(--muted)]">Your workspace could not load. <button className="text-link underline" onClick={() => window.location.reload()}>Try again</button></p>
      ) : user ? <RecentGuideList key={user.id} viewer={viewer} /> : (
        <EmptyState
          icon={<StudyIcon name="profile" size={22} />}
          title="Sign in to see recent Guides"
          description="Pick up where you left off with the Guides saved to your account."
          action={<Link href="/auth?next=/my-guides" prefetch={false} className={buttonClassName({ size: "sm" })}>Sign in</Link>}
        />
      )}
    </section>
  );
}
