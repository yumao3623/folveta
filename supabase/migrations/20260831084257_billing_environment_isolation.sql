-- Paddle Sandbox and Live are separate provider namespaces even when they
-- deliberately share one Folveta Supabase project. Legacy NULL rows do not
-- grant entitlement because every runtime query filters a concrete namespace.

alter table public.billing_customers
  add column if not exists billing_environment text;
alter table public.billing_subscriptions
  add column if not exists billing_environment text;
alter table public.billing_usage_periods
  add column if not exists billing_environment text;
alter table public.billing_generation_reservations
  add column if not exists billing_environment text;
alter table public.billing_webhook_events
  add column if not exists billing_environment text;
alter table public.generation_executions
  add column if not exists billing_environment text;
alter table public.billing_customers
  add column if not exists id uuid default public.gen_random_uuid();
alter table public.billing_subscriptions
  add column if not exists id uuid default public.gen_random_uuid();
alter table public.billing_usage_periods
  add column if not exists id uuid default public.gen_random_uuid();
alter table public.billing_webhook_events
  add column if not exists id uuid default public.gen_random_uuid();

alter table public.billing_customers
  add constraint billing_customers_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));
alter table public.billing_subscriptions
  add constraint billing_subscriptions_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));
alter table public.billing_usage_periods
  add constraint billing_usage_periods_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));
alter table public.billing_generation_reservations
  add constraint billing_generation_reservations_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));
alter table public.billing_webhook_events
  add constraint billing_webhook_events_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));
alter table public.generation_executions
  add constraint generation_executions_billing_environment_check
  check (billing_environment is null or billing_environment in ('sandbox', 'live'));

alter table public.billing_customers drop constraint if exists billing_customers_pkey;
alter table public.billing_customers drop constraint if exists billing_customers_paddle_customer_id_key;
alter table public.billing_customers alter column id set not null;
alter table public.billing_customers add primary key (id);
alter table public.billing_customers
  add constraint billing_customers_environment_customer_key
  unique (billing_environment, paddle_customer_id);
alter table public.billing_customers
  add constraint billing_customers_environment_user_key
  unique (billing_environment, user_id);

alter table public.billing_subscriptions drop constraint if exists billing_subscriptions_pkey;
alter table public.billing_subscriptions alter column id set not null;
alter table public.billing_subscriptions add primary key (id);
alter table public.billing_subscriptions
  add constraint billing_subscriptions_environment_subscription_key
  unique (billing_environment, paddle_subscription_id);

alter table public.billing_usage_periods drop constraint if exists billing_usage_periods_pkey;
alter table public.billing_usage_periods alter column id set not null;
alter table public.billing_usage_periods add primary key (id);
alter table public.billing_usage_periods
  add constraint billing_usage_periods_environment_user_period_key
  unique (billing_environment, user_id, period_start);
-- PostgreSQL treats NULL values as distinct in a regular unique constraint.
-- Retain one legacy/free usage row for the deployed 13-argument generation RPC
-- until the formal app is deliberately moved to PADDLE_ENV=live.
create unique index billing_usage_periods_legacy_user_period_key
  on public.billing_usage_periods(user_id, period_start)
  where billing_environment is null;

alter table public.billing_webhook_events drop constraint if exists billing_webhook_events_pkey;
alter table public.billing_webhook_events alter column id set not null;
alter table public.billing_webhook_events add primary key (id);
alter table public.billing_webhook_events
  add constraint billing_webhook_events_environment_event_key
  unique (billing_environment, event_id);

create index billing_subscriptions_environment_user_idx
  on public.billing_subscriptions(billing_environment, user_id, status);
create index billing_subscriptions_environment_customer_idx
  on public.billing_subscriptions(billing_environment, paddle_customer_id);
create index billing_generation_reservations_environment_user_idx
  on public.billing_generation_reservations(billing_environment, user_id, period_start, status);

create function public.billing_quota_for_user(
  p_user_id uuid,
  p_billing_environment text
)
returns table(plan text, quota integer)
language sql
stable
security definer
set search_path = public
as $$
  select case when p_billing_environment in ('sandbox', 'live') and exists (
    select 1 from public.billing_subscriptions
    where user_id = p_user_id
      and billing_environment = p_billing_environment
      and status in ('active', 'trialing')
  ) then 'pro' else 'free' end,
  case when p_billing_environment in ('sandbox', 'live') and exists (
    select 1 from public.billing_subscriptions
    where user_id = p_user_id
      and billing_environment = p_billing_environment
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
  if new.billing_environment is not null
     and new.billing_environment not in ('sandbox', 'live') then
    raise exception 'billing_environment_required' using errcode = '22023';
  end if;

  select owner_user_id into v_user_id
  from public.preparation_sessions
  where id = new.session_id;

  -- Anonymous sessions remain usable before account claim.
  if v_user_id is null then
    return new;
  end if;

  if new.billing_environment is null then
    -- Compatibility path for the existing formal deployment. It is always
    -- Free, so a Sandbox/Live subscription can never affect this path.
    v_plan := 'free';
    v_quota := 2;
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
    from public.billing_quota_for_user(v_user_id, new.billing_environment);

    insert into public.billing_usage_periods (
      billing_environment, user_id, period_start, period_end, plan, quota
    ) values (
      new.billing_environment, v_user_id, v_period_start, v_period_end, v_plan, v_quota
    )
    on conflict (billing_environment, user_id, period_start) do update
      set period_end = excluded.period_end,
          plan = excluded.plan,
          quota = excluded.quota,
          updated_at = now();
  end if;

  select * into v_usage
  from public.billing_usage_periods
  where billing_environment is not distinct from new.billing_environment
    and user_id = v_user_id
    and period_start = v_period_start
  for update;

  if v_usage.consumed + v_usage.reserved >= v_usage.quota then
    raise exception 'billing_quota_exceeded' using errcode = 'P0001';
  end if;

  insert into public.billing_generation_reservations (
    generation_run_id, billing_environment, user_id, period_start, status
  ) values (
    new.id, new.billing_environment, v_user_id, v_period_start, 'reserved'
  );

  update public.billing_usage_periods
  set reserved = reserved + 1, updated_at = now()
  where billing_environment is not distinct from new.billing_environment
    and user_id = v_user_id
    and period_start = v_period_start;

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
    where billing_environment is not distinct from v_reservation.billing_environment
      and user_id = v_reservation.user_id
      and period_start = v_reservation.period_start;
  else
    update public.billing_generation_reservations
    set status = 'released', updated_at = now()
    where generation_run_id = new.id;
    update public.billing_usage_periods
    set reserved = greatest(0, reserved - 1), updated_at = now()
    where billing_environment is not distinct from v_reservation.billing_environment
      and user_id = v_reservation.user_id
      and period_start = v_reservation.period_start;
  end if;

  return new;
end;
$$;

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
    'subscriptionStatus', null
  )
  from (select p_user_id as user_id) input
  left join public.billing_usage_periods period
    on period.user_id = input.user_id
   and period.billing_environment is null
   and period.period_start = public.billing_period_start();
$$;

create or replace function public.billing_usage_summary(
  p_user_id uuid,
  p_billing_environment text
)
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
      where user_id = p_user_id
        and billing_environment = p_billing_environment
        and status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'completed')
      order by updated_at desc limit 1
    )
  )
  from (select p_user_id as user_id) input
  left join public.billing_usage_periods period
    on period.user_id = input.user_id
   and period.billing_environment = p_billing_environment
   and period.period_start = public.billing_period_start()
  where p_billing_environment in ('sandbox', 'live');
$$;

create or replace function public.claim_generation_execution(
  p_session_id uuid,
  p_source_snapshot_hash text,
  p_execution_contract_hash text,
  p_provider text,
  p_model text,
  p_prompt_version text,
  p_schema_version text,
  p_pipeline_version text,
  p_parsing_contract_version text,
  p_plan_operation_version text,
  p_plan_operation_kind text,
  p_plan_operation_input_hash text,
  p_plan_input_json jsonb,
  p_billing_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.preparation_sessions%rowtype;
  v_existing public.generation_executions%rowtype;
  v_generation_run_id uuid;
  v_plan_operation_id uuid;
  v_span_count bigint;
  v_database_snapshot_hash text;
begin
  perform pg_advisory_xact_lock(76498231);

  if p_source_snapshot_hash is null or p_source_snapshot_hash !~ '^[0-9a-f]{64}$'
     or p_execution_contract_hash is null or p_execution_contract_hash !~ '^[0-9a-f]{64}$'
     or p_plan_input_json is null
     or jsonb_typeof(p_plan_input_json) not in ('object', 'array') then
    raise exception 'invalid_generation_hash' using errcode = '22023';
  end if;
  if nullif(btrim(p_provider), '') is null
     or nullif(btrim(p_model), '') is null
     or nullif(btrim(p_prompt_version), '') is null
     or nullif(btrim(p_schema_version), '') is null
     or nullif(btrim(p_pipeline_version), '') is null
     or nullif(btrim(p_parsing_contract_version), '') is null
     or nullif(btrim(p_plan_operation_version), '') is null
     or p_plan_operation_kind not in ('plan_topics', 'extract_topics')
     or p_billing_environment not in ('sandbox', 'live') then
    raise exception 'invalid_generation_contract' using errcode = '22023';
  end if;

  select * into v_session
  from public.preparation_sessions
  where id = p_session_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'generation_session_not_found' using errcode = 'P0002';
  end if;
  if v_session.state not in ('ready', 'ready_with_gaps', 'failed_retryable', 'failed_terminal', 'guide_ready') then
    raise exception 'generation_session_not_ready' using errcode = '55000';
  end if;

  select count(*), encode(extensions.digest(string_agg(span.content_hash, ':' order by span.content_hash), 'sha256'), 'hex')
  into v_span_count, v_database_snapshot_hash
  from public.source_spans as span
  join public.sources as source
    on source.id = span.source_id
   and source.status in ('ready', 'ready_with_gaps')
  where span.session_id = p_session_id;

  if v_span_count = 0 or v_database_snapshot_hash is null then
    raise exception 'generation_sources_empty' using errcode = '22023';
  end if;
  if v_database_snapshot_hash <> p_source_snapshot_hash then
    raise exception 'generation_source_snapshot_mismatch' using errcode = '55000';
  end if;

  select * into v_existing
  from public.generation_executions
  where session_id = p_session_id
    and status in ('queued', 'running')
  order by requested_at desc
  limit 1
  for update;

  if found then
    if v_existing.billing_environment is distinct from p_billing_environment then
      raise exception 'billing_environment_mismatch' using errcode = '55000';
    end if;
    if v_existing.source_snapshot_hash = p_source_snapshot_hash
       and v_existing.execution_contract_hash = p_execution_contract_hash then
      update public.preparation_sessions
      set current_generation_run_id = v_existing.id,
          updated_at = now()
      where id = p_session_id;
      return jsonb_build_object(
        'status', 'reused',
        'generationRunId', v_existing.id,
        'dispatchState', v_existing.dispatch_state
      );
    end if;
    raise exception 'incompatible_generation_already_active' using errcode = '55000';
  end if;

  v_generation_run_id := public.gen_random_uuid();
  v_plan_operation_id := public.gen_random_uuid();

  insert into public.generation_executions (
    id, session_id, source_snapshot_hash, execution_contract_hash,
    provider, model, prompt_version, schema_version,
    pipeline_version, parsing_contract_version, billing_environment
  ) values (
    v_generation_run_id, p_session_id, p_source_snapshot_hash,
    p_execution_contract_hash, p_provider, p_model, p_prompt_version,
    p_schema_version, p_pipeline_version, p_parsing_contract_version,
    p_billing_environment
  );

  insert into public.generation_operations (
    id, generation_run_id, operation_key, operation_kind, operation_version,
    status, input_json, operation_input_hash, ready_at
  ) values (
    v_plan_operation_id, v_generation_run_id, 'plan:root', p_plan_operation_kind,
    p_plan_operation_version, 'ready', p_plan_input_json,
    encode(extensions.digest(p_plan_input_json::text, 'sha256'), 'hex'), now()
  );

  update public.preparation_sessions
  set current_generation_run_id = v_generation_run_id,
      state = 'extracting_topics',
      current_stage = 'extracting_topics',
      failed_stage = null,
      error_code = null,
      error_message = null,
      updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'status', 'created',
    'generationRunId', v_generation_run_id,
    'planOperationId', v_plan_operation_id,
    'dispatchState', 'dispatch_pending'
  );
end;
$$;

create or replace function public.billing_quota_for_user(p_user_id uuid)
returns table(plan text, quota integer)
language sql
stable
security definer
set search_path = public
as $$
  select 'free'::text, 2;
$$;

revoke all on function public.billing_quota_for_user(uuid, text) from public, anon, authenticated;
revoke all on function public.billing_usage_summary(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_usage_summary(uuid, text) to service_role;
revoke all on function public.claim_generation_execution(
  uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb, text
) from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_execution(
  uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb, text
) to service_role;
