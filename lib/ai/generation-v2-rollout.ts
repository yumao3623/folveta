import { getServerEnv } from "@/lib/env";

export function isGenerationV2WriteEnabled() {
  return getServerEnv().GENERATION_V2_RUNTIME_ENABLED;
}

export function isGenerationV2SchemaUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === "42P01" || code === "PGRST205";
}
