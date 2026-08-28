-- A short database-backed lease serializes generation continuation requests.
-- The lease is intentionally recoverable: an interrupted serverless request
-- cannot permanently block a saved checkpoint from being resumed.
alter table public.preparation_sessions
  add column if not exists generation_lease_id uuid,
  add column if not exists generation_lease_expires_at timestamptz;

create index if not exists preparation_sessions_generation_lease_expiry_idx
  on public.preparation_sessions (generation_lease_expires_at)
  where generation_lease_expires_at is not null;

comment on column public.preparation_sessions.generation_lease_id is
  'Private, short-lived server-side generation continuation lease. Never expose to clients.';

comment on column public.preparation_sessions.generation_lease_expires_at is
  'Expiry for the private generation continuation lease. Expired leases may be safely claimed by a later continuation request.';
