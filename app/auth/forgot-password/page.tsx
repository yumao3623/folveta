import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { requestPasswordReset } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

type ForgotPasswordPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : null;
  const message = typeof query.message === "string" ? query.message : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-12">
      <section className="w-full max-w-[440px]">
        <Link href="/auth" className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Back to sign in
        </Link>
        <div className="ui-surface ui-surface--elevated mt-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="ui-icon-frame ui-icon-frame--primary ui-icon-frame--lg"><Mail className="h-5 w-5" strokeWidth={1.8} /></span>
            <div>
              <p className="text-label-sm text-[var(--primary)]">Folveta account</p>
              <h1 className="mt-1 font-headline-md text-[26px] font-semibold text-[var(--foreground)]">Reset your password</h1>
            </div>
          </div>
          <p className="mt-5 text-[14px] leading-6 text-[var(--text-secondary)]">Enter your account email and we will send a password reset link if an account is associated with it.</p>
          {error ? <Alert tone="destructive" className="mt-6">{error}</Alert> : null}
          {message ? <Alert tone="success" className="mt-6">{message}</Alert> : null}
          <form action={requestPasswordReset} className="mt-7 space-y-5">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">Email</span>
              <Input className="w-full" type="email" name="email" autoComplete="email" required />
            </label>
            <button type="submit" className={buttonClassName({ size: "lg", className: "w-full" })}>Send reset link</button>
          </form>
        </div>
      </section>
    </main>
  );
}
