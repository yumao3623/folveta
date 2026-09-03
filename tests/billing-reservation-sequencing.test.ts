import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const billingMigration = read("supabase/migrations/20260831084257_billing_environment_isolation.sql");
const sequencingMigration = read("supabase/migrations/20260903020351_billing_reservation_after_execution_insert.sql");
const dispatch = read("lib/ai/generation-dispatch.ts");

describe("billing reservation sequencing", () => {
  it("inserts the parent execution before its FK-backed reservation", () => {
    expect(sequencingMigration).toContain("drop trigger if exists billing_reserve_generation on public.generation_executions;");
    expect(sequencingMigration).toMatch(/create trigger billing_reserve_generation\s+after insert on public\.generation_executions/i);
    expect(sequencingMigration).toContain("for each row execute function public.billing_reserve_generation();");
    expect(billingMigration).toContain("generation_run_id, billing_environment, user_id, period_start, status");
    expect(billingMigration).toContain("new.id, new.billing_environment, v_user_id, v_period_start, 'reserved'");
  });

  it("keeps quota failures transactional rather than weakening the FK", () => {
    expect(billingMigration).toContain("raise exception 'billing_quota_exceeded' using errcode = 'P0001';");
    expect(billingMigration).toContain("for update;");
    expect(sequencingMigration).not.toMatch(/drop constraint|deferrable|disable trigger/i);
  });

  it("preserves replay, environment, anonymous, and settlement safeguards", () => {
    expect(billingMigration).toContain("perform pg_advisory_xact_lock(76498231);");
    expect(billingMigration).toContain("and status in ('queued', 'running')");
    expect(billingMigration).toContain("v_existing.billing_environment is distinct from p_billing_environment");
    expect(billingMigration).toContain("if v_user_id is null then");
    expect(billingMigration).toContain("new.status not in ('succeeded', 'failed')");
    expect(billingMigration).toContain("set status = 'consumed'");
    expect(billingMigration).toContain("set status = 'released'");
  });

  it("logs only an RPC name and validated SQLSTATE for non-quota database failures", () => {
    expect(dispatch).toContain('event: "generation_rpc_failed"');
    expect(dispatch).toContain("rpc: name, sqlstate: code");
    expect(dispatch).toContain("/^[0-9A-Z]{5}$/.test(code)");
    expect(dispatch).not.toMatch(/console\.error\([^)]*(message|details|hint|query|args)/i);
  });
});
