import { createHash, randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getServerEnv } from "@/lib/env";
import { executionContract, PROVIDER_DEADLINES_MS } from "@/lib/ai/generation-contract";
import { classifyProviderError, ModelGateway, SafeProviderError } from "@/lib/ai/gateway";
import {
  groundingVerdictsSchema,
  mergedTopicsSchema,
  mergedTopicsSchemaForSpanIds,
  rawGuideTopicSchema,
  rawGuideTopicSchemaForSpanIds,
  topicCandidatesSchema,
  topicCandidatesSchemaForSpanIds,
} from "@/lib/ai/schemas";
import { PROMPTS } from "@/lib/ai/prompts";
import { allRawClaims, evidenceLine, type GenerationSourceRow, type GenerationSpanRow } from "@/lib/ai/pipeline";
import { buildTopic, forbiddenLanguage } from "@/lib/ai/pipeline";
import { guideSchema } from "@/lib/schemas";
import type { Json } from "@/lib/server/database.types";
import type { ZodType } from "zod";

export type WorkflowDispatchInput = { generationRunId: string; dispatchToken: string };
export type OperationOutcome =
  | { status: "completed" | "terminal"; resultHash?: string }
  | { status: "wait"; nextEligibleAt: string };

type RpcJson = Record<string, unknown>;
type Context = {
  generationRunId: string;
  sessionId: string;
  sessionTitle: string;
  sourceSnapshotHash: string;
  executionContractHash: string;
  operationKind: "plan_topics" | "extract_topics" | "merge_topics" | "generate_guide" | "grounding_verify" | "finalize";
  input: Record<string, unknown>;
  operationId: string;
  resultHash: string | null;
  result: unknown;
  dependencies: Array<{ operationId: string; resultHash: string; result: unknown }>;
  sources: Array<{ id: string; displayName: string; kind: GenerationSourceRow["kind"]; status: string }>;
  spans: Array<{ id: string; sourceId: string; locatorKind: GenerationSpanRow["locator_kind"]; locatorNumber: number; text: string; excerpt: string; contentHash: string }>;
};

function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function safeDbError(code: string) {
  const error = new Error(code);
  error.name = "WorkflowSafeError";
  return error;
}

async function rpc(name: string, args: Record<string, unknown>) {
  const client = getSupabaseAdmin() as unknown as { rpc: (fn: string, params: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
  const { data, error } = await client.rpc(name, args);
  if (error) throw safeDbError(`DB_${name.toUpperCase()}_FAILED`);
  return data as RpcJson;
}

export async function acknowledgeWorkflow(input: WorkflowDispatchInput, workflowRunId: string) {
  return rpc("acknowledge_generation_workflow", {
    p_generation_run_id: input.generationRunId,
    p_dispatch_token: input.dispatchToken,
    p_workflow_run_id: workflowRunId,
    p_workflow_contract_version: executionContract(getServerEnv()).hash,
  });
}

export async function getOperationContext(generationRunId: string, operationKey: string) {
  return rpc("get_generation_operation_context", {
    p_generation_run_id: generationRunId,
    p_operation_key: operationKey,
  }) as unknown as Context;
}

export async function createOperation(input: {
  generationRunId: string;
    operationKey: string;
    operationKind: "extract_topics" | "merge_topics" | "generate_guide" | "grounding_verify" | "finalize";
  privateInput: Json;
  dependencies: Array<{ operationId: string; resultHash: string }>;
}) {
  const contract = executionContract(getServerEnv());
  const result = await rpc("create_generation_operation", {
    p_operation_id: null,
    p_generation_run_id: input.generationRunId,
    p_operation_key: input.operationKey,
    p_operation_kind: input.operationKind,
    p_operation_version: "1",
    p_operation_input_hash: hashJson(input.privateInput),
    p_input_json: input.privateInput,
    p_dependency_operation_ids: input.dependencies.map((dependency) => dependency.operationId),
    p_dependency_result_hashes: input.dependencies.map((dependency) => dependency.resultHash),
    p_expected_execution_contract_hash: contract.hash,
  });
  return String(result);
}

function material(context: Context) {
  const sources: GenerationSourceRow[] = context.sources.map((source) => ({
    id: source.id,
    display_name: source.displayName,
    kind: source.kind,
    status: source.status,
    warnings: [],
    error_code: null,
    error_message: null,
  }));
  const spans: GenerationSpanRow[] = context.spans.map((span) => ({
    id: span.id,
    source_id: span.sourceId,
    locator_kind: span.locatorKind,
    locator_number: span.locatorNumber,
    text: span.text,
    excerpt: span.excerpt,
    content_hash: span.contentHash,
  }));
  return { sources, spans, sourcesById: new Map(sources.map((source) => [source.id, source])) };
}

type EvidenceValidationContext = {
  operationKind: Context["operationKind"];
  input: Record<string, unknown>;
  spans: Array<{ id: string }>;
};

export function allowedEvidenceSpanIds(context: EvidenceValidationContext) {
  const availableIds = new Set(context.spans.map((span) => span.id));
  if (context.operationKind === "plan_topics" || context.operationKind === "extract_topics") {
    const requestedIds = Array.isArray(context.input.spanIds) ? context.input.spanIds as string[] : [...availableIds];
    return [...new Set(requestedIds)].filter((id) => availableIds.has(id));
  }
  if (context.operationKind === "generate_guide") {
    const topic = context.input.topic as { evidence_span_ids?: unknown };
    const requestedIds = Array.isArray(topic?.evidence_span_ids) ? topic.evidence_span_ids as string[] : [];
    return [...new Set(requestedIds)].filter((id) => availableIds.has(id));
  }
  return [...availableIds];
}

function providerRequest(context: Context): {
  task: "topic_extract" | "topic_merge" | "guide" | "grounding_verify";
  schema: ZodType<unknown>;
  schemaName: string;
  instructions: string;
  evidence: string;
  requestTimeoutMs: number;
} {
  const { spans, sourcesById } = material(context);
  const lines = (selected: GenerationSpanRow[]) => selected.map((span) => evidenceLine(span, sourcesById.get(span.source_id)!)).join("\n\n");
  if (context.operationKind === "plan_topics") {
    const allowedSpanIds = allowedEvidenceSpanIds(context);
    const allowed = new Set(allowedSpanIds);
    return {
      task: "topic_merge" as const,
      schema: mergedTopicsSchemaForSpanIds(allowedSpanIds),
      schemaName: "merged_topics",
      instructions: `${PROMPTS.topicExtract}\n${PROMPTS.topicMerge}`,
      evidence: `Maximum topics: 12\n\n${lines(spans.filter((span) => allowed.has(span.id)))}`,
      requestTimeoutMs: PROVIDER_DEADLINES_MS.plan_topics,
    };
  }
  if (context.operationKind === "extract_topics") {
    const allowedSpanIds = allowedEvidenceSpanIds(context);
    const allowed = new Set(allowedSpanIds);
    return {
      task: "topic_extract" as const,
      schema: topicCandidatesSchemaForSpanIds(allowedSpanIds),
      schemaName: "topic_candidates",
      instructions: PROMPTS.topicExtract,
      evidence: lines(spans.filter((span) => allowed.has(span.id))),
      requestTimeoutMs: PROVIDER_DEADLINES_MS.extract_topics,
    };
  }
  if (context.operationKind === "merge_topics") {
    const allowedSpanIds = allowedEvidenceSpanIds(context);
    const candidates = context.dependencies.flatMap((dependency) => {
      const parsed = topicCandidatesSchema.safeParse(dependency.result);
      if (!parsed.success) throw new SafeProviderError("GENERATION_DEPENDENCY_CONTRACT_MISMATCH", "execution_contract", false, null, null, "non_retryable");
      return parsed.data.candidates;
    });
    return {
      task: "topic_merge" as const,
      schema: mergedTopicsSchemaForSpanIds(allowedSpanIds),
      schemaName: "merged_topics",
      instructions: PROMPTS.topicMerge,
      evidence: `Maximum topics: 12\nValid span IDs: ${spans.map((span) => span.id).join(", ")}\n\nCandidates:\n${JSON.stringify(candidates)}`,
      requestTimeoutMs: PROVIDER_DEADLINES_MS.merge_topics,
    };
  }
  if (context.operationKind === "generate_guide") {
    const topic = context.input.topic as Record<string, unknown>;
    const allowedSpanIds = allowedEvidenceSpanIds(context);
    const allowed = new Set(allowedSpanIds);
    return {
      task: "guide" as const,
      schema: rawGuideTopicSchemaForSpanIds(allowedSpanIds),
      schemaName: "study_guide_topic",
      instructions: PROMPTS.guideTopic,
      evidence: `Topic contract: ${JSON.stringify(topic)}\n\nEvidence:\n${lines(spans.filter((span) => allowed.has(span.id)))}`,
      requestTimeoutMs: PROVIDER_DEADLINES_MS.guide,
    };
  }
  const raw = context.input.raw as Parameters<typeof allRawClaims>[0];
  const claims = allRawClaims(raw);
  const cited = new Set(claims.flatMap((claim) => claim.span_ids));
  return {
    task: "grounding_verify" as const,
    schema: groundingVerdictsSchema,
    schemaName: "grounding_verdicts",
    instructions: PROMPTS.groundingVerify,
    evidence: `Claims:\n${JSON.stringify(claims)}\n\nCited evidence:\n${lines(spans.filter((span) => cited.has(span.id)))}`,
    requestTimeoutMs: PROVIDER_DEADLINES_MS.grounding,
  };
}

export function validateProviderResult(context: EvidenceValidationContext, value: unknown, result: { providerStatus: number; providerRequestId: string | null }) {
  const invalidReference = () => new SafeProviderError(
    "MODEL_INVALID_SOURCE_REFERENCE",
    "invalid_output",
    false,
    result.providerStatus,
    result.providerRequestId,
    "invalid_source_reference",
  );
  if (context.operationKind === "extract_topics") {
    const allowed = new Set(allowedEvidenceSpanIds(context));
    const parsed = topicCandidatesSchema.parse(value);
    if (parsed.candidates.some((candidate) => candidate.evidence_span_ids.some((id) => !allowed.has(id)))) throw invalidReference();
  }
  if (context.operationKind === "plan_topics" || context.operationKind === "merge_topics") {
    const allowed = new Set(allowedEvidenceSpanIds(context));
    const parsed = mergedTopicsSchema.parse(value);
    if (parsed.topics.some((topic) => topic.evidence_span_ids.some((id) => !allowed.has(id)))) throw invalidReference();
  }
  if (context.operationKind === "generate_guide") {
    const allowed = new Set(allowedEvidenceSpanIds(context));
    const parsed = rawGuideTopicSchema.parse(value);
    if (allRawClaims(parsed).some((claim) => claim.span_ids.some((id) => !allowed.has(id)))) throw invalidReference();
  }
  if (context.operationKind === "grounding_verify") {
    const claims = allRawClaims(context.input.raw as Parameters<typeof allRawClaims>[0]);
    const expected = new Set(claims.map((claim) => claim.id));
    const verdicts = groundingVerdictsSchema.parse(value).verdicts;
    const actual = new Set(verdicts.map((verdict) => verdict.claim_id));
    if (actual.size !== verdicts.length || actual.size !== expected.size || [...expected].some((id) => !actual.has(id))) {
      throw new SafeProviderError("MODEL_GROUNDING_CONTRACT_MISMATCH", "invalid_output", false, result.providerStatus, result.providerRequestId, "non_retryable");
    }
  }
}

export async function executeProviderOperation(generationRunId: string, operationKey: string): Promise<OperationOutcome> {
  const context = await getOperationContext(generationRunId, operationKey);
  const contract = executionContract(getServerEnv());
  if (context.executionContractHash !== contract.hash) return { status: "terminal" };
  const claim = await rpc("claim_generation_operation", {
    p_generation_run_id: generationRunId,
    p_operation_key: operationKey,
    p_expected_source_snapshot_hash: context.sourceSnapshotHash,
    p_expected_execution_contract_hash: contract.hash,
    p_lease_seconds: 120,
  });
  if (claim.status === "completed") return { status: "completed", resultHash: String(claim.resultHash) };
  if (["contended", "waiting", "capacity_wait", "dependencies_pending"].includes(String(claim.status))) {
    return { status: "wait", nextEligibleAt: String(claim.nextEligibleAt ?? new Date(Date.now() + 5_000).toISOString()) };
  }
  if (claim.status !== "claimed") return { status: "terminal" };

  const started = Date.now();
  try {
    const result = await new ModelGateway().generateStructured<unknown>(providerRequest(context));
    const value = result.data as unknown as Json;
    validateProviderResult(context, value, result);
    const settled = await rpc("settle_generation_operation_success", {
      p_generation_run_id: generationRunId,
      p_operation_key: operationKey,
      p_owner_token: claim.ownerToken,
      p_fencing_version: claim.fencingVersion,
      p_attempt_id: claim.attemptId,
      p_result_json: value,
      p_result_hash: hashJson(value),
      p_usage: result.usage as Json,
      p_actual_model: result.actualModel,
      p_provider_status: result.providerStatus,
      p_provider_request_id: result.providerRequestId,
      p_provider_duration_ms: result.durationMs,
      p_database_commit_duration_ms: 0,
      p_total_duration_ms: Date.now() - started,
    });
    return settled.status === "succeeded" ? { status: "completed", resultHash: String(settled.resultHash) } : { status: "terminal" };
  } catch (error) {
    const safe = classifyProviderError(error);
    const category = safe.category === "provider_refusal" ? "model_refusal" : safe.category === "execution_contract" ? "invalid_output" : safe.category;
    const settled = await rpc("settle_generation_operation_retry_or_fail", {
      p_generation_run_id: generationRunId,
      p_operation_key: operationKey,
      p_owner_token: claim.ownerToken,
      p_fencing_version: claim.fencingVersion,
      p_attempt_id: claim.attemptId,
      p_retryable: safe.retryable,
      p_failure_category: category,
      p_error_code: safe.code,
      p_provider_status: safe.providerStatus,
      p_provider_request_id: safe.providerRequestId,
      p_retry_reason: safe.retryReason ?? "non_retryable",
      p_provider_duration_ms: Date.now() - started,
      p_total_duration_ms: Date.now() - started,
      p_retry_delay_seconds: 5,
    });
    return settled.status === "retry_wait"
      ? { status: "wait", nextEligibleAt: String(settled.nextEligibleAt) }
      : { status: "terminal" };
  }
}

export async function prepareTopicPlan(generationRunId: string) {
  const context = await getOperationContext(generationRunId, "plan:root");
  if (context.input.mode !== "batch") {
    return { mode: "single" as const, operations: [{ operationId: context.operationId, operationKey: "plan:root" }] };
  }
  const batches = Array.isArray(context.input.batches) ? context.input.batches as string[][] : [];
  if (!batches.length) throw safeDbError("GENERATION_BATCH_PLAN_MISSING");
  const operations = [{ operationId: context.operationId, operationKey: "plan:root" }];
  for (let index = 1; index < batches.length; index += 1) {
    const suffix = createHash("sha256").update(`${generationRunId}:extract:${index}`, "utf8").digest("hex").slice(0, 24);
    const operationKey = `extract:op_${suffix}`;
    const operationId = await createOperation({
      generationRunId,
      operationKey,
      operationKind: "extract_topics",
      privateInput: { mode: "batch", batchIndex: index, spanIds: batches[index] } as unknown as Json,
      dependencies: [],
    });
    operations.push({ operationId, operationKey });
  }
  return { mode: "batch" as const, operations };
}

export async function createMergeOperation(
  generationRunId: string,
  extractions: Array<{ operationId: string; operationKey: string }>,
) {
  const contexts = await Promise.all(extractions.map(({ operationKey }) => getOperationContext(generationRunId, operationKey)));
  const dependencies = contexts.map((context) => {
    if (!context.resultHash) throw safeDbError("EXTRACTION_RESULT_MISSING");
    return { operationId: context.operationId, resultHash: context.resultHash };
  });
  const suffix = createHash("sha256").update(`${generationRunId}:merge`, "utf8").digest("hex").slice(0, 24);
  const operationKey = `merge:op_${suffix}`;
  const operationId = await createOperation({
    generationRunId,
    operationKey,
    operationKind: "merge_topics",
    privateInput: { batchCount: extractions.length } as unknown as Json,
    dependencies,
  });
  return { operationId, operationKey };
}

export async function createGuideOperations(
  generationRunId: string,
  planOperationKey: string,
  offset: number,
  limit: number,
) {
  const context = await getOperationContext(generationRunId, planOperationKey);
  const result = mergedTopicsSchema.safeParse(context.result);
  if (!result.success || !context.resultHash) return { status: "terminal" as const };
  const topics = result.data.topics.slice(0, 12);
  const start = Math.max(0, Math.trunc(offset));
  const waveSize = Math.min(4, Math.max(1, Math.trunc(limit)));
  const guideOperations = [] as Array<{ operationId: string; operationKey: string; index: number }>;
  for (const [waveIndex, topic] of topics.slice(start, start + waveSize).entries()) {
    const index = start + waveIndex;
    const suffix = createHash("sha256").update(`${generationRunId}:guide:${index}`, "utf8").digest("hex").slice(0, 24);
    const operationKey = `guide:op_${suffix}`;
    const operationId = await createOperation({
      generationRunId,
      operationKey,
      operationKind: "generate_guide",
      privateInput: { topic } as unknown as Json,
      dependencies: [{ operationId: context.operationId, resultHash: context.resultHash! }],
    });
    guideOperations.push({ operationId, operationKey, index });
  }
  return {
    status: "completed" as const,
    guideOperations,
    totalTopics: topics.length,
  };
}

export async function createGroundingOperation(generationRunId: string, guideKey: string, index: number) {
  const guide = await getOperationContext(generationRunId, guideKey);
  if (!guide.resultHash || !guide.result) throw safeDbError("GUIDE_RESULT_MISSING");
  const suffix = createHash("sha256").update(`${generationRunId}:grounding:${index}`, "utf8").digest("hex").slice(0, 24);
  const operationKey = `grounding:op_${suffix}`;
  const operationId = await createOperation({
    generationRunId,
    operationKey,
    operationKind: "grounding_verify",
    privateInput: { topic: guide.input.topic, raw: guide.result } as unknown as Json,
    dependencies: [{ operationId: guide.operationId, resultHash: guide.resultHash }],
  });
  return { operationId, operationKey };
}

export async function createFinalizeOperation(
  generationRunId: string,
  groundings: Array<{ operationId: string; operationKey: string }>,
) {
  const contexts = await Promise.all(groundings.map(({ operationKey }) => getOperationContext(generationRunId, operationKey)));
  const dependencies = contexts.map((context) => {
    if (!context.resultHash) throw safeDbError("GROUNDING_RESULT_MISSING");
    return { operationId: context.operationId, resultHash: context.resultHash };
  });
  const suffix = createHash("sha256").update(`${generationRunId}:finalize`, "utf8").digest("hex").slice(0, 24);
  const operationKey = `finalize:op_${suffix}`;
  await createOperation({ generationRunId, operationKey, operationKind: "finalize", privateInput: {}, dependencies });
  return operationKey;
}

export async function finalizeOperation(generationRunId: string, operationKey: string) {
  const context = await getOperationContext(generationRunId, operationKey);
  const contract = executionContract(getServerEnv());
  const claim = await rpc("claim_generation_operation", {
    p_generation_run_id: generationRunId,
    p_operation_key: operationKey,
    p_expected_source_snapshot_hash: context.sourceSnapshotHash,
    p_expected_execution_contract_hash: contract.hash,
    p_lease_seconds: 120,
  });
  if (claim.status === "completed") return { status: "completed" as const };
  if (claim.status !== "claimed") return { status: "terminal" as const };
  const { sources, spans, sourcesById } = material(context);
  const spansById = new Map(spans.map((span) => [span.id, span]));
  // Re-read grounding contexts to assemble private validated content without
  // ever returning it to the Workflow event log.
  const operationRows = await Promise.all(context.dependencies.map(async (dependency) => {
    const client = getSupabaseAdmin();
    const { data, error } = await client.from("generation_operations").select("input_json, result_json").eq("id", dependency.operationId).maybeSingle();
    if (error || !data) throw safeDbError("FINALIZE_DEPENDENCY_READ_FAILED");
    return data;
  }));
  const guideTopics = operationRows.map((row) => {
    const input = row.input_json as unknown as { topic: Parameters<typeof buildTopic>[1]; raw: Parameters<typeof buildTopic>[0] };
    const verdicts = row.result_json as unknown as Parameters<typeof buildTopic>[2];
    return buildTopic(input.raw, input.topic, verdicts, spansById, sourcesById);
  });
  const guide = guideSchema.parse({
    schema_version: "1.0",
    id: randomUUID(),
    session_id: context.sessionId,
    title: context.sessionTitle,
    based_on_uploaded_materials: true,
    source_count: sources.length,
    priority_method_summary: "Priority bands reflect supported topic coverage and course structure in the uploaded materials. They are study suggestions, not probabilities of appearing on an exam.",
    generation_status: "ready",
    source_issues: [],
    topics: guideTopics,
    overall_gaps: [],
    generated_at: new Date().toISOString(),
  });
  if (forbiddenLanguage(guide)) throw safeDbError("FORBIDDEN_LANGUAGE");
  const result = await rpc("finalize_generation_execution", {
    p_generation_run_id: generationRunId,
    p_operation_key: operationKey,
    p_owner_token: claim.ownerToken,
    p_fencing_version: claim.fencingVersion,
    p_guide_id: guide.id,
    p_guide_title: guide.title,
    p_guide_json: guide as unknown as Json,
    p_validation_warnings: [],
    p_source_checksum: context.sourceSnapshotHash,
    p_guide_result_hash: hashJson(guide),
  });
  return result.status === "succeeded" ? { status: "completed" as const } : { status: "terminal" as const };
}
