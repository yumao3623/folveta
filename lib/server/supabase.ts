import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/server/database.types";

let cachedClient: ReturnType<typeof createClient<Database>> | undefined;

const POSTGREST_CLOCK_SKEW_CODE = "PGRST303";
const POSTGREST_CLOCK_SKEW_MESSAGE = "JWT issued at future";
const POSTGREST_CLOCK_SKEW_RETRY_MS = 1_000;

function requestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
}

async function isPostgrestClockSkew(response: Response, method: string) {
  if (response.status !== 401) return false;

  if (method === "HEAD") {
    return response.headers.get("proxy-status")?.includes(POSTGREST_CLOCK_SKEW_CODE) ?? false;
  }

  try {
    const body = await response.clone().json() as { code?: unknown; message?: unknown };
    return body.code === POSTGREST_CLOCK_SKEW_CODE && body.message === POSTGREST_CLOCK_SKEW_MESSAGE;
  } catch {
    return false;
  }
}

export async function supabaseAdminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const method = requestMethod(input, init);
  const response = await fetch(input, init);
  if ((method !== "GET" && method !== "HEAD") || !(await isPostgrestClockSkew(response, method))) {
    return response;
  }

  await new Promise((resolve) => setTimeout(resolve, POSTGREST_CLOCK_SKEW_RETRY_MS));
  return fetch(input, init);
}

export function getSupabaseAdmin() {
  if (!cachedClient) {
    const env = getServerEnv();
    cachedClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: supabaseAdminFetch },
      },
    );
  }
  return cachedClient;
}
