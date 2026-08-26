-- Product-3 Gate: close the anonymous execute grant left by Supabase defaults.

revoke all on function public.claim_current_anonymous_session(text) from public;
revoke all on function public.claim_current_anonymous_session(text) from anon;
grant execute on function public.claim_current_anonymous_session(text) to authenticated;
