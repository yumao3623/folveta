import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260903050000_generation_v2_billing_admission.sql", "utf8");
const persistence = readFileSync("lib/server/generation-v2-persistence.ts", "utf8");
const runtime = readFileSync("lib/ai/generation-v2-runtime.ts", "utf8");
const reconciliation = readFileSync("supabase/migrations/20260909154252_generation_v2_reconciliation.sql", "utf8");

describe("Generation v2 billing admission", () => {
  it("uses an idempotent v2 reservation and settlement boundary", () => {
    expect(migration).toContain("create table public.billing_generation_v2_reservations");
    expect(migration).toContain("raise exception 'billing_quota_exceeded' using errcode = 'P0001';");
    expect(migration).toContain("create or replace function public.billing_reserve_generation_v2");
    expect(migration).toContain("create or replace function public.billing_settle_generation_v2");
    expect(migration).toContain("revoke all on function public.billing_reserve_generation_v2(uuid, text) from public, anon, authenticated;");
    expect(migration).toContain("grant execute on function public.billing_settle_generation_v2(uuid, text) to service_role;");
  });

  it("reserves only after the manifest is durable and settles atomically with terminal delivery", () => {
    expect(persistence).toContain("billing_reserve_generation_v2");
    expect(persistence).toContain("finalize_generation_v2_request");
    expect(runtime.indexOf("await reserveGenerationV2Billing")).toBeGreaterThan(runtime.indexOf("await linkGenerationV2Artifact"));
    expect(runtime).toContain("await reserveGenerationV2Billing(request.id, getBillingEnvironment());");
    expect(runtime).toContain("await finalizeGenerationV2Request({ requestId");
    expect(reconciliation).toContain("from public.assemble_generation_v2_request(");
    expect(reconciliation).toContain("perform public.billing_settle_generation_v2(");
  });

  it("repairs legacy terminal reservations and claims stale non-terminal requests", () => {
    expect(reconciliation).toContain("create or replace function public.reconcile_generation_v2_billing");
    expect(reconciliation).toContain("create or replace function public.claim_stale_generation_v2_requests");
    expect(reconciliation.match(/to service_role;/g)).toHaveLength(3);
  });
});
