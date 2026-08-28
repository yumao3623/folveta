-- Follow-up for the deployed 202608280004 migration. Supabase keeps pgcrypto
-- in the extensions schema, while the durable RPCs explicitly reference the
-- historical public-qualified UUID function name.
create or replace function public.gen_random_uuid()
returns uuid
language sql
volatile
parallel safe
set search_path = ''
as $$
  select extensions.gen_random_uuid();
$$;

revoke all on function public.gen_random_uuid()
  from public, anon, authenticated, service_role;

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

      update public.generation_workflow_instances as instance
      set status = 'failed',
          error_code = 'WORKFLOW_STALLED',
          completed_at = now(),
          last_seen_at = now()
      where instance.generation_run_id = v_run.id
        and instance.status = 'acknowledged';

      generation_run_id := v_run.id;
      action := 'redispatch_pending';
      return next;
    end if;
  end loop;
end;
$$;
