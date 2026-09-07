import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { claimCurrentAnonymousSession } from "@/lib/server/auth";
import { getSupabaseAuth } from "@/lib/server/supabase-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const recovery = next === "/auth/reset-password";
  const errorPath = recovery
    ? "/auth/reset-password?error=This+password+reset+link+is+invalid+or+expired."
    : "/auth?error=The+confirmation+link+is+invalid+or+expired.";
  if (!code) {
    return NextResponse.redirect(new URL(errorPath, url));
  }
  const supabase = await getSupabaseAuth();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const failurePath = recovery
      ? "/auth/reset-password?error=This+password+reset+link+could+not+be+completed."
      : "/auth?error=The+confirmation+link+could+not+be+completed.";
    return NextResponse.redirect(new URL(failurePath, url));
  }
  await claimCurrentAnonymousSession();
  return NextResponse.redirect(new URL(next, url));
}
