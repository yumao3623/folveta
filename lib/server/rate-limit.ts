import { hashValue } from "@/lib/server/crypto";
import { AppError } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type RateLimit = {
  scope: string;
  limit: number;
  windowSeconds: number;
  key: string;
};

function clientFingerprint(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = vercelForwardedFor || forwardedFor;
  // Vercel supplies a client IP in production. The fallback avoids storing a
  // raw browser identifier if an upstream proxy strips it.
  return hashValue(clientIp || headers.get("user-agent") || "unknown-client");
}

export function requestRateLimitKey(request: Request) {
  return clientFingerprint(request.headers);
}

export function sessionRateLimitKey(sessionId: string) {
  return hashValue(`session:${sessionId}`);
}

export async function enforceRateLimit(rateLimit: RateLimit) {
  const { data, error } = await getSupabaseAdmin().rpc("consume_rate_limit", {
    p_scope: rateLimit.scope,
    p_key_hash: rateLimit.key,
    p_window_seconds: rateLimit.windowSeconds,
    p_limit: rateLimit.limit,
  });
  if (error || !data?.[0]) {
    console.error(JSON.stringify({ event: "rate_limit_unavailable", scope: rateLimit.scope, code: error?.code ?? null }));
    throw new AppError("RATE_LIMIT_UNAVAILABLE", "This request cannot be processed right now. Please retry shortly.", 503);
  }
  const result = data[0];
  if (!result.allowed) {
    console.warn(JSON.stringify({ event: "rate_limit_exceeded", scope: rateLimit.scope }));
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please wait before trying again.",
      429,
      { retryAfterSeconds: result.retry_after_seconds },
    );
  }
}
