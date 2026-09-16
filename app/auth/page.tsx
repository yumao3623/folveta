import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { buttonClassName } from "@/components/ui/styles";
import { AuthPageLayout } from "@/components/auth-page-layout";
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
    <AuthPageLayout
      title={mode === "sign-up" ? "Create your account" : "Sign in"}
      asset="guide"
      backHref="/"
      backLabel="Back to home"
      story={(
        <>
          <p className="mt-6 text-label-sm text-[var(--primary)]">A calmer way to study</p>
          <h2 className="mx-auto mt-3 max-w-[520px] text-[clamp(1.6rem,3.2vw,2.35rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-[var(--foreground)] lg:mx-0">
            Turn course material into a plan you can actually use.
          </h2>
          <p className="mx-auto mt-4 max-w-[460px] text-[15px] leading-7 text-[var(--text-secondary)] lg:mx-0">
            Folveta pulls the signal from your notes, builds a source-linked Study Guide, and gives you a quick way to check what stuck.
          </p>
          <ul className="auth-page__steps mx-auto mt-6 flex max-w-[500px] flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-[var(--primary)] lg:mx-0 lg:justify-start">
            {["Keep materials together", "Study the right topics", "Check your recall"].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
    >

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
            {mode === "sign-in" ? (
              <div className="-mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-[13px] font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)]">
                  Forgot password?
                </Link>
              </div>
            ) : null}
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
    </AuthPageLayout>
  );
}
