# Folveta Library, Search, and Profile

Status: **Current Product-3C architecture**  
Last updated: 2026-08-26

## Scope

Product-3C turns the remaining private Workspace destinations into real features: `/library`, `/search`, and `/profile`, plus shared navigation with `/my-guides`. It does not add Payment, public sharing, embeddings, RAG, new model calls, unsupported upload formats, social profile fields, or account deletion.

## Migration status

The workspace has no Supabase CLI on PATH, `supabase/config.toml`, linked project state, database URL, or migration workflow. Only application URL/keys are configured. Migration `202608260002_product_3b_guide_management.sql` therefore remains unapplied in dev.

Product-3C adds `202608260003_product_3c_library_search_profile.sql` for Library access indexes, three GIN FTS indexes, and the authenticated `search_owned_knowledge` function. It is also unapplied. Neither migration was executed through an ad hoc service-role or SQL path because that would create untracked database state. Apply both in order through the formal migration channel before migration-backed E2E or release.

## Library

Library is the inventory of uploaded Sources. My Guides remains the Guide artifact manager.

- Supported filters are All, PDF, and PPTX only.
- Sorting supports newest, oldest, and filename.
- Pages default to 12 and are capped at 24 with one look-ahead row.
- Each item exposes the real filename, kind, upload time, processing status, unit/page/slide count, readable unit count when different, and related Guide.
- The query starts from `sources`, inner-joins `preparation_sessions`, filters `owner_user_id` and non-deleted aggregate state, and embeds related Guide metadata in the same request.
- Sources for archived Guides remain useful Library material and link to the Archived Guide list. Deleted aggregates never appear. A defensively encountered deleted Guide relationship is suppressed.

## Search architecture and scope

Search accepts a trimmed 2-100 character query, defaults to 12 results, and caps pages at 24. The Server Component and `GET /api/search` share the same validator and DAL.

The authenticated Supabase server client invokes a `security invoker` PostgreSQL function. The function requires `auth.uid()`, is executable only by `authenticated`, and relies on owner RLS plus explicit non-archived/non-deleted predicates. Results are ranked and paginated in PostgreSQL; the browser never downloads an account corpus for filtering.

The first search scope is:

1. Guide title, returned as Guide.
2. Topic title and structured Topic JSON text, returned as Topic.
3. Source filename, returned as Source.
4. Source span text/excerpt, collapsed to its Source result.

Guide results reopen through stable Guide ID. Topic results target the real private Study route and topic fragment. Source results open their related active Guide when present, otherwise their owned Study workspace. Archived and deleted aggregates are excluded from Search.

## Profile

Profile uses Supabase Auth as the account source and adds no profile table. It shows email, Auth account creation date, owner-scoped non-deleted Guide count, owner-scoped Source count, and Sign out. Guide and Source counts run as two parallel exact-count queries with explicit owner/deletion filters. No avatar, bio, streak, mastery, course statistic, plan, or subscription state is displayed.

`/account` redirects to `/profile` for compatibility.

## Authorization and privacy

- All three pages redirect signed-out users to Auth before private reads.
- `GET /api/library` and `GET /api/search` return 401 before their DAL runs for signed-out requests.
- Library/Profile use the server-only service role only with explicit authenticated owner filters.
- Search uses the authenticated client and RLS; it cannot accept an owner ID from the browser.
- All Workspace routes export `noindex,nofollow`, remain absent from sitemap, and publish no query, filename, Guide title, or excerpt in metadata.

## Account deletion

Delete Account is deferred. A correct implementation must stage every owned aggregate, remove private Storage objects first, cascade Postgres children including spans/Quick Checks/results, preserve observable retry/retention behavior, then delete the Auth user. Payment will add billing/customer coordination. Deleting only `auth.users` is explicitly not a complete account deletion flow.

## Verification boundary

Automated tests cover validators, pagination limits, Source fields, archived/deleted relationships, owner query contracts, three search result types and targets, FTS/RLS/index contracts, empty/invalid/no-result states, Profile fields/count isolation, navigation, API anonymous denial, and private SEO.

Real dev Product-3C two-account E2E is not passed while migrations are unapplied. The required follow-up must validate Account A Library/filter/search/profile/navigation, Account B isolation across page/API/RLS/URL guessing, deleted exclusion, sign-out isolation, and cleanup after applying both pending migrations.
