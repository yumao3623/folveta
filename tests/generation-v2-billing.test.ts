import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260903050000_generation_v2_billing_admission.sql", "utf8");
const persistence = readFileSync("lib/server/generation-v2-persistence.ts", "utf8");
const runtime = readFileSync("lib/ai/generation-v2-runtime.ts", "utf8");

describe("Generation v2 billing admission", () => {
  it("uses an idempotent v2 reservation and settlement boundary", () => {
    expect(migration).toContain("create table public.billing_generation_v2_reservations");
    expect(migration).toContain("raise exception 'billing_quota_exceeded' using errcode = 'P0001';");
    expect(migration).toContain("create or replace function public.billing_reserve_generation_v2");
    expect(migration).toContain("create or replace function public.billing_settle_generation_v2");
    expect(migration).toContain("revoke all on function public.billing_reserve_generation_v2(uuid, text) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.billing_settle_generation_v2(uuid, text) to service_role;");
  });

  it("connects reservation before v2 work and settlement after terminal delivery", () => {
    expect(persistence).toContain("billing_reserve_generation_v2");
    expect(persistence).toContain("billing_settle_generation_v2");
    expect(runtime).toContain("await reserveGenerationV2Billing(request.id, getBillingEnvironment());");
    expect(runtime).toContain("await settleGenerationV2Billing(requestId, status");
  });
});
