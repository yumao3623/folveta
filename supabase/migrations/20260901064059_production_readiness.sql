-- Production readiness: durable, server-only fixed-window rate limits.
-- Keys are SHA-256 fingerprints produced by the application; raw IP addresses
-- and user identifiers are never stored in this table.
create table if not exists public.rate_limit_windows (
  scope text not null check (scope ~ '^[a-z0-9_.-]{1,80}$'),
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  primary key (scope, key_hash, window_started_at)
);

create index if not exists rate_limit_windows_expiry_idx
  on public.rate_limit_windows(window_started_at);

alter table public.rate_limit_windows enable row level security;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_window_seconds integer,
  p_limit integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_count integer;
  v_retry_after_seconds integer;
begin
  if p_scope !~ '^[a-z0-9_.-]{1,80}$' then
    raise exception 'invalid rate-limit scope' using errcode = '22023';
  end if;
  if p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid rate-limit key' using errcode = '22023';
  end if;
  if p_window_seconds < 10 or p_window_seconds > 86400 or p_limit < 1 or p_limit > 10000 then
    raise exception 'invalid rate-limit window or limit' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);
  v_retry_after_seconds := greatest(1, ceil(extract(epoch from (v_window_started_at + make_interval(secs => p_window_seconds)) - v_now))::integer);

  insert into public.rate_limit_windows (scope, key_hash, window_started_at, attempt_count)
  values (p_scope, p_key_hash, v_window_started_at, 1)
  on conflict (scope, key_hash, window_started_at) do update
    set attempt_count = least(public.rate_limit_windows.attempt_count + 1, p_limit + 1)
  returning attempt_count into v_count;

  return query select v_count <= p_limit, v_retry_after_seconds;
end;
$$;

revoke all on table public.rate_limit_windows from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
