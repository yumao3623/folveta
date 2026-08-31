"use client";

import { useState } from "react";
import { ExternalLink, XCircle } from "lucide-react";
import { cancelCurrentSubscription, createCustomerPortalSession } from "@/app/billing/actions";
import { Button } from "@/components/ui/button";

export function BillingPanel({ summary }: { summary: { plan: string; quota: number; consumed: number; reserved: number; remaining: number; subscriptionStatus: string | null } }) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const paid = summary.plan === "pro";
  async function openPortal() {
    setBusy(true); setMessage(null);
    const result = await createCustomerPortalSession();
    setBusy(false);
    if ("error" in result) { setMessage(result.error ?? "Billing portal is unavailable."); return; }
    window.location.href = result.url;
  }
  async function cancel() {
    setBusy(true); setMessage(null);
    const result = await cancelCurrentSubscription();
    setBusy(false);
    setMessage("error" in result ? (result.error ?? "Cancellation failed.") : "Cancellation scheduled for the end of the current billing period.");
  }
  return <section className="mt-7 ui-surface ui-surface--base p-5 sm:p-6" aria-labelledby="billing-heading"><div className="flex items-start justify-between gap-4"><div><p className="text-label-sm text-[var(--primary)]">Plan</p><h2 id="billing-heading" className="mt-1 text-[20px] font-semibold">{paid ? "Folveta Pro" : "Free"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{summary.remaining} of {summary.quota} Study Guides remaining this month.</p></div><span className="rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--primary-hover)]">{summary.subscriptionStatus ?? "free"}</span></div>{paid ? <div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={openPortal} disabled={busy}><ExternalLink className="h-4 w-4" />Manage billing</Button><Button variant="ghost" onClick={cancel} disabled={busy}><XCircle className="h-4 w-4" />Cancel at period end</Button></div> : <a href="/pricing" className="mt-5 inline-flex items-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white">Upgrade to Pro</a>}{message && <p className="mt-3 text-sm text-[var(--muted)]" role="status">{message}</p>}</section>;
}
