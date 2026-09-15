-- Make terminal Guide delivery and billing settlement one database transaction,
-- and expose bounded claims for the existing minute reconciler.

create or replace function public.finalize_generation_v2_request(
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
  v_request public.generation_v2_requests;
begin
  select * into v_request
  from public.assemble_generation_v2_request(
    p_request_id,
    p_delivery_status,
    p_guide_json
  );

  perform public.billing_settle_generation_v2(
    p_request_id,
    p_delivery_status
  );

  return v_request;
end;
$$;

create or replace function public.reconcile_generation_v2_billing(
  p_limit integer default 20
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_reconciled integer := 0;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid v2 billing reconciliation limit' using errcode = '22023';
  end if;

  for v_request in
    select request.id, request.status
    from public.billing_generation_v2_reservations reservation
    join public.generation_v2_requests request on request.id = reservation.request_id
    where reservation.status = 'reserved'
      and request.status in ('complete', 'complete_with_gaps', 'failed_no_guide')
    order by request.completed_at, request.id
    for update of reservation skip locked
    limit p_limit
  loop
    perform public.billing_settle_generation_v2(v_request.id, v_request.status);
    v_reconciled := v_reconciled + 1;
  end loop;

  return v_reconciled;
end;
$$;

create or replace function public.claim_stale_generation_v2_requests(
  p_limit integer default 20,
  p_stale_seconds integer default 300
)
returns table(request_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'invalid v2 reconciliation limit' using errcode = '22023';
  end if;
  if p_stale_seconds < 60 or p_stale_seconds > 3600 then
    raise exception 'invalid v2 reconciliation stale window' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select request.id
    from public.generation_v2_requests request
    where request.status in ('queued', 'working')
      and request.last_progress_at <= now() - make_interval(secs => p_stale_seconds)
    order by request.last_progress_at, request.id
    for update skip locked
    limit p_limit
  )
  update public.generation_v2_requests request
  set last_progress_at = now(), updated_at = now()
  from candidates
  where request.id = candidates.id
  returning request.id;
end;
$$;

revoke all on function public.finalize_generation_v2_request(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.reconcile_generation_v2_billing(integer) from public, anon, authenticated;
revoke all on function public.claim_stale_generation_v2_requests(integer, integer) from public, anon, authenticated;
grant execute on function public.finalize_generation_v2_request(uuid, text, jsonb) to service_role;
grant execute on function public.reconcile_generation_v2_billing(integer) to service_role;
grant execute on function public.claim_stale_generation_v2_requests(integer, integer) to service_role;
