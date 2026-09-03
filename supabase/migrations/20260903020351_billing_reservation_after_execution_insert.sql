-- The reservation references generation_executions(id), so its trigger must
-- run only after the parent row is visible to FK checks. An exception from
-- billing_reserve_generation still aborts this INSERT and its transaction.
drop trigger if exists billing_reserve_generation on public.generation_executions;
create trigger billing_reserve_generation
  after insert on public.generation_executions
  for each row execute function public.billing_reserve_generation();
