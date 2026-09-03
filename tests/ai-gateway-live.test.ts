import { describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { z } from "zod";
import { ModelGateway } from "@/lib/ai/gateway";
import { buildSourceSnapshot, canonicalizeV2Artifact, partitionV2Snapshot } from "@/lib/ai/generation-v2";
import { executePersistedGenerationV2, v2ManifestForSnapshot } from "@/lib/ai/generation-v2-execution";
import { GenerationV2Persistence, v2ArtifactContentKey, v2RequestContentKey } from "@/lib/ai/generation-v2-persistence";
import { ModelGatewayV2Provider, type V2ProviderMetric } from "@/lib/ai/generation-v2-provider";
import type { ParsedMaterial } from "@/lib/server/parser";

if (process.env.RUN_LIVE_GATEWAY_TEST === "1") {
  // Next intentionally ignores .env.local under NODE_ENV=test. This opt-in
  // probe is the explicit exception and never prints loaded values.
  const nodeEnv = process.env.NODE_ENV;
  const environment = process.env as Record<string, string | undefined>;
  environment.NODE_ENV = "development";
  loadEnvConfig(process.cwd(), true, console, true);
  environment.NODE_ENV = nodeEnv;
}

function localV2Sql(sql: string) {
  try {
    return execFileSync("docker", ["exec", "-i", "supabase_db_study_guide_maker", "psql", "-X", "-U", "postgres", "-d", "postgres", "-tA", "-v", "ON_ERROR_STOP=1"], {
      input: sql,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("LOCAL_V2_DATABASE_RPC_FAILED");
  }
}

function base64Json(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

describe.skipIf(process.env.RUN_LIVE_GATEWAY_TEST !== "1")("live configured gateway probe", () => {
  it.skipIf(process.env.LIVE_V2_SKIP_PROBE === "1")("returns a schema-valid Responses result for a non-sensitive prompt", async () => {
    const gateway = new ModelGateway();
    const result = await gateway.generateStructured({
      task: "topic_extract",
      schema: z.object({ value: z.literal("ok") }).strict(),
      schemaName: "gateway_probe",
      instructions: "Return the required object exactly.",
      evidence: "Return value ok.",
    });
    expect(result.data).toEqual({ value: "ok" });
    expect(["parsed", "text_fallback"]).toContain(result.parseMode);
    console.info("[live-gateway-probe]", JSON.stringify({
      provider: result.provider,
      configuredModel: result.configuredModel,
      actualModel: result.actualModel,
      retryCount: result.retryCount,
      parseMode: result.parseMode,
    }));
  }, 240_000);

  it("generates canonical v2 artifacts for English, Chinese, and mixed synthetic evidence", async () => {
    const fixtures = [
      { name: "english", text: "Cellular respiration uses a proton gradient across the inner mitochondrial membrane. ATP synthase uses that gradient to produce ATP." },
      { name: "chinese", text: "细胞呼吸在线粒体内膜两侧建立质子梯度。ATP 合酶利用这个梯度合成 ATP。" },
      { name: "mixed", text: "ATP synthase 利用 proton gradient 合成 ATP。该过程连接 cellular respiration 与能量转换。" },
    ];
    const selected = process.env.LIVE_V2_FIXTURE ? fixtures.filter((fixture) => fixture.name === process.env.LIVE_V2_FIXTURE) : fixtures;
    expect(selected).toHaveLength(process.env.LIVE_V2_FIXTURE ? 1 : 3);
    const observations: Array<Record<string, unknown>> = [];
    for (const fixture of selected) {
      const parsed: ParsedMaterial = { units: [{ locatorKind: "page", locatorNumber: 1, title: null, rawText: fixture.text, normalizedText: fixture.text, readable: true, warnings: [], contentHash: `live-${fixture.name}-fixture-hash-123456`, blocks: [fixture.text] }], warnings: [] };
      const snapshot = buildSourceSnapshot({ sessionId: `live-${fixture.name}`, ownerScope: "live-test-owner", title: "Synthetic provider fixture", sources: [{ id: `source-${fixture.name}`, displayName: "synthetic-fixture", parsed }] });
      const store = new GenerationV2Persistence();
      const request = store.createOrJoinRequest({ sessionId: snapshot.session_id, sourceSnapshotHash: snapshot.snapshot_hash, generationContractHash: "slice-3-live-contract", outputLanguage: "match_materials", manifest: v2ManifestForSnapshot(snapshot) }).request;
      const providerMetrics: V2ProviderMetric[] = [];
      const startedAt = Date.now();
      const result = await executePersistedGenerationV2({ store, requestId: request.id, snapshot, title: "Synthetic provider fixture", provider: new ModelGatewayV2Provider(undefined, (metric) => providerMetrics.push(metric)) });
      expect(result.guide?.generation_status).toBe("complete");
      expect(result.guide?.sections).toHaveLength(1);
      expect(result.guide?.sections[0].source_refs).toEqual([expect.objectContaining({ span_id: snapshot.spans[0].id, source_id: `source-${fixture.name}`, locator: { kind: "page", number: 1 } })]);
      expect(providerMetrics.filter((metric) => metric.outcome === "success")).toHaveLength(1);
      expect(providerMetrics.length).toBeLessThanOrEqual(2);
      observations.push({ fixture: fixture.name, partitionCount: 1, providerCalls: providerMetrics.length, normalProviderCalls: providerMetrics.filter((metric) => metric.attempt === 1).length, retryCalls: providerMetrics.filter((metric) => metric.attempt > 1).length, finalArtifacts: result.guide?.sections.length, finalStatus: result.guide?.generation_status, providerDurationsMs: providerMetrics.map((metric) => metric.durationMs), providerStatuses: providerMetrics.map((metric) => metric.providerStatus), providerErrorCodes: providerMetrics.map((metric) => metric.errorCode), wallTimeMs: Date.now() - startedAt, optionalBlocksPresent: Object.keys(result.guide?.sections[0] ?? {}).filter((key) => ["key_concepts", "definitions", "processes_relationships", "common_confusions", "practice_prompts", "review_targets"].includes(key)).length });
    }
    console.info("[live-v2-provider-metrics]", JSON.stringify(observations));
  }, 240_000);

  it.skipIf(process.env.RUN_LIVE_V2_DB_TEST !== "1")("settles a real provider artifact through local Slice 2 RPCs and preserves completed replay safety", async () => {
    const text = "A synthetic evidence sentence explains how a bounded source supports a study-guide claim.";
    const parsed: ParsedMaterial = { units: [{ locatorKind: "page", locatorNumber: 1, title: null, rawText: text, normalizedText: text, readable: true, warnings: [], contentHash: "live-provider-db-fixture-hash-123456", blocks: [text] }], warnings: [] };
    const sessionId = randomUUID();
    const snapshot = buildSourceSnapshot({ sessionId, ownerScope: "live-db-test-owner", title: "Synthetic database fixture", sources: [{ id: "source-live-db", displayName: "synthetic-fixture", parsed }] });
    const partition = v2ManifestForSnapshot(snapshot)[0];
    const sourcePartition = partitionV2Snapshot(snapshot)[0];
    const partitionId = "guide";
    const artifactId = randomUUID();
    const leaseId = randomUUID();
    const requestKey = v2RequestContentKey({ sourceSnapshotHash: snapshot.snapshot_hash, generationContractHash: "slice-3-live-db-contract", outputLanguage: "match_materials" });
    const artifactKey = v2ArtifactContentKey({ sourceSnapshotHash: snapshot.snapshot_hash, generationContractHash: "slice-3-live-db-contract", outputLanguage: "match_materials", kind: "guide", partitionKey: partitionId, spanContentHashes: partition.spanContentHashes });
    const manifestJson = base64Json({ partitions: [partitionId] });
    const spanIdentityJson = base64Json({ span_ids: snapshot.spans.map((span) => span.id) });
    let created = false;
    try {
      localV2Sql(`
        insert into public.preparation_sessions (id, access_token_hash, title, expires_at)
        values ('${sessionId}', 'slice-3-live-db-token', 'Slice 3 local fixture', now() + interval '1 hour');
        select id from public.create_or_join_generation_v2_request(
          '${sessionId}', '${snapshot.snapshot_hash}', 'slice-3-live-db-contract', 'match_materials', '${requestKey}',
          convert_from(decode('${manifestJson}', 'base64'), 'utf8')::jsonb
        );
        insert into public.generation_v2_artifacts (
          id, session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind,
          partition_key, artifact_content_key, span_identity_json
        ) values (
          '${artifactId}', '${sessionId}', '${snapshot.snapshot_hash}', 'slice-3-live-db-contract', 'match_materials', 'guide',
          '${partitionId}', '${artifactKey}', convert_from(decode('${spanIdentityJson}', 'base64'), 'utf8')::jsonb
        );
        insert into public.generation_v2_request_artifacts (request_id, artifact_id, session_id, partition_key, partition_order, required)
        select id, '${artifactId}', '${sessionId}', '${partitionId}', 0, true
        from public.generation_v2_requests where session_id = '${sessionId}' and request_content_key = '${requestKey}';
      `);
      created = true;
      expect(localV2Sql(`select id from public.claim_generation_v2_artifact('${artifactId}', '${leaseId}', 210);`)).toBe(artifactId);

      const providerMetrics: V2ProviderMetric[] = [];
      const startedAt = Date.now();
      const raw = await new ModelGatewayV2Provider(undefined, (metric) => providerMetrics.push(metric)).generate({
        artifactId,
        attempt: 1,
        partition: sourcePartition,
        spans: snapshot.spans,
        outputLanguage: "en",
      });
      const resolved = canonicalizeV2Artifact(raw, sourcePartition, snapshot);
      const resultJson = base64Json(resolved);
      const resultHash = createHash("sha256").update(JSON.stringify(resolved), "utf8").digest("hex");
      expect(localV2Sql(`select status || '|' || attempt_count || '|' || (result_json #>> '{source_refs,0,span_id}') from public.settle_generation_v2_artifact('${artifactId}', '${leaseId}', 'complete', convert_from(decode('${resultJson}', 'base64'), 'utf8')::jsonb, '${resultHash}', null, null, false);`))
        .toBe(`complete|1|${snapshot.spans[0].id}`);
      expect(localV2Sql(`select id from public.claim_generation_v2_artifact('${artifactId}', '${randomUUID()}', 210);`)).toBe("");
      expect(providerMetrics).toHaveLength(1);
      expect(providerMetrics[0]).toMatchObject({ outcome: "success", attempt: 1, retryable: false, providerStatus: 200 });
      console.info("[live-v2-provider-db-metrics]", JSON.stringify({ partitionCount: 1, providerCalls: 1, retryCalls: 0, finalArtifacts: 1, finalStatus: "complete", providerDurationMs: providerMetrics[0].durationMs, wallTimeMs: Date.now() - startedAt, canonicalAnchorPersisted: true, completedArtifactReclaimed: false }));
    } finally {
      if (created) localV2Sql(`delete from public.preparation_sessions where id = '${sessionId}';`);
    }
  }, 240_000);
});
