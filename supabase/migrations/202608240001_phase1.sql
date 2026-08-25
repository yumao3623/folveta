create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.preparation_sessions (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  title text not null default 'Untitled Study Guide',
  state text not null default 'draft_materials' check (state in (
    'draft_materials', 'parsing', 'ready', 'ready_with_gaps',
    'extracting_topics', 'merging_topics', 'generating_guide',
    'verifying_guide', 'guide_ready', 'failed_retryable', 'failed_terminal'
  )),
  current_stage text,
  failed_stage text,
  error_code text,
  error_message text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  display_name text not null,
  kind text not null check (kind in ('pdf', 'pptx')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  storage_path text not null unique,
  file_hash text,
  status text not null default 'uploading' check (status in (
    'uploading', 'uploaded', 'parsing', 'ready', 'ready_with_gaps', 'cannot_use'
  )),
  unit_count integer not null default 0,
  readable_unit_count integer not null default 0,
  extracted_character_count integer not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sources_session_hash_unique
  on public.sources(session_id, file_hash)
  where file_hash is not null and status <> 'cannot_use';

create table if not exists public.source_units (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  locator_kind text not null check (locator_kind in ('page', 'slide')),
  locator_number integer not null check (locator_number > 0),
  title text,
  raw_text text not null,
  normalized_text text not null,
  readable boolean not null,
  warnings jsonb not null default '[]'::jsonb,
  content_hash text not null,
  unique(source_id, locator_kind, locator_number)
);

create table if not exists public.source_spans (
  id text primary key,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  locator_kind text not null check (locator_kind in ('page', 'slide')),
  locator_number integer not null check (locator_number > 0),
  ordinal integer not null check (ordinal >= 0),
  text text not null,
  excerpt text not null,
  content_hash text not null,
  unique(source_id, locator_kind, locator_number, ordinal)
);

create index if not exists source_spans_session_idx on public.source_spans(session_id);
create index if not exists source_spans_source_idx on public.source_spans(source_id);

create table if not exists public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  stage text not null,
  status text not null check (status in ('running', 'succeeded', 'failed')),
  attempt integer not null default 1,
  prompt_version text not null,
  schema_version text not null,
  provider text not null,
  model text not null,
  usage jsonb,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.study_guides (
  id uuid primary key,
  session_id uuid not null references public.preparation_sessions(id) on delete cascade,
  schema_version text not null,
  prompt_version text not null,
  source_checksum text not null,
  guide_json jsonb not null,
  validation_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id)
);

alter table public.preparation_sessions enable row level security;
alter table public.sources enable row level security;
alter table public.source_units enable row level security;
alter table public.source_spans enable row level security;
alter table public.generation_runs enable row level security;
alter table public.study_guides enable row level security;

-- The browser never reads these tables directly. Route Handlers use the service
-- role after verifying the high-entropy session cookie; RLS therefore remains
-- closed to anon/authenticated clients.
