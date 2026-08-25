import { cookies } from "next/headers";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { SESSION_COOKIE } from "@/lib/config";
import { createSessionToken, hashValue } from "@/lib/server/crypto";
import { errorResponse } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(140).default("Untitled Study Guide"),
}).strict();

export async function POST(request: Request) {
  try {
    const input = createSessionSchema.parse(await request.json().catch(() => ({})));
    const token = createSessionToken();
    const env = getServerEnv();
    const expiresAt = new Date(Date.now() + env.SESSION_RETENTION_DAYS * 86_400_000);
    const { data, error } = await getSupabaseAdmin()
      .from("preparation_sessions")
      .insert({
        access_token_hash: hashValue(token),
        title: input.title,
        expires_at: expiresAt.toISOString(),
      })
      .select("id, title, state, expires_at")
      .single();
    if (error) throw error;

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return Response.json({ session: data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
