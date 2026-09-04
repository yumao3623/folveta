import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("course-materials"),
  MODEL_PROVIDER: z.literal("openai").default("openai"),
  OPENAI_BASE_URL: z.url().default("https://api.openai.com/v1"),
  OPENAI_API_KEY: z.string().min(1),
  MODEL_TOPIC_EXTRACT: z.string().min(1),
  MODEL_TOPIC_MERGE: z.string().min(1),
  MODEL_GUIDE: z.string().min(1),
  MODEL_GROUNDING_VERIFY: z.string().min(1),
  MODEL_QUICK_CHECK: z.string().min(1),
  MODEL_QUESTION_VERIFY: z.string().min(1),
  MODEL_CONTEXT_WINDOW_TOKENS: z.coerce.number().int().positive().default(128_000),
  GATEWAY_MAX_INPUT_TOKENS: z.coerce.number().int().positive().default(80_000),
  AI_GENERATION_WORKFLOW_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  GENERATION_V2_RUNTIME_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  GENERATION_V2_PRODUCT_ENABLED: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  CRON_SECRET: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(32).optional(),
  ),
  PROMPT_VERSION: z.string().min(1).default("phase1-v1"),
  GUIDE_SCHEMA_VERSION: z.literal("1.0").default("1.0"),
  QUICK_CHECK_SCHEMA_VERSION: z.literal("1.0").default("1.0"),
  SESSION_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  RETENTION_JOB_SECRET: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().min(32).optional(),
  ),
  PADDLE_ENV: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["sandbox", "live"]).optional(),
  ),
  NEXT_PUBLIC_PADDLE_ENV: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.enum(["sandbox", "production"]).default("sandbox"),
  ),
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: z.string().min(1).optional(),
  PADDLE_API_KEY: z.string().min(1).optional(),
  PADDLE_NOTIFICATION_WEBHOOK_SECRET: z.string().min(1).optional(),
  PADDLE_PRODUCT_ID: z.string().regex(/^pro_[a-z0-9]{26}$/).optional(),
  PADDLE_PRICE_ID: z.string().regex(/^pri_[a-z0-9]{26}$/).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Missing or invalid server environment variables: ${keys}`);
  }
  const expectedPublicPaddleEnvironment = parsed.data.PADDLE_ENV === "sandbox" ? "sandbox" : "production";
  if ((!parsed.data.PADDLE_ENV && parsed.data.NEXT_PUBLIC_PADDLE_ENV === "production")
    || (parsed.data.PADDLE_ENV && parsed.data.NEXT_PUBLIC_PADDLE_ENV !== expectedPublicPaddleEnvironment)) {
    throw new Error("PADDLE_ENV and NEXT_PUBLIC_PADDLE_ENV must describe the same Paddle environment.");
  }
  return parsed.data;
}

export function hasPublicSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
