import { createHash } from "node:crypto";
import type { ServerEnv } from "@/lib/env";

export const GENERATION_PIPELINE_VERSION = "workflow-v1";
export const OPERATION_VERSION = "1";
export const MAX_SINGLE_PLAN_CHARACTERS = 45_000;
export const EXPECTED_PLAN_OUTPUT_TOKENS = 5_000;
export const PLAN_PROMPT_OVERHEAD_TOKENS = 2_000;
export const TOKEN_SAFETY_MARGIN = 0.85;

export const PROVIDER_DEADLINES_MS = {
  plan_topics: 75_000,
  extract_topics: 65_000,
  merge_topics: 65_000,
  guide: 85_000,
  grounding: 55_000,
} as const;

export type ProviderOperationKind = keyof typeof PROVIDER_DEADLINES_MS;

export function approximateTokenCount(text: string) {
  let ascii = 0;
  let nonAscii = 0;
  for (const character of text) {
    if (character.charCodeAt(0) <= 0x7f) ascii += 1;
    else nonAscii += 1;
  }
  return Math.ceil(ascii / 4 + nonAscii * 1.15);
}

export function planningBudget(input: {
  evidence: string;
  metadataCharacters: number;
  modelContextTokens: number;
  gatewayInputTokens: number;
}) {
  const approximateInputTokens = approximateTokenCount(input.evidence)
    + Math.ceil(input.metadataCharacters / 3)
    + PLAN_PROMPT_OVERHEAD_TOKENS;
  const hardLimit = Math.min(input.modelContextTokens, input.gatewayInputTokens);
  const safeLimit = Math.floor((hardLimit - EXPECTED_PLAN_OUTPUT_TOKENS) * TOKEN_SAFETY_MARGIN);
  return {
    approximateInputTokens,
    safeLimit,
    singleCall: input.evidence.length <= MAX_SINGLE_PLAN_CHARACTERS && approximateInputTokens <= safeLimit,
  };
}

export function planningBatches<T extends { id: string; text: string }>(input: {
  spans: T[];
  metadataCharacters: number;
  modelContextTokens: number;
  gatewayInputTokens: number;
}) {
  const hardLimit = Math.min(input.modelContextTokens, input.gatewayInputTokens);
  const safeInputTokens = Math.floor((hardLimit - EXPECTED_PLAN_OUTPUT_TOKENS) * TOKEN_SAFETY_MARGIN)
    - PLAN_PROMPT_OVERHEAD_TOKENS
    - Math.ceil(input.metadataCharacters / 3);
  const batches: T[][] = [];
  let batch: T[] = [];
  let characters = 0;
  let tokens = 0;
  for (const span of input.spans) {
    const spanTokens = approximateTokenCount(span.text) + approximateTokenCount(span.id) + 8;
    if (spanTokens > safeInputTokens) throw new Error("GENERATION_SPAN_EXCEEDS_TOKEN_BUDGET");
    if (batch.length && (characters + span.text.length > MAX_SINGLE_PLAN_CHARACTERS || tokens + spanTokens > safeInputTokens)) {
      batches.push(batch);
      batch = [];
      characters = 0;
      tokens = 0;
    }
    batch.push(span);
    characters += span.text.length;
    tokens += spanTokens;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

export function executionContract(env: ServerEnv) {
  const value = {
    pipelineVersion: GENERATION_PIPELINE_VERSION,
    operationVersion: OPERATION_VERSION,
    provider: env.MODEL_PROVIDER,
    baseUrlOrigin: new URL(env.OPENAI_BASE_URL).origin,
    models: {
      topicExtract: env.MODEL_TOPIC_EXTRACT,
      topicMerge: env.MODEL_TOPIC_MERGE,
      guide: env.MODEL_GUIDE,
      grounding: env.MODEL_GROUNDING_VERIFY,
    },
    promptVersion: env.PROMPT_VERSION,
    guideSchemaVersion: env.GUIDE_SCHEMA_VERSION,
    modelContextTokens: env.MODEL_CONTEXT_WINDOW_TOKENS,
    gatewayInputTokens: env.GATEWAY_MAX_INPUT_TOKENS,
  };
  return {
    value,
    hash: createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex"),
  };
}
