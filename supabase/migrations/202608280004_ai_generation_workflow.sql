-- Expand-only durable AI generation schema. The historical generation_runs
-- table keeps its model-attempt meaning until a later, separately deployed
-- cleanup migration.

create table public.generation_executions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  public_stage text not null default 'preparing' check (public_stage in (
    'preparing', 'planning', 'generating_guide', 'checking_grounding',
    'finalizing', 'complete', 'failed'
  )),
  source_snapshot_hash text not null check (source_snapshot_hash ~ '^[0-9a-f]{64}$'),
  execution_contract_hash text not null check (execution_contract_hash ~ '^[0-9a-f]{64}$'),
  provider text not null,
  model text not null,
  prompt_version text not null,
  schema_version text not null,
  pipeline_version text not null,
  parsing_contract_version text not null,
  retry_credits_remaining smallint not null default 4 check (retry_credits_remaining between 0 and 4),
  provider_invocations_used smallint not null default 0 check (provider_invocations_used between 0 and 40),
  provider_invocation_limit smallint not null default 40 check (provider_invocation_limit between 1 and 40),
  dispatch_state text not null default 'dispatch_pending' check (dispatch_state in (
    'dispatch_pending', 'dispatch_claimed', 'workflow_acked', 'running', 'succeeded', 'failed'
  )),
  dispatch_epoch integer not null default 0 check (dispatch_epoch >= 0),
  dispatch_token uuid,
  dispatch_attempt_count integer not null default 0 check (dispatch_attempt_count >= 0),
  dispatch_attempt_limit integer not null default 20 check (dispatch_attempt_limit between 1 and 100),
  dispatch_lease_expires_at timestamptz,
  next_dispatch_at timestamptz not null default now(),
  last_dispatch_at timestamptz,
  workflow_acknowledged_at timestamptz,
  last_progress_at timestamptz not null default now(),
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  hard_deadline_at timestamptz not null default (now() + interval '15 minutes'),
  failure_category text check (failure_category is null or failure_category in (
    'provider_transient', 'provider_unavailable', 'provider_protocol', 'model_refusal', 'invalid_output',
    'source_superseded', 'contract_mismatch', 'deadline', 'provider_exhausted',
    'workflow_infrastructure', 'internal'
  )),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,64}$'),
  retry_allowed boolean not null default false,
  support_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (provider_invocations_used <= provider_invocation_limit),
  check ((status in ('succeeded', 'failed')) = (completed_at is not null)),
  check ((status = 'succeeded') = (public_stage = 'complete') or status <> 'succeeded'),
  check ((status = 'failed') = (public_stage = 'failed') or status <> 'failed')
);

create unique index generation_executions_one_active_per_session_idx
  on public.generation_executions(session_id)
  where status in ('queued', 'running');

create index generation_executions_dispatch_due_idx
  on public.generation_executions(next_dispatch_at, requested_at)
  where status in ('queued', 'running') and dispatch_state in ('dispatch_pending', 'dispatch_claimed');

create index generation_executions_deadline_idx
  on public.generation_executions(hard_deadline_at)
  where status in ('queued', 'running');

create index generation_executions_session_idx
  on public.generation_executions(session_id, requested_at desc);

create table public.generation_operations (
  id uuid primary key default gen_random_uuid(),
  generation_run_id uuid not null references public.generation_executions(id) on delete cascade,
  operation_key text not null check (
    char_length(operation_key) between 3 and 128
    and operation_key ~ '^[a-z_]+:[A-Za-z0-9_-]+$'
  ),
  operation_kind text not null check (operation_kind in (
    'plan_topics', 'extract_topics', 'merge_topics', 'generate_guide',
    'grounding_verify', 'finalize'
  )),
  operation_version text not null check (char_length(operation_version) between 1 and 64),
  status text not null default 'pending' check (status in (
    'pending', 'ready', 'running', 'retry_wait', 'succeeded', 'failed', 'cancelled'
  )),
  dependency_operation_ids uuid[] not null default '{}',
  dependency_result_hashes text[] not null default '{}',
  input_json jsonb not null,
  operation_input_hash text not null check (operation_input_hash ~ '^[0-9a-f]{64}$'),
  result_json jsonb,
  result_hash text check (result_hash is null or result_hash ~ '^[0-9a-f]{64}$'),
  owner_token uuid,
  fencing_version bigint not null default 0 check (fencing_version >= 0),
  lease_expires_at timestamptz,
  next_eligible_at timestamptz not null default now(),
  provider_attempt_count smallint not null default 0 check (provider_attempt_count between 0 and 3),
  provider_attempt_ids uuid[] not null default '{}',
  current_attempt_id uuid references public.generation_runs(id) on delete set null,
  ready_at timestamptz,
  claimed_at timestamptz,
  settled_at timestamptz,
  queue_duration_ms bigint check (queue_duration_ms is null or queue_duration_ms >= 0),
  slot_wait_duration_ms bigint not null default 0 check (slot_wait_duration_ms >= 0),
  provider_duration_ms bigint check (provider_duration_ms is null or provider_duration_ms >= 0),
  database_commit_duration_ms bigint check (database_commit_duration_ms is null or database_commit_duration_ms >= 0),
  total_duration_ms bigint check (total_duration_ms is null or total_duration_ms >= 0),
  deadline_exceeded boolean not null default false,
  failure_category text check (failure_category is null or failure_category in (
    'provider_transient', 'provider_unavailable', 'provider_protocol', 'model_refusal', 'invalid_output',
    'source_superseded', 'contract_mismatch', 'deadline', 'provider_exhausted',
    'workflow_infrastructure', 'internal'
  )),
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,64}$'),
  provider_status integer check (provider_status is null or provider_status between 100 and 599),
  provider_request_id text check (
    provider_request_id is null
    or provider_request_id ~ '^[A-Za-z0-9._:/=-]{1,128}$'
  ),
  retry_reason text check (retry_reason is null or retry_reason in (
    'timeout', 'rate_limited', 'provider_unavailable', 'connection',
    'transport_interruption', 'empty_output', 'workflow_infrastructure',
    'protocol_error', 'model_mismatch', 'refusal', 'schema_invalid',
    'invalid_source_reference', 'contract_superseded', 'configuration_limit',
    'deadline', 'exhausted', 'non_retryable'
  )),
  retry_allowed boolean not null default false,
  support_id uuid not null default gen_random_uuid(),
  reuse_source_generation_run_id uuid references public.generation_executions(id) on delete set null,
  reuse_source_operation_id uuid references public.generation_operations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(generation_run_id, operation_key),
  unique(generation_run_id, id),
  check (cardinality(dependency_operation_ids) = cardinality(dependency_result_hashes)),
  check (array_position(dependency_operation_ids, null) is null),
  check (array_position(dependency_result_hashes, null) is null),
  check (operation_input_hash = encode(extensions.digest(input_json::text, 'sha256'), 'hex')),
  check ((status = 'succeeded') = (result_hash is not null) or status <> 'succeeded'),
  check ((status = 'running') = (owner_token is not null and lease_expires_at is not null) or status <> 'running')
);

create index generation_operations_run_status_idx
  on public.generation_operations(generation_run_id, status, next_eligible_at);

create index generation_operations_active_lease_idx
  on public.generation_operations(lease_expires_at, generation_run_id)
  where status = 'running' and operation_kind <> 'finalize';

create index generation_operations_current_attempt_idx
  on public.generation_operations(current_attempt_id)
  where current_attempt_id is not null;

-- Compatible telemetry expansion for the historical per-provider-call table.
-- Existing writers may omit every new nullable field.
alter table public.generation_runs
  add column if not exists generation_execution_id uuid
    references public.generation_executions(id) on delete cascade,
  add column if not exists operation_id uuid
    references public.generation_operations(id) on delete set null,
  add column if not exists queue_duration_ms bigint
    check (queue_duration_ms is null or queue_duration_ms >= 0),
  add column if not exists slot_wait_duration_ms bigint
    check (slot_wait_duration_ms is null or slot_wait_duration_ms >= 0),
  add column if not exists provider_duration_ms bigint
    check (provider_duration_ms is null or provider_duration_ms >= 0),
  add column if not exists database_commit_duration_ms bigint
    check (database_commit_duration_ms is null or database_commit_duration_ms >= 0),
  add column if not exists total_duration_ms bigint
    check (total_duration_ms is null or total_duration_ms >= 0),
  add column if not exists retry_reason text
    check (retry_reason is null or retry_reason in (
      'timeout', 'rate_limited', 'provider_unavailable', 'connection',
      'transport_interruption', 'empty_output', 'workflow_infrastructure',
      'protocol_error', 'model_mismatch', 'refusal', 'schema_invalid',
      'invalid_source_reference', 'contract_superseded', 'configuration_limit',
      'deadline', 'exhausted', 'non_retryable'
    )),
  add column if not exists provider_status integer
    check (provider_status is null or provider_status between 100 and 599),
  add column if not exists provider_request_id text
    check (provider_request_id is null or provider_request_id ~ '^[A-Za-z0-9._:/=-]{1,128}$'),
  add column if not exists deadline_exceeded boolean not null default false;

create index if not exists generation_runs_execution_operation_idx
  on public.generation_runs(generation_execution_id, operation_id, attempt)
  where generation_execution_id is not null;

create table public.generation_workflow_instances (
  id uuid primary key default gen_random_uuid(),
  generation_run_id uuid not null references public.generation_executions(id) on delete cascade,
  workflow_run_id text not null unique check (char_length(workflow_run_id) between 1 and 256),
  workflow_contract_version text not null check (char_length(workflow_contract_version) between 1 and 64),
  dispatch_epoch integer check (dispatch_epoch is null or dispatch_epoch > 0),
  status text not null check (status in ('acknowledged', 'stale', 'completed', 'failed')),
  dispatched_at timestamptz,
  acknowledged_at timestamptz,
  completed_at timestamptz,
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_]{1,64}$'),
  support_id uuid not null default gen_random_uuid(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index generation_workflow_instances_run_idx
  on public.generation_workflow_instances(generation_run_id, first_seen_at desc);

alter table public.preparation_sessions
  add column if not exists current_generation_run_id uuid
    references public.generation_executions(id) on delete set null;

create index if not exists preparation_sessions_current_generation_run_idx
  on public.preparation_sessions(current_generation_run_id)
  where current_generation_run_id is not null;

comment on table public.generation_executions is
  'Private logical AI generation runs and transactional dispatch outbox. Service role only.';
comment on table public.generation_operations is
  'Private fenced generation checkpoints and validated model results. Service role only.';
comment on table public.generation_workflow_instances is
  'Privacy-safe 1:N Vercel Workflow observability records. Never grants execution ownership.';
comment on column public.generation_operations.result_json is
  'Private validated intermediate model output. Never expose through status or Workflow payloads.';
comment on column public.generation_operations.input_json is
  'Private immutable operation input. Workers load it by opaque operation ID; never place it in Workflow payloads.';
comment on column public.preparation_sessions.current_generation_run_id is
  'Current logical AI generation business identity; not a Vercel Workflow execution ID.';

alter table public.generation_executions enable row level security;
alter table public.generation_operations enable row level security;
alter table public.generation_workflow_instances enable row level security;

revoke all on table public.generation_executions from public, anon, authenticated;
revoke all on table public.generation_operations from public, anon, authenticated;
revoke all on table public.generation_workflow_instances from public, anon, authenticated;
grant all on table public.generation_executions to service_role;
grant all on table public.generation_operations to service_role;
grant all on table public.generation_workflow_instances to service_role;

create or replace function public.record_generation_attempt(
  p_attempt_id uuid,
  p_session_id uuid,
  p_stage text,
  p_status text,
  p_attempt integer,
  p_prompt_version text,
  p_schema_version text,
  p_provider text,
  p_model text,
  p_usage jsonb,
  p_error_code text,
  p_started_at timestamptz,
  p_completed_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt_id uuid := coalesce(p_attempt_id, public.gen_random_uuid());
  v_recorded_id uuid;
begin
  if p_status is null or p_status not in ('running', 'succeeded', 'failed') then
    raise exception 'invalid_generation_attempt_status' using errcode = '22023';
  end if;
  if p_attempt < 1 or p_attempt > 3 then
    raise exception 'invalid_generation_attempt_number' using errcode = '22023';
  end if;
  if p_error_code is not null and p_error_code !~ '^[A-Z0-9_]{1,64}$' then
    raise exception 'invalid_generation_attempt_error_code' using errcode = '22023';
  end if;

  insert into public.generation_runs as attempt (
    id, session_id, stage, status, attempt, prompt_version, schema_version,
    provider, model, usage, error_code, error_message, started_at, completed_at
  ) values (
    v_attempt_id, p_session_id, p_stage, p_status, p_attempt,
    p_prompt_version, p_schema_version, p_provider, p_model, p_usage,
    p_error_code, null, coalesce(p_started_at, now()),
    case when p_status = 'running' then null else coalesce(p_completed_at, now()) end
  )
  on conflict (id) do update set
    status = excluded.status,
    attempt = excluded.attempt,
    model = excluded.model,
    usage = excluded.usage,
    error_code = excluded.error_code,
    error_message = null,
    completed_at = excluded.completed_at
  where attempt.session_id = excluded.session_id
  returning id into v_recorded_id;

  if v_recorded_id is null then
    raise exception 'generation_attempt_identity_conflict' using errcode = '23505';
  end if;
  return v_recorded_id;
end;
$$;

create or replace function public.claim_generation_dispatch(
  p_generation_run_id uuid default null,
  p_lease_seconds integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_dispatch_token uuid;
  v_lease_seconds integer := least(greatest(coalesce(p_lease_seconds, 15), 5), 60);
  v_backoff_seconds integer;
begin
  select * into v_run
  from public.generation_executions
  where (p_generation_run_id is null or id = p_generation_run_id)
    and status in ('queued', 'running')
    and hard_deadline_at > now()
    and dispatch_attempt_count < dispatch_attempt_limit
    and next_dispatch_at <= now()
    and (
      dispatch_state = 'dispatch_pending'
      or (
        dispatch_state = 'dispatch_claimed'
        and dispatch_lease_expires_at <= now()
      )
    )
  order by requested_at
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('status', 'none');
  end if;

  v_dispatch_token := public.gen_random_uuid();
  v_backoff_seconds := least(60, (2 ^ least(v_run.dispatch_attempt_count, 5))::integer);

  update public.generation_executions
  set dispatch_state = 'dispatch_claimed',
      dispatch_epoch = dispatch_epoch + 1,
      dispatch_token = v_dispatch_token,
      dispatch_attempt_count = dispatch_attempt_count + 1,
      dispatch_lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      next_dispatch_at = now() + make_interval(secs => v_lease_seconds + v_backoff_seconds),
      last_dispatch_at = now(),
      updated_at = now()
  where id = v_run.id;

  return jsonb_build_object(
    'status', 'claimed',
    'generationRunId', v_run.id,
    'dispatchToken', v_dispatch_token,
    'dispatchEpoch', v_run.dispatch_epoch + 1,
    'leaseExpiresAt', now() + make_interval(secs => v_lease_seconds)
  );
end;
$$;

create or replace function public.acknowledge_generation_workflow(
  p_generation_run_id uuid,
  p_dispatch_token uuid,
  p_workflow_run_id text,
  p_workflow_contract_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_valid boolean;
  v_existing_run_id uuid;
  v_existing_status text;
begin
  if char_length(p_workflow_run_id) not between 1 and 256
     or char_length(p_workflow_contract_version) not between 1 and 64 then
    raise exception 'invalid_workflow_identity' using errcode = '22023';
  end if;

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;

  select generation_run_id, status into v_existing_run_id, v_existing_status
  from public.generation_workflow_instances
  where workflow_run_id = p_workflow_run_id;

  if v_existing_run_id is not null and v_existing_run_id <> p_generation_run_id then
    raise exception 'workflow_identity_conflict' using errcode = '23505';
  end if;

  v_valid := v_run.status in ('queued', 'running')
    and now() < v_run.hard_deadline_at
    and v_run.dispatch_token = p_dispatch_token
    and (
      (v_run.dispatch_state = 'dispatch_claimed' and v_existing_run_id is null)
      or (
        v_run.dispatch_state in ('workflow_acked', 'running')
        and v_existing_run_id = p_generation_run_id
        and v_existing_status = 'acknowledged'
      )
    );

  insert into public.generation_workflow_instances as instance (
    generation_run_id, workflow_run_id, workflow_contract_version,
    dispatch_epoch, status, dispatched_at, acknowledged_at
  ) values (
    p_generation_run_id, p_workflow_run_id, p_workflow_contract_version,
    case when v_valid then v_run.dispatch_epoch else null end,
    case when v_valid then 'acknowledged' else 'stale' end,
    v_run.last_dispatch_at,
    case when v_valid then now() else null end
  )
  on conflict (workflow_run_id) do update set
    workflow_contract_version = excluded.workflow_contract_version,
    dispatch_epoch = excluded.dispatch_epoch,
    status = excluded.status,
    acknowledged_at = excluded.acknowledged_at,
    completed_at = case when excluded.status = 'stale' then now() else null end,
    error_code = case when excluded.status = 'stale' then 'STALE_DISPATCH' else null end,
    last_seen_at = now()
  where instance.generation_run_id = excluded.generation_run_id;

  if not v_valid then
    return jsonb_build_object('status', 'stale');
  end if;

  update public.generation_executions
  set status = 'running',
      dispatch_state = 'workflow_acked',
      dispatch_lease_expires_at = null,
      workflow_acknowledged_at = coalesce(workflow_acknowledged_at, now()),
      started_at = coalesce(started_at, now()),
      last_progress_at = now(),
      updated_at = now()
  where id = p_generation_run_id
    and dispatch_token = p_dispatch_token;

  return jsonb_build_object(
    'status', 'acknowledged',
    'generationRunId', p_generation_run_id,
    'dispatchEpoch', v_run.dispatch_epoch
  );
end;
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
  p_plan_input_json jsonb
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
     or p_plan_operation_kind not in ('plan_topics', 'extract_topics') then
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
    pipeline_version, parsing_contract_version
  ) values (
    v_generation_run_id, p_session_id, p_source_snapshot_hash,
    p_execution_contract_hash, p_provider, p_model, p_prompt_version,
    p_schema_version, p_pipeline_version, p_parsing_contract_version
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

create or replace function public.create_generation_operation(
  p_operation_id uuid,
  p_generation_run_id uuid,
  p_operation_key text,
  p_operation_kind text,
  p_operation_version text,
  p_operation_input_hash text,
  p_input_json jsonb,
  p_dependency_operation_ids uuid[],
  p_dependency_result_hashes text[],
  p_expected_execution_contract_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_existing public.generation_operations%rowtype;
  v_dependency_hash text;
  v_unclaimed_provider_operations integer;
  v_index integer;
  v_operation_id uuid := coalesce(p_operation_id, public.gen_random_uuid());
begin
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  if p_operation_key is null
     or p_operation_key !~ '^[a-z_]+:[A-Za-z0-9_-]+$'
     or char_length(p_operation_key) > 128
     or p_operation_kind is null
     or p_operation_kind not in (
       'plan_topics', 'extract_topics', 'merge_topics', 'generate_guide',
       'grounding_verify', 'finalize'
     )
     or p_input_json is null
     or jsonb_typeof(p_input_json) not in ('object', 'array')
     or p_expected_execution_contract_hash is null
     or p_expected_execution_contract_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_generation_operation' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_dependency_operation_ids, '{}'))
     <> cardinality(coalesce(p_dependency_result_hashes, '{}')) then
    raise exception 'generation_dependency_shape_mismatch' using errcode = '22023';
  end if;
  if array_position(coalesce(p_dependency_operation_ids, '{}'), null) is not null
     or array_position(coalesce(p_dependency_result_hashes, '{}'), null) is not null then
    raise exception 'generation_dependency_contains_null' using errcode = '22023';
  end if;

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found or v_run.status not in ('queued', 'running') then
    raise exception 'generation_run_not_active' using errcode = '55000';
  end if;
  if v_run.execution_contract_hash <> p_expected_execution_contract_hash then
    raise exception 'generation_contract_mismatch' using errcode = '55000';
  end if;
  if now() >= v_run.hard_deadline_at then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
    );
    return null;
  end if;
  if not exists (
    select 1 from public.preparation_sessions as session
    where session.id = v_run.session_id
      and session.current_generation_run_id = v_run.id
      and session.deleted_at is null
  ) then
    raise exception 'generation_run_superseded' using errcode = '55000';
  end if;

  select * into v_existing
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and operation_key = p_operation_key;

  if found then
    if (p_operation_id is null or v_existing.id = p_operation_id)
       and v_existing.operation_kind = p_operation_kind
       and v_existing.operation_version = p_operation_version
       and v_existing.operation_input_hash = encode(extensions.digest(p_input_json::text, 'sha256'), 'hex')
       and v_existing.input_json = p_input_json
       and v_existing.dependency_operation_ids = coalesce(p_dependency_operation_ids, '{}')
       and v_existing.dependency_result_hashes = coalesce(p_dependency_result_hashes, '{}') then
      return v_existing.id;
    end if;
    raise exception 'generation_operation_identity_conflict' using errcode = '23505';
  end if;

  if cardinality(coalesce(p_dependency_operation_ids, '{}')) > 0 then
    for v_index in 1..cardinality(p_dependency_operation_ids) loop
      select result_hash into v_dependency_hash
      from public.generation_operations
      where id = p_dependency_operation_ids[v_index]
        and generation_run_id = p_generation_run_id
        and status = 'succeeded';

      if v_dependency_hash is null
         or v_dependency_hash <> p_dependency_result_hashes[v_index] then
        raise exception 'generation_dependency_not_committed' using errcode = '55000';
      end if;
    end loop;
  end if;

  if p_operation_kind <> 'finalize' then
    select count(*) into v_unclaimed_provider_operations
    from public.generation_operations
    where generation_run_id = p_generation_run_id
      and operation_kind <> 'finalize'
      and provider_attempt_count = 0
      and status not in ('failed', 'cancelled');

    if v_run.provider_invocations_used
       + v_unclaimed_provider_operations
       + 1
       + v_run.retry_credits_remaining > v_run.provider_invocation_limit then
      raise exception 'generation_operation_graph_exceeds_invocation_limit' using errcode = '54000';
    end if;
  end if;

  insert into public.generation_operations (
    id, generation_run_id, operation_key, operation_kind, operation_version,
    status, dependency_operation_ids, dependency_result_hashes,
    input_json, operation_input_hash, ready_at
  ) values (
    v_operation_id, p_generation_run_id, p_operation_key, p_operation_kind,
    p_operation_version, 'ready', coalesce(p_dependency_operation_ids, '{}'),
    coalesce(p_dependency_result_hashes, '{}'), p_input_json,
    encode(extensions.digest(p_input_json::text, 'sha256'), 'hex'), now()
  );

  return v_operation_id;
end;
$$;

create or replace function public._terminalize_generation_execution(
  p_generation_run_id uuid,
  p_failure_category text,
  p_error_code text,
  p_retry_allowed boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  if p_failure_category is null
     or p_failure_category not in (
       'provider_transient', 'provider_unavailable', 'provider_protocol', 'model_refusal', 'invalid_output',
       'source_superseded', 'contract_mismatch', 'deadline', 'provider_exhausted',
       'workflow_infrastructure', 'internal'
     )
     or p_error_code is null
     or p_error_code !~ '^[A-Z0-9_]{1,64}$' then
    raise exception 'invalid_safe_generation_diagnostic' using errcode = '22023';
  end if;

  update public.generation_runs as attempt
  set status = 'failed',
      error_code = p_error_code,
      error_message = null,
      retry_reason = case when p_failure_category = 'deadline' then 'deadline' else retry_reason end,
      deadline_exceeded = p_failure_category = 'deadline',
      total_duration_ms = floor(extract(epoch from (now() - started_at)) * 1000)::bigint,
      completed_at = now()
  where attempt.status = 'running'
    and attempt.id in (
      select operation.current_attempt_id
      from public.generation_operations as operation
      where operation.generation_run_id = p_generation_run_id
        and operation.current_attempt_id is not null
    );

  update public.generation_operations
  set status = case when status = 'running' then 'failed' else 'cancelled' end,
      owner_token = null,
      lease_expires_at = null,
      retry_allowed = false,
      deadline_exceeded = p_failure_category = 'deadline',
      failure_category = case when status = 'running' then p_failure_category else failure_category end,
      error_code = case when status = 'running' then p_error_code else error_code end,
      settled_at = case when status = 'running' then now() else settled_at end,
      updated_at = now()
  where generation_run_id = p_generation_run_id
    and status in ('pending', 'ready', 'running', 'retry_wait');

  update public.generation_executions
  set status = 'failed',
      public_stage = 'failed',
      dispatch_state = 'failed',
      dispatch_token = null,
      dispatch_lease_expires_at = null,
      failure_category = p_failure_category,
      error_code = p_error_code,
      retry_allowed = p_retry_allowed,
      last_progress_at = now(),
      completed_at = now(),
      updated_at = now()
  where id = p_generation_run_id
    and status in ('queued', 'running')
  returning session_id into v_session_id;

  if v_session_id is null then
    return false;
  end if;

  update public.preparation_sessions
  set state = case when p_retry_allowed then 'failed_retryable' else 'failed_terminal' end,
      failed_stage = current_stage,
      error_code = p_error_code,
      error_message = case
        when p_retry_allowed then 'Generation could not finish this time. Your materials and completed work are saved.'
        else 'Generation could not be completed with these materials.'
      end,
      updated_at = now()
  where id = v_session_id
    and current_generation_run_id = p_generation_run_id;

  update public.generation_workflow_instances
  set status = 'failed',
      error_code = p_error_code,
      completed_at = now(),
      last_seen_at = now()
  where generation_run_id = p_generation_run_id
    and status = 'acknowledged';

  return true;
end;
$$;

create or replace function public.claim_generation_operation(
  p_generation_run_id uuid,
  p_operation_key text,
  p_expected_source_snapshot_hash text,
  p_expected_execution_contract_hash text,
  p_lease_seconds integer default 270
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_operation public.generation_operations%rowtype;
  v_owner_token uuid;
  v_attempt_id uuid;
  v_attempt_number integer;
  v_global_active integer;
  v_run_active integer;
  v_global_ahead integer;
  v_run_ahead integer;
  v_span_count bigint;
  v_database_snapshot_hash text;
  v_lease_seconds integer := least(greatest(coalesce(p_lease_seconds, 270), 30), 270);
  v_session_state text;
begin
  -- Every operation transaction takes the same global lock before its run lock.
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found or v_run.status not in ('queued', 'running') then
    return jsonb_build_object('status', 'run_terminal');
  end if;
  if now() >= v_run.hard_deadline_at then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
    );
    return jsonb_build_object('status', 'deadline_exceeded');
  end if;
  if not exists (
    select 1 from public.preparation_sessions as session
    where session.id = v_run.session_id
      and session.current_generation_run_id = v_run.id
      and session.deleted_at is null
  ) then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'source_superseded', 'GENERATION_RUN_SUPERSEDED', false
    );
    return jsonb_build_object('status', 'run_superseded');
  end if;
  if v_run.source_snapshot_hash <> p_expected_source_snapshot_hash
     or v_run.execution_contract_hash <> p_expected_execution_contract_hash then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'contract_mismatch', 'GENERATION_CONTRACT_MISMATCH', false
    );
    return jsonb_build_object('status', 'contract_mismatch');
  end if;

  select count(*), encode(extensions.digest(string_agg(span.content_hash, ':' order by span.content_hash), 'sha256'), 'hex')
  into v_span_count, v_database_snapshot_hash
  from public.source_spans as span
  join public.sources as source
    on source.id = span.source_id
   and source.status in ('ready', 'ready_with_gaps')
  where span.session_id = v_run.session_id;

  if v_span_count = 0 or v_database_snapshot_hash is distinct from v_run.source_snapshot_hash then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'source_superseded', 'SOURCE_SNAPSHOT_CHANGED', false
    );
    return jsonb_build_object('status', 'source_superseded');
  end if;

  select * into v_operation
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and operation_key = p_operation_key
  for update;

  if not found then
    return jsonb_build_object('status', 'missing');
  end if;
  if v_operation.status = 'succeeded' then
    return jsonb_build_object(
      'status', 'completed',
      'operationId', v_operation.id,
      'resultHash', v_operation.result_hash
    );
  end if;
  if v_operation.status in ('failed', 'cancelled') then
    return jsonb_build_object('status', 'operation_terminal', 'operationId', v_operation.id);
  end if;
  if v_operation.status = 'running' and v_operation.lease_expires_at > now() then
    return jsonb_build_object(
      'status', 'contended',
      'operationId', v_operation.id,
      'nextEligibleAt', v_operation.lease_expires_at
    );
  end if;
  if v_operation.status = 'retry_wait' and v_operation.next_eligible_at > now() then
    return jsonb_build_object(
      'status', 'waiting',
      'operationId', v_operation.id,
      'nextEligibleAt', v_operation.next_eligible_at
    );
  end if;
  if exists (
    select 1
    from unnest(v_operation.dependency_operation_ids) as dependency(operation_id)
    left join public.generation_operations as committed
      on committed.id = dependency.operation_id
     and committed.generation_run_id = p_generation_run_id
    where committed.id is null or committed.status <> 'succeeded'
  ) then
    return jsonb_build_object('status', 'dependencies_pending', 'operationId', v_operation.id);
  end if;

  v_owner_token := public.gen_random_uuid();

  if v_operation.operation_kind = 'finalize' then
    update public.generation_operations
    set status = 'running',
        owner_token = v_owner_token,
        fencing_version = fencing_version + 1,
        lease_expires_at = now() + make_interval(secs => v_lease_seconds),
        claimed_at = now(),
        updated_at = now()
    where id = v_operation.id;

    update public.generation_executions
    set status = 'running',
        public_stage = 'finalizing',
        dispatch_state = 'running',
        last_progress_at = now(),
        started_at = coalesce(started_at, now()),
        updated_at = now()
    where id = p_generation_run_id;

    update public.preparation_sessions
    set state = 'verifying_guide',
        current_stage = 'finalizing',
        updated_at = now()
    where id = v_run.session_id
      and current_generation_run_id = p_generation_run_id;

    return jsonb_build_object(
      'status', 'claimed',
      'operationId', v_operation.id,
      'ownerToken', v_owner_token,
      'fencingVersion', v_operation.fencing_version + 1,
      'attemptNumber', null,
      'attemptId', null,
      'leaseExpiresAt', now() + make_interval(secs => v_lease_seconds)
    );
  end if;

  if v_operation.provider_attempt_count >= 3 then
    update public.generation_operations
    set status = 'failed',
        failure_category = 'provider_exhausted',
        error_code = 'PROVIDER_ATTEMPTS_EXHAUSTED',
        retry_allowed = false,
        owner_token = null,
        lease_expires_at = null,
        settled_at = now(),
        updated_at = now()
    where id = v_operation.id;
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'provider_exhausted', 'PROVIDER_ATTEMPTS_EXHAUSTED', true
    );
    return jsonb_build_object('status', 'attempts_exhausted', 'operationId', v_operation.id);
  end if;
  if v_operation.provider_attempt_count > 0 and v_run.retry_credits_remaining <= 0 then
    update public.generation_operations
    set status = 'failed',
        failure_category = 'provider_exhausted',
        error_code = 'GENERATION_RETRY_BUDGET_EXHAUSTED',
        retry_allowed = false,
        owner_token = null,
        lease_expires_at = null,
        settled_at = now(),
        updated_at = now()
    where id = v_operation.id;
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'provider_exhausted', 'GENERATION_RETRY_BUDGET_EXHAUSTED', true
    );
    return jsonb_build_object('status', 'retry_budget_exhausted', 'operationId', v_operation.id);
  end if;
  if v_run.provider_invocations_used >= least(v_run.provider_invocation_limit, 40) then
    update public.generation_operations
    set status = 'failed',
        failure_category = 'provider_exhausted',
        error_code = 'GENERATION_INVOCATION_LIMIT_REACHED',
        retry_allowed = false,
        owner_token = null,
        lease_expires_at = null,
        settled_at = now(),
        updated_at = now()
    where id = v_operation.id;
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'provider_exhausted', 'GENERATION_INVOCATION_LIMIT_REACHED', true
    );
    return jsonb_build_object('status', 'invocation_limit_reached', 'operationId', v_operation.id);
  end if;

  select count(*) into v_global_active
  from public.generation_operations
  where status = 'running'
    and operation_kind <> 'finalize'
    and lease_expires_at > now();

  select count(*) into v_run_active
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and status = 'running'
    and operation_kind <> 'finalize'
    and lease_expires_at > now();

  select count(*) into v_global_ahead
  from public.generation_operations as candidate
  join public.generation_executions as candidate_run
    on candidate_run.id = candidate.generation_run_id
   and candidate_run.status in ('queued', 'running')
   and candidate_run.dispatch_state in ('workflow_acked', 'running')
   and candidate_run.hard_deadline_at > now()
  where candidate.id <> v_operation.id
    and candidate.operation_kind <> 'finalize'
    and candidate.status in ('ready', 'retry_wait')
    and candidate.next_eligible_at <= now()
    and (coalesce(candidate.ready_at, candidate.created_at), candidate.id)
      < (coalesce(v_operation.ready_at, v_operation.created_at), v_operation.id)
    and not exists (
      select 1
      from unnest(candidate.dependency_operation_ids) as queued_dependency(operation_id)
      left join public.generation_operations as committed_dependency
        on committed_dependency.id = queued_dependency.operation_id
       and committed_dependency.generation_run_id = candidate.generation_run_id
      where committed_dependency.id is null or committed_dependency.status <> 'succeeded'
    );

  select count(*) into v_run_ahead
  from public.generation_operations as candidate
  where candidate.generation_run_id = p_generation_run_id
    and candidate.id <> v_operation.id
    and candidate.operation_kind <> 'finalize'
    and candidate.status in ('ready', 'retry_wait')
    and candidate.next_eligible_at <= now()
    and (coalesce(candidate.ready_at, candidate.created_at), candidate.id)
      < (coalesce(v_operation.ready_at, v_operation.created_at), v_operation.id)
    and not exists (
      select 1
      from unnest(candidate.dependency_operation_ids) as queued_dependency(operation_id)
      left join public.generation_operations as committed_dependency
        on committed_dependency.id = queued_dependency.operation_id
       and committed_dependency.generation_run_id = p_generation_run_id
      where committed_dependency.id is null or committed_dependency.status <> 'succeeded'
    );

  if v_global_active >= 8
     or v_run_active >= 4
     or v_global_ahead >= 8 - v_global_active
     or v_run_ahead >= 4 - v_run_active then
    update public.generation_operations
    set next_eligible_at = greatest(next_eligible_at, now() + interval '5 seconds'),
        slot_wait_duration_ms = slot_wait_duration_ms + 5000,
        updated_at = now()
    where id = v_operation.id;
    return jsonb_build_object(
      'status', 'capacity_wait',
      'operationId', v_operation.id,
      'nextEligibleAt', now() + interval '5 seconds'
    );
  end if;

  if v_operation.current_attempt_id is not null and v_operation.status = 'running' then
    update public.generation_runs
    set status = 'failed',
        error_code = 'ATTEMPT_LEASE_EXPIRED',
        error_message = null,
        retry_reason = 'workflow_infrastructure',
        deadline_exceeded = false,
        total_duration_ms = floor(extract(epoch from (now() - started_at)) * 1000)::bigint,
        completed_at = now()
    where id = v_operation.current_attempt_id
      and status = 'running';
  end if;

  v_attempt_number := v_operation.provider_attempt_count + 1;
  v_attempt_id := public.gen_random_uuid();

  insert into public.generation_runs (
    id, session_id, stage, status, attempt, prompt_version, schema_version,
    provider, model, generation_execution_id, operation_id,
    queue_duration_ms, slot_wait_duration_ms, started_at
  ) values (
    v_attempt_id, v_run.session_id, v_operation.operation_kind, 'running',
    v_attempt_number, v_run.prompt_version, v_run.schema_version,
    v_run.provider, v_run.model, p_generation_run_id, v_operation.id,
    floor(extract(epoch from (
      now() - case
        when v_attempt_number > 1 then v_operation.next_eligible_at
        else coalesce(v_operation.ready_at, v_operation.created_at)
      end
    )) * 1000)::bigint,
    v_operation.slot_wait_duration_ms,
    now()
  );

  update public.generation_operations
  set status = 'running',
      owner_token = v_owner_token,
      fencing_version = fencing_version + 1,
      lease_expires_at = now() + make_interval(secs => v_lease_seconds),
      next_eligible_at = now(),
      provider_attempt_count = v_attempt_number,
      provider_attempt_ids = provider_attempt_ids || array[v_attempt_id],
      current_attempt_id = v_attempt_id,
      claimed_at = now(),
      queue_duration_ms = coalesce(
        queue_duration_ms,
        floor(extract(epoch from (now() - coalesce(ready_at, created_at))) * 1000)::bigint
      ),
      failure_category = case
        when v_operation.current_attempt_id is not null and v_operation.status = 'running'
          then 'workflow_infrastructure'
        else failure_category
      end,
      retry_reason = case
        when v_operation.current_attempt_id is not null and v_operation.status = 'running'
          then 'workflow_infrastructure'
        else retry_reason
      end,
      retry_allowed = false,
      updated_at = now()
  where id = v_operation.id;

  update public.generation_executions
  set status = 'running',
      public_stage = case
        when v_operation.operation_kind = 'grounding_verify' then 'checking_grounding'
        when v_operation.operation_kind = 'generate_guide'
             and public_stage not in ('checking_grounding', 'finalizing') then 'generating_guide'
        when v_operation.operation_kind in ('plan_topics', 'extract_topics', 'merge_topics')
             and public_stage = 'preparing' then 'planning'
        else public_stage
      end,
      dispatch_state = 'running',
      provider_invocations_used = provider_invocations_used + 1,
      retry_credits_remaining = retry_credits_remaining - case when v_attempt_number > 1 then 1 else 0 end,
      retry_allowed = false,
      last_progress_at = now(),
      started_at = coalesce(started_at, now()),
      updated_at = now()
  where id = p_generation_run_id;

  v_session_state := case
    when v_operation.operation_kind = 'grounding_verify' then 'verifying_guide'
    when v_operation.operation_kind = 'generate_guide' then 'generating_guide'
    when v_operation.operation_kind = 'merge_topics' then 'merging_topics'
    else 'extracting_topics'
  end;

  update public.preparation_sessions
  set state = case
        when state = 'verifying_guide' then state
        when state = 'generating_guide' and v_session_state in ('extracting_topics', 'merging_topics') then state
        else v_session_state
      end,
      current_stage = case
        when current_stage = 'verifying_guide' then current_stage
        else v_session_state
      end,
      updated_at = now()
  where id = v_run.session_id
    and current_generation_run_id = p_generation_run_id;

  return jsonb_build_object(
    'status', 'claimed',
    'operationId', v_operation.id,
    'ownerToken', v_owner_token,
    'fencingVersion', v_operation.fencing_version + 1,
    'attemptNumber', v_attempt_number,
    'attemptId', v_attempt_id,
    'leaseExpiresAt', now() + make_interval(secs => v_lease_seconds)
  );
end;
$$;

create or replace function public.settle_generation_operation_success(
  p_generation_run_id uuid,
  p_operation_key text,
  p_owner_token uuid,
  p_fencing_version bigint,
  p_attempt_id uuid,
  p_result_json jsonb,
  p_result_hash text,
  p_usage jsonb,
  p_actual_model text,
  p_provider_status integer,
  p_provider_request_id text,
  p_provider_duration_ms bigint,
  p_database_commit_duration_ms bigint,
  p_total_duration_ms bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_operation public.generation_operations%rowtype;
  v_span_count bigint;
  v_database_snapshot_hash text;
  v_database_started_at timestamptz := clock_timestamp();
  v_result_hash text;
begin
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  if p_result_json is null
     or p_result_hash is null or p_result_hash !~ '^[0-9a-f]{64}$'
     or p_provider_duration_ms is null or p_provider_duration_ms < 0
     or p_database_commit_duration_ms is null or p_database_commit_duration_ms < 0
     or p_total_duration_ms is null or p_total_duration_ms < 0
     or p_provider_status is null or p_provider_status not between 100 and 599
     or (p_provider_request_id is not null and p_provider_request_id !~ '^[A-Za-z0-9._:/=-]{1,128}$') then
    raise exception 'invalid_generation_success_settlement' using errcode = '22023';
  end if;

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found or v_run.status not in ('queued', 'running') then
    return jsonb_build_object('status', 'stale');
  end if;
  if now() >= v_run.hard_deadline_at then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
    );
    return jsonb_build_object('status', 'deadline_exceeded');
  end if;
  if not exists (
    select 1 from public.preparation_sessions as session
    where session.id = v_run.session_id
      and session.current_generation_run_id = v_run.id
      and session.deleted_at is null
  ) then
    return jsonb_build_object('status', 'stale');
  end if;

  select count(*), encode(extensions.digest(string_agg(span.content_hash, ':' order by span.content_hash), 'sha256'), 'hex')
  into v_span_count, v_database_snapshot_hash
  from public.source_spans as span
  join public.sources as source
    on source.id = span.source_id
   and source.status in ('ready', 'ready_with_gaps')
  where span.session_id = v_run.session_id;

  if v_span_count = 0 or v_database_snapshot_hash is distinct from v_run.source_snapshot_hash then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'source_superseded', 'SOURCE_SNAPSHOT_CHANGED', false
    );
    return jsonb_build_object('status', 'source_superseded');
  end if;

  select * into v_operation
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and operation_key = p_operation_key
  for update;

  if not found
     or v_operation.operation_kind = 'finalize'
     or v_operation.status <> 'running'
     or v_operation.owner_token is distinct from p_owner_token
     or v_operation.fencing_version <> p_fencing_version
     or v_operation.current_attempt_id is distinct from p_attempt_id
     or v_operation.lease_expires_at <= now() then
    return jsonb_build_object('status', 'stale');
  end if;

  update public.generation_runs
  set status = 'succeeded',
      model = coalesce(nullif(p_actual_model, ''), model),
      usage = p_usage,
      error_code = null,
      error_message = null,
      provider_status = p_provider_status,
      provider_request_id = p_provider_request_id,
      provider_duration_ms = p_provider_duration_ms,
      database_commit_duration_ms = greatest(
        p_database_commit_duration_ms,
        floor(extract(epoch from (clock_timestamp() - v_database_started_at)) * 1000)::bigint
      ),
      total_duration_ms = floor(extract(epoch from (now() - started_at)) * 1000)::bigint,
      retry_reason = null,
      deadline_exceeded = false,
      completed_at = now()
  where id = p_attempt_id
    and status = 'running';

  if not found then
    return jsonb_build_object('status', 'stale');
  end if;

  v_result_hash := encode(extensions.digest(p_result_json::text, 'sha256'), 'hex');

  update public.generation_operations
  set status = 'succeeded',
      result_json = p_result_json,
      result_hash = v_result_hash,
      owner_token = null,
      lease_expires_at = null,
      next_eligible_at = now(),
      provider_request_id = p_provider_request_id,
      provider_duration_ms = p_provider_duration_ms,
      database_commit_duration_ms = greatest(
        p_database_commit_duration_ms,
        floor(extract(epoch from (clock_timestamp() - v_database_started_at)) * 1000)::bigint
      ),
      total_duration_ms = greatest(
        p_total_duration_ms,
        floor(extract(epoch from (now() - coalesce(v_operation.ready_at, v_operation.created_at))) * 1000)::bigint
      ),
      failure_category = null,
      error_code = null,
      retry_reason = null,
      retry_allowed = false,
      settled_at = now(),
      updated_at = now()
  where id = v_operation.id
    and owner_token = p_owner_token
    and fencing_version = p_fencing_version;

  if not found then
    raise exception 'generation_success_cas_failed' using errcode = '40001';
  end if;

  update public.generation_executions
  set retry_allowed = false,
      last_progress_at = now(),
      updated_at = now()
  where id = p_generation_run_id
    and status = 'running';

  return jsonb_build_object(
    'status', 'succeeded',
    'operationId', v_operation.id,
    'resultHash', v_result_hash
  );
end;
$$;

create or replace function public.settle_generation_operation_retry_or_fail(
  p_generation_run_id uuid,
  p_operation_key text,
  p_owner_token uuid,
  p_fencing_version bigint,
  p_attempt_id uuid,
  p_retryable boolean,
  p_failure_category text,
  p_error_code text,
  p_provider_status integer,
  p_provider_request_id text,
  p_retry_reason text,
  p_provider_duration_ms bigint,
  p_total_duration_ms bigint,
  p_retry_delay_seconds integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_operation public.generation_operations%rowtype;
  v_next_eligible_at timestamptz;
  v_can_retry boolean;
  v_database_started_at timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  if p_retryable is null
     or p_failure_category is null
     or p_failure_category not in (
       'provider_transient', 'provider_unavailable', 'provider_protocol', 'model_refusal', 'invalid_output',
       'source_superseded', 'contract_mismatch', 'deadline', 'provider_exhausted',
       'workflow_infrastructure', 'internal'
     )
     or p_error_code is null
     or p_error_code !~ '^[A-Z0-9_]{1,64}$'
     or p_retry_reason is null
     or p_retry_reason not in (
       'timeout', 'rate_limited', 'provider_unavailable', 'connection',
       'transport_interruption', 'empty_output', 'workflow_infrastructure',
       'protocol_error', 'model_mismatch', 'refusal', 'schema_invalid',
       'invalid_source_reference', 'contract_superseded', 'configuration_limit',
       'deadline', 'exhausted', 'non_retryable'
     )
     or (p_provider_status is not null and p_provider_status not between 100 and 599)
     or (p_provider_request_id is not null and p_provider_request_id !~ '^[A-Za-z0-9._:/=-]{1,128}$')
     or p_provider_duration_ms is null or p_provider_duration_ms < 0
     or p_total_duration_ms is null or p_total_duration_ms < 0 then
    raise exception 'invalid_generation_failure_settlement' using errcode = '22023';
  end if;

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found or v_run.status not in ('queued', 'running') then
    return jsonb_build_object('status', 'stale');
  end if;

  select * into v_operation
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and operation_key = p_operation_key
  for update;

  if not found
     or v_operation.operation_kind = 'finalize'
     or v_operation.status <> 'running'
     or v_operation.owner_token is distinct from p_owner_token
     or v_operation.fencing_version <> p_fencing_version
     or v_operation.current_attempt_id is distinct from p_attempt_id
     or v_operation.lease_expires_at <= now() then
    return jsonb_build_object('status', 'stale');
  end if;

  update public.generation_runs
  set status = 'failed',
      error_code = p_error_code,
      error_message = null,
      provider_status = p_provider_status,
      provider_request_id = p_provider_request_id,
      provider_duration_ms = p_provider_duration_ms,
      database_commit_duration_ms = floor(extract(epoch from (clock_timestamp() - v_database_started_at)) * 1000)::bigint,
      total_duration_ms = floor(extract(epoch from (now() - started_at)) * 1000)::bigint,
      retry_reason = p_retry_reason,
      deadline_exceeded = now() >= v_run.hard_deadline_at,
      completed_at = now()
  where id = p_attempt_id
    and status = 'running';

  if not found then
    return jsonb_build_object('status', 'stale');
  end if;

  v_next_eligible_at := now() + make_interval(
    secs => least(greatest(coalesce(p_retry_delay_seconds, 5), 1), 120)
  );
  v_can_retry := p_retryable
    and now() < v_run.hard_deadline_at
    and v_next_eligible_at < v_run.hard_deadline_at
    and v_operation.provider_attempt_count < 3
    and v_run.retry_credits_remaining > 0
    and v_run.provider_invocations_used < least(v_run.provider_invocation_limit, 40);

  if v_can_retry then
    update public.generation_operations
    set status = 'retry_wait',
        owner_token = null,
        lease_expires_at = null,
        next_eligible_at = v_next_eligible_at,
        provider_status = p_provider_status,
        provider_request_id = p_provider_request_id,
        provider_duration_ms = p_provider_duration_ms,
        total_duration_ms = p_total_duration_ms,
        failure_category = p_failure_category,
        error_code = p_error_code,
        retry_reason = p_retry_reason,
        retry_allowed = true,
        settled_at = now(),
        updated_at = now()
    where id = v_operation.id
      and owner_token = p_owner_token
      and fencing_version = p_fencing_version;

    if not found then
      raise exception 'generation_retry_cas_failed' using errcode = '40001';
    end if;

    update public.generation_executions
    set retry_allowed = true,
        last_progress_at = now(),
        updated_at = now()
    where id = p_generation_run_id
      and status = 'running';

    return jsonb_build_object(
      'status', 'retry_wait',
      'operationId', v_operation.id,
      'nextEligibleAt', v_next_eligible_at
    );
  end if;

  update public.generation_operations
  set status = 'failed',
      owner_token = null,
      lease_expires_at = null,
      provider_status = p_provider_status,
      provider_request_id = p_provider_request_id,
      provider_duration_ms = p_provider_duration_ms,
      total_duration_ms = p_total_duration_ms,
      failure_category = p_failure_category,
      error_code = p_error_code,
      retry_reason = p_retry_reason,
      retry_allowed = p_retryable,
      deadline_exceeded = now() >= v_run.hard_deadline_at,
      settled_at = now(),
      updated_at = now()
  where id = v_operation.id
    and owner_token = p_owner_token
    and fencing_version = p_fencing_version;

  if not found then
    raise exception 'generation_failure_cas_failed' using errcode = '40001';
  end if;

  perform public._terminalize_generation_execution(
    p_generation_run_id,
    case
      when now() >= v_run.hard_deadline_at then 'deadline'
      when p_retryable then 'provider_exhausted'
      else p_failure_category
    end,
    case
      when now() >= v_run.hard_deadline_at then 'GENERATION_DEADLINE_EXCEEDED'
      when p_retryable and v_operation.provider_attempt_count >= 3 then 'PROVIDER_ATTEMPTS_EXHAUSTED'
      when p_retryable and v_run.retry_credits_remaining <= 0 then 'GENERATION_RETRY_BUDGET_EXHAUSTED'
      when p_retryable and v_run.provider_invocations_used >= least(v_run.provider_invocation_limit, 40) then 'GENERATION_INVOCATION_LIMIT_REACHED'
      else p_error_code
    end,
    p_retryable and now() < v_run.hard_deadline_at
  );

  return jsonb_build_object('status', 'failed', 'operationId', v_operation.id);
end;
$$;

create or replace function public.finalize_generation_execution(
  p_generation_run_id uuid,
  p_operation_key text,
  p_owner_token uuid,
  p_fencing_version bigint,
  p_guide_id uuid,
  p_guide_title text,
  p_guide_json jsonb,
  p_validation_warnings jsonb,
  p_source_checksum text,
  p_guide_result_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_operation public.generation_operations%rowtype;
  v_guide_id uuid;
  v_span_count bigint;
  v_database_snapshot_hash text;
  v_guide_result_hash text;
begin
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  if p_guide_id is null
     or nullif(btrim(p_guide_title), '') is null
     or p_guide_json is null
     or jsonb_typeof(p_guide_json) <> 'object'
     or p_validation_warnings is null
     or jsonb_typeof(p_validation_warnings) <> 'array'
     or p_source_checksum is null or p_source_checksum !~ '^[0-9a-f]{64}$'
     or p_guide_result_hash is null or p_guide_result_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_generation_finalize_payload' using errcode = '22023';
  end if;

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found or v_run.status not in ('queued', 'running') then
    return jsonb_build_object('status', 'stale');
  end if;
  if now() >= v_run.hard_deadline_at then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
    );
    return jsonb_build_object('status', 'deadline_exceeded');
  end if;
  if v_run.source_snapshot_hash <> p_source_checksum
     or not exists (
       select 1 from public.preparation_sessions as session
       where session.id = v_run.session_id
         and session.current_generation_run_id = v_run.id
         and session.deleted_at is null
     ) then
    return jsonb_build_object('status', 'stale');
  end if;

  select count(*), encode(extensions.digest(string_agg(span.content_hash, ':' order by span.content_hash), 'sha256'), 'hex')
  into v_span_count, v_database_snapshot_hash
  from public.source_spans as span
  join public.sources as source
    on source.id = span.source_id
   and source.status in ('ready', 'ready_with_gaps')
  where span.session_id = v_run.session_id;

  if v_span_count = 0 or v_database_snapshot_hash is distinct from v_run.source_snapshot_hash then
    perform public._terminalize_generation_execution(
      p_generation_run_id, 'source_superseded', 'SOURCE_SNAPSHOT_CHANGED', false
    );
    return jsonb_build_object('status', 'source_superseded');
  end if;

  select * into v_operation
  from public.generation_operations
  where generation_run_id = p_generation_run_id
    and operation_key = p_operation_key
  for update;

  if not found
     or v_operation.operation_kind <> 'finalize'
     or v_operation.status <> 'running'
     or v_operation.owner_token is distinct from p_owner_token
     or v_operation.fencing_version <> p_fencing_version
     or v_operation.lease_expires_at <= now() then
    return jsonb_build_object('status', 'stale');
  end if;
  if cardinality(v_operation.dependency_operation_ids) = 0
     or exists (
       select 1
       from unnest(v_operation.dependency_operation_ids) as dependency(operation_id)
       left join public.generation_operations as committed
         on committed.id = dependency.operation_id
        and committed.generation_run_id = p_generation_run_id
       where committed.id is null or committed.status <> 'succeeded'
     )
     or exists (
       select 1 from public.generation_operations as unfinished
       where unfinished.generation_run_id = p_generation_run_id
         and unfinished.id <> v_operation.id
         and unfinished.status <> 'succeeded'
     ) then
    return jsonb_build_object('status', 'dependencies_pending');
  end if;

  v_guide_result_hash := encode(extensions.digest(p_guide_json::text, 'sha256'), 'hex');

  insert into public.study_guides as guide (
    id, session_id, schema_version, prompt_version, source_checksum,
    guide_json, validation_warnings, title, updated_at
  ) values (
    p_guide_id, v_run.session_id, v_run.schema_version, v_run.prompt_version,
    p_source_checksum, p_guide_json, p_validation_warnings, p_guide_title, now()
  )
  on conflict (session_id) do update set
    schema_version = excluded.schema_version,
    prompt_version = excluded.prompt_version,
    source_checksum = excluded.source_checksum,
    guide_json = excluded.guide_json,
    validation_warnings = excluded.validation_warnings,
    title = excluded.title,
    deleted_at = null,
    archived_at = null,
    updated_at = now()
  returning guide.id into v_guide_id;

  update public.generation_operations
  set status = 'succeeded',
      result_hash = v_guide_result_hash,
      owner_token = null,
      lease_expires_at = null,
      retry_allowed = false,
      settled_at = now(),
      updated_at = now()
  where id = v_operation.id
    and status = 'running'
    and owner_token = p_owner_token
    and fencing_version = p_fencing_version;

  if not found then
    raise exception 'generation_finalize_cas_failed' using errcode = '40001';
  end if;

  update public.generation_executions
  set status = 'succeeded',
      public_stage = 'complete',
      dispatch_state = 'succeeded',
      dispatch_token = null,
      dispatch_lease_expires_at = null,
      retry_allowed = false,
      last_progress_at = now(),
      completed_at = now(),
      updated_at = now()
  where id = p_generation_run_id
    and status in ('queued', 'running');

  if not found then
    raise exception 'generation_finalize_run_cas_failed' using errcode = '40001';
  end if;

  update public.preparation_sessions
  set state = 'guide_ready',
      current_stage = 'guide_ready',
      failed_stage = null,
      error_code = null,
      error_message = null,
      updated_at = now()
  where id = v_run.session_id
    and current_generation_run_id = p_generation_run_id;

  if not found then
    raise exception 'generation_finalize_session_cas_failed' using errcode = '40001';
  end if;

  update public.generation_workflow_instances
  set status = 'completed',
      error_code = null,
      completed_at = now(),
      last_seen_at = now()
  where generation_run_id = p_generation_run_id
    and status = 'acknowledged';

  return jsonb_build_object(
    'status', 'succeeded',
    'generationRunId', p_generation_run_id,
    'guideId', v_guide_id
  );
end;
$$;

create or replace function public.get_generation_execution_status(
  p_generation_run_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'generationRunId', execution.id,
    'status', execution.status,
    'stage', case
      when execution.status = 'succeeded' then 'complete'
      when execution.status = 'failed' then 'failed'
      when exists (
        select 1 from public.generation_operations operation
        where operation.generation_run_id = execution.id
          and operation.operation_kind in ('plan_topics', 'extract_topics', 'merge_topics')
          and operation.status <> 'succeeded'
      ) then 'planning'
      when exists (
        select 1 from public.generation_operations operation
        where operation.generation_run_id = execution.id
          and operation.operation_kind = 'generate_guide'
          and operation.status <> 'succeeded'
      ) then 'generating_guide'
      when exists (
        select 1 from public.generation_operations operation
        where operation.generation_run_id = execution.id
          and operation.operation_kind = 'grounding_verify'
          and operation.status <> 'succeeded'
      ) then 'checking_grounding'
      when exists (
        select 1 from public.generation_operations operation
        where operation.generation_run_id = execution.id
          and operation.operation_kind = 'finalize'
      ) then 'finalizing'
      else execution.public_stage
    end,
    'dispatchState', execution.dispatch_state,
    'completedOperations', (
      select count(*) from public.generation_operations operation
      where operation.generation_run_id = execution.id
        and operation.status = 'succeeded'
    ),
    'totalOperations', (
      select count(*) from public.generation_operations operation
      where operation.generation_run_id = execution.id
        and operation.status <> 'cancelled'
    ),
    'providerInvocationsUsed', execution.provider_invocations_used,
    'retryCreditsRemaining', execution.retry_credits_remaining,
    'failureCategory', execution.failure_category,
    'errorCode', execution.error_code,
    'retryAllowed', execution.retry_allowed,
    'supportId', execution.support_id,
    'lastProgressAt', execution.last_progress_at,
    'hardDeadlineAt', execution.hard_deadline_at
  )
  from public.generation_executions as execution
  where execution.id = p_generation_run_id;
$$;

create or replace function public.get_generation_operation_context(
  p_generation_run_id uuid,
  p_operation_key text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'generationRunId', execution.id,
    'sessionId', execution.session_id,
    'sessionTitle', session.title,
    'runStatus', execution.status,
    'sourceSnapshotHash', execution.source_snapshot_hash,
    'executionContractHash', execution.execution_contract_hash,
    'provider', execution.provider,
    'model', execution.model,
    'promptVersion', execution.prompt_version,
    'schemaVersion', execution.schema_version,
    'pipelineVersion', execution.pipeline_version,
    'parsingContractVersion', execution.parsing_contract_version,
    'hardDeadlineAt', execution.hard_deadline_at,
    'operationId', operation.id,
    'operationKey', operation.operation_key,
    'operationKind', operation.operation_kind,
    'operationVersion', operation.operation_version,
    'operationStatus', operation.status,
    'operationInputHash', operation.operation_input_hash,
    'input', operation.input_json,
    'resultHash', operation.result_hash,
    'result', operation.result_json,
    'dependencies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'operationId', dependency.id,
        'operationKey', dependency.operation_key,
        'operationKind', dependency.operation_kind,
        'resultHash', dependency.result_hash,
        'result', dependency.result_json
      ) order by ordinality)
      from unnest(operation.dependency_operation_ids) with ordinality as requested(operation_id, ordinality)
      join public.generation_operations as dependency
        on dependency.id = requested.operation_id
       and dependency.generation_run_id = execution.id
       and dependency.status = 'succeeded'
    ), '[]'::jsonb),
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', source.id,
        'displayName', source.display_name,
        'kind', source.kind,
        'status', source.status,
        'warnings', source.warnings,
        'errorCode', source.error_code
      ) order by source.created_at, source.id)
      from public.sources as source
      where source.session_id = execution.session_id
        and source.status in ('ready', 'ready_with_gaps')
    ), '[]'::jsonb),
    'spans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', span.id,
        'sourceId', span.source_id,
        'locatorKind', span.locator_kind,
        'locatorNumber', span.locator_number,
        'ordinal', span.ordinal,
        'text', span.text,
        'excerpt', span.excerpt,
        'contentHash', span.content_hash
      ) order by span.source_id, span.locator_number, span.ordinal)
      from public.source_spans as span
      join public.sources as source
        on source.id = span.source_id
       and source.status in ('ready', 'ready_with_gaps')
      where span.session_id = execution.session_id
    ), '[]'::jsonb)
  )
  from public.generation_executions as execution
  join public.preparation_sessions as session
    on session.id = execution.session_id
   and session.current_generation_run_id = execution.id
   and session.deleted_at is null
  join public.generation_operations as operation
    on operation.generation_run_id = execution.id
   and operation.operation_key = p_operation_key
  where execution.id = p_generation_run_id;
$$;

create or replace function public.expire_generation_execution(
  p_generation_run_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
begin
  perform pg_advisory_xact_lock(76498231);
  perform pg_advisory_xact_lock(hashtextextended(p_generation_run_id::text, 76498231));

  select * into v_run
  from public.generation_executions
  where id = p_generation_run_id
  for update;

  if not found
     or v_run.status not in ('queued', 'running')
     or now() < v_run.hard_deadline_at then
    return false;
  end if;

  return public._terminalize_generation_execution(
    p_generation_run_id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
  );
end;
$$;

create or replace function public.watchdog_generation_executions(
  p_limit integer default 20,
  p_stale_seconds integer default 120
)
returns table(generation_run_id uuid, action text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_run public.generation_executions%rowtype;
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_stale_seconds integer := least(greatest(coalesce(p_stale_seconds, 120), 30), 900);
begin
  perform pg_advisory_xact_lock(76498231);

  for v_run in
    select execution.*
    from public.generation_executions as execution
    where execution.status in ('queued', 'running')
      and (
        execution.hard_deadline_at <= now()
        or execution.dispatch_attempt_count >= execution.dispatch_attempt_limit
        or (
          execution.dispatch_state in ('workflow_acked', 'running')
          and execution.last_progress_at <= now() - make_interval(secs => v_stale_seconds)
          and not exists (
            select 1 from public.generation_operations as active_operation
            where active_operation.generation_run_id = execution.id
              and active_operation.status = 'running'
              and active_operation.lease_expires_at > now()
          )
          and not exists (
            select 1 from public.generation_operations as sleeping_operation
            where sleeping_operation.generation_run_id = execution.id
              and sleeping_operation.status = 'retry_wait'
              and sleeping_operation.next_eligible_at > now()
          )
        )
      )
    order by execution.hard_deadline_at, execution.last_progress_at
    limit v_limit
    for update skip locked
  loop
    perform pg_advisory_xact_lock(hashtextextended(v_run.id::text, 76498231));

    if v_run.hard_deadline_at <= now() then
      perform public._terminalize_generation_execution(
        v_run.id, 'deadline', 'GENERATION_DEADLINE_EXCEEDED', false
      );
      generation_run_id := v_run.id;
      action := 'deadline_failed';
      return next;
    elsif v_run.dispatch_attempt_count >= v_run.dispatch_attempt_limit then
      perform public._terminalize_generation_execution(
        v_run.id, 'workflow_infrastructure', 'GENERATION_DISPATCH_EXHAUSTED', true
      );
      generation_run_id := v_run.id;
      action := 'dispatch_failed';
      return next;
    else
      update public.generation_executions
      set dispatch_state = 'dispatch_pending',
          dispatch_token = null,
          dispatch_lease_expires_at = null,
          next_dispatch_at = now(),
          last_progress_at = now(),
          updated_at = now()
      where id = v_run.id
        and status in ('queued', 'running');

      update public.generation_workflow_instances
      set status = 'failed',
          error_code = 'WORKFLOW_STALLED',
          completed_at = now(),
          last_seen_at = now()
      where generation_run_id = v_run.id
        and status = 'acknowledged';

      generation_run_id := v_run.id;
      action := 'redispatch_pending';
      return next;
    end if;
  end loop;
end;
$$;

-- Internal helper is callable only by the security-definer RPCs above.
revoke all on function public._terminalize_generation_execution(uuid, text, text, boolean)
  from public, anon, authenticated, service_role;

revoke all on function public.record_generation_attempt(
  uuid, uuid, text, text, integer, text, text, text, text, jsonb, text, timestamptz, timestamptz
) from public, anon, authenticated, service_role;
grant execute on function public.record_generation_attempt(
  uuid, uuid, text, text, integer, text, text, text, text, jsonb, text, timestamptz, timestamptz
) to service_role;

revoke all on function public.claim_generation_execution(
  uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_execution(
  uuid, text, text, text, text, text, text, text, text, text, text, text, jsonb
) to service_role;

revoke all on function public.create_generation_operation(
  uuid, uuid, text, text, text, text, jsonb, uuid[], text[], text
) from public, anon, authenticated, service_role;
grant execute on function public.create_generation_operation(
  uuid, uuid, text, text, text, text, jsonb, uuid[], text[], text
) to service_role;

revoke all on function public.claim_generation_dispatch(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_dispatch(uuid, integer)
  to service_role;

revoke all on function public.acknowledge_generation_workflow(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.acknowledge_generation_workflow(uuid, uuid, text, text)
  to service_role;

revoke all on function public.claim_generation_operation(uuid, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_generation_operation(uuid, text, text, text, integer)
  to service_role;

revoke all on function public.settle_generation_operation_success(
  uuid, text, uuid, bigint, uuid, jsonb, text, jsonb, text, integer, text, bigint, bigint, bigint
) from public, anon, authenticated, service_role;
grant execute on function public.settle_generation_operation_success(
  uuid, text, uuid, bigint, uuid, jsonb, text, jsonb, text, integer, text, bigint, bigint, bigint
) to service_role;

revoke all on function public.settle_generation_operation_retry_or_fail(
  uuid, text, uuid, bigint, uuid, boolean, text, text, integer, text, text, bigint, bigint, integer
) from public, anon, authenticated, service_role;
grant execute on function public.settle_generation_operation_retry_or_fail(
  uuid, text, uuid, bigint, uuid, boolean, text, text, integer, text, text, bigint, bigint, integer
) to service_role;

revoke all on function public.finalize_generation_execution(
  uuid, text, uuid, bigint, uuid, text, jsonb, jsonb, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.finalize_generation_execution(
  uuid, text, uuid, bigint, uuid, text, jsonb, jsonb, text, text
) to service_role;

revoke all on function public.get_generation_execution_status(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_generation_execution_status(uuid)
  to service_role;

revoke all on function public.get_generation_operation_context(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.get_generation_operation_context(uuid, text)
  to service_role;

revoke all on function public.expire_generation_execution(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.expire_generation_execution(uuid)
  to service_role;

revoke all on function public.watchdog_generation_executions(integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.watchdog_generation_executions(integer, integer)
  to service_role;
