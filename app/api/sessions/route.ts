import { cookies } from "next/headers";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/config";
import { createSessionToken, hashValue } from "@/lib/server/crypto";
import { errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getCurrentUser } from "@/lib/server/auth";
import { enforceRateLimit, requestRateLimitKey } from "@/lib/server/rate-limit";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(140).default("Untitled Study Guide"),
}).strict();

export async function POST(request: Request) {
  try {
    await enforceRateLimit({ scope: "session.create", key: requestRateLimitKey(request), limit: 8, windowSeconds: 3600 });
    const input = createSessionSchema.parse(await request.json().catch(() => ({})));
    const user = await getCurrentUser();
    const token = user ? null : createSessionToken();
    const env = getServerEnv();
    const expiresAt = user ? null : new Date(Date.now() + env.SESSION_RETENTION_DAYS * 86_400_000);
    const { data, error } = await getSupabaseAdmin()
      .from("preparation_sessions")
      .insert({
        access_token_hash: token ? hashValue(token) : null,
        owner_user_id: user?.id ?? null,
        title: input.title,
        expires_at: expiresAt?.toISOString() ?? null,
      })
      .select("id, title, state, expires_at")
      .single();
    if (error) throw error;

    if (token && expiresAt) {
      const store = await cookies();
      store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      });
    }

    return Response.json({ session: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
