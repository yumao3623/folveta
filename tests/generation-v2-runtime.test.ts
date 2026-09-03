import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { v2ReadModelStatus } from "@/lib/ai/generation-v2-runtime";

function localSql(sql: string) {
  return execFileSync("docker", ["exec", "-i", "supabase_db_study_guide_maker", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-tA", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" }).trim();
}

describe("Generation v2 runtime contract", () => {
  it("maps persisted facts to a user-facing status without exposing lease state", () => {
    expect(v2ReadModelStatus("queued", [{ status: "pending" }])).toBe("preparing");
    expect(v2ReadModelStatus("queued", [{ status: "working" }])).toBe("generating");
    expect(v2ReadModelStatus("complete", [])).toBe("ready");
    expect(v2ReadModelStatus("complete_with_gaps", [])).toBe("ready_with_gaps");
    expect(v2ReadModelStatus("failed_no_guide", [])).toBe("unable_to_generate");
  });

  it("keeps the v2 runtime isolated from the production entry and v1 DAG", () => {
    const route = readFileSync("app/api/internal/generation-v2/route.ts", "utf8");
    expect(route).toContain("GENERATION_V2_RUNTIME_ENABLED");
    expect(route).toContain("generateStudyGuideV2Workflow");
    expect(route).not.toContain("/api/sessions/");
    expect(readFileSync("app/api/sessions/[sessionId]/generate/route.ts", "utf8")).not.toContain("generation-v2");
    expect(readFileSync("app/workflows/generation.ts", "utf8")).not.toContain("generation-v2");
  });

  it("restricts runtime security-definer RPCs to the server role", () => {
    const migration = readFileSync("supabase/migrations/20260903040000_generation_v2_runtime.sql", "utf8");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration.match(/grant execute on function public\.(claim_generation_v2_artifact|settle_generation_v2_artifact|assemble_generation_v2_request)/g)).toHaveLength(3);
  });
});

describe.skipIf(process.env.RUN_LOCAL_V2_DB_TEST !== "1")("Generation v2 runtime PostgreSQL primitives", () => {
  const makeFixture = () => {
    const sessionId = randomUUID();
    const requestKey = `runtime-${randomUUID()}`;
    const requestId = localSql(`
      insert into public.preparation_sessions (id, access_token_hash, title, expires_at)
      values ('${sessionId}', '${sessionId}-runtime-token', 'Runtime fixture', now() + interval '1 hour');
      select id from public.create_or_join_generation_v2_request(
        '${sessionId}', 'runtime-snapshot', 'runtime-contract', 'en', '${requestKey}', '{"partitions":["p0"]}'::jsonb
      );
    `);
    const artifactId = randomUUID();
    localSql(`
      insert into public.generation_v2_artifacts (id, session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json)
      values ('${artifactId}', '${sessionId}', 'runtime-snapshot', 'runtime-contract', 'en', 'section', 'p0', '${requestKey}-artifact', '{"span_ids":[]}'::jsonb);
      insert into public.generation_v2_request_artifacts (request_id, artifact_id, session_id, partition_key, partition_order, required)
      values ('${requestId}', '${artifactId}', '${sessionId}', 'p0', 0, true);
    `);
    return { sessionId, requestId, artifactId };
  };

  const attachRequiredArtifact = (fixture: ReturnType<typeof makeFixture>, partitionKey: string) => {
    const artifactId = randomUUID();
    localSql(`
      insert into public.generation_v2_artifacts (id, session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json)
      values ('${artifactId}', '${fixture.sessionId}', 'runtime-snapshot', 'runtime-contract', 'en', 'section', '${partitionKey}', '${randomUUID()}', '{"span_ids":[]}'::jsonb);
      insert into public.generation_v2_request_artifacts (request_id, artifact_id, session_id, partition_key, partition_order, required)
      values ('${fixture.requestId}', '${artifactId}', '${fixture.sessionId}', '${partitionKey}', 1, true);
    `);
    return artifactId;
  };

  it("blocks early retry claims, reclaims due work, rejects stale settlement, and replays assembly idempotently", () => {
    const fixture = makeFixture();
    const lease1 = randomUUID();
    const lease2 = randomUUID();
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${lease1}', 210);`)).toBe(fixture.artifactId);
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${randomUUID()}', 210);`)).toBe("");
    expect(localSql(`select status from public.settle_generation_v2_artifact('${fixture.artifactId}', '${lease1}', 'retry_wait', null, null, 'provider_timeout', 'retry', true, 30);`)).toBe("retry_wait");
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${lease2}', 210);`)).toBe("");
    localSql(`update public.generation_v2_artifacts set retry_at = now() - interval '1 second' where id = '${fixture.artifactId}';`);
    expect(localSql(`select id || '|' || attempt_count from public.claim_generation_v2_artifact('${fixture.artifactId}', '${lease2}', 210);`)).toBe(`${fixture.artifactId}|2`);
    expect(localSql(`select id from public.settle_generation_v2_artifact('${fixture.artifactId}', '${lease1}', 'complete', '{}'::jsonb, 'stale', null, null, false, 1);`)).toBe("");
    localSql(`select id from public.settle_generation_v2_artifact('${fixture.artifactId}', '${lease2}', 'complete', '{}'::jsonb, 'result', null, null, false, 1);`);
    expect(localSql(`select status from public.assemble_generation_v2_request('${fixture.requestId}', 'complete', '{"schema_version":"2.0"}'::jsonb);`)).toBe("complete");
    expect(localSql(`select status || '|' || (select count(*) from public.generation_v2_guides where request_id = '${fixture.requestId}') from public.assemble_generation_v2_request('${fixture.requestId}', 'complete', '{"schema_version":"2.0","changed":true}'::jsonb);`)).toBe("complete|1");
    localSql(`delete from public.preparation_sessions where id = '${fixture.sessionId}';`);
  }, 30_000);

  it("delivers a canonical partial guide when a sibling exhausts", () => {
    const partial = makeFixture();
    const exhaustedArtifactId = attachRequiredArtifact(partial, "p1");
    const successLease = randomUUID();
    const exhaustedLease = randomUUID();
    localSql(`select id from public.claim_generation_v2_artifact('${partial.artifactId}', '${successLease}', 210);`);
    localSql(`select id from public.settle_generation_v2_artifact('${partial.artifactId}', '${successLease}', 'complete', '{}'::jsonb, 'result', null, null, false, 1);`);
    localSql(`select id from public.claim_generation_v2_artifact('${exhaustedArtifactId}', '${exhaustedLease}', 210);`);
    localSql(`select id from public.settle_generation_v2_artifact('${exhaustedArtifactId}', '${exhaustedLease}', 'gap', null, null, 'provider_exhausted', 'unavailable', false, 1);`);
    expect(localSql(`select status from public.assemble_generation_v2_request('${partial.requestId}', 'complete_with_gaps', '{"schema_version":"2.0"}'::jsonb);`)).toBe("complete_with_gaps");
    expect(localSql(`select count(*) from public.generation_v2_guides where request_id = '${partial.requestId}';`)).toBe("1");
    localSql(`delete from public.preparation_sessions where id = '${partial.sessionId}';`);

    const failed = makeFixture();
    const lease = randomUUID();
    localSql(`select id from public.claim_generation_v2_artifact('${failed.artifactId}', '${lease}', 210);`);
    localSql(`select id from public.settle_generation_v2_artifact('${failed.artifactId}', '${lease}', 'gap', null, null, 'provider_exhausted', 'unavailable', false, 1);`);
    expect(localSql(`select status from public.assemble_generation_v2_request('${failed.requestId}', 'failed_no_guide', null);`)).toBe("failed_no_guide");
    expect(localSql(`select count(*) from public.generation_v2_guides where request_id = '${failed.requestId}';`)).toBe("0");
    localSql(`delete from public.preparation_sessions where id = '${failed.sessionId}';`);
  }, 30_000);

  it("reclaims an expired lease, rejects the stale worker, and gaps an interrupted final attempt", () => {
    const fixture = makeFixture();
    const staleLease = randomUUID();
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${staleLease}', 1);`)).toBe(fixture.artifactId);
    localSql(`update public.generation_v2_artifacts set lease_expires_at = now() - interval '1 second' where id = '${fixture.artifactId}';`);
    const recoveredLease = randomUUID();
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${recoveredLease}', 210);`)).toBe(fixture.artifactId);
    expect(localSql(`select id from public.settle_generation_v2_artifact('${fixture.artifactId}', '${staleLease}', 'gap', null, null, 'stale', 'stale', false, 1);`)).toBe("");
    localSql(`update public.generation_v2_artifacts set lease_expires_at = now() - interval '1 second' where id = '${fixture.artifactId}';`);
    expect(localSql(`select id from public.claim_generation_v2_artifact('${fixture.artifactId}', '${randomUUID()}', 210);`)).toBe("");
    expect(localSql(`select status || '|' || gap_code from public.generation_v2_artifacts where id = '${fixture.artifactId}';`)).toBe("gap|provider_retry_exhausted");
    localSql(`delete from public.preparation_sessions where id = '${fixture.sessionId}';`);
  }, 30_000);

  it("exposes runner RPCs only to service_role", () => {
    const privileges = localSql(`
      select has_function_privilege('anon', 'public.claim_generation_v2_artifact(uuid,uuid,integer)', 'execute')
        || '|' || has_function_privilege('authenticated', 'public.claim_generation_v2_artifact(uuid,uuid,integer)', 'execute')
        || '|' || has_function_privilege('service_role', 'public.claim_generation_v2_artifact(uuid,uuid,integer)', 'execute')
        || '|' || has_function_privilege('anon', 'public.settle_generation_v2_artifact(uuid,uuid,text,jsonb,text,text,text,boolean,integer)', 'execute')
        || '|' || has_function_privilege('authenticated', 'public.settle_generation_v2_artifact(uuid,uuid,text,jsonb,text,text,text,boolean,integer)', 'execute')
        || '|' || has_function_privilege('service_role', 'public.settle_generation_v2_artifact(uuid,uuid,text,jsonb,text,text,text,boolean,integer)', 'execute')
        || '|' || has_function_privilege('anon', 'public.assemble_generation_v2_request(uuid,text,jsonb)', 'execute')
        || '|' || has_function_privilege('authenticated', 'public.assemble_generation_v2_request(uuid,text,jsonb)', 'execute')
        || '|' || has_function_privilege('service_role', 'public.assemble_generation_v2_request(uuid,text,jsonb)', 'execute');
    `);
    expect(privileges).toBe("false|false|true|false|false|true|false|false|true");
  }, 30_000);
});
