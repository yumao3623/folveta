import { z } from "zod";
import { ModelGateway, SafeProviderError, classifyProviderError } from "@/lib/ai/gateway";
import { type V2Artifact, type V2Partition, type V2Span, v2ArtifactSchema, v2ArtifactSchemaForSpanIds } from "@/lib/ai/generation-v2";

export type V2ProviderMetric = {
  artifactId: string;
  attempt: number;
  outcome: "success" | "failure";
  durationMs: number;
  providerStatus: number | null;
  providerRequestId: string | null;
  errorCode: string | null;
  retryable: boolean;
};

export type V2ArtifactProvider = {
  generate(input: { artifactId: string; attempt: number; partition: V2Partition; spans: V2Span[]; outputLanguage: "en" | "zh" }): Promise<V2Artifact>;
};

const instructions = [
  "Create one concise, evidence-backed study-guide section from the supplied evidence.",
  "Use only supplied span IDs. Every explanation claim must cite one or more supplied IDs.",
  "Do not invent source names, page numbers, excerpts, facts, exam predictions, or mastery guarantees.",
  "Required fields are section title, priority, focus reason, and one or more source-backed explanation claims.",
  "Optional instructional blocks may be omitted when unsupported by the evidence.",
].join("\n");

function evidenceFor(spans: V2Span[]) {
  return spans.map((span) => `[span_id: ${span.id}]\n${span.text}`).join("\n\n");
}

function normalizeStructuredArtifact(value: unknown): V2Artifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) return v2ArtifactSchema.parse(value);
  const normalized = { ...(value as Record<string, unknown>) };
  for (const key of ["review_targets", "key_concepts", "definitions", "processes_relationships", "common_confusions", "practice_prompts"]) {
    if (normalized[key] === null) delete normalized[key];
  }
  return v2ArtifactSchema.parse(normalized);
}

/** A thin Generation v2 request builder over the already-audited ModelGateway. */
export class ModelGatewayV2Provider implements V2ArtifactProvider {
  constructor(
    private readonly gateway = new ModelGateway(),
    private readonly recordMetric: (metric: V2ProviderMetric) => void = () => {},
  ) {}

  async generate(input: { artifactId: string; attempt: number; partition: V2Partition; spans: V2Span[]; outputLanguage: "en" | "zh" }): Promise<V2Artifact> {
    const startedAt = Date.now();
    try {
      const schema = v2ArtifactSchemaForSpanIds(input.partition.span_ids);
      const result = await this.gateway.generateStructured({
        task: "guide",
        schema: schema as z.ZodType<V2Artifact>,
        schemaName: "generation_v2_artifact",
        instructions: `${instructions}\nWrite the learner-facing content in ${input.outputLanguage === "zh" ? "Simplified Chinese" : "English"}. ${input.attempt > 1 ? "This is a repair attempt: return the complete schema-valid artifact." : ""}`,
        evidence: evidenceFor(input.spans),
      });
      this.recordMetric({ artifactId: input.artifactId, attempt: input.attempt, outcome: "success", durationMs: result.durationMs, providerStatus: result.providerStatus, providerRequestId: result.providerRequestId, errorCode: null, retryable: false });
      return normalizeStructuredArtifact(result.data);
    } catch (error) {
      const safe = classifyProviderError(error);
      this.recordMetric({ artifactId: input.artifactId, attempt: input.attempt, outcome: "failure", durationMs: Date.now() - startedAt, providerStatus: safe.providerStatus, providerRequestId: safe.providerRequestId, errorCode: safe.code, retryable: safe.retryable });
      throw safe;
    }
  }
}

export function v2ArtifactFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "MODEL_PROVIDER_FAILURE";
  if (error instanceof z.ZodError) {
    return { code: "invalid_output", message: "The provider returned an invalid structured artifact.", retryable: true };
  }
  if (code === "MODEL_INVALID_SOURCE_REFERENCE" || code === "MODEL_UNSUPPORTED_CLAIM" || code === "MODEL_UNSUPPORTED_CLAIM_IN_EXPLANATION") {
    return { code: "invalid_output", message: "The provider cited evidence outside this artifact.", retryable: false };
  }
  const safe = classifyProviderError(error);
  // A schema-invalid response gets one artifact-scoped repair attempt. The
  // gateway remains strict; this only controls whether Slice 2 schedules it.
  const repairable = safe.code === "MODEL_INVALID_JSON" || safe.code === "MODEL_SCHEMA_VALIDATION_FAILED" || safe.code === "MODEL_EMPTY_OUTPUT";
  return {
    code: safe.code,
    message: safe instanceof SafeProviderError ? safe.code : "Provider artifact unavailable.",
    retryable: safe.retryable || repairable,
  };
}
