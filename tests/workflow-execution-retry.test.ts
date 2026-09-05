import OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  gateway: vi.fn(),
  rpc: vi.fn(),
}));

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  SUPABASE_STORAGE_BUCKET: "course-materials",
  MODEL_PROVIDER: "openai" as const,
  OPENAI_BASE_URL: "https://gateway.example.test/v1",
  OPENAI_API_KEY: "test-openai-key",
  MODEL_TOPIC_EXTRACT: "test-model",
  MODEL_TOPIC_MERGE: "test-model",
  MODEL_GUIDE: "test-model",
  MODEL_GROUNDING_VERIFY: "test-model",
  MODEL_QUICK_CHECK: "test-model",
  MODEL_QUESTION_VERIFY: "test-model",
  MODEL_CONTEXT_WINDOW_TOKENS: 128_000,
  GATEWAY_MAX_INPUT_TOKENS: 80_000,
  AI_GENERATION_WORKFLOW_ENABLED: true,
  GENERATION_V2_RUNTIME_ENABLED: false,
  GENERATION_V2_PRODUCT_ENABLED: false,
  GENERATION_V2_ROLLOUT_ALLOWLIST: "",
  PROMPT_VERSION: "test-v1",
  GUIDE_SCHEMA_VERSION: "1.0" as const,
  QUICK_CHECK_SCHEMA_VERSION: "1.0" as const,
  SESSION_RETENTION_DAYS: 7,
  NEXT_PUBLIC_PADDLE_ENV: "sandbox" as const,
};

vi.mock("@/lib/env", () => ({ getServerEnv: () => env }));
vi.mock("@/lib/server/supabase", () => ({
  getSupabaseAdmin: () => ({ rpc: mocked.rpc }),
}));
vi.mock("@/lib/ai/gateway", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/gateway")>();
  return {
    ...actual,
    ModelGateway: class {
      generateStructured = mocked.gateway;
    },
  };
});

import { executionContract } from "@/lib/ai/generation-contract";
import { executeProviderOperation } from "@/lib/ai/workflow-execution";

describe("provider operation retry boundary", () => {
  beforeEach(() => {
    mocked.gateway.mockReset();
    mocked.rpc.mockReset();
  });

  it("retries one classified transport failure and completes on its next claim", async () => {
    const executionContractHash = executionContract(env).hash;
    let claimedAttempts = 0;
    let retryCreditsRemaining = 4;
    const settlementArgs: Record<string, unknown>[] = [];

    mocked.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "get_generation_operation_context") {
        return {
          data: {
            generationRunId: "run-safe-id",
            sessionId: "session-safe-id",
            sessionTitle: "Test session",
            sourceSnapshotHash: "source-snapshot-hash",
            executionContractHash,
            operationKind: "plan_topics",
            input: { spanIds: ["span-safe-id"] },
            operationId: "operation-safe-id",
            resultHash: null,
            result: null,
            dependencies: [],
            sources: [{ id: "source-safe-id", displayName: "Source", kind: "pdf", status: "ready" }],
            spans: [{
              id: "span-safe-id",
              sourceId: "source-safe-id",
              locatorKind: "page",
              locatorNumber: 1,
              text: "Safe fixture evidence.",
              excerpt: "Safe fixture evidence.",
              contentHash: "span-content-hash",
            }],
          },
          error: null,
        };
      }
      if (name === "claim_generation_operation") {
        claimedAttempts += 1;
        if (claimedAttempts > 1) retryCreditsRemaining -= 1;
        return {
          data: {
            status: "claimed",
            ownerToken: `owner-${claimedAttempts}`,
            fencingVersion: claimedAttempts,
            attemptId: `attempt-${claimedAttempts}`,
          },
          error: null,
        };
      }
      if (name === "settle_generation_operation_retry_or_fail") {
        settlementArgs.push(args);
        return { data: { status: "retry_wait", nextEligibleAt: "2026-09-03T00:00:05.000Z" }, error: null };
      }
      if (name === "settle_generation_operation_success") {
        return { data: { status: "succeeded", resultHash: "result-hash" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    mocked.gateway
      .mockRejectedValueOnce(new OpenAI.APIConnectionError({
        cause: Object.assign(new Error("private connection detail"), { code: "ECONNRESET" }),
      }))
      .mockResolvedValueOnce({
        data: {
          topics: [{
            id: "topic-one",
            title: "Topic one",
            priority: "study_first",
            focus_reason: "Supported by fixture evidence.",
            evidence_span_ids: ["span-safe-id"],
          }],
        },
        provider: "openai",
        configuredModel: "test-model",
        actualModel: "test-model",
        usage: null,
        providerRequestId: null,
        providerStatus: 200,
        durationMs: 1,
        retryCount: 0,
        parseMode: "parsed",
      });

    await expect(executeProviderOperation("run-safe-id", "plan:root")).resolves.toMatchObject({ status: "wait" });
    expect(settlementArgs).toHaveLength(1);
    expect(settlementArgs[0]).toMatchObject({
      p_retryable: true,
      p_error_code: "MODEL_PROVIDER_CONNECTION",
      p_retry_reason: "connection",
    });

    await expect(executeProviderOperation("run-safe-id", "plan:root")).resolves.toEqual({ status: "completed", resultHash: "result-hash" });
    expect(claimedAttempts).toBe(2);
    expect(retryCreditsRemaining).toBe(3);
  });
});
