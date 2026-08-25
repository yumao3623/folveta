# Folveta Auth and Persistence

Status: **Current Product-3A architecture**
Last updated: 2026-08-26

## Decision

Folveta uses Supabase Auth as the formal account identity system. Email/password is the only account method in Product-3A. The existing high-entropy `sgm_session` cookie remains the anonymous identity and is not replaced by a custom account system.

`auth.users.id` is the durable owner and future billing owner. A separate profile or team-workspace table is deferred until Folveta has application-specific profile fields or a real multi-member requirement. Payment may later add provider-independent customer, entitlement, plan, and usage records keyed to this user ID; Product-3A creates no paid state.

## Aggregate and ownership

`preparation_sessions` remains the aggregate root because every current Source, source unit/span, generation run, Guide, Quick Check, and result already belongs to exactly one session. It receives `owner_user_id` and lifecycle timestamps. This avoids a parallel container and preserves the current pipeline.

`study_guides` remains the independent persistent artifact. Its ID is stable across regeneration and it owns normalized title, created/updated time, last access, archive, and deletion state. Reopening resolves the Guide to its existing `/study/[sessionId]` workspace. Product-3B may add list/manage routes without migrating generated content again.

Child ownership is derived through `session_id`; duplicate `user_id` columns are intentionally avoided so ownership cannot drift between Source, Quick Check, Result, and Guide.

## Anonymous and authenticated flows

Anonymous creation stores a random token hash plus a seven-day `expires_at`. The raw token remains HttpOnly, SameSite=Lax, Secure in production, and private to one browser. Anonymous database roles receive no direct table policy.

Authenticated creation stores `owner_user_id`, no anonymous token hash, and no anonymous expiry. Server access accepts only the matching Supabase Auth user. The Auth session is refreshed through Next.js `proxy.ts`; Route Handlers and pages repeat authorization close to the data source.

After sign-in, sign-up with an immediate session, or PKCE email callback, Folveta calls `claim_current_anonymous_session` with the hash of the current anonymous cookie. The security-definer function obtains the destination owner from `auth.uid()` and atomically requires an unclaimed, unexpired, non-deleted row with the exact token hash. A successful claim clears the token hash and expiry, sets owner/claim/access timestamps, and deletes the anonymous cookie. It never accepts a Guide/session ID, so guessing an ID cannot claim content. A concurrent or replayed claim has no eligible token row.

## Authorization and RLS

Authenticated RLS read policies compare the aggregate owner to `auth.uid()`. Child reads require an owned, non-deleted parent session. Direct browser writes, including direct deletion that could orphan Storage, remain closed; server code uses the service role only after the shared ownership DAL authorizes the request. Anonymous requests continue through the server DAL and never receive direct table access.

The explicit Guide detail API returns only owner-authorized persistence metadata and a reopen path. Existing upload, parse, generation, Quick Check, result, and page routes all use the same `requireOwnedSession` / `requireOwnedSource` checks.

## Lifecycle, retention, and deletion

- Anonymous content becomes inaccessible at `expires_at` (seven days by default).
- Account content has no anonymous TTL and remains until the user deletes it or the account is deleted.
- `archived_at`, `deleted_at`, and `purge_after` separate workspace visibility from permanent purge.
- The protected retention endpoint selects expired anonymous sessions and rows whose `purge_after` is due, removes private Storage objects first, and then deletes the aggregate so Postgres cascades remove children.
- Deployment must configure `RETENTION_JOB_SECRET` and schedule the endpoint. That scheduler is not proven merely by repository code.
- Future account deletion must first stage owned aggregates for Storage cleanup, then delete the Supabase Auth user. Deleting `auth.users` cascades database rows, but it must not run before private object paths have been cleaned.

## Migration and repair

Migration `202608260001_product_3a_auth_persistence.sql` is additive for existing anonymous fixtures: current rows retain their token hash and expiry, while owner fields begin null. The new identity check permits exactly anonymous-token or authenticated-owner state. Existing Guide titles are backfilled from the session.

Rollback after claims is intentionally not a blind down migration: removing `owner_user_id` would orphan durable account ownership. Before any rollback, export claimed owner/session mappings and restore a valid anonymous credential/expiry or migrate those rows forward. Schema or policy defects should use a new forward repair migration.

## Dev environment verification

On 2026-08-26, migration `202608260001_product_3a_auth_persistence.sql` was applied to the configured Supabase dev project. A scoped two-account E2E verified anonymous upload and parsing, sign-in claim, credential clearing, owner reopen after refresh, sign-out isolation, cross-account denial, owner-only RLS reads, denial of direct authenticated writes/deletes, Quick Check scoring, Results, and Guide return links. A separate revoked-user check verified that a stale Auth cookie degrades to anonymous access, returns 200 instead of 500, and is cleared by the refresh proxy. The temporary Storage object, aggregate, attempts, and Auth users were removed after verification.

Real Guide generation was attempted twice but the configured external model gateway returned retryable Cloudflare `502 origin_bad_gateway` responses during topic extraction. The Auth/persistence E2E therefore used a clearly marked Guide/Quick Check fixture grounded in the successfully parsed source span; real AI generation is not recorded as passing. Deployment scheduling for the retention endpoint also remains unconfigured.

## Privacy and SEO

`/auth`, `/account`, all user Guide routes, Quick Checks, results, internal APIs, and future workspace/search/billing pages are private and `noindex`. They are excluded from the sitemap and public structured data. The homepage remains the canonical `Study Guide Maker` owner.
