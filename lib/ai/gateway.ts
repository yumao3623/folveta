import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { getServerEnv } from "@/lib/env";
import { AppError } from "@/lib/server/http";

export type ModelTask =
  | "topic_extract"
  | "topic_merge"
  | "guide"
  | "grounding_verify"
  | "quick_check"
  | "question_verify";

const modelKeys: Record<ModelTask, keyof Pick<ReturnType<typeof getServerEnv>,
  | "MODEL_TOPIC_EXTRACT"
  | "MODEL_TOPIC_MERGE"
  | "MODEL_GUIDE"
  | "MODEL_GROUNDING_VERIFY"
  | "MODEL_QUICK_CHECK"
  | "MODEL_QUESTION_VERIFY"
>> = {
  topic_extract: "MODEL_TOPIC_EXTRACT",
  topic_merge: "MODEL_TOPIC_MERGE",
  guide: "MODEL_GUIDE",
  grounding_verify: "MODEL_GROUNDING_VERIFY",
  quick_check: "MODEL_QUICK_CHECK",
  question_verify: "MODEL_QUESTION_VERIFY",
};

export type StructuredResult<T> = {
  data: T;
  provider: "openai";
  configuredModel: string;
  actualModel: string;
  usage: unknown;
  retryCount: number;
  parseMode: "parsed" | "text_fallback";
};

export type ModelResponseDiagnostics = {
  provider: "openai";
  model: string;
  requestId: string | null;
  httpStatus: number | null;
  responseFields: string[];
  outputItemCount: number | null;
  outputItemTypes: string[];
  outputTextLength: number;
  outputParsedPresent: boolean;
  responseStatus: string | null;
  incompleteReason: string | null;
  refusalPresent: boolean;
  usage: Record<string, number> | null;
  parseResult: "parsed" | "text_fallback" | "empty" | "invalid_json" | "schema_invalid" | "refusal" | "incomplete";
  durationMs: number;
};

const MODEL_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 2;

function numericUsage(usage: unknown) {
  if (!usage || typeof usage !== "object") return null;
  const entries = Object.entries(usage).filter(([, value]) => typeof value === "number") as Array<[string, number]>;
  return entries.length ? Object.fromEntries(entries) : null;
}

export function responseDiagnostics(
  response: unknown,
  input: { provider: "openai"; model: string; durationMs: number; parseResult: ModelResponseDiagnostics["parseResult"] },
): ModelResponseDiagnostics {
  const value = response && typeof response === "object" ? response as Record<string, unknown> : {};
  const output = Array.isArray(value.output) ? value.output : null;
  const outputTypes = output
    ? output.map((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).type === "string" ? String((item as Record<string, unknown>).type) : "unknown")
    : [];
  const refusalPresent = output?.some((item) => {
    if (!item || typeof item !== "object") return false;
    const content = (item as Record<string, unknown>).content;
    return Array.isArray(content) && content.some((part: unknown) => part && typeof part === "object" && (part as Record<string, unknown>).type === "refusal");
  }) ?? false;
  const incomplete = value.incomplete_details;
  return {
    provider: input.provider,
    model: input.model,
    requestId: typeof value.id === "string" ? value.id : typeof value._request_id === "string" ? value._request_id : typeof value.request_id === "string" ? value.request_id : null,
    httpStatus: typeof value.status_code === "number" ? value.status_code : null,
    responseFields: Object.keys(value).sort(),
    outputItemCount: output ? output.length : null,
    outputItemTypes: outputTypes,
    outputTextLength: typeof value.output_text === "string" ? value.output_text.length : 0,
    outputParsedPresent: value.output_parsed !== null && value.output_parsed !== undefined,
    responseStatus: typeof value.status === "string" ? value.status : null,
    incompleteReason: incomplete && typeof incomplete === "object" && typeof (incomplete as Record<string, unknown>).reason === "string" ? String((incomplete as Record<string, unknown>).reason) : null,
    refusalPresent: refusalPresent || Boolean(value.refusal),
    usage: numericUsage(value.usage),
    parseResult: input.parseResult,
    durationMs: input.durationMs,
  };
}

function logDiagnostics(diagnostics: ModelResponseDiagnostics) {
  console.info("[model-diagnostic]", JSON.stringify(diagnostics));
}

export function parseStructuredText<T>(text: unknown, schema: ZodType<T>) {
  if (typeof text !== "string" || !text.trim()) return { kind: "empty" as const };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "invalid_json" as const };
  }
  const result = schema.safeParse(parsed);
  return result.success
    ? { kind: "valid" as const, data: result.data }
    : { kind: "schema_invalid" as const };
}

export function isRetryableModelError(error: unknown) {
  if (error instanceof AppError) return ["MODEL_EMPTY_OUTPUT", "MODEL_INCOMPLETE_RESPONSE", "MODEL_PROVIDER_TRANSIENT", "MODEL_PROVIDER_TIMEOUT"].includes(error.code);
  const status = error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : null;
  if (status !== null && [408, 409, 429, 502, 503, 504].includes(status)) return true;
  const name = error && typeof error === "object" && typeof (error as { name?: unknown }).name === "string" ? (error as { name: string }).name : "";
  return /timeout|connection/i.test(name);
}

export async function withBoundedModelRetry<T>(
  call: (attempt: number) => Promise<T>,
  onRetry?: (attempt: number) => Promise<void> | void,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await call(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_ATTEMPTS || !isRetryableModelError(error)) throw error;
      await onRetry?.(attempt + 1);
      const delay = Math.min(2_000, 250 * (2 ** (attempt - 1))) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError instanceof Error ? lastError : new AppError("MODEL_GENERATION_FAILED", "The model provider request failed.", 502);
}

function safeProviderError(error: unknown) {
  const status = error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : null;
  if (status === 408 || (status !== null && [502, 503, 504].includes(status))) return new AppError("MODEL_PROVIDER_TRANSIENT", "The model provider is temporarily unavailable.", 502, { httpStatus: status });
  if (status === 429) return new AppError("MODEL_PROVIDER_TRANSIENT", "The model provider is rate limited.", 429, { httpStatus: status });
  const name = error && typeof error === "object" && typeof (error as { name?: unknown }).name === "string" ? (error as { name: string }).name : "";
  if (/timeout|connection/i.test(name)) return new AppError("MODEL_PROVIDER_TIMEOUT", "The model provider request timed out.", 504);
  return new AppError("MODEL_GENERATION_FAILED", "The model provider request failed.", 502, { httpStatus: status });
}

export class ModelGateway {
  private client: OpenAI;
  private env = getServerEnv();

  constructor() {
    this.client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
      timeout: MODEL_TIMEOUT_MS,
    });
  }

  async generateStructured<T>({
    task,
    schema,
    schemaName,
    instructions,
    evidence,
    onRetry,
  }: {
    task: ModelTask;
    schema: ZodType<T>;
    schemaName: string;
    instructions: string;
    evidence: string;
    onRetry?: (attempt: number) => Promise<void> | void;
  }): Promise<StructuredResult<T>> {
    const configuredModel = this.env[modelKeys[task]];
    return withBoundedModelRetry(async (attempt) => {
      const startedAt = Date.now();
      try {
        const response = await this.client.responses.parse({
          model: configuredModel,
          instructions,
          input: evidence,
          text: { format: zodTextFormat(schema, schemaName) },
        });
        const responseValue = response as unknown as Record<string, unknown>;
        const hasRefusalItem = response.output?.some((item) => {
          const candidate = item as unknown as { type?: string; content?: unknown };
          return candidate.type === "message" && Array.isArray(candidate.content)
            && candidate.content.some((part: unknown) => part && typeof part === "object" && (part as { type?: unknown }).type === "refusal");
        }) ?? false;
        if (responseValue.refusal || hasRefusalItem) {
          const error = new AppError("MODEL_REFUSAL", "The model declined to generate this result.", 422);
          logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "refusal" }));
          throw error;
        }
        if (response.status === "incomplete" || response.incomplete_details) {
          const error = new AppError("MODEL_INCOMPLETE_RESPONSE", "The model response was incomplete.", 502, { reason: response.incomplete_details?.reason ?? null });
          logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "incomplete" }));
          throw error;
        }
        if (response.output_parsed !== null && response.output_parsed !== undefined) {
          const validation = schema.safeParse(response.output_parsed);
          if (!validation.success) {
            logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "schema_invalid" }));
            throw new AppError("MODEL_SCHEMA_VALIDATION_FAILED", "The model returned a result that did not match the required schema.", 502);
          }
          logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "parsed" }));
          return {
            data: validation.data,
            provider: "openai",
            configuredModel,
            actualModel: response.model,
            usage: response.usage,
            retryCount: attempt - 1,
            parseMode: "parsed",
          };
        }
        const fallback = parseStructuredText(response.output_text, schema);
        if (fallback.kind === "valid") {
          logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "text_fallback" }));
          return {
            data: fallback.data,
            provider: "openai",
            configuredModel,
            actualModel: response.model,
            usage: response.usage,
            retryCount: attempt - 1,
            parseMode: "text_fallback",
          };
        }
        const code = fallback.kind === "empty" ? "MODEL_EMPTY_OUTPUT" : fallback.kind === "invalid_json" ? "MODEL_INVALID_JSON" : "MODEL_SCHEMA_VALIDATION_FAILED";
        const error = new AppError(code, fallback.kind === "empty" ? "The model did not return a result." : "The model returned a result that did not match the required schema.", 502);
        logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: fallback.kind }));
        throw error;
      } catch (error) {
        if (!(error instanceof AppError)) {
          logDiagnostics(responseDiagnostics(error, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "empty" }));
        }
        throw error instanceof AppError ? error : safeProviderError(error);
      }
    }, onRetry);
  }
}
