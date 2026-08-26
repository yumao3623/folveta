import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, LogOut, Mail } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { buttonClassName } from "@/components/ui/styles";
import { getCurrentUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=/account");

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Study Guide Maker
        </Link>
        <section className="mt-7 border-t border-[var(--border)] pt-7">
          <p className="text-label-sm text-[var(--primary)]">Folveta</p>
          <h1 className="mt-2 font-headline-md text-[32px] font-semibold text-[var(--foreground)]">Account</h1>
          <div className="mt-8 flex flex-col gap-5 border-y border-[var(--border-soft)] py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-[var(--primary)]" strokeWidth={1.8} />
              <span className="truncate text-[15px] text-[var(--foreground)]">{user.email}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/my-guides" className={buttonClassName({ variant: "soft" })}>
                <BookOpen className="h-4 w-4" strokeWidth={1.8} /> My Guides
              </Link>
              <form action={signOut}>
                <button type="submit" className={buttonClassName({ variant: "secondary" })}>
                  <LogOut className="h-4 w-4" strokeWidth={1.8} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
