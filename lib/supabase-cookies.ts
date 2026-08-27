const SUPABASE_AUTH_SESSION_COOKIE = /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/i;

export function isSupabaseAuthSessionCookie(name: string) {
  return SUPABASE_AUTH_SESSION_COOKIE.test(name);
}
