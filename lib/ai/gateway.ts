import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { zodTextFormat } from "openai/helpers/zod";
import type { ZodType } from "zod";
import { getServerEnv } from "@/lib/env";

export type ModelTask =
  | "image_extract"
  | "file_extract"
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
  image_extract: "MODEL_TOPIC_EXTRACT",
  file_extract: "MODEL_TOPIC_EXTRACT",
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
  providerRequestId: string | null;
  providerStatus: number;
  durationMs: number;
  retryCount: 0;
  parseMode: "parsed" | "text_fallback";
};

export type ProviderErrorClass =
  | "http"
  | "sdk_timeout"
  | "sdk_connection"
  | "abort"
  | "transport"
  | "unknown_internal";

export type ProviderErrorCode =
  | "HTTP_408"
  | "HTTP_429"
  | "HTTP_5XX"
  | "HTTP_4XX"
  | "SDK_API_CONNECTION_TIMEOUT"
  | "SDK_API_CONNECTION"
  | "SDK_API_USER_ABORT"
  | "TIMEOUT_ERROR"
  | "ABORT_ERROR"
  | "CONNECTION_ERROR"
  | "ETIMEDOUT"
  | "ECONNRESET"
  | "ECONNREFUSED"
  | "EAI_AGAIN"
  | "ENETUNREACH"
  | "EHOSTUNREACH"
  | "ENOTFOUND"
  | "UND_ERR_CONNECT_TIMEOUT"
  | "UND_ERR_HEADERS_TIMEOUT"
  | "UND_ERR_BODY_TIMEOUT"
  | "UND_ERR_SOCKET";

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
  providerErrorClass: ProviderErrorClass | null;
  providerErrorCode: ProviderErrorCode | null;
};

export const MODEL_TIMEOUT_MS = 180_000;

export type ProviderFailureCategory =
  | "provider_transient"
  | "provider_unavailable"
  | "provider_refusal"
  | "provider_protocol"
  | "invalid_output"
  | "execution_contract";

export type ProviderRetryReason =
  | "timeout"
  | "rate_limited"
  | "provider_unavailable"
  | "connection"
  | "transport_interruption"
  | "empty_output"
  | "protocol_error"
  | "model_mismatch"
  | "refusal"
  | "schema_invalid"
  | "invalid_source_reference"
  | "configuration_limit"
  | "non_retryable";

export class SafeProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly category: ProviderFailureCategory,
    public readonly retryable: boolean,
    public readonly providerStatus: number | null = null,
    public readonly providerRequestId: string | null = null,
    public readonly retryReason: ProviderRetryReason | null = null,
    public readonly deadlineExceeded = false,
    public readonly providerErrorClass: ProviderErrorClass | null = null,
    public readonly providerErrorCode: ProviderErrorCode | null = null,
  ) {
    super(code);
    this.name = "SafeProviderError";
  }
}

function numericUsage(usage: unknown) {
  if (!usage || typeof usage !== "object") return null;
  const entries = Object.entries(usage).filter(([, value]) => typeof value === "number") as Array<[string, number]>;
  return entries.length ? Object.fromEntries(entries) : null;
}

export function responseDiagnostics(
  response: unknown,
  input: {
    provider: "openai";
    model: string;
    durationMs: number;
    parseResult: ModelResponseDiagnostics["parseResult"];
    providerErrorClass?: ProviderErrorClass | null;
    providerErrorCode?: ProviderErrorCode | null;
  },
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
    requestId: typeof value.id === "string" ? value.id : typeof value._request_id === "string" ? value._request_id : typeof value.request_id === "string" ? value.request_id : typeof value.requestID === "string" ? value.requestID : null,
    httpStatus: typeof value.status_code === "number" ? value.status_code : typeof value.status === "number" ? value.status : null,
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
    providerErrorClass: input.providerErrorClass ?? null,
    providerErrorCode: input.providerErrorCode ?? null,
  };
}

function logDiagnostics(diagnostics: ModelResponseDiagnostics) {
  console.info("[model-diagnostic]", JSON.stringify(privacySafeDiagnostics(diagnostics)));
}

export function privacySafeDiagnostics(diagnostics: ModelResponseDiagnostics) {
  return {
    providerStatus: diagnostics.httpStatus,
    requestId: diagnostics.requestId,
    duration: diagnostics.durationMs,
    providerErrorClass: diagnostics.providerErrorClass,
    providerErrorCode: diagnostics.providerErrorCode,
  };
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
  return error instanceof SafeProviderError && error.retryable;
}

function boundedRequestId(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : null;
}

export function validateProviderEnvelope(input: {
  contentType: string | null;
  response: unknown;
  configuredModel: string;
  providerStatus: number;
  requestId: string | null;
}) {
  const mediaType = input.contentType?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!(mediaType === "application/json" || mediaType.endsWith("+json"))) {
    throw new SafeProviderError("MODEL_INVALID_CONTENT_TYPE", "provider_protocol", false, input.providerStatus, input.requestId, "protocol_error");
  }
  if (!input.response || typeof input.response !== "object" || Array.isArray(input.response)) {
    throw new SafeProviderError("MODEL_INVALID_RESPONSE_OBJECT", "provider_protocol", false, input.providerStatus, input.requestId, "protocol_error");
  }
  const response = input.response as Record<string, unknown>;
  if (typeof response.model !== "string" || !response.model) {
    throw new SafeProviderError("MODEL_IDENTITY_MISSING", "provider_protocol", false, input.providerStatus, input.requestId, "protocol_error");
  }
  if (response.model !== input.configuredModel) {
    throw new SafeProviderError("MODEL_IDENTITY_MISMATCH", "provider_protocol", false, input.providerStatus, input.requestId, "model_mismatch");
  }
  if (!Array.isArray(response.output) || typeof response.output_text !== "string") {
    throw new SafeProviderError("MODEL_INVALID_RESPONSE_OBJECT", "provider_protocol", false, input.providerStatus, input.requestId, "protocol_error");
  }
  return response;
}

const transportCodes = new Set<ProviderErrorCode>([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const timeoutCodes = new Set<ProviderErrorCode>([
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

function providerErrorCode(error: unknown): ProviderErrorCode | null {
  let current = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && transportCodes.has(code as ProviderErrorCode)) {
      return code as ProviderErrorCode;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

function makeSafeProviderError(
  code: string,
  category: ProviderFailureCategory,
  retryable: boolean,
  status: number | null,
  requestId: string | null,
  retryReason: ProviderRetryReason,
  deadlineExceeded: boolean,
  errorClass: ProviderErrorClass,
  errorCode: ProviderErrorCode | null,
) {
  return new SafeProviderError(
    code,
    category,
    retryable,
    status,
    requestId,
    retryReason,
    deadlineExceeded,
    errorClass,
    errorCode,
  );
}

export function classifyProviderError(error: unknown): SafeProviderError {
  if (error instanceof SafeProviderError) return error;
  const status = error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : null;
  const requestId = error && typeof error === "object"
    ? boundedRequestId((error as { request_id?: unknown; requestID?: unknown }).request_id ?? (error as { requestID?: unknown }).requestID)
    : null;
  if (status === 408) {
    return makeSafeProviderError("MODEL_PROVIDER_TIMEOUT", "provider_transient", true, status, requestId, "timeout", true, "http", "HTTP_408");
  }
  if (status === 429) {
    return makeSafeProviderError("MODEL_PROVIDER_RATE_LIMITED", "provider_transient", true, status, requestId, "rate_limited", false, "http", "HTTP_429");
  }
  if (status !== null && status >= 500 && status <= 599) {
    return makeSafeProviderError("MODEL_PROVIDER_TRANSIENT", "provider_transient", true, status, requestId, "provider_unavailable", false, "http", "HTTP_5XX");
  }
  if (status !== null && status >= 400 && status <= 499) {
    return makeSafeProviderError("MODEL_PROVIDER_FAILURE", "provider_unavailable", false, status, requestId, "non_retryable", false, "http", "HTTP_4XX");
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return makeSafeProviderError("MODEL_PROVIDER_TIMEOUT", "provider_transient", true, status, requestId, "timeout", true, "sdk_timeout", "SDK_API_CONNECTION_TIMEOUT");
  }
  if (error instanceof OpenAI.APIConnectionError) {
    const causeCode = providerErrorCode(error);
    const timeout = causeCode !== null && timeoutCodes.has(causeCode);
    return makeSafeProviderError(
      timeout ? "MODEL_PROVIDER_TIMEOUT" : "MODEL_PROVIDER_CONNECTION",
      "provider_transient",
      true,
      status,
      requestId,
      timeout ? "timeout" : "connection",
      timeout,
      "sdk_connection",
      causeCode ?? "SDK_API_CONNECTION",
    );
  }
  if (error instanceof OpenAI.APIUserAbortError) {
    return makeSafeProviderError("MODEL_PROVIDER_ABORTED", "provider_unavailable", false, status, requestId, "non_retryable", false, "abort", "SDK_API_USER_ABORT");
  }
  const causeCode = providerErrorCode(error);
  if (causeCode) {
    const timeout = timeoutCodes.has(causeCode);
    return makeSafeProviderError(
      timeout ? "MODEL_PROVIDER_TIMEOUT" : "MODEL_PROVIDER_CONNECTION",
      "provider_transient",
      true,
      status,
      requestId,
      timeout ? "timeout" : "connection",
      timeout,
      "transport",
      causeCode,
    );
  }
  const name = error && typeof error === "object" && typeof (error as { name?: unknown }).name === "string" ? (error as { name: string }).name : "";
  if (/timeout/i.test(name)) return makeSafeProviderError("MODEL_PROVIDER_TIMEOUT", "provider_transient", true, status, requestId, "timeout", true, "transport", "TIMEOUT_ERROR");
  if (name === "AbortError") return makeSafeProviderError("MODEL_PROVIDER_TIMEOUT", "provider_transient", true, status, requestId, "timeout", true, "abort", "ABORT_ERROR");
  if (/connection|network|fetch/i.test(name)) return makeSafeProviderError("MODEL_PROVIDER_CONNECTION", "provider_transient", true, status, requestId, "connection", false, "transport", "CONNECTION_ERROR");
  return makeSafeProviderError("MODEL_PROVIDER_FAILURE", "provider_unavailable", false, status, requestId, "non_retryable", false, "unknown_internal", null);
}

function incompleteProviderError(reason: string | null, status: number | null, requestId: string | null) {
  if (reason === "max_output_tokens") {
    return new SafeProviderError("MODEL_OUTPUT_TOKEN_LIMIT", "execution_contract", false, status, requestId, "configuration_limit");
  }
  if (reason === "content_filter" || reason === "refusal") {
    return new SafeProviderError("MODEL_REFUSAL", "provider_refusal", false, status, requestId, "refusal");
  }
  if (reason === "model_mismatch" || reason === "protocol_error") {
    return new SafeProviderError("MODEL_PROTOCOL_MISMATCH", "provider_protocol", false, status, requestId, "protocol_error");
  }
  return new SafeProviderError("MODEL_INCOMPLETE_RESPONSE", "provider_transient", true, status, requestId, "transport_interruption");
}

export class ModelGateway {
  private client: OpenAI;
  private env = getServerEnv();

  constructor() {
    this.client = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      baseURL: this.env.OPENAI_BASE_URL,
      timeout: MODEL_TIMEOUT_MS,
      maxRetries: 0,
      logLevel: "off",
    });
  }

  async generateStructured<T>({
    task,
    schema,
    schemaName,
    instructions,
    evidence,
    transport = "structured",
    requestTimeoutMs = MODEL_TIMEOUT_MS,
  }: {
    task: ModelTask;
    schema: ZodType<T>;
    schemaName: string;
    instructions: string;
    evidence: string | ResponseInput;
    transport?: "structured" | "json_text";
    requestTimeoutMs?: number;
  }): Promise<StructuredResult<T>> {
    const configuredModel = this.env[modelKeys[task]];
    const startedAt = Date.now();
    try {
      const request = this.client.responses.create({
        model: configuredModel,
        instructions: transport === "json_text"
          ? `${instructions}\nReturn exactly one valid JSON object matching the requested schema. Do not include markdown or commentary.`
          : instructions,
        input: evidence,
        ...(transport === "structured" ? { text: { format: zodTextFormat(schema, schemaName) } } : {}),
      }, { timeout: requestTimeoutMs });
      const envelope = await request.withResponse();
      const requestId = boundedRequestId(envelope.request_id);
      const providerStatus = envelope.response.status;
      validateProviderEnvelope({
        contentType: envelope.response.headers.get("content-type"),
        response: envelope.data,
        configuredModel,
        providerStatus,
        requestId,
      });
      const response = envelope.data;
      const responseValue = response as unknown as Record<string, unknown>;
      const hasRefusalItem = response.output.some((item) => {
        const candidate = item as unknown as { type?: string; content?: unknown };
        return candidate.type === "message" && Array.isArray(candidate.content)
          && candidate.content.some((part: unknown) => part && typeof part === "object" && (part as { type?: unknown }).type === "refusal");
      });
      if (responseValue.refusal || hasRefusalItem) {
        logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "refusal" }));
        throw new SafeProviderError("MODEL_REFUSAL", "provider_refusal", false, providerStatus, requestId, "refusal");
      }
      if (response.status === "incomplete" || response.incomplete_details) {
        logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: "incomplete" }));
        throw incompleteProviderError(response.incomplete_details?.reason ?? null, providerStatus, requestId);
      }
      const parsed = parseStructuredText(response.output_text, schema);
      if (parsed.kind === "valid") {
        const durationMs = Date.now() - startedAt;
        const parseMode = transport === "structured" ? "parsed" as const : "text_fallback" as const;
        logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs, parseResult: parseMode }));
        return {
          data: parsed.data,
          provider: "openai",
          configuredModel,
          actualModel: response.model,
          usage: response.usage,
          providerRequestId: requestId,
          providerStatus,
          durationMs,
          retryCount: 0,
          parseMode,
        };
      }
      logDiagnostics(responseDiagnostics(response, { provider: "openai", model: configuredModel, durationMs: Date.now() - startedAt, parseResult: parsed.kind }));
      if (parsed.kind === "empty") {
        throw new SafeProviderError("MODEL_EMPTY_OUTPUT", "provider_transient", true, providerStatus, requestId, "empty_output");
      }
      throw new SafeProviderError(
        parsed.kind === "invalid_json" ? "MODEL_INVALID_JSON" : "MODEL_SCHEMA_VALIDATION_FAILED",
        "provider_protocol",
        false,
        providerStatus,
        requestId,
        parsed.kind === "invalid_json" ? "protocol_error" : "schema_invalid",
      );
    } catch (error) {
      const safe = classifyProviderError(error);
      if (!(error instanceof SafeProviderError)) {
        logDiagnostics(responseDiagnostics(error, {
          provider: "openai",
          model: configuredModel,
          durationMs: Date.now() - startedAt,
          parseResult: "empty",
          providerErrorClass: safe.providerErrorClass,
          providerErrorCode: safe.providerErrorCode,
        }));
      }
      throw safe;
    }
  }
}
