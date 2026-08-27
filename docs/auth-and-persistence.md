# Folveta Auth and Persistence

Status: **Current Product-3 identity, ownership, and lifecycle architecture**
Last updated: 2026-08-27

## Decision

Folveta uses Supabase Auth as the formal account identity system. Email/password is the only account method in Product-3A. The existing high-entropy `sgm_session` cookie remains the anonymous identity and is not replaced by a custom account system.

`auth.users.id` is the durable owner and future billing owner. A separate profile or team-workspace table is deferred until Folveta has application-specific profile fields or a real multi-member requirement. Payment may later add provider-independent customer, entitlement, plan, and usage records keyed to this user ID; Product-3A creates no paid state.

## Aggregate and ownership

`preparation_sessions` remains the aggregate root because every current Source, source unit/span, generation run, Guide, Quick Check, and result already belongs to exactly one session. It receives `owner_user_id` and lifecycle timestamps. This avoids a parallel container and preserves the current pipeline.

`study_guides` remains the independent persistent artifact. Its ID is stable across regeneration and it owns normalized title, created/updated time, last access, archive, and deletion state. Product-3B now lists and manages that artifact without adding a parallel Guide container. Reopening resolves an owner-authorized stable Guide ID to its existing `/study/[sessionId]` workspace.

Child ownership is derived through `session_id`; duplicate `user_id` columns are intentionally avoided so ownership cannot drift between Source, Quick Check, Result, and Guide.

## Anonymous and authenticated flows

Anonymous creation stores a random token hash plus a seven-day `expires_at`. The raw token remains HttpOnly, SameSite=Lax, Secure in production, and private to one browser. Anonymous database roles receive no direct table policy.

Authenticated creation stores `owner_user_id`, no anonymous token hash, and no anonymous expiry. Server access accepts only the matching Supabase Auth user. The Auth session is refreshed through Next.js `proxy.ts`; Route Handlers and pages repeat authorization close to the data source.

After sign-in, sign-up with an immediate session, or PKCE email callback, Folveta calls `claim_current_anonymous_session` with the hash of the current anonymous cookie. The security-definer function obtains the destination owner from `auth.uid()` and atomically requires an unclaimed, unexpired, non-deleted row with the exact token hash. A successful claim clears the token hash and expiry, sets owner/claim/access timestamps, and deletes the anonymous cookie. It never accepts a Guide/session ID, so guessing an ID cannot claim content. A concurrent or replayed claim has no eligible token row.

## Authorization and RLS

Authenticated RLS read policies compare the aggregate owner to `auth.uid()`. Child reads require an owned, non-deleted parent session. Direct browser writes, including direct deletion that could orphan Storage, remain closed; server code uses the service role only after the shared ownership DAL authorizes the request. Anonymous requests continue through the server DAL and never receive direct table access.

The explicit Guide detail API returns only owner-authorized persistence metadata and a reopen path. Existing upload, parse, generation, Quick Check, result, and page routes all use the same `requireOwnedSession` / `requireOwnedSource` checks.

## Lifecycle, retention, and deletion

The approved current boundary is:

- **Sign out:** Supabase Auth session state is removed and private routes/data become unavailable in that browser. Sign out does not delete account-owned data.
- **Session expiry:** the Next.js refresh proxy refreshes valid sessions and clears stale/revoked state. Expiry requires re-authentication; it does not delete account data. Anonymous content separately becomes inaccessible at `expires_at` (seven days by default).
- **Guide archive and soft delete:** `archived_at`, `deleted_at`, and `purge_after` separate visibility from physical deletion. Archive is reversible. Delete immediately marks both Guide and aggregate unavailable, cannot be reopened/restored, and sets `purge_after` to 30 days later.
- **30-day purge:** the timestamp makes a deleted aggregate eligible for the protected retention endpoint. The endpoint also selects expired anonymous sessions, removes private Storage objects first, and then deletes `preparation_sessions`, whose foreign-key cascades remove Sources, units/spans, generation runs, Guides, Quick Checks, and attempts/results. A production scheduler is not configured or verified, so the product does not claim automatic physical deletion after exactly 30 days.
- **Failure and retry:** a Storage error stops before database deletion, keeping the due aggregate available to a later retry. If Storage succeeds and the database delete fails, the due aggregate remains and must be safely retried. Production readiness requires scheduling, idempotency verification, observable failures, bounded retry/backoff, and an operator recovery path.
- **Account deletion request:** no request endpoint, support/privacy request channel, or Delete Account UI exists today. The product must not imply otherwise.
- **Account/Auth deletion:** the future orchestration must stop new writes, enumerate and stage every owned aggregate, complete Storage cleanup, delete child database aggregates through the parent, and only then delete the Supabase Auth user. Although `owner_user_id` uses `on delete cascade`, deleting `auth.users` first is forbidden because it can orphan private Storage objects.
- **Future billing dependency:** before Auth deletion, the future Payment implementation must cancel or settle provider billing state and preserve only retention-required billing records under the approved legal policy. Product-3 contains no billing records or fake plan state.

Full account deletion is therefore deliberately deferred as a mandatory Payment/Production prerequisite. This is a bounded lifecycle decision, not a claim that the workflow already exists.

## Migration and repair

Migration `202608260001_product_3a_auth_persistence.sql` is additive for existing anonymous fixtures: current rows retain their token hash and expiry, while owner fields begin null. The new identity check permits exactly anonymous-token or authenticated-owner state. Existing Guide titles are backfilled from the session.

Rollback after claims is intentionally not a blind down migration: removing `owner_user_id` would orphan durable account ownership. Before any rollback, export claimed owner/session mappings and restore a valid anonymous credential/expiry or migrate those rows forward. Schema or policy defects should use a new forward repair migration.

## Dev environment verification

On 2026-08-26, migration `202608260001_product_3a_auth_persistence.sql` was applied to the configured Supabase dev project. The official CLI history was later reconciled only after read-only schema inspection proved the three pre-existing migrations were present. Local and remote history now match through `202608260005`; new migrations are reviewed with CLI dry-run, applied in filename order, and verified through `migration list`.

A scoped two-account E2E verified anonymous upload and parsing, sign-in claim, credential clearing, owner reopen after refresh, sign-out isolation, cross-account denial, owner-only RLS reads, denial of direct authenticated writes/deletes, Quick Check scoring, Results, and Guide return links. A separate revoked-user check verified that a stale Auth cookie degrades to anonymous access, returns 200 instead of 500, and is cleared by the refresh proxy. The temporary Storage object, aggregate, attempts, and Auth users were removed after verification.

Real Guide generation was attempted twice but the configured external model gateway returned retryable Cloudflare `502 origin_bad_gateway` responses during topic extraction. The Auth/persistence E2E therefore used a clearly marked Guide/Quick Check fixture grounded in the successfully parsed source span; real AI generation is not recorded as passing. Deployment scheduling for the retention endpoint also remains unconfigured.

Product-3B added a second scoped two-account dev run on 2026-08-26. Deterministic schema fixtures verified owner-only list/recent data, stable-ID reopen, rename, archive/restore, soft delete, deleted denial, Quick Check/Results continuity, sign-out isolation, relogin persistence, and Account B denial for Account A reads and mutations. Its index migration is now applied, and all fixture aggregates and Auth users were removed.

Product-3C keeps ownership on `auth.users.id` and adds no profile table. Library/Profile server DALs repeat explicit owner filters while direct authenticated reads remain protected by existing RLS. Search runs through the authenticated client under RLS rather than the service role. The Product-3C index/RPC migration, claim-grant hardening migration, and filename-tokenization repair are applied in dev. The final two-account Gate passed owner isolation across pages, APIs, direct authenticated/anonymous Supabase reads, Search RPC, URL guessing, signed-out routes, and relogin persistence. All Gate fixtures and users were cleaned.

## Production pre-launch verification

On 2026-08-27, Production created and persisted an anonymous session with the expected `sgm_session` attributes (`HttpOnly`, `Secure`, `SameSite=Lax`, path `/`, host-only), uploaded and parsed a synthetic PDF fixture through private Storage, generated a real source-grounded Guide, and generated/scored a five-question Quick Check. Email confirmation activated a real test account; password sign-in then atomically claimed the anonymous aggregate. My Guides, Library, Search, Profile, stable-ID reopen, source continuity, persisted Results, refresh, sign-out isolation, and relogin passed. The claimed account retained exactly one Guide and one Source, providing replay/idempotency evidence for this flow.

The cross-device confirmation attempt opened the link on a different device and reached Folveta without a usable callback `code`; it is retained as historical evidence and does not represent the supported same-browser path. A fresh same-browser Production run passed `/signup 200`, `/verify 303`, `/token 200`, `/user 200`, returned to `https://folveta.com/profile`, and preserved the anonymous aggregate through claim. The current Supabase default confirmation template uses `{{ .ConfirmationURL }}` and is not editable without Custom SMTP. Auth signup, email confirmation, PKCE callback, session refresh, sign-out, relogin, and anonymous claim are therefore PASS for this scoped pre-launch gate.

## Privacy and SEO

`/auth`, `/account`, all user Guide routes, Quick Checks, results, internal APIs, and future workspace/search/billing pages are private and `noindex`. They are excluded from the sitemap and public structured data. The homepage remains the canonical `Study Guide Maker` owner.
