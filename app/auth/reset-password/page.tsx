import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { updatePassword } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/server/auth";
import { AuthPageLayout } from "@/components/auth-page-layout";

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
    <AuthPageLayout title="Choose a new password" asset="locked">
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
    </AuthPageLayout>
  );
}
