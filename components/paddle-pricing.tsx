"use client";

import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LockKeyhole, Sparkles } from "lucide-react";
import { getPaddlePriceId } from "@/lib/billing/config";
import { Button } from "@/components/ui/button";

export function PaddlePricing({ userId, userEmail }: { userId: string | null; userEmail?: string | null }) {
  const router = useRouter();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [error, setError] = useState<string | null>(() => process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ? null : "Sandbox checkout is not configured yet.");

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    initializePaddle({
      token,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
    }).then((instance) => setPaddle(instance ?? null)).catch(() => setError("Sandbox checkout could not load."));
  }, []);

  function subscribe() {
    if (!userId) {
      router.push(`/auth?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    if (!paddle) return;
    paddle.Checkout.open({
      items: [{ priceId: getPaddlePriceId(), quantity: 1 }],
      customer: userEmail ? { email: userEmail } : undefined,
      customData: { user_id: userId },
      settings: { variant: "one-page", successUrl: `${window.location.origin}/billing/success` },
    });
  }

  return <section className="mx-auto w-full max-w-[960px]">
    <div className="grid gap-5 md:grid-cols-2">
      <article className="ui-surface ui-surface--base p-6 sm:p-7">
        <p className="text-label-sm text-[var(--muted)]">Free</p>
        <h2 className="mt-2 text-[26px] font-semibold">Start learning</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Core Study Guide creation with a monthly limit.</p>
        <p className="mt-6 text-[34px] font-semibold leading-none">$0<span className="ml-1 text-sm font-normal text-[var(--muted)]">/ month</span></p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          {["2 successful Study Guides per month", "Up to 3 files and 75 source units", "Quick Check included"].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />{item}</li>)}
        </ul>
      </article>
      <article className="ui-surface ui-surface--elevated border-[var(--primary)] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-label-sm text-[var(--primary)]">Folveta Pro</p><Sparkles className="h-5 w-5 text-[var(--primary)]" /></div>
        <h2 className="mt-2 text-[26px] font-semibold">More room for exam season</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Higher limits for focused, source-grounded study.</p>
        <p className="mt-6 text-[34px] font-semibold leading-none">$12<span className="ml-1 text-sm font-normal text-[var(--muted)]">/ month</span></p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
          {["10 successful Study Guides per month", "Up to 10 files and 300 source units", "Up to 600k extracted characters", "Quick Check included"].map((item) => <li key={item} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />{item}</li>)}
        </ul>
        <Button onClick={subscribe} disabled={Boolean(userId) && !paddle} className="mt-7 w-full"><LockKeyhole className="h-4 w-4" />{userId ? "Subscribe in Sandbox" : "Sign in to subscribe"}</Button>
        {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
        <p className="mt-3 text-center text-xs text-[var(--muted)]">Sandbox only. No real charge is created.</p>
      </article>
    </div>
  </section>;
}
