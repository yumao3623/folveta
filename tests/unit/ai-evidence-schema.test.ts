import { zodTextFormat } from "openai/helpers/zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseStructuredText, SafeProviderError } from "@/lib/ai/gateway";
import {
  mergedTopicsSchemaForSpanIds,
  rawGuideTopicSchemaForSpanIds,
  topicCandidatesSchemaForSpanIds,
} from "@/lib/ai/schemas";
import { allowedEvidenceSpanIds, validateProviderResult } from "@/lib/ai/workflow-execution";

const allowedSpanIds = ["span_allowed_a", "span_allowed_b"];

const topicResult = (spanId: string) => ({
  topics: [{
    id: "topic-one",
    title: "Topic one",
    priority: "study_first" as const,
    focus_reason: "Supported by the supplied evidence.",
    evidence_span_ids: [spanId],
  }],
});

function structuredOutputEnums(schema: Parameters<typeof zodTextFormat>[0]) {
  const format = zodTextFormat(schema, "test_schema") as unknown as { schema: unknown };
  const enums: string[][] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.enum) && record.enum.every((item) => typeof item === "string")) {
      enums.push(record.enum as string[]);
    }
    Object.values(record).forEach(visit);
  };
  visit(format.schema);
  return enums;
}

describe("operation-scoped evidence schemas", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts an allowed evidence span ID", () => {
    const schema = mergedTopicsSchemaForSpanIds(allowedSpanIds);
    expect(schema.parse(topicResult("span_allowed_a"))).toEqual(topicResult("span_allowed_a"));
  });

  it("emits only the exact operation allowed set in every structured-output span enum", () => {
    const idsWithDuplicate = ["span_allowed_a", "span_allowed_b", "span_allowed_a"];
    const schemas = [
      topicCandidatesSchemaForSpanIds(idsWithDuplicate),
      mergedTopicsSchemaForSpanIds(idsWithDuplicate),
      rawGuideTopicSchemaForSpanIds(idsWithDuplicate),
    ];
    const spanEnums = schemas.flatMap(structuredOutputEnums)
      .filter((values) => values.every((value) => value.startsWith("span_")));
    expect(spanEnums.length).toBeGreaterThanOrEqual(3);
    expect(spanEnums.every((values) => JSON.stringify(values) === JSON.stringify(allowedSpanIds))).toBe(true);
  });

  it("derives each operation allowed set from IDs present in its current context", () => {
    const spans = allowedSpanIds.map((id) => ({ id }));
    expect(allowedEvidenceSpanIds({
      operationKind: "extract_topics",
      input: { spanIds: ["span_allowed_b", "span_missing", "span_allowed_b"] },
      spans,
    })).toEqual(["span_allowed_b"]);
    expect(allowedEvidenceSpanIds({
      operationKind: "merge_topics",
      input: {},
      spans,
    })).toEqual(allowedSpanIds);
    expect(allowedEvidenceSpanIds({
      operationKind: "generate_guide",
      input: { topic: { evidence_span_ids: ["span_allowed_a", "span_missing"] } },
      spans,
    })).toEqual(["span_allowed_a"]);
  });

  it("rejects an evidence span ID outside the allowed set as a structured result", () => {
    const schema = mergedTopicsSchemaForSpanIds(allowedSpanIds);
    expect(parseStructuredText(JSON.stringify(topicResult("span_not_allowed")), schema))
      .toEqual({ kind: "schema_invalid" });
  });

  it("keeps post-validation as a second referential-integrity defense", () => {
    const context = {
      operationKind: "plan_topics" as const,
      input: { spanIds: allowedSpanIds },
      spans: allowedSpanIds.map((id) => ({ id })),
    };
    expect(allowedEvidenceSpanIds(context)).toEqual(allowedSpanIds);
    expect(() => validateProviderResult(context, topicResult("span_allowed_b"), {
      providerStatus: 200,
      providerRequestId: "resp_safe",
    })).not.toThrow();
    expect(() => validateProviderResult(context, topicResult("span_not_allowed"), {
      providerStatus: 200,
      providerRequestId: "resp_safe",
    })).toThrowError(expect.objectContaining<Partial<SafeProviderError>>({
      code: "MODEL_INVALID_SOURCE_REFERENCE",
      retryable: false,
    }));
  });

  it("does not log source content or model output while building or validating schemas", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const schema = mergedTopicsSchemaForSpanIds(allowedSpanIds);
    schema.safeParse(topicResult("span_not_allowed"));
    expect(info).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
