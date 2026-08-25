create table if not exists public.quick_checks (
  id uuid primary key,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  guide_id uuid not null,
  guide_checksum text not null,
  schema_version text not null,
  prompt_version text not null,
  requested_question_count integer not null check (requested_question_count between 5 and 10),
  question_count integer not null check (question_count between 1 and 10),
  quick_check_json jsonb not null,
  validation_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, guide_checksum, requested_question_count)
);

create index if not exists quick_checks_session_idx
  on public.quick_checks(session_id, created_at desc);

create table if not exists public.quick_check_attempts (
  id uuid primary key,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  quick_check_id uuid not null references public.quick_checks(id) on delete cascade,
  status text not null check (status in ('submitted')),
  selected_answers jsonb not null,
  result_json jsonb not null,
  correct_count integer not null check (correct_count >= 0),
  scored_count integer not null check (scored_count > 0),
  submitted_at timestamptz not null default now()
);

create index if not exists quick_check_attempts_session_idx
  on public.quick_check_attempts(session_id, submitted_at desc);

alter table public.quick_checks enable row level security;
alter table public.quick_check_attempts enable row level security;

-- As in Phase 1, browser access is mediated by Route Handlers after the
-- high-entropy session cookie is verified. Direct anon/authenticated access
-- remains closed by RLS.
