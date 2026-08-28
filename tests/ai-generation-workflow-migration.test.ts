import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(join(
  process.cwd(),
  "supabase/migrations/202608280004_ai_generation_workflow.sql",
), "utf8");

function functionBody(name: string) {
  const start = migration.indexOf(`function public.${name}`);
  const end = migration.indexOf("\n$$;", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("durable generation expand migration", () => {
  it("keeps historical attempts and creates private execution relations", () => {
    expect(migration).not.toMatch(/rename\s+to\s+generation_attempts/i);
    expect(migration).not.toMatch(/drop\s+(table|column)[^;]*generation_runs/i);
    expect(migration).toContain("alter table public.generation_runs");
    expect(migration).toContain("add column if not exists generation_execution_id uuid");
    expect(migration).toContain("add column if not exists operation_id uuid");
    expect(migration).toContain("create table public.generation_executions");
    expect(migration).toContain("create table public.generation_operations");
    expect(migration).toContain("create table public.generation_workflow_instances");
    expect(migration).toContain("input_json jsonb not null");
    expect(migration).toContain("operation_input_hash = encode(public.digest(input_json::text, 'sha256'), 'hex')");
    expect(migration).toContain("enable row level security");
    expect(migration).toMatch(/revoke all on table public\.generation_executions from public, anon, authenticated/i);
    expect(migration).toContain("function public.get_generation_operation_context");
    expect(migration).toContain("grant execute on function public.get_generation_operation_context(uuid, text)");
    expect(migration).toContain("p_workflow_run_id text");
    expect(migration).toContain("workflow_run_id, workflow_contract_version");
  });

  it("makes the database the bounded provider-attempt authority", () => {
    expect(migration).toContain("provider_attempt_count between 0 and 3");
    expect(migration).toContain("retry_credits_remaining between 0 and 4");
    expect(migration).toContain("provider_invocations_used between 0 and 40");
    expect(migration).toContain("interval '15 minutes'");
    expect(migration).toContain("v_global_active >= 8");
    expect(migration).toContain("v_run_active >= 4");
    expect(migration).toContain("v_global_ahead >= 8 - v_global_active");
    expect(migration).toContain("v_run_ahead >= 4 - v_run_active");
    expect(migration).toContain("v_operation.provider_attempt_count + 1");
    expect(migration).toContain("retry_credits_remaining - case when v_attempt_number > 1 then 1 else 0 end");
  });

  it("uses consistent locks and fenced atomic settlement", () => {
    const claim = migration.indexOf("function public.claim_generation_operation");
    const success = migration.indexOf("function public.settle_generation_operation_success");
    const finalize = migration.indexOf("function public.finalize_generation_execution");
    for (const start of [claim, success, finalize]) {
      const body = migration.slice(start, start + 12_000);
      expect(body.indexOf("pg_advisory_xact_lock(76498231)")).toBeGreaterThan(0);
      expect(body.indexOf("hashtextextended(p_generation_run_id::text, 76498231)")).toBeGreaterThan(
        body.indexOf("pg_advisory_xact_lock(76498231)"),
      );
    }
    expect(migration).toContain("owner_token = p_owner_token");
    expect(migration).toContain("fencing_version = p_fencing_version");
    expect(migration).toContain("generation_finalize_session_cas_failed");
  });

  it("reconciles dispatch gaps and fences duplicate Workflow starts", () => {
    const dispatch = functionBody("claim_generation_dispatch");
    const acknowledge = functionBody("acknowledge_generation_workflow");
    const watchdog = functionBody("watchdog_generation_executions");
    expect(dispatch).toContain("for update skip locked");
    expect(dispatch).toContain("dispatch_lease_expires_at <= now()");
    expect(acknowledge).toContain("v_run.dispatch_token = p_dispatch_token");
    expect(acknowledge).toContain("v_run.dispatch_state = 'dispatch_claimed' and v_existing_run_id is null");
    expect(acknowledge).toContain("v_existing_status = 'acknowledged'");
    expect(acknowledge).toContain("case when v_valid then 'acknowledged' else 'stale' end");
    expect(migration).toContain("workflow_run_id text not null unique");
    expect(watchdog).toContain("set dispatch_state = 'dispatch_pending'");
    expect(watchdog).toContain("redispatch_pending");
  });

  it("replays completed operations without attempts and rejects stale owners", () => {
    const claim = functionBody("claim_generation_operation");
    const settle = functionBody("settle_generation_operation_success");
    expect(claim.indexOf("v_operation.status = 'succeeded'")).toBeLessThan(claim.indexOf("v_attempt_number := v_operation.provider_attempt_count + 1"));
    expect(claim.indexOf("v_operation.lease_expires_at > now()")).toBeLessThan(claim.indexOf("v_attempt_number := v_operation.provider_attempt_count + 1"));
    expect(claim).toContain("ATTEMPT_LEASE_EXPIRED");
    expect(claim).toContain("retry_reason = 'workflow_infrastructure'");
    expect(settle).toContain("v_operation.owner_token is distinct from p_owner_token");
    expect(settle).toContain("v_operation.fencing_version <> p_fencing_version");
    expect(settle).toContain("v_operation.lease_expires_at <= now()");
  });

  it("does not spend attempts or retry credits while waiting for capacity", () => {
    const claim = functionBody("claim_generation_operation");
    const capacity = claim.indexOf("'status', 'capacity_wait'");
    const reserveAttempt = claim.indexOf("insert into public.generation_runs");
    const consumeCredit = claim.indexOf("retry_credits_remaining = retry_credits_remaining - case");
    expect(capacity).toBeGreaterThan(0);
    expect(capacity).toBeLessThan(reserveAttempt);
    expect(capacity).toBeLessThan(consumeCredit);
    expect(claim).toContain("v_operation.provider_attempt_count > 0 and v_run.retry_credits_remaining <= 0");
  });

  it("keeps persisted diagnostics privacy-safe and database-canonical", () => {
    expect(migration).toContain("deadline_exceeded boolean not null default false");
    expect(migration).toContain("queue_duration_ms");
    expect(migration).toContain("slot_wait_duration_ms");
    expect(migration).toContain("provider_duration_ms");
    expect(migration).toContain("database_commit_duration_ms");
    expect(migration).toContain("v_result_hash := encode(public.digest(p_result_json::text, 'sha256'), 'hex')");
    expect(migration).not.toMatch(/prompt_json|request_body|response_body|source_material/i);
  });
});
