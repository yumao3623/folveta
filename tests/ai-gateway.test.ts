import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/server/http";
import { isRetryableModelError, parseStructuredText, privacySafeDiagnostics, responseDiagnostics, SafeProviderError, validateProviderEnvelope } from "@/lib/ai/gateway";
import { z } from "zod";

const schema = z.object({ value: z.string().min(1) }).strict();

describe("AI gateway reliability contracts", () => {
  it("accepts valid JSON text when parsed structured output is missing", () => {
    expect(parseStructuredText('{"value":"ok"}', schema)).toEqual({ kind: "valid", data: { value: "ok" } });
  });

  it("rejects invalid JSON and schema-invalid JSON without repairing it", () => {
    expect(parseStructuredText("not json", schema)).toEqual({ kind: "invalid_json" });
    expect(parseStructuredText('{"value":7}', schema)).toEqual({ kind: "schema_invalid" });
    expect(parseStructuredText('{"value":"unterminated"', schema)).toEqual({ kind: "invalid_json" });
  });

  it("only marks bounded transient failures retryable", () => {
    expect(isRetryableModelError(new SafeProviderError("MODEL_EMPTY_OUTPUT", "provider_transient", true))).toBe(true);
    expect(isRetryableModelError(new SafeProviderError("MODEL_INCOMPLETE_RESPONSE", "provider_transient", true))).toBe(true);
    expect(isRetryableModelError(Object.assign(new Error("bad gateway"), { status: 502 }))).toBe(false);
    expect(isRetryableModelError(new AppError("MODEL_SCHEMA_VALIDATION_FAILED", "invalid"))).toBe(false);
    expect(isRetryableModelError(Object.assign(new Error("bad request"), { status: 400 }))).toBe(false);
  });

  it("exposes only sanitized provider error fields", () => {
    const error = new SafeProviderError("MODEL_PROVIDER_TRANSIENT", "provider_transient", true, 503, "req_123", "provider_unavailable");
    expect(error.message).toBe("MODEL_PROVIDER_TRANSIENT");
    expect(error).not.toHaveProperty("cause");
    expect(JSON.stringify(error)).not.toContain("private");
  });

  it("rejects invalid content types, response shapes, and model identities without retrying", () => {
    const valid = { model: "configured-model", output: [], output_text: "{}" };
    expect(() => validateProviderEnvelope({ contentType: "text/event-stream", response: valid, configuredModel: "configured-model", providerStatus: 200, requestId: "req_1" }))
      .toThrowError(expect.objectContaining({ code: "MODEL_INVALID_CONTENT_TYPE", retryable: false }));
    expect(() => validateProviderEnvelope({ contentType: "application/json", response: "not-an-object", configuredModel: "configured-model", providerStatus: 200, requestId: "req_2" }))
      .toThrowError(expect.objectContaining({ code: "MODEL_INVALID_RESPONSE_OBJECT", retryable: false }));
    expect(() => validateProviderEnvelope({ contentType: "application/json", response: { ...valid, model: "unexpected-model" }, configuredModel: "configured-model", providerStatus: 200, requestId: "req_3" }))
      .toThrowError(expect.objectContaining({ code: "MODEL_IDENTITY_MISMATCH", retryable: false }));
  });

  it("diagnostics contain metadata only and never response text", () => {
    const diagnostics = responseDiagnostics({
      id: "resp_test",
      status: "completed",
      output_text: '{"value":"private source text"}',
      output_parsed: null,
      output: [{ type: "message", content: [{ type: "output_text", text: "private source text" }] }],
      usage: { input_tokens: 12, output_tokens: 4 },
    }, { provider: "openai", model: "gpt-5.6-sol", durationMs: 850, parseResult: "text_fallback" });
    expect(diagnostics.outputTextLength).toBeGreaterThan(0);
    expect(diagnostics.outputItemTypes).toEqual(["message"]);
    expect(JSON.stringify(diagnostics)).not.toContain("private source text");
    expect(JSON.stringify(diagnostics)).not.toContain("prompt");
  });

  it("captures compatible gateway request and HTTP metadata without response content", () => {
    const diagnostics = responseDiagnostics({
      requestID: "gateway-request-id",
      status: 503,
      error: { message: "private provider detail" },
    }, { provider: "openai", model: "gpt-5.6-sol", durationMs: 850, parseResult: "empty" });
    expect(diagnostics.requestId).toBe("gateway-request-id");
    expect(diagnostics.httpStatus).toBe(503);
    expect(JSON.stringify(diagnostics)).not.toContain("private provider detail");
    expect(privacySafeDiagnostics(diagnostics)).toEqual({
      providerStatus: 503,
      requestId: "gateway-request-id",
      duration: 850,
    });
  });
});
