-- Product-3B: bounded owner Guide lists and lifecycle cleanup access paths.

create index if not exists preparation_sessions_owner_active_recent_idx
  on public.preparation_sessions(owner_user_id, last_accessed_at desc, updated_at desc, id desc)
  where owner_user_id is not null and archived_at is null and deleted_at is null;

create index if not exists preparation_sessions_owner_archived_recent_idx
  on public.preparation_sessions(owner_user_id, archived_at desc, id desc)
  where owner_user_id is not null and archived_at is not null and deleted_at is null;

create index if not exists sources_session_idx
  on public.sources(session_id);

create index if not exists study_guides_active_recent_idx
  on public.study_guides(last_accessed_at desc, updated_at desc, id desc)
  where archived_at is null and deleted_at is null;

create index if not exists study_guides_archived_recent_idx
  on public.study_guides(archived_at desc, id desc)
  where archived_at is not null and deleted_at is null;

create index if not exists preparation_sessions_purge_due_idx
  on public.preparation_sessions(purge_after)
  where purge_after is not null;
