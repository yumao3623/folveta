import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { safeNextPath } from "@/lib/auth-redirect";
import { signIn, signUp } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Account access",
  robots: { index: false, follow: false },
};

type AuthPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const query = await searchParams;
  const mode = query.mode === "sign-up" ? "sign-up" : "sign-in";
  const next = safeNextPath(typeof query.next === "string" ? query.next : null);
  const error = typeof query.error === "string" ? query.error : null;
  const message = typeof query.message === "string" ? query.message : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-12">
      <section className="w-full max-w-[440px]">
        <Link href="/" className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)]">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
          Study Guide Maker
        </Link>
        <div className="ui-surface ui-surface--elevated mt-6 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="ui-icon-frame ui-icon-frame--primary ui-icon-frame--lg">
              <LockKeyhole className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-label-sm text-[var(--primary)]">Folveta account</p>
              <h1 className="mt-1 font-headline-md text-[26px] font-semibold text-[var(--foreground)]">
                {mode === "sign-up" ? "Create your account" : "Sign in"}
              </h1>
            </div>
          </div>

          {error ? <Alert tone="destructive" className="mt-6">{error}</Alert> : null}
          {message ? <Alert tone="success" className="mt-6">{message}</Alert> : null}

          <form action={mode === "sign-up" ? signUp : signIn} className="mt-7 space-y-5">
            <input type="hidden" name="next" value={next} />
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">Email</span>
              <Input className="w-full" type="email" name="email" autoComplete="email" required />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold text-[var(--foreground)]">Password</span>
              <Input
                className="w-full"
                type="password"
                name="password"
                minLength={8}
                maxLength={128}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                required
              />
            </label>
            <button type="submit" className={buttonClassName({ size: "lg", className: "w-full" })}>
              {mode === "sign-up" ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-[var(--text-secondary)]">
            {mode === "sign-up" ? "Already have an account?" : "New to Folveta?"}{" "}
            <Link
              href={`/auth?mode=${mode === "sign-up" ? "sign-in" : "sign-up"}&next=${encodeURIComponent(next)}`}
              className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]"
            >
              {mode === "sign-up" ? "Sign in" : "Create one"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
