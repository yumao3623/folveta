import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/lib/server/database.types";

let cachedClient: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseAdmin() {
  if (!cachedClient) {
    const env = getServerEnv();
    cachedClient = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
  }
  return cachedClient;
}
