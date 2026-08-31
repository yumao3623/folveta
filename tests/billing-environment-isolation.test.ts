import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260831084257_billing_environment_isolation.sql");
const webhookRoute = read("app/api/paddle/webhook/route.ts");
const webhookSync = read("lib/server/paddle-webhook.ts");
const billing = read("lib/server/billing.ts");
const dispatch = read("lib/ai/generation-dispatch.ts");

describe("billing environment isolation", () => {
  it("records every Paddle-specific resource in an explicit provider namespace", () => {
    for (const table of [
      "billing_customers",
      "billing_subscriptions",
      "billing_usage_periods",
      "billing_generation_reservations",
      "billing_webhook_events",
    ]) {
      expect(migration).toContain(`alter table public.${table}\n  add column if not exists billing_environment text;`);
    }
    expect(migration).toContain("billing_environment in ('sandbox', 'live')");
  });

  it("allows identical Paddle IDs in Sandbox and Live, while keeping each namespace unique", () => {
    expect(migration).toContain("unique (billing_environment, paddle_customer_id)");
    expect(migration).toContain("unique (billing_environment, paddle_subscription_id)");
    expect(migration).toContain("unique (billing_environment, event_id)");
    expect(webhookSync).toContain('onConflict: "billing_environment,user_id"');
    expect(webhookSync).toContain('onConflict: "billing_environment,paddle_subscription_id"');
  });

  it("fails closed for paid access when the environment is absent or mismatched", () => {
    expect(migration).toContain("p_billing_environment in ('sandbox', 'live') and exists");
    expect(migration).toContain("and billing_environment = p_billing_environment");
    expect(migration).toContain("where p_billing_environment in ('sandbox', 'live');");
    expect(migration).toContain("v_existing.billing_environment is distinct from p_billing_environment");
    expect(billing).toContain('.eq("billing_environment", getBillingEnvironment())');
  });

  it("keeps the deployed 13-argument generation path Free-only during the transition", () => {
    expect(migration).not.toContain("drop function public.claim_generation_execution(\n  uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb\n);");
    expect(migration).toContain("create or replace function public.billing_quota_for_user(p_user_id uuid)");
    expect(migration).toContain("select 'free'::text, 2;");
    expect(migration).toContain("on conflict (user_id, period_start) where billing_environment is null");
    expect(migration).toContain("and period.billing_environment is null");
  });

  it("binds webhook writes and generation quota reservation to server-side configuration", () => {
    expect(webhookRoute).toContain("const billingEnvironment = getBillingEnvironment()");
    expect(webhookRoute).toContain("billing_environment: billingEnvironment");
    expect(webhookRoute).toContain('.eq("billing_environment", billingEnvironment)');
    expect(webhookRoute).toContain("processPaddleEvent(billingEnvironment, event)");
    expect(dispatch).toContain("p_billing_environment: getBillingEnvironment()");
    expect(migration).toContain("where billing_environment is not distinct from v_reservation.billing_environment");
  });
});
