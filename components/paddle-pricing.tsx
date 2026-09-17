"use client";

import type { Paddle } from "@paddle/paddle-js";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { buttonClassName } from "@/components/ui/styles";
import { StudyIcon } from "@/components/ui/study-icon";
import { usePublicViewer } from "@/components/public-viewer";
import type { PublicViewer } from "@/lib/public-viewer";

export function PaddlePricing({ priceId }: { priceId: string }) {
  const router = useRouter();
  const { viewer, status } = usePublicViewer();
  const isLive = process.env.NEXT_PUBLIC_PADDLE_ENV === "production";
  const paddle = useRef<Paddle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (busy || status !== "ready") return;
    if (!viewer?.user) {
      router.push(`/auth?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Revalidate identity at the action boundary, including after a tab was left open.
      const response = await fetch("/api/viewer", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("Your account could not be checked. Please try again.");
      const current: PublicViewer = await response.json();
      if (!current.user) { router.push(`/auth?next=${encodeURIComponent("/pricing")}`); return; }
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (!token) throw new Error("Checkout is not available right now. Please try again later.");
      if (!paddle.current) {
        const { initializePaddle } = await import("@paddle/paddle-js");
        paddle.current = await initializePaddle({ token, environment: isLive ? "production" : "sandbox" }) ?? null;
      }
      if (!paddle.current) throw new Error("Checkout could not load. Please try again.");
      paddle.current.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: current.user.email ? { email: current.user.email } : undefined,
        customData: { user_id: current.user.id },
        settings: { variant: "one-page", successUrl: `${window.location.origin}/billing/success` },
      });
    } catch (cause) {
      setError(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "Checkout could not load. Please try again.");
    } finally { setBusy(false); }
  }

  return <section className="mx-auto w-full max-w-[960px]">
    <div className="grid gap-5 md:grid-cols-2">
      <article className="ui-surface ui-surface--base p-6 sm:p-7">
        <p className="text-label-sm text-[var(--muted)]">Free</p>
        <h2 className="mt-2 text-[26px] font-semibold">Start learning</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Core Study Guide creation with a monthly limit.</p>
        <p className="mt-6 text-[34px] font-semibold leading-none">$0<span className="ml-1 text-sm font-normal text-[var(--muted)]">/ month</span></p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          {["2 successful Study Guides per month", "Up to 3 files and 75 source units", "Quick Check included"].map((item) => <li key={item} className="flex items-start gap-2"><StudyIcon name="success" size={20} />{item}</li>)}
        </ul>
        <Link href="/#upload" className={`${buttonClassName({ variant: "secondary" })} mt-7 w-full`}>Create a Study Guide</Link>
      </article>
      <article className="ui-surface ui-surface--elevated border-[var(--primary)] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-label-sm text-[var(--primary)]">Folveta Pro</p><span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--primary)]" /></div>
        <h2 className="mt-2 text-[26px] font-semibold">More room for exam season</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Higher limits for focused, source-grounded study.</p>
        <p className="mt-6 text-[34px] font-semibold leading-none">$12<span className="ml-1 text-sm font-normal text-[var(--muted)]">/ month</span></p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          {["10 successful Study Guides per month", "Up to 10 files and 300 source units", "Up to 600k extracted characters", "Quick Check included"].map((item) => <li key={item} className="flex items-start gap-2"><StudyIcon name="success" size={20} />{item}</li>)}
        </ul>
        <Button onClick={subscribe} disabled={status !== "ready" || busy} className="mt-7 w-full"><StudyIcon name="locked" size={20} />{busy ? "Opening checkout…" : viewer?.user ? `Subscribe in ${isLive ? "Folveta Pro" : "Sandbox"}` : "Sign in to subscribe"}</Button>
        {error && <p role="alert" className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
        {status === "error" && <p role="alert" className="mt-3 text-xs text-[var(--danger)]">Your account could not load. <button className="underline" onClick={() => window.location.reload()}>Refresh and try again</button>.</p>}
        <p className="mt-3 text-center text-xs text-[var(--muted)]">{isLive ? "Secure checkout powered by Paddle." : "Sandbox only. No real charge is created."}</p>
      </article>
    </div>
  </section>;
}
