alter table public.preparation_sessions
  add column if not exists generation_checkpoint jsonb;

comment on column public.preparation_sessions.generation_checkpoint is
  'Private, source-bound Guide generation checkpoint. Contains intermediate model artifacts only; never exposed to clients or diagnostics.';
