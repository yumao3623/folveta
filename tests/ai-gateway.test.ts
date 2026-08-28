import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/server/http";
import { isRetryableModelError, parseStructuredText, responseDiagnostics, withBoundedModelRetry } from "@/lib/ai/gateway";
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
    expect(isRetryableModelError(new AppError("MODEL_EMPTY_OUTPUT", "empty"))).toBe(true);
    expect(isRetryableModelError(new AppError("MODEL_INCOMPLETE_RESPONSE", "incomplete"))).toBe(true);
    expect(isRetryableModelError(Object.assign(new Error("bad gateway"), { status: 502 }))).toBe(true);
    expect(isRetryableModelError(new AppError("MODEL_SCHEMA_VALIDATION_FAILED", "invalid"))).toBe(false);
    expect(isRetryableModelError(Object.assign(new Error("bad request"), { status: 400 }))).toBe(false);
  });

  it("retries an empty model response once, then succeeds", async () => {
    let calls = 0;
    const retries: number[] = [];
    const result = await withBoundedModelRetry(async () => {
      calls += 1;
      if (calls === 1) throw new AppError("MODEL_EMPTY_OUTPUT", "empty");
      return "ok";
    }, (attempt) => {
      retries.push(attempt);
    });
    expect(result).toBe("ok");
    expect(calls).toBe(2);
    expect(retries).toEqual([2]);
  });

  it("retries a 502 only once and preserves terminal errors", async () => {
    let transientCalls = 0;
    await expect(withBoundedModelRetry(async () => {
      transientCalls += 1;
      throw Object.assign(new Error("bad gateway"), { status: 502 });
    })).rejects.toMatchObject({ status: 502 });
    expect(transientCalls).toBe(2);

    let terminalCalls = 0;
    await expect(withBoundedModelRetry(async () => {
      terminalCalls += 1;
      throw new AppError("MODEL_SCHEMA_VALIDATION_FAILED", "invalid");
    })).rejects.toMatchObject({ code: "MODEL_SCHEMA_VALIDATION_FAILED" });
    expect(terminalCalls).toBe(1);
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
  });
});
