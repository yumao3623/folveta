-- Slice 4 runtime primitives. Supabase remains the authoritative state machine;
-- the runner only claims artifacts and submits immutable results.
alter table public.generation_v2_artifacts add column if not exists retry_at timestamptz;

create or replace function public.claim_generation_v2_artifact(
  p_artifact_id uuid,
  p_lease_id uuid,
  p_lease_seconds integer default 120
)
returns public.generation_v2_artifacts
language plpgsql security definer set search_path = public
as $$
declare artifact_row public.generation_v2_artifacts;
begin
  if p_lease_seconds < 1 or p_lease_seconds > 900 then
    raise exception 'invalid v2 artifact lease duration';
  end if;
  -- A runner can crash after its final provider call but before settlement.
  -- That attempt cannot be safely called again, so make its recovery state a
  -- durable gap rather than leaving an unclaimable expired lease forever.
  update public.generation_v2_artifacts
  set status = 'gap', retryable = false, retry_at = null,
      gap_code = 'provider_retry_exhausted',
      gap_message = 'The final provider attempt was interrupted before it could be recorded.',
      lease_id = null, lease_expires_at = null, updated_at = now()
  where id = p_artifact_id
    and status = 'working' and lease_expires_at <= now()
    and attempt_count >= 2;
  update public.generation_v2_artifacts
  set status = 'working', lease_id = p_lease_id,
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      retry_at = null, attempt_count = attempt_count + 1, updated_at = now()
  where id = p_artifact_id
    and (status = 'pending' or (status = 'retry_wait' and (retry_at is null or retry_at <= now()))
      or (status = 'working' and lease_expires_at <= now()))
    and attempt_count < 2
  returning * into artifact_row;
  return artifact_row;
end;
$$;

drop function if exists public.settle_generation_v2_artifact(uuid, uuid, text, jsonb, text, text, text, boolean);
create or replace function public.settle_generation_v2_artifact(
  p_artifact_id uuid,
  p_lease_id uuid,
  p_status text,
  p_result_json jsonb default null,
  p_result_hash text default null,
  p_gap_code text default null,
  p_gap_message text default null,
  p_retryable boolean default false,
  p_retry_after_seconds integer default 1
)
returns public.generation_v2_artifacts
language plpgsql security definer set search_path = public
as $$
declare artifact_row public.generation_v2_artifacts;
begin
  if p_status not in ('complete', 'retry_wait', 'gap') then raise exception 'invalid v2 artifact settlement status'; end if;
  if p_retry_after_seconds < 0 or p_retry_after_seconds > 900 then raise exception 'invalid v2 retry delay'; end if;
  update public.generation_v2_artifacts
  set status = p_status,
      result_json = case when p_status = 'complete' then p_result_json else null end,
      result_hash = case when p_status = 'complete' then p_result_hash else null end,
      gap_code = case when p_status = 'complete' then null else p_gap_code end,
      gap_message = case when p_status = 'complete' then null else p_gap_message end,
      retryable = case when p_status = 'retry_wait' then true else p_retryable end,
      retry_at = case when p_status = 'retry_wait' then now() + make_interval(secs => p_retry_after_seconds) else null end,
      lease_id = null, lease_expires_at = null,
      completed_at = case when p_status = 'complete' then now() else null end,
      updated_at = now()
  where id = p_artifact_id and status = 'working' and lease_id = p_lease_id and lease_expires_at > now()
  returning * into artifact_row;
  return artifact_row;
end;
$$;

create or replace function public.assemble_generation_v2_request(
  p_request_id uuid,
  p_delivery_status text,
  p_guide_json jsonb default null
)
returns public.generation_v2_requests
language plpgsql security definer set search_path = public
as $$
declare request_row public.generation_v2_requests;
declare required_count integer;
declare complete_count integer;
declare derived_status text;
begin
  if p_delivery_status not in ('complete', 'complete_with_gaps', 'failed_no_guide') then raise exception 'invalid v2 request delivery status'; end if;
  select * into request_row from public.generation_v2_requests where id = p_request_id for update;
  if not found then raise exception 'unknown v2 request'; end if;
  if request_row.status in ('complete', 'complete_with_gaps', 'failed_no_guide') then return request_row; end if;
  select count(*), count(*) filter (where artifact.status = 'complete')
    into required_count, complete_count
    from public.generation_v2_request_artifacts link
    join public.generation_v2_artifacts artifact on artifact.id = link.artifact_id
    where link.request_id = request_row.id and link.required;
  if exists (
    select 1 from public.generation_v2_request_artifacts link
    join public.generation_v2_artifacts artifact on artifact.id = link.artifact_id
    where link.request_id = request_row.id and link.required and artifact.status not in ('complete', 'gap')
  ) then raise exception 'v2 request artifacts are not terminal'; end if;
  derived_status := case when complete_count = 0 then 'failed_no_guide'
    when complete_count = required_count then 'complete' else 'complete_with_gaps' end;
  if p_delivery_status <> derived_status then raise exception 'v2 request delivery status does not match artifacts'; end if;
  if p_delivery_status in ('complete', 'complete_with_gaps') then
    if p_guide_json is null then raise exception 'v2 guide required for delivery'; end if;
    insert into public.generation_v2_guides (request_id, session_id, source_snapshot_hash, generation_contract_hash, delivery_status, guide_json)
      values (request_row.id, request_row.session_id, request_row.source_snapshot_hash, request_row.generation_contract_hash, p_delivery_status, p_guide_json)
      on conflict (request_id) do nothing;
  end if;
  update public.generation_v2_requests
    set status = p_delivery_status, completed_at = case when p_delivery_status <> 'working' then now() else null end,
        last_progress_at = now(), updated_at = now()
    where id = request_row.id;
  select * into request_row from public.generation_v2_requests where id = p_request_id;
  return request_row;
end;
$$;
revoke all on function public.claim_generation_v2_artifact(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_generation_v2_artifact(uuid, uuid, integer) to service_role;
revoke all on function public.assemble_generation_v2_request(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.assemble_generation_v2_request(uuid, text, jsonb) to service_role;
revoke all on function public.settle_generation_v2_artifact(uuid, uuid, text, jsonb, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.settle_generation_v2_artifact(uuid, uuid, text, jsonb, text, text, text, boolean, integer) to service_role;
