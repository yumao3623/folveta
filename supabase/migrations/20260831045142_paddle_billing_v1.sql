-- Paddle Billing v1 Sandbox integration.
-- Provider state is mirrored locally; Paddle remains the payment system of record.

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  paddle_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  paddle_subscription_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  paddle_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled', 'completed')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  scheduled_change jsonb,
  cancel_at_period_end boolean not null default false,
  next_billed_at timestamptz,
  last_event_occurred_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_idx
  on public.billing_subscriptions(user_id, status);
create index if not exists billing_subscriptions_customer_idx
  on public.billing_subscriptions(paddle_customer_id);

create table if not exists public.billing_usage_periods (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  plan text not null check (plan in ('free', 'pro')),
  quota integer not null check (quota > 0),
  consumed integer not null default 0 check (consumed >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, period_start)
);

create table if not exists public.billing_generation_reservations (
  generation_run_id uuid primary key references public.generation_executions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  status text not null check (status in ('reserved', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_generation_reservations_user_idx
  on public.billing_generation_reservations(user_id, period_start, status);

create table if not exists public.billing_webhook_events (
  event_id text primary key,
  event_type text not null,
  occurred_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'processed' check (status in ('processed', 'ignored', 'failed'))
);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_usage_periods enable row level security;
alter table public.billing_generation_reservations enable row level security;
alter table public.billing_webhook_events enable row level security;

drop policy if exists "Users read own billing customer" on public.billing_customers;
create policy "Users read own billing customer"
  on public.billing_customers for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own billing subscriptions" on public.billing_subscriptions;
create policy "Users read own billing subscriptions"
  on public.billing_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own billing usage" on public.billing_usage_periods;
create policy "Users read own billing usage"
  on public.billing_usage_periods for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users read own billing reservations" on public.billing_generation_reservations;
create policy "Users read own billing reservations"
  on public.billing_generation_reservations for select to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.billing_period_start()
returns date
language sql
stable
as $$
  select date_trunc('month', now())::date;
$$;

create or replace function public.billing_quota_for_user(p_user_id uuid)
returns table(plan text, quota integer)
language sql
stable
security definer
set search_path = public
as $$
  select case when exists (
    select 1 from public.billing_subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
  ) then 'pro' else 'free' end,
  case when exists (
    select 1 from public.billing_subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
  ) then 10 else 2 end;
$$;

create or replace function public.billing_reserve_generation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_period_start date := public.billing_period_start();
  v_period_end date := (v_period_start + interval '1 month')::date;
  v_plan text;
  v_quota integer;
  v_usage public.billing_usage_periods%rowtype;
begin
  select owner_user_id into v_user_id
  from public.preparation_sessions
  where id = new.session_id;

  -- Anonymous sessions remain usable before account claim.
  if v_user_id is null then
    return new;
  end if;

  select plan, quota into v_plan, v_quota
  from public.billing_quota_for_user(v_user_id);

  insert into public.billing_usage_periods (user_id, period_start, period_end, plan, quota)
  values (v_user_id, v_period_start, v_period_end, v_plan, v_quota)
  on conflict (user_id, period_start) do update
    set period_end = excluded.period_end,
        plan = excluded.plan,
        quota = excluded.quota,
        updated_at = now();

  select * into v_usage
  from public.billing_usage_periods
  where user_id = v_user_id and period_start = v_period_start
  for update;

  if v_usage.consumed + v_usage.reserved >= v_usage.quota then
    raise exception 'billing_quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.billing_generation_reservations (generation_run_id, user_id, period_start, status)
  values (new.id, v_user_id, v_period_start, 'reserved');

  update public.billing_usage_periods
  set reserved = reserved + 1, updated_at = now()
  where user_id = v_user_id and period_start = v_period_start;

  return new;
end;
$$;

create or replace function public.billing_settle_generation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.billing_generation_reservations%rowtype;
begin
  if old.status = new.status or new.status not in ('succeeded', 'failed') then
    return new;
  end if;

  select * into v_reservation
  from public.billing_generation_reservations
  where generation_run_id = new.id and status = 'reserved'
  for update;

  if not found then
    return new;
  end if;

  if new.status = 'succeeded' then
    update public.billing_generation_reservations
    set status = 'consumed', updated_at = now()
    where generation_run_id = new.id;
    update public.billing_usage_periods
    set reserved = greatest(0, reserved - 1), consumed = consumed + 1, updated_at = now()
    where user_id = v_reservation.user_id and period_start = v_reservation.period_start;
  else
    update public.billing_generation_reservations
    set status = 'released', updated_at = now()
    where generation_run_id = new.id;
    update public.billing_usage_periods
    set reserved = greatest(0, reserved - 1), updated_at = now()
    where user_id = v_reservation.user_id and period_start = v_reservation.period_start;
  end if;

  return new;
end;
$$;

drop trigger if exists billing_reserve_generation on public.generation_executions;
create trigger billing_reserve_generation
  before insert on public.generation_executions
  for each row execute function public.billing_reserve_generation();

drop trigger if exists billing_settle_generation on public.generation_executions;
create trigger billing_settle_generation
  after update of status on public.generation_executions
  for each row execute function public.billing_settle_generation();

create or replace function public.billing_usage_summary(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', coalesce(period.plan, 'free'),
    'quota', coalesce(period.quota, 2),
    'consumed', coalesce(period.consumed, 0),
    'reserved', coalesce(period.reserved, 0),
    'remaining', greatest(0, coalesce(period.quota, 2) - coalesce(period.consumed, 0) - coalesce(period.reserved, 0)),
    'periodStart', coalesce(period.period_start, public.billing_period_start()),
    'periodEnd', coalesce(period.period_end, (public.billing_period_start() + interval '1 month')::date),
    'subscriptionStatus', (
      select status from public.billing_subscriptions
      where user_id = p_user_id and status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'completed')
      order by updated_at desc limit 1
    )
  )
  from (select p_user_id as user_id) input
  left join public.billing_usage_periods period
    on period.user_id = input.user_id
   and period.period_start = public.billing_period_start();
$$;

revoke all on function public.billing_period_start() from public, anon, authenticated;
revoke all on function public.billing_quota_for_user(uuid) from public, anon, authenticated;
revoke all on function public.billing_reserve_generation() from public, anon, authenticated;
revoke all on function public.billing_settle_generation() from public, anon, authenticated;
revoke all on function public.billing_usage_summary(uuid) from public, anon;
grant execute on function public.billing_usage_summary(uuid) to authenticated;
