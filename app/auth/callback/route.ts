import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { claimCurrentAnonymousSession } from "@/lib/server/auth";
import { getSupabaseAuth } from "@/lib/server/supabase-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  if (!code) {
    return NextResponse.redirect(new URL("/auth?error=The+confirmation+link+is+invalid+or+expired.", url));
  }
  const supabase = await getSupabaseAuth();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/auth?error=The+confirmation+link+could+not+be+completed.", url));
  }
  await claimCurrentAnonymousSession();
  return NextResponse.redirect(new URL(next, url));
}
