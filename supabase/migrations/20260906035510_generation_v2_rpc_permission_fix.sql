-- The original persistence migration revoked PUBLIC only. Supabase's public
-- schema exposure can leave explicit grants for API roles, so clear them by
-- role before restoring the server-only grant.
revoke all on function public.create_or_join_generation_v2_request(uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_or_join_generation_v2_request(uuid, text, text, text, text, jsonb)
  to service_role;
