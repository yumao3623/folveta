-- Billing webhook inserts use the server-only Supabase service role. The
-- environment-isolation migration added UUID defaults that call this wrapper;
-- preserve its public lock-down while allowing that server-side insert path.
grant execute on function public.gen_random_uuid() to service_role;
