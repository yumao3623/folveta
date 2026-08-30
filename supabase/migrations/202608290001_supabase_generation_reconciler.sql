-- Supabase-owned minute scheduler bridge for the Vercel Workflow dispatcher.
-- The database remains authoritative for dispatch/watchdog state; this wrapper
-- only submits an authenticated, opaque request to the existing Route Handler.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;

create schema if not exists private;

create or replace function private.invoke_generation_reconciler()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_url
  from vault.decrypted_secrets
  where name = 'folveta_generation_reconcile_url';

  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'folveta_generation_cron_secret';

  if nullif(trim(coalesce(v_url, '')), '') is null
     or nullif(trim(coalesce(v_secret, '')), '') is null then
    raise exception using
      errcode = 'P0001',
      message = 'GENERATION_RECONCILE_SCHEDULER_SECRET_MISSING';
  end if;

  select net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 55000
  )
    into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.invoke_generation_reconciler()
  from public, anon, authenticated, service_role;
