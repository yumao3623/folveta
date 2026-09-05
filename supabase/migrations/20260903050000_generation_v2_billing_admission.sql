-- Generation v2 has its own request identity, so it cannot use the v1
-- generation_executions trigger as a billing compatibility adapter.

drop function if exists public.billing_reserve_generation_v2(uuid, text);
drop function if exists public.billing_settle_generation_v2(uuid, text);

create table public.billing_generation_v2_reservations (
  request_id uuid primary key references public.generation_v2_requests(id) on delete cascade,
  billing_environment text,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  status text not null check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_generation_v2_reservations_environment_check
    check (billing_environment is null or billing_environment in ('sandbox', 'live'))
);

create index billing_generation_v2_reservations_user_idx
  on public.billing_generation_v2_reservations(billing_environment, user_id, period_start, status);

alter table public.billing_generation_v2_reservations enable row level security;

create policy "Users read own v2 billing reservations"
  on public.billing_generation_v2_reservations for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.billing_reserve_generation_v2(
  p_request_id uuid,
  p_billing_environment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_user_id uuid;
  v_period_start date := public.billing_period_start();
  v_period_end date := (v_period_start + interval '1 month')::date;
  v_plan text;
  v_quota integer;
  v_usage public.billing_usage_periods%rowtype;
  v_existing public.billing_generation_v2_reservations%rowtype;
begin
  if p_billing_environment is not null
     and p_billing_environment not in ('sandbox', 'live') then
    raise exception 'billing_environment_required' using errcode = '22023';
  end if;

  select request.session_id, session.owner_user_id
    into v_session_id, v_user_id
  from public.generation_v2_requests request
  join public.preparation_sessions session on session.id = request.session_id
  where request.id = p_request_id
  for update of request, session;

  if v_session_id is null then
    raise exception 'generation_v2_request_not_found' using errcode = 'P0002';
  end if;

  select * into v_existing
  from public.billing_generation_v2_reservations
  where request_id = p_request_id
  for update;
  if found then
    return jsonb_build_object('status', v_existing.status);
  end if;

  -- Anonymous sessions retain the existing pre-account generation behavior.
  if v_user_id is null then
    return jsonb_build_object('status', 'skipped');
  end if;

  if p_billing_environment is null then
    select plan, quota into v_plan, v_quota
    from public.billing_quota_for_user(v_user_id);

    insert into public.billing_usage_periods (
      billing_environment, user_id, period_start, period_end, plan, quota
    ) values (
      null, v_user_id, v_period_start, v_period_end, v_plan, v_quota
    )
    on conflict (user_id, period_start) where billing_environment is null do update
      set period_end = excluded.period_end,
          plan = excluded.plan,
          quota = excluded.quota,
          updated_at = now();
  else
    select plan, quota into v_plan, v_quota
    from public.billing_quota_for_user(v_user_id, p_billing_environment);

    insert into public.billing_usage_periods (
      billing_environment, user_id, period_start, period_end, plan, quota
    ) values (
      p_billing_environment, v_user_id, v_period_start, v_period_end, v_plan, v_quota
    )
    on conflict (billing_environment, user_id, period_start) do update
      set period_end = excluded.period_end,
          plan = excluded.plan,
          quota = excluded.quota,
          updated_at = now();
  end if;

  select * into v_usage
  from public.billing_usage_periods
  where billing_environment is not distinct from p_billing_environment
    and user_id = v_user_id
    and period_start = v_period_start
  for update;

  if v_usage.consumed + v_usage.reserved >= v_usage.quota then
    raise exception 'billing_quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.billing_generation_v2_reservations (
    request_id, billing_environment, user_id, period_start, status
  ) values (
    p_request_id, p_billing_environment, v_user_id, v_period_start, 'reserved'
  );

  update public.billing_usage_periods
  set reserved = reserved + 1, updated_at = now()
  where billing_environment is not distinct from p_billing_environment
    and user_id = v_user_id
    and period_start = v_period_start;

  return jsonb_build_object('status', 'reserved');
end;
$$;

create or replace function public.billing_settle_generation_v2(
  p_request_id uuid,
  p_delivery_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.billing_generation_v2_reservations%rowtype;
begin
  if p_delivery_status not in ('complete', 'complete_with_gaps', 'failed_no_guide') then
    raise exception 'invalid v2 billing settlement status' using errcode = '22023';
  end if;

  select * into v_reservation
  from public.billing_generation_v2_reservations
  where request_id = p_request_id
  for update;

  if not found then
    return jsonb_build_object('status', 'skipped');
  end if;
  if v_reservation.status <> 'reserved' then
    return jsonb_build_object('status', v_reservation.status);
  end if;

  if p_delivery_status in ('complete', 'complete_with_gaps') then
    update public.billing_generation_v2_reservations
    set status = 'consumed', updated_at = now()
    where request_id = p_request_id;
    update public.billing_usage_periods
    set reserved = greatest(0, reserved - 1), consumed = consumed + 1, updated_at = now()
    where billing_environment is not distinct from v_reservation.billing_environment
      and user_id = v_reservation.user_id
      and period_start = v_reservation.period_start;
    return jsonb_build_object('status', 'consumed');
  end if;

  update public.billing_generation_v2_reservations
  set status = 'released', updated_at = now()
  where request_id = p_request_id;
  update public.billing_usage_periods
  set reserved = greatest(0, reserved - 1), updated_at = now()
  where billing_environment is not distinct from v_reservation.billing_environment
    and user_id = v_reservation.user_id
    and period_start = v_reservation.period_start;
  return jsonb_build_object('status', 'released');
end;
$$;

revoke all on function public.billing_reserve_generation_v2(uuid, text) from public, anon, authenticated;
revoke all on function public.billing_settle_generation_v2(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_reserve_generation_v2(uuid, text) to service_role;
grant execute on function public.billing_settle_generation_v2(uuid, text) to service_role;
