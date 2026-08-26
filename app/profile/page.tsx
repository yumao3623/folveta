import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays, Files, LogOut, Mail } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { buttonClassName } from "@/components/ui/styles";
import { getCurrentUser } from "@/lib/server/auth";
import { getOwnedProfileSummary } from "@/lib/server/profile";

export const metadata: Metadata = { title: "Profile", robots: { index: false, follow: false } };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/profile");
  const summary = await getOwnedProfileSummary(user.id);
  return (
    <WorkspaceShell active="profile">
      <div className="mx-auto w-full max-w-[800px]">
        <header className="border-b border-[var(--border)] pb-7">
          <p className="text-label-sm text-[var(--primary)]">Account</p>
          <h1 className="mt-2 font-display text-[36px] font-extrabold leading-tight text-[var(--foreground)] sm:text-[44px]">Profile</h1>
          <p className="mt-3 text-[15px] leading-6 text-[var(--muted)]">Your Folveta account and private workspace summary.</p>
        </header>
        <section className="mt-7 ui-surface ui-surface--base p-5 sm:p-6" aria-labelledby="account-details-heading">
          <h2 id="account-details-heading" className="text-[18px] font-semibold">Account details</h2>
          <dl className="mt-5 divide-y divide-[var(--border-soft)]">
            <div className="flex min-w-0 items-center gap-3 py-4 first:pt-0"><Mail className="h-5 w-5 shrink-0 text-[var(--primary)]" /><dt className="w-28 shrink-0 text-[13px] text-[var(--muted)]">Email</dt><dd className="min-w-0 break-all text-[14px] font-medium">{user.email}</dd></div>
            <div className="flex items-center gap-3 py-4 last:pb-0"><CalendarDays className="h-5 w-5 shrink-0 text-[var(--primary)]" /><dt className="w-28 shrink-0 text-[13px] text-[var(--muted)]">Member since</dt><dd className="text-[14px] font-medium">{formatDate(user.created_at)}</dd></div>
          </dl>
        </section>
        <section className="mt-5 grid gap-4 sm:grid-cols-2" aria-label="Workspace totals">
          <Link href="/my-guides" className="ui-surface ui-surface--interactive flex items-center gap-4 p-5"><span className="ui-icon-frame ui-icon-frame--md ui-icon-frame--primary"><BookOpen className="h-5 w-5" /></span><span><strong className="block text-[24px] leading-none">{summary.guideCount}</strong><span className="mt-1 block text-[13px] text-[var(--muted)]">Guide{summary.guideCount === 1 ? "" : "s"}</span></span></Link>
          <Link href="/library" className="ui-surface ui-surface--interactive flex items-center gap-4 p-5"><span className="ui-icon-frame ui-icon-frame--md ui-icon-frame--source"><Files className="h-5 w-5" /></span><span><strong className="block text-[24px] leading-none">{summary.sourceCount}</strong><span className="mt-1 block text-[13px] text-[var(--muted)]">Source{summary.sourceCount === 1 ? "" : "s"}</span></span></Link>
        </section>
        <section className="mt-7 border-t border-[var(--border-soft)] pt-6"><form action={signOut}><button type="submit" className={buttonClassName({ variant: "secondary" })}><LogOut className="h-4 w-4" /> Sign out</button></form></section>
      </div>
    </WorkspaceShell>
  );
}
