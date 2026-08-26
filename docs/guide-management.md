# Folveta Guide Management

Status: **Current Product-3B architecture**  
Last updated: 2026-08-26

## Scope

Product-3B implements account-owned My Guides, Landing Recent Guides, stable-ID reopen, rename, archive/restore, and soft delete. Product-3C now consumes this lifecycle in Library/Search/Profile; Payment, SEO v2, deployment, and public Guide pages remain out of scope.

## Private routes and API

- `/my-guides` requires a Supabase Auth user and redirects anonymous requests to `/auth?next=/my-guides`.
- Landing Recent Guides uses the same owner-scoped list query. Anonymous users and accounts without Guides receive explicit empty states; Folveta does not substitute demo data.
- `GET /api/guides` returns the current account's bounded active or archived list.
- `GET /api/guides/[guideId]` retains the Product-3A owner-authorized metadata response.
- `GET /api/guides/[guideId]/reopen` resolves a stable Guide ID on the server, updates last access, and redirects to the existing Study Guide workspace.
- `PATCH /api/guides/[guideId]` accepts only rename, archive, or restore.
- `DELETE /api/guides/[guideId]` performs soft deletion. The browser cannot write Guide lifecycle columns directly.

All mutation handlers authenticate at execution time, check same-origin browser requests, authorize the Guide through its parent session owner, and use the server-only service role only after that check. Unknown and cross-owner IDs return the same unavailable response.

## List and Recent query

The canonical active ordering is:

`study_guides.last_accessed_at DESC, study_guides.updated_at DESC, study_guides.id DESC`

The final ID tie-breaker makes ordering deterministic. Reopen updates `last_accessed_at` on both the Guide and aggregate session. Rename updates `updated_at` but does not make a never-opened Guide outrank a more recently opened Guide unless their access timestamps tie.

The list API defaults to 12 rows and caps client-selected limits at 24. It fetches one look-ahead row to expose `hasNextPage` without loading a user's full history. Recent Guides reuses the same active query with a limit of four. The PostgREST query starts from `study_guides`, inner-joins the owner session, filters both lifecycle records, and embeds `sources(count)` in the same database request; it does not issue one source query per Guide.

Repository migration `202608260002_product_3b_guide_management.sql` adds partial owner/lifecycle/recent indexes, a source session index for counts, and the due-purge index. The list still filters owner ID explicitly even though authenticated RLS also protects direct reads. The configured environment exposes no database connection, Supabase CLI, or linked project configuration, so this index-only migration has not been applied or query-planned in dev yet; it must be applied through the normal migration channel before release.

## Rename

Titles are trimmed server-side, must be non-empty, and are limited to 140 characters. Rename changes only `study_guides.title` and its row timestamp. It does not mutate Guide JSON, Sources, evidence, generation output, or Quick Checks. The Study workspace renders the normalized persistence title separately from immutable generated content. A later regeneration preserves the existing normalized title.

## Archive and restore

Archive and restore synchronize the existing `archived_at` fields on `study_guides` and `preparation_sessions`. Archived Guides are excluded from default My Guides and Recent Guides. Product-3B provides one minimal Archived filter with restore and delete actions rather than a separate archive product surface.

Library keeps Sources for archived Guides visible and labels their relationship as Archived rather than reopening an inaccessible Guide. Knowledge Search is limited to active Guides/aggregates. Deleted aggregates are excluded from both surfaces. See `docs/library-search-profile.md`.

## Delete and retention

Delete is soft deletion, not immediate physical purge. It sets `deleted_at` on the Guide and aggregate session and sets the session `purge_after` to 30 days later. The parent deletion state immediately blocks Study Guide, Source, Quick Check, and Results authorization. Deleted Guides cannot be reopened or restored in Product-3B.

The existing protected retention endpoint remains responsible for deleting private Storage objects first and then deleting the aggregate so database cascades remove children. Deployment scheduling for that endpoint remains unconfigured and is not claimed as production-ready.

## Privacy and SEO

`/my-guides` exports `noindex,nofollow`, redirects anonymous users before querying, is absent from the sitemap, and emits no user title or source content in public metadata. Individual Study routes retain their existing `noindex,nofollow` layout. The homepage remains the public Study Guide Maker owner even though it conditionally renders a signed-in user's Recent Guides.

## Verification

Automated Product-3B coverage includes owner query constraints, second-user ownership rejection, recent ordering, pagination/limits, source-count strategy, reopen, valid/invalid rename, archive/restore, default archive exclusion, soft delete, deleted access denial, mutation authorization, anonymous list denial, private-route SEO, and existing Study Guide/Quick Check regression coverage.

Scoped real dev Supabase E2E passed with two temporary confirmed Auth users and five deterministic Guide/source fixtures. It verified Account A owner-only multi-Guide listing, recent order, pagination, reopen, rename, archive/restore, soft delete, deleted reopen denial, Quick Check and Results continuity, sign-out isolation, and persistence after a new login. Account B saw only its own Guide and received owner-safe denial for Account A read, rename, archive, and delete attempts. The fixtures were database/schema fixtures, not AI generation, and all five aggregates plus both Auth users were removed after the run.

Browser QA passed at 1440px and 390px with no horizontal overflow or incoherent overlap, one semantic H1, visible real empty states, keyboard focus entry/wrapping/Escape/restore in management dialogs, explicit destructive confirmation, `noindex,nofollow`, and no browser console warnings or errors. QA screenshots were stored only as temporary local artifacts rather than committed product assets.

The external AI gateway issue remains unchanged: `portdan.com` returned Cloudflare `502 origin_bad_gateway` during Product-3A real generation. Product-3B does not change the AI pipeline to work around that environment failure.
