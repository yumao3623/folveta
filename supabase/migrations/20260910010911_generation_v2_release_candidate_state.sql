-- Release-candidate state fixes:
-- 1. parser/source coverage gaps participate in the terminal delivery status;
-- 2. a changed immutable source snapshot atomically aborts the old request and
--    releases its billing reservation;
-- 3. V2 Data API privileges are explicit ahead of Supabase's 2026-10-30
--    default-grant change. RLS remains authoritative for authenticated reads.

create or replace function public.assemble_generation_v2_request(
  p_request_id uuid,
  p_delivery_status text,
  p_guide_json jsonb default null
)
returns public.generation_v2_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.generation_v2_requests;
  required_count integer;
  complete_count integer;
  guide_gap_count integer := 0;
  derived_status text;
begin
  if p_delivery_status not in ('complete', 'complete_with_gaps', 'failed_no_guide') then
    raise exception 'invalid v2 request delivery status' using errcode = '22023';
  end if;

  select * into request_row
  from public.generation_v2_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'unknown v2 request' using errcode = 'P0002'; end if;
  if request_row.status in ('complete', 'complete_with_gaps', 'failed_no_guide') then return request_row; end if;

  select count(*), count(*) filter (where artifact.status = 'complete')
    into required_count, complete_count
  from public.generation_v2_request_artifacts link
  join public.generation_v2_artifacts artifact on artifact.id = link.artifact_id
  where link.request_id = request_row.id and link.required;

  if exists (
    select 1
    from public.generation_v2_request_artifacts link
    join public.generation_v2_artifacts artifact on artifact.id = link.artifact_id
    where link.request_id = request_row.id
      and link.required
      and artifact.status not in ('complete', 'gap')
  ) then
    raise exception 'v2 request artifacts are not terminal' using errcode = '55000';
  end if;

  if p_guide_json is not null and jsonb_typeof(p_guide_json #> '{coverage,gaps}') = 'array' then
    guide_gap_count := jsonb_array_length(p_guide_json #> '{coverage,gaps}');
  end if;

  derived_status := case
    when complete_count = 0 then 'failed_no_guide'
    when complete_count < required_count or guide_gap_count > 0 then 'complete_with_gaps'
    else 'complete'
  end;
  if p_delivery_status <> derived_status then
    raise exception 'v2 request delivery status does not match artifacts and coverage gaps' using errcode = '22023';
  end if;

  if p_delivery_status in ('complete', 'complete_with_gaps') then
    if p_guide_json is null then raise exception 'v2 guide required for delivery' using errcode = '22004'; end if;
    insert into public.generation_v2_guides (
      request_id, session_id, source_snapshot_hash, generation_contract_hash,
      delivery_status, guide_json
    ) values (
      request_row.id, request_row.session_id, request_row.source_snapshot_hash,
      request_row.generation_contract_hash, p_delivery_status, p_guide_json
    ) on conflict (request_id) do nothing;
  end if;

  update public.generation_v2_requests
  set status = p_delivery_status,
      completed_at = now(),
      last_progress_at = now(),
      updated_at = now()
  where id = request_row.id;

  select * into request_row
  from public.generation_v2_requests
  where id = p_request_id;
  return request_row;
end;
$$;

create or replace function public.abort_generation_v2_request(
  p_request_id uuid,
  p_code text,
  p_message text
)
returns public.generation_v2_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.generation_v2_requests;
begin
  if nullif(btrim(p_code), '') is null or char_length(p_code) > 100 then
    raise exception 'invalid v2 abort code' using errcode = '22023';
  end if;
  if nullif(btrim(p_message), '') is null or char_length(p_message) > 500 then
    raise exception 'invalid v2 abort message' using errcode = '22023';
  end if;

  select * into request_row
  from public.generation_v2_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'unknown v2 request' using errcode = 'P0002'; end if;
  if request_row.status in ('complete', 'complete_with_gaps', 'failed_no_guide') then return request_row; end if;

  update public.generation_v2_artifacts artifact
  set status = 'gap',
      result_json = null,
      result_hash = null,
      gap_code = p_code,
      gap_message = p_message,
      retryable = false,
      retry_at = null,
      lease_id = null,
      lease_expires_at = null,
      completed_at = null,
      updated_at = now()
  where artifact.id in (
    select link.artifact_id
    from public.generation_v2_request_artifacts link
    where link.request_id = p_request_id
  ) and artifact.status in ('pending', 'working', 'retry_wait');

  update public.generation_v2_requests
  set status = 'failed_no_guide',
      completed_at = now(),
      last_progress_at = now(),
      updated_at = now()
  where id = p_request_id;

  perform public.billing_settle_generation_v2(p_request_id, 'failed_no_guide');

  select * into request_row
  from public.generation_v2_requests
  where id = p_request_id;
  return request_row;
end;
$$;

revoke all on function public.assemble_generation_v2_request(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.abort_generation_v2_request(uuid, text, text) from public, anon, authenticated;
grant execute on function public.assemble_generation_v2_request(uuid, text, jsonb) to service_role;
grant execute on function public.abort_generation_v2_request(uuid, text, text) to service_role;

grant select on table public.generation_v2_requests to authenticated;
grant select on table public.generation_v2_artifacts to authenticated;
grant select on table public.generation_v2_guides to authenticated;
grant select on table public.generation_v2_request_artifacts to authenticated;
grant select on table public.billing_generation_v2_reservations to authenticated;
grant select, insert, update, delete on table public.generation_v2_requests to service_role;
grant select, insert, update, delete on table public.generation_v2_artifacts to service_role;
grant select, insert, update, delete on table public.generation_v2_guides to service_role;
grant select, insert, update, delete on table public.generation_v2_request_artifacts to service_role;
grant select, insert, update, delete on table public.billing_generation_v2_reservations to service_role;
