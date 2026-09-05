import { getServerEnv } from "@/lib/env";

export type GenerationV2RolloutSubject = {
  id: string;
  owner_user_id: string | null;
};

function parseAllowlist(value: string) {
  return new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean));
}

export function generationV2RolloutMatches(subject: GenerationV2RolloutSubject, allowlist: string) {
  const entries = parseAllowlist(allowlist);
  return entries.has("*") || entries.has(subject.id) || (subject.owner_user_id ? entries.has(subject.owner_user_id) : false);
}

export function isGenerationV2WriteEnabled(subject: GenerationV2RolloutSubject) {
  const env = getServerEnv();
  return env.GENERATION_V2_RUNTIME_ENABLED
    && env.GENERATION_V2_PRODUCT_ENABLED
    && generationV2RolloutMatches(subject, env.GENERATION_V2_ROLLOUT_ALLOWLIST);
}

export function isGenerationV2SchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "42P01" || code === "PGRST205";
}
