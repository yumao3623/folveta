import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnv } from "@/lib/env";

const requiredEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  SUPABASE_STORAGE_BUCKET: "course-materials",
  MODEL_PROVIDER: "openai",
  OPENAI_BASE_URL: "https://api.openai.com/v1",
  OPENAI_API_KEY: "openai-key",
  MODEL_TOPIC_EXTRACT: "model",
  MODEL_TOPIC_MERGE: "model",
  MODEL_GUIDE: "model",
  MODEL_GROUNDING_VERIFY: "model",
  MODEL_QUICK_CHECK: "model",
  MODEL_QUESTION_VERIFY: "model",
  PROMPT_VERSION: "phase1-v1",
  GUIDE_SCHEMA_VERSION: "1.0",
  QUICK_CHECK_SCHEMA_VERSION: "1.0",
  SESSION_RETENTION_DAYS: "7",
  PADDLE_ENV: "sandbox",
} as const;

function stubRequiredEnvironment() {
  Object.entries(requiredEnvironment).forEach(([key, value]) => vi.stubEnv(key, value));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("server environment", () => {
  it("treats a blank optional retention secret as unconfigured", () => {
    stubRequiredEnvironment();
    vi.stubEnv("RETENTION_JOB_SECRET", "   ");

    expect(getServerEnv().RETENTION_JOB_SECRET).toBeUndefined();
  });

  it("rejects a configured retention secret shorter than 32 characters", () => {
    stubRequiredEnvironment();
    vi.stubEnv("RETENTION_JOB_SECRET", "too-short");

    expect(() => getServerEnv()).toThrow("RETENTION_JOB_SECRET");
  });

  it("accepts a configured retention secret with at least 32 characters", () => {
    stubRequiredEnvironment();
    vi.stubEnv("RETENTION_JOB_SECRET", "a".repeat(32));

    expect(getServerEnv().RETENTION_JOB_SECRET).toHaveLength(32);
  });

  it("rejects a client Paddle environment that does not match the server environment", () => {
    stubRequiredEnvironment();
    vi.stubEnv("NEXT_PUBLIC_PADDLE_ENV", "production");

    expect(() => getServerEnv()).toThrow("PADDLE_ENV and NEXT_PUBLIC_PADDLE_ENV");
  });
});
