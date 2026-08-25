-- Product-3A: durable Supabase Auth ownership with a one-time anonymous claim.

alter table public.preparation_sessions
  alter column access_token_hash drop not null,
  alter column expires_at drop not null,
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists claimed_at timestamptz,
  add column if not exists last_accessed_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_after timestamptz;

alter table public.preparation_sessions
  drop constraint if exists preparation_sessions_identity_check;

alter table public.preparation_sessions
  add constraint preparation_sessions_identity_check check (
    (
      owner_user_id is null
      and access_token_hash is not null
      and expires_at is not null
    )
    or
    (
      owner_user_id is not null
      and access_token_hash is null
      and expires_at is null
    )
  );

create unique index if not exists preparation_sessions_access_token_unique
  on public.preparation_sessions(access_token_hash)
  where access_token_hash is not null;

create index if not exists preparation_sessions_owner_recent_idx
  on public.preparation_sessions(owner_user_id, last_accessed_at desc)
  where owner_user_id is not null and deleted_at is null;

create index if not exists preparation_sessions_anonymous_expiry_idx
  on public.preparation_sessions(expires_at)
  where owner_user_id is null and deleted_at is null;

alter table public.study_guides
  add column if not exists title text,
  add column if not exists last_accessed_at timestamptz not null default now(),
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.study_guides as guide
set title = session.title
from public.preparation_sessions as session
where guide.session_id = session.id and guide.title is null;

alter table public.study_guides
  alter column title set default 'Untitled Study Guide',
  alter column title set not null;

create index if not exists study_guides_recent_idx
  on public.study_guides(last_accessed_at desc)
  where deleted_at is null;

alter table public.quick_checks
  drop constraint if exists quick_checks_guide_id_fkey;

alter table public.quick_checks
  add constraint quick_checks_guide_id_fkey
  foreign key (guide_id) references public.study_guides(id) on delete cascade
  not valid;

alter table public.quick_checks validate constraint quick_checks_guide_id_fkey;

create or replace function public.claim_current_anonymous_session(token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_session_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  update public.preparation_sessions
  set owner_user_id = auth.uid(),
      access_token_hash = null,
      expires_at = null,
      claimed_at = now(),
      last_accessed_at = now(),
      updated_at = now()
  where access_token_hash = token_hash
    and owner_user_id is null
    and expires_at > now()
    and deleted_at is null
  returning id into claimed_session_id;

  return claimed_session_id;
end;
$$;

revoke all on function public.claim_current_anonymous_session(text) from public;
grant execute on function public.claim_current_anonymous_session(text) to authenticated;

drop policy if exists "Users read owned preparation sessions" on public.preparation_sessions;
create policy "Users read owned preparation sessions"
  on public.preparation_sessions for select to authenticated
  using (owner_user_id = (select auth.uid()) and deleted_at is null);

drop policy if exists "Users create owned preparation sessions" on public.preparation_sessions;
drop policy if exists "Users update owned preparation sessions" on public.preparation_sessions;
drop policy if exists "Users delete owned preparation sessions" on public.preparation_sessions;

drop policy if exists "Users read owned sources" on public.sources;
create policy "Users read owned sources"
  on public.sources for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = sources.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned source units" on public.source_units;
create policy "Users read owned source units"
  on public.source_units for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = source_units.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned source spans" on public.source_spans;
create policy "Users read owned source spans"
  on public.source_spans for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = source_spans.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned generation runs" on public.generation_runs;
create policy "Users read owned generation runs"
  on public.generation_runs for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = generation_runs.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned study guides" on public.study_guides;
create policy "Users read owned study guides"
  on public.study_guides for select to authenticated
  using (deleted_at is null and exists (
    select 1 from public.preparation_sessions session
    where session.id = study_guides.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned quick checks" on public.quick_checks;
create policy "Users read owned quick checks"
  on public.quick_checks for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = quick_checks.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));

drop policy if exists "Users read owned quick check attempts" on public.quick_check_attempts;
create policy "Users read owned quick check attempts"
  on public.quick_check_attempts for select to authenticated
  using (exists (
    select 1 from public.preparation_sessions session
    where session.id = quick_check_attempts.session_id
      and session.owner_user_id = (select auth.uid())
      and session.deleted_at is null
  ));
