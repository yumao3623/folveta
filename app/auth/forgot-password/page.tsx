import type { Metadata } from "next";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { requestPasswordReset } from "@/app/auth/actions";
import { AuthPageLayout } from "@/components/auth-page-layout";

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
    <AuthPageLayout title="Reset your password" asset="locked">
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
    </AuthPageLayout>
  );
}
