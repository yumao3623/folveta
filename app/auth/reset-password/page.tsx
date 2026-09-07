import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { updatePassword } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

type ResetPasswordPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const user = await getCurrentUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-12">
      <section className="w-full max-w-[440px]">
        <Link href="/auth" className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to sign in
        </Link>
        <div className="ui-surface ui-surface--elevated mt-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="ui-icon-frame ui-icon-frame--primary ui-icon-frame--lg"><LockKeyhole className="h-5 w-5" strokeWidth={1.8} /></span>
            <div>
              <p className="text-label-sm text-[var(--primary)]">Folveta account</p>
              <h1 className="mt-1 font-headline-md text-[26px] font-semibold text-[var(--foreground)]">Choose a new password</h1>
            </div>
          </div>
          {!user ? (
            <>
              <Alert tone="destructive" className="mt-6">This password reset link is invalid or expired. Request a new link to continue.</Alert>
              <Link href="/auth/forgot-password" className={`${buttonClassName({ size: "lg" })} mt-6 w-full`}>Request a new link</Link>
            </>
          ) : (
            <>
              {error ? <Alert tone="destructive" className="mt-6">{error}</Alert> : null}
              <form action={updatePassword} className="mt-7 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">New password</span>
                  <Input className="w-full" type="password" name="password" minLength={8} maxLength={128} autoComplete="new-password" required />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">Confirm new password</span>
                  <Input className="w-full" type="password" name="confirmPassword" minLength={8} maxLength={128} autoComplete="new-password" required />
                </label>
                <button type="submit" className={buttonClassName({ size: "lg", className: "w-full" })}>Update password</button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
