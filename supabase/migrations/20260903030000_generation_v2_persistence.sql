-- Generation v2 stores user-deliverable artifacts, not workflow operations.
-- session_id is a stable private lineage: an anonymous claim changes the parent
-- session owner but never changes this lineage or any content identity below.

create table public.generation_v2_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  source_snapshot_hash text not null,
  generation_contract_hash text not null,
  output_language text not null check (output_language in ('match_materials', 'en', 'zh')),
  request_content_key text not null,
  manifest_json jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'working', 'complete', 'complete_with_gaps', 'failed_no_guide')),
  last_progress_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, request_content_key),
  unique (id, session_id)
);

create index generation_v2_requests_resume_idx
  on public.generation_v2_requests(session_id, status, last_progress_at desc);

create table public.generation_v2_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  source_snapshot_hash text not null,
  generation_contract_hash text not null,
  output_language text not null check (output_language in ('match_materials', 'en', 'zh')),
  artifact_kind text not null check (artifact_kind in ('guide', 'section', 'synthesis')),
  partition_key text not null,
  artifact_content_key text not null,
  span_identity_json jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'working', 'retry_wait', 'complete', 'gap')),
  result_json jsonb,
  result_hash text,
  gap_code text,
  gap_message text,
  retryable boolean not null default false,
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 2),
  lease_id uuid,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, artifact_content_key),
  unique (id, session_id),
  check (
    (status = 'complete' and result_json is not null and result_hash is not null and completed_at is not null)
    or (status <> 'complete' and result_json is null and result_hash is null)
  ),
  check ((status = 'working') = (lease_id is not null and lease_expires_at is not null))
);

create index generation_v2_artifacts_claim_idx
  on public.generation_v2_artifacts(status, lease_expires_at)
  where status in ('pending', 'retry_wait', 'working');

-- `study_guides` is a v1 single-row-per-session aggregate. Keeping v2 snapshots
-- separate preserves historical v1 Guides and lets v2 remain immutable.
create table public.generation_v2_guides (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  source_snapshot_hash text not null,
  generation_contract_hash text not null,
  delivery_status text not null check (delivery_status in ('complete', 'complete_with_gaps')),
  guide_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (request_id, session_id) references public.generation_v2_requests(id, session_id) on delete cascade
);

create index generation_v2_guides_session_idx
  on public.generation_v2_guides(session_id, updated_at desc);

create table public.generation_v2_request_artifacts (
  request_id uuid not null,
  artifact_id uuid not null,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  partition_key text not null,
  partition_order integer not null check (partition_order >= 0),
  required boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (request_id, artifact_id),
  unique (request_id, partition_key),
  foreign key (request_id, session_id) references public.generation_v2_requests(id, session_id) on delete cascade,
  foreign key (artifact_id, session_id) references public.generation_v2_artifacts(id, session_id) on delete restrict
);

alter table public.generation_v2_requests enable row level security;
alter table public.generation_v2_artifacts enable row level security;
alter table public.generation_v2_guides enable row level security;
alter table public.generation_v2_request_artifacts enable row level security;

-- Browser clients do not write v2 records. The server and later worker use the
-- service role after session authorization; authenticated reads remain private.
create policy "Users read owned generation v2 requests"
  on public.generation_v2_requests for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = generation_v2_requests.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

create policy "Users read owned generation v2 artifacts"
  on public.generation_v2_artifacts for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = generation_v2_artifacts.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

create policy "Users read owned generation v2 guides"
  on public.generation_v2_guides for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = generation_v2_guides.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

create policy "Users read owned generation v2 request artifacts"
  on public.generation_v2_request_artifacts for select to authenticated
  using (exists (
    select 1
    from public.generation_v2_requests request
    join public.preparation_sessions session on session.id = request.session_id
    where request.id = generation_v2_request_artifacts.request_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

-- Atomic idempotency boundary for a future server-owned v2 runner. No provider
-- work is dispatched here, so a duplicate Generate only returns the same row.
create or replace function public.create_or_join_generation_v2_request(
  p_session_id uuid,
  p_source_snapshot_hash text,
  p_generation_contract_hash text,
  p_output_language text,
  p_request_content_key text,
  p_manifest_json jsonb
)
returns public.generation_v2_requests
language plpgsql
security definer
set search_path = public
as $$
declare request_row public.generation_v2_requests;
begin
  insert into public.generation_v2_requests (
    session_id, source_snapshot_hash, generation_contract_hash, output_language,
    request_content_key, manifest_json
  ) values (
    p_session_id, p_source_snapshot_hash, p_generation_contract_hash, p_output_language,
    p_request_content_key, p_manifest_json
  )
  on conflict (session_id, request_content_key) do update
    set updated_at = public.generation_v2_requests.updated_at
  returning * into request_row;
  return request_row;
end;
$$;

revoke all on function public.create_or_join_generation_v2_request(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.create_or_join_generation_v2_request(uuid, text, text, text, text, jsonb) to service_role;

create or replace function public.claim_generation_v2_artifact(
  p_artifact_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer default 120
)
returns public.generation_v2_artifacts
language plpgsql
security definer
set search_path = public
as $$
declare artifact_row public.generation_v2_artifacts;
begin
  if p_lease_seconds < 1 or p_lease_seconds > 900 then
    raise exception 'invalid v2 artifact lease duration';
  end if;

  update public.generation_v2_artifacts
  set status = 'working', lease_id = p_lease_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempt_count = attempt_count + 1, updated_at = now()
  where id = p_artifact_id
    and (
      status in ('pending', 'retry_wait')
      or (status = 'working' and lease_expires_at <= now())
    )
    and attempt_count < 2
  returning * into artifact_row;
  return artifact_row;
end;
$$;

revoke all on function public.claim_generation_v2_artifact(uuid, uuid, integer) from public;
grant execute on function public.claim_generation_v2_artifact(uuid, uuid, integer) to service_role;

create or replace function public.settle_generation_v2_artifact(
  p_artifact_id uuid,
  p_lease_id uuid,
  p_status text,
  p_result_json jsonb default null,
  p_result_hash text default null,
  p_gap_code text default null,
  p_gap_message text default null,
  p_retryable boolean default false
)
returns public.generation_v2_artifacts
language plpgsql
security definer
set search_path = public
as $$
declare artifact_row public.generation_v2_artifacts;
begin
  if p_status not in ('complete', 'retry_wait', 'gap') then
    raise exception 'invalid v2 artifact settlement status';
  end if;

  update public.generation_v2_artifacts
  set status = p_status,
      result_json = case when p_status = 'complete' then p_result_json else null end,
      result_hash = case when p_status = 'complete' then p_result_hash else null end,
      gap_code = case when p_status = 'complete' then null else p_gap_code end,
      gap_message = case when p_status = 'complete' then null else p_gap_message end,
      retryable = case when p_status = 'retry_wait' then true else p_retryable end,
      lease_id = null, lease_expires_at = null,
      completed_at = case when p_status = 'complete' then now() else null end,
      updated_at = now()
  where id = p_artifact_id
    and status = 'working'
    and lease_id = p_lease_id
    and lease_expires_at > now()
  returning * into artifact_row;
  return artifact_row;
end;
$$;

revoke all on function public.settle_generation_v2_artifact(uuid, uuid, text, jsonb, text, text, text, boolean) from public;
grant execute on function public.settle_generation_v2_artifact(uuid, uuid, text, jsonb, text, text, text, boolean) to service_role;
