import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isInvalidAuthSessionError } from "@/lib/auth-errors";
import type { Database } from "@/lib/server/database.types";
import { isSupabaseAuthSessionCookie } from "@/lib/supabase-cookies";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/.well-known/workflow/")) {
    return NextResponse.next({ request });
  }
  const authCookies = request.cookies.getAll().filter(({ name }) => isSupabaseAuthSessionCookie(name));
  if (authCookies.length === 0) return NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { error } = await supabase.auth.getUser();
  if (error && isInvalidAuthSessionError(error)) {
    authCookies.forEach(({ name }) => request.cookies.delete(name));
    response = NextResponse.next({ request });
    authCookies.forEach(({ name }) => response.cookies.delete(name));
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
