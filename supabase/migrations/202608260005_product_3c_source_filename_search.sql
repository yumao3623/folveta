-- Product-3C Gate: tokenize filename punctuation and extensions as word boundaries.

drop index if exists public.sources_private_search_idx;

create index sources_private_search_idx
  on public.sources using gin (
    to_tsvector(
      'english'::regconfig,
      pg_catalog.regexp_replace(display_name, '[^[:alnum:]]+', ' ', 'g')
    )
  );

create or replace function public.search_owned_knowledge(
  search_query text,
  result_limit integer default 12,
  result_offset integer default 0
)
returns table (
  result_type text,
  result_id text,
  guide_id uuid,
  session_id uuid,
  source_id uuid,
  title text,
  subtitle text,
  excerpt text,
  rank real,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '28000';
  end if;

  search_query := btrim(search_query);
  if char_length(search_query) < 2 or char_length(search_query) > 100 then
    raise exception 'Search query must contain between 2 and 100 characters' using errcode = '22023';
  end if;

  return query
  with input as (
    select pg_catalog.websearch_to_tsquery('english'::regconfig, search_query) as query
  ),
  guide_matches as (
    select
      'guide'::text as result_type,
      guide.id::text as result_id,
      guide.id as guide_id,
      guide.session_id,
      null::uuid as source_id,
      guide.title,
      'Study Guide'::text as subtitle,
      null::text as excerpt,
      (3 + pg_catalog.ts_rank(
        pg_catalog.to_tsvector('english'::regconfig, guide.title), input.query
      ))::real as rank
    from public.study_guides guide
    join public.preparation_sessions session on session.id = guide.session_id
    cross join input
    where session.owner_user_id = auth.uid()
      and session.archived_at is null
      and session.deleted_at is null
      and guide.archived_at is null
      and guide.deleted_at is null
      and pg_catalog.to_tsvector('english'::regconfig, guide.title) @@ input.query
  ),
  topic_matches as (
    select
      'topic'::text as result_type,
      topic.value->>'id' as result_id,
      guide.id as guide_id,
      guide.session_id,
      null::uuid as source_id,
      topic.value->>'title' as title,
      guide.title as subtitle,
      left(pg_catalog.regexp_replace(topic.value::text, '\s+', ' ', 'g'), 420) as excerpt,
      (2 + pg_catalog.ts_rank(
        pg_catalog.to_tsvector('english'::regconfig, topic.value::text), input.query
      ))::real as rank
    from public.study_guides guide
    join public.preparation_sessions session on session.id = guide.session_id
    cross join input
    cross join lateral pg_catalog.jsonb_array_elements(coalesce(guide.guide_json->'topics', '[]'::jsonb)) topic(value)
    where session.owner_user_id = auth.uid()
      and session.archived_at is null
      and session.deleted_at is null
      and guide.archived_at is null
      and guide.deleted_at is null
      and pg_catalog.to_tsvector(
        'english'::regconfig,
        coalesce(guide.title, '') || ' ' || coalesce(guide.guide_json::text, '')
      ) @@ input.query
      and pg_catalog.to_tsvector('english'::regconfig, topic.value::text) @@ input.query
  ),
  source_matches as (
    select
      'source'::text as result_type,
      source.id::text as result_id,
      guide.id as guide_id,
      source.session_id,
      source.id as source_id,
      source.display_name as title,
      coalesce(guide.title, 'Course material') as subtitle,
      case
        when pg_catalog.to_tsvector(
          'english'::regconfig,
          pg_catalog.regexp_replace(source.display_name, '[^[:alnum:]]+', ' ', 'g')
        ) @@ input.query
          then null::text
        else span_match.excerpt
      end as excerpt,
      (1 + greatest(
        pg_catalog.ts_rank(
          pg_catalog.to_tsvector(
            'english'::regconfig,
            pg_catalog.regexp_replace(source.display_name, '[^[:alnum:]]+', ' ', 'g')
          ),
          input.query
        ),
        coalesce(span_match.rank, 0::real)
      ))::real as rank
    from public.sources source
    join public.preparation_sessions session on session.id = source.session_id
    left join public.study_guides guide
      on guide.session_id = source.session_id
      and guide.archived_at is null
      and guide.deleted_at is null
    cross join input
    left join lateral (
      select
        span.excerpt,
        pg_catalog.ts_rank(
          pg_catalog.to_tsvector('english'::regconfig, span.text || ' ' || span.excerpt),
          input.query
        )::real as rank
      from public.source_spans span
      where span.source_id = source.id
        and pg_catalog.to_tsvector('english'::regconfig, span.text || ' ' || span.excerpt) @@ input.query
      order by pg_catalog.ts_rank(
        pg_catalog.to_tsvector('english'::regconfig, span.text || ' ' || span.excerpt),
        input.query
      ) desc, span.locator_number asc, span.ordinal asc
      limit 1
    ) span_match on true
    where session.owner_user_id = auth.uid()
      and session.archived_at is null
      and session.deleted_at is null
      and (
        pg_catalog.to_tsvector(
          'english'::regconfig,
          pg_catalog.regexp_replace(source.display_name, '[^[:alnum:]]+', ' ', 'g')
        ) @@ input.query
        or span_match.rank is not null
      )
  ),
  combined as (
    select * from guide_matches
    union all
    select * from topic_matches
    union all
    select * from source_matches
  )
  select
    combined.result_type,
    combined.result_id,
    combined.guide_id,
    combined.session_id,
    combined.source_id,
    combined.title,
    combined.subtitle,
    combined.excerpt,
    combined.rank,
    count(*) over() as total_count
  from combined
  order by combined.rank desc, combined.title asc, combined.result_id asc
  limit least(greatest(result_limit, 1), 24)
  offset greatest(result_offset, 0);
end;
$$;

revoke all on function public.search_owned_knowledge(text, integer, integer) from public;
revoke all on function public.search_owned_knowledge(text, integer, integer) from anon;
grant execute on function public.search_owned_knowledge(text, integer, integer) to authenticated;
