param(
  [string]$Container = "supabase_db_study_guide_maker"
)

$ErrorActionPreference = "Stop"

function Invoke-LocalSql {
  param([string]$Sql)
  $Sql | docker exec -i $Container psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -P pager=off
  if ($LASTEXITCODE -ne 0) { throw "Local PostgreSQL assertion failed." }
}

function Assert-LocalSqlFails {
  param([string]$Sql, [string]$Label)
  $Sql | docker exec -i $Container psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -P pager=off 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { throw "Expected PostgreSQL rejection: $Label" }
}

Invoke-LocalSql @'
create extension if not exists pgcrypto;

do $$
begin
  if (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (
    'generation_v2_requests', 'generation_v2_artifacts', 'generation_v2_request_artifacts', 'generation_v2_guides'
  )) <> 4 then raise exception 'missing v2 tables'; end if;
  if (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in (
    'create_or_join_generation_v2_request', 'claim_generation_v2_artifact', 'settle_generation_v2_artifact'
  )) <> 3 then raise exception 'missing v2 RPCs'; end if;
end $$;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'v2-owner@example.test', 'x', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'v2-other@example.test', 'x', now())
on conflict (id) do nothing;

insert into public.preparation_sessions (id, access_token_hash, title, expires_at)
values
  ('11111111-1111-4111-8111-111111111111', 'v2-anon-token', 'V2 anonymous session', now() + interval '1 day'),
  ('22222222-2222-4222-8222-222222222222', 'v2-other-token', 'V2 other session', now() + interval '1 day');

select id from public.create_or_join_generation_v2_request(
  '11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'request-key-a', '{"partitions":["p0","p1","p2"]}'::jsonb
) \gset request_

do $$
declare duplicate_id uuid;
begin
  select id into duplicate_id from public.create_or_join_generation_v2_request(
    '11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'request-key-a', '{"ignored":true}'::jsonb
  );
  if duplicate_id <> (select id from public.generation_v2_requests where request_content_key = 'request-key-a') then
    raise exception 'duplicate request did not join canonical row';
  end if;
end $$;

insert into public.generation_v2_artifacts (
  session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind,
  partition_key, artifact_content_key, span_identity_json
) values
  ('11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'section', 'p0', 'artifact-key-p0', '{"spans":["a"]}'),
  ('11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'section', 'p1', 'artifact-key-p1', '{"spans":["b"]}'),
  ('11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'section', 'p2', 'artifact-key-p2', '{"spans":["c"]}'),
  ('22222222-2222-4222-8222-222222222222', 'snapshot-b', 'contract-b', 'en', 'section', 'p0', 'artifact-key-other', '{"spans":["z"]}');

select id from public.generation_v2_artifacts where session_id = '11111111-1111-4111-8111-111111111111' and partition_key = 'p0' \gset a0_
select id from public.generation_v2_artifacts where session_id = '11111111-1111-4111-8111-111111111111' and partition_key = 'p1' \gset a1_
select id from public.generation_v2_artifacts where session_id = '11111111-1111-4111-8111-111111111111' and partition_key = 'p2' \gset a2_
select id from public.generation_v2_artifacts where session_id = '22222222-2222-4222-8222-222222222222' \gset other_artifact_

insert into public.generation_v2_request_artifacts (request_id, artifact_id, session_id, partition_key, partition_order, required)
values
  (:'request_id', :'a0_id', '11111111-1111-4111-8111-111111111111', 'p0', 0, true),
  (:'request_id', :'a1_id', '11111111-1111-4111-8111-111111111111', 'p1', 1, true),
  (:'request_id', :'a2_id', '11111111-1111-4111-8111-111111111111', 'p2', 2, true);

-- Complete p0 immediately, retain it while p1 becomes a gap, and retry p2 only.
select * from public.claim_generation_v2_artifact(:'a0_id', '10000000-0000-4000-8000-000000000001', 120);
select * from public.settle_generation_v2_artifact(:'a0_id', '10000000-0000-4000-8000-000000000001', 'complete', '{"partition":"p0"}'::jsonb, 'result-p0', null, null, false);
select * from public.claim_generation_v2_artifact(:'a1_id', '10000000-0000-4000-8000-000000000002', 120);
select * from public.settle_generation_v2_artifact(:'a1_id', '10000000-0000-4000-8000-000000000002', 'gap', null, null, 'provider_exhausted', 'no result', false);
select * from public.claim_generation_v2_artifact(:'a2_id', '10000000-0000-4000-8000-000000000003', 120);
select * from public.settle_generation_v2_artifact(:'a2_id', '10000000-0000-4000-8000-000000000003', 'retry_wait', null, null, 'timeout', 'retry later', true);
select * from public.claim_generation_v2_artifact(:'a2_id', '10000000-0000-4000-8000-000000000004', 120);
select * from public.settle_generation_v2_artifact(:'a2_id', '10000000-0000-4000-8000-000000000004', 'complete', '{"partition":"p2"}'::jsonb, 'result-p2', null, null, false);

do $$
begin
  if (select count(*) from public.generation_v2_artifacts where session_id = '11111111-1111-4111-8111-111111111111' and status = 'complete') <> 2 then
    raise exception 'successful siblings were not retained';
  end if;
  if (select status from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-p1') <> 'gap' then
    raise exception 'gap artifact was not retained';
  end if;
  if (select attempt_count from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-p0') <> 1 then
    raise exception 'completed artifact was regenerated';
  end if;
  if (select attempt_count from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-p2') <> 2 then
    raise exception 'retry did not target only retryable artifact';
  end if;
end $$;

insert into public.generation_v2_guides (request_id, session_id, source_snapshot_hash, generation_contract_hash, delivery_status, guide_json)
values (:'request_id', '11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'complete_with_gaps', '{"sections":["p0","p2"],"coverage":{"gaps":["p1"]}}');
update public.generation_v2_requests set status = 'complete_with_gaps', completed_at = now() where id = :'request_id';

do $$
begin
  if (select delivery_status from public.generation_v2_guides where request_id = (select id from public.generation_v2_requests where request_content_key = 'request-key-a')) <> 'complete_with_gaps' then
    raise exception 'complete_with_gaps guide was not persisted';
  end if;
  if (select status from public.generation_v2_requests where request_content_key = 'request-key-a') <> 'complete_with_gaps' then
    raise exception 'request did not persist complete_with_gaps';
  end if;
end $$;

-- Independent terminal request states prove complete and failed_no_guide remain distinct.
select id from public.create_or_join_generation_v2_request(
  '11111111-1111-4111-8111-111111111111', 'snapshot-complete', 'contract-a', 'en', 'request-key-complete', '{}'::jsonb
) \gset complete_request_
insert into public.generation_v2_guides (request_id, session_id, source_snapshot_hash, generation_contract_hash, delivery_status, guide_json)
values (:'complete_request_id', '11111111-1111-4111-8111-111111111111', 'snapshot-complete', 'contract-a', 'complete', '{"sections":["complete"],"coverage":{"gaps":[]}}');
update public.generation_v2_requests set status = 'complete', completed_at = now() where id = :'complete_request_id';

select id from public.create_or_join_generation_v2_request(
  '11111111-1111-4111-8111-111111111111', 'snapshot-failed', 'contract-a', 'en', 'request-key-failed', '{}'::jsonb
) \gset failed_request_
insert into public.generation_v2_artifacts (session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json, status, gap_code, gap_message)
values ('11111111-1111-4111-8111-111111111111', 'snapshot-failed', 'contract-a', 'en', 'section', 'failed', 'artifact-key-failed', '{}', 'gap', 'invalid_output', 'no guide');
update public.generation_v2_requests set status = 'failed_no_guide', completed_at = now() where id = :'failed_request_id';
do $$
begin
  if (select delivery_status from public.generation_v2_guides where request_id = (select id from public.generation_v2_requests where request_content_key = 'request-key-complete')) <> 'complete' then
    raise exception 'complete guide was not persisted';
  end if;
  if exists (select 1 from public.generation_v2_guides where request_id = (select id from public.generation_v2_requests where request_content_key = 'request-key-failed')) then
    raise exception 'failed_no_guide persisted a false deliverable';
  end if;
  if (select status from public.generation_v2_requests where request_content_key = 'request-key-failed') <> 'failed_no_guide' then
    raise exception 'failed_no_guide status was not persisted';
  end if;
end $$;

-- Expired lease is reclaimable; its old holder cannot settle after the replacement lease.
insert into public.generation_v2_artifacts (session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json)
values ('11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'section', 'lease', 'artifact-key-lease', '{}') returning id \gset lease_
select * from public.claim_generation_v2_artifact(:'lease_id', '20000000-0000-4000-8000-000000000001', 1);
update public.generation_v2_artifacts set lease_expires_at = now() - interval '1 second' where id = :'lease_id';
select * from public.claim_generation_v2_artifact(:'lease_id', '20000000-0000-4000-8000-000000000002', 120);
do $$
begin
  if exists (select 1 from public.settle_generation_v2_artifact((select id from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-lease'), '20000000-0000-4000-8000-000000000001', 'complete', '{"bad":true}', 'bad', null, null, false) where id is not null) then
    raise exception 'stale lease settlement succeeded';
  end if;
end $$;
select * from public.settle_generation_v2_artifact(:'lease_id', '20000000-0000-4000-8000-000000000002', 'complete', '{"good":true}', 'good', null, null, false);
do $$
begin
  if exists (select 1 from public.claim_generation_v2_artifact((select id from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-lease'), '20000000-0000-4000-8000-000000000003', 120) where id is not null) then
    raise exception 'completed artifact became reclaimable';
  end if;
  if exists (select 1 from public.settle_generation_v2_artifact((select id from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-lease'), '20000000-0000-4000-8000-000000000002', 'complete', '{"overwrite":true}', 'bad', null, null, false) where id is not null) then
    raise exception 'completed artifact was overwritten';
  end if;
end $$;
'@

Assert-LocalSqlFails @'
insert into public.generation_v2_artifacts (session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json)
values ('11111111-1111-4111-8111-111111111111', 'snapshot-a', 'contract-a', 'en', 'section', 'duplicate', 'artifact-key-p0', '{}');
'@ "artifact canonical uniqueness"

Assert-LocalSqlFails @'
insert into public.generation_v2_request_artifacts (request_id, artifact_id, session_id, partition_key, partition_order, required)
values ((select id from public.generation_v2_requests where request_content_key = 'request-key-a'),
        (select id from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-other'),
        '11111111-1111-4111-8111-111111111111', 'cross-session', 9, true);
'@ "cross-session composite foreign key"

Invoke-LocalSql @'
-- RLS: neither anonymous nor the wrong authenticated user can read v2 rows.
set role anon;
do $$ begin
  if (select count(*) from public.generation_v2_requests) <> 0 then raise exception 'anonymous RLS access leaked'; end if;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
  if (select count(*) from public.generation_v2_requests) <> 0 then raise exception 'wrong owner request RLS access leaked'; end if;
  if (select count(*) from public.generation_v2_artifacts) <> 0 then raise exception 'wrong owner artifact RLS access leaked'; end if;
end $$;
reset role;

-- Claim transfers authorization only. Session, request, and artifact identities remain unchanged.
set role authenticated;
set request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.claim_current_anonymous_session('v2-anon-token');
do $$ begin
  if (select count(*) from public.generation_v2_requests where request_content_key = 'request-key-a') <> 1 then raise exception 'claimed owner cannot read request'; end if;
  if (select count(*) from public.generation_v2_artifacts where session_id = '11111111-1111-4111-8111-111111111111') <> 5 then raise exception 'claimed owner cannot read artifacts'; end if;
  if (select count(*) from public.generation_v2_guides) <> 2 then raise exception 'claimed owner cannot read guides'; end if;
end $$;
reset role;

do $$
begin
  if exists (select 1 from public.preparation_sessions where id = '11111111-1111-4111-8111-111111111111' and access_token_hash is not null) then
    raise exception 'anonymous credential survived claim';
  end if;
  if (select owner_user_id from public.preparation_sessions where id = '11111111-1111-4111-8111-111111111111') <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid then
    raise exception 'claim owner mismatch';
  end if;
  if exists (select 1 from public.preparation_sessions where access_token_hash = 'v2-anon-token') then
    raise exception 'old anonymous token still resolves after claim';
  end if;
  if (select source_snapshot_hash from public.generation_v2_requests where request_content_key = 'request-key-a') <> 'snapshot-a' then
    raise exception 'claim changed request content identity';
  end if;
  if (select artifact_content_key from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-p0') <> 'artifact-key-p0' then
    raise exception 'claim changed artifact content identity';
  end if;
end $$;

-- Worker calls remain service-role only and bypass RLS without granting browser writes.
set role service_role;
select id from public.create_or_join_generation_v2_request(
  '11111111-1111-4111-8111-111111111111', 'snapshot-worker', 'contract-a', 'en', 'request-key-worker', '{}'::jsonb
);
do $$ begin
  if (select count(*) from public.generation_v2_requests where request_content_key = 'request-key-worker') <> 1 then
    raise exception 'service role worker could not access v2 request';
  end if;
end $$;
reset role;
'@

# Real PostgreSQL concurrency: two independent client sessions issue each RPC at once.
$requestSql = @'
select id from public.create_or_join_generation_v2_request(
  '11111111-1111-4111-8111-111111111111', 'snapshot-concurrent', 'contract-concurrent', 'en', 'request-key-concurrent', '{}'::jsonb
);
'@
$requestJobs = 1..2 | ForEach-Object {
  Start-Job -ScriptBlock { param($Sql, $Container) $Sql | docker exec -i $Container psql -X -U postgres -d postgres -tA -v ON_ERROR_STOP=1 } -ArgumentList $requestSql, $Container
}
$requestIds = $requestJobs | ForEach-Object { Receive-Job -Job $_ -Wait; Remove-Job $_ } | Where-Object { $_ -match '^[0-9a-f-]{36}$' }
if (($requestIds | Select-Object -Unique).Count -ne 1) { throw "Concurrent request create did not return one canonical request." }

Invoke-LocalSql @'
do $$
begin
  if (select count(*) from public.generation_v2_requests where session_id = '11111111-1111-4111-8111-111111111111' and request_content_key = 'request-key-concurrent') <> 1 then
    raise exception 'concurrent request insert created more than one canonical row';
  end if;
end $$;
insert into public.generation_v2_artifacts (session_id, source_snapshot_hash, generation_contract_hash, output_language, artifact_kind, partition_key, artifact_content_key, span_identity_json)
values ('11111111-1111-4111-8111-111111111111', 'snapshot-concurrent', 'contract-concurrent', 'en', 'section', 'concurrent', 'artifact-key-concurrent', '{}') returning id \gset concurrent_artifact_
'@

$claimSql = @'
select id, lease_id from public.claim_generation_v2_artifact(
  (select id from public.generation_v2_artifacts where artifact_content_key = 'artifact-key-concurrent'),
  gen_random_uuid(), 120
);
'@
$claimJobs = 1..2 | ForEach-Object {
  Start-Job -ScriptBlock { param($Sql, $Container) $Sql | docker exec -i $Container psql -X -U postgres -d postgres -tA -F ',' -v ON_ERROR_STOP=1 } -ArgumentList $claimSql, $Container
}
$claimRows = $claimJobs | ForEach-Object { Receive-Job -Job $_ -Wait; Remove-Job $_ } | Where-Object { $_ -match '^[0-9a-f-]{36},[0-9a-f-]{36}$' }
if ($claimRows.Count -ne 1) { throw "Concurrent artifact claim did not issue exactly one lease." }

Write-Output "Generation v2 local PostgreSQL persistence verification: PASS"
