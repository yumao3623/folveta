# Folveta Library, Search, and Profile

Status: **Current Product-3C architecture**  
Last updated: 2026-08-26

## Scope

Product-3C turns the remaining private Workspace destinations into real features: `/library`, `/search`, and `/profile`, plus shared navigation with `/my-guides`. It does not add Payment, public sharing, embeddings, RAG, new model calls, unsupported upload formats, or social profile fields. Account deletion is documented below and was implemented separately.

## Migration status

The official Supabase CLI is available through `npx`, and the configured dev project is linked in ignored local CLI state. The remote schema was inspected before repairing history for the three migrations already present. No migration SQL was executed through the service-role client or dashboard editor.

On 2026-08-26 the CLI dry-run and push applied, in order, `202608260002_product_3b_guide_management.sql`, `202608260003_product_3c_library_search_profile.sql`, `202608260004_product_3_gate_hardening.sql`, and `202608260005_product_3c_source_filename_search.sql`. The final local/remote migration list matches through `202608260005`.

The deployed schema contains all Product-3B/Library indexes and three GIN FTS indexes. `search_owned_knowledge` is `stable`, `security invoker`, has an empty `search_path`, and grants execute only to `authenticated`. Migration `004` also removes the Supabase-default anonymous execute grant from the claim RPC. Migration `005` makes filename punctuation and extensions word boundaries in both the Source GIN expression and RPC, so ordinary searches such as `Glial Atlas` match `Glial Atlas.pdf` consistently.

## Library

Library is the inventory of uploaded Sources. My Guides remains the Guide artifact manager.

- Supported filters include All, PDF, Word, Excel, PowerPoint (including legacy PPT), and Image.
- Sorting supports newest, oldest, and filename.
- Pages default to 12 and are capped at 24 with one look-ahead row.
- Each item exposes the real filename, kind, upload time, processing status, unit/page/slide count, readable unit count when different, and related Guide.
- The query starts from `sources`, inner-joins `preparation_sessions`, filters `owner_user_id` and non-deleted aggregate state, and embeds related Guide metadata in the same request.
- Sources for archived Guides remain useful Library material and link to the Archived Guide list. Deleted aggregates never appear. A defensively encountered deleted Guide relationship is suppressed.

## Search architecture and scope

Search accepts a trimmed 2-100 character query, defaults to 12 results, and caps pages at 24. The Server Component and `GET /api/search` share the same validator and DAL.

The authenticated Supabase server client invokes a `security invoker` PostgreSQL function. The function requires `auth.uid()`, is executable only by `authenticated`, and relies on owner RLS plus explicit non-archived/non-deleted predicates. Results are ranked and paginated in PostgreSQL; the browser never downloads an account corpus for filtering. A dev `EXPLAIN` for normalized Source filename search used `Bitmap Index Scan on sources_private_search_idx`, confirming the expected GIN access path rather than an obvious full-table scan.

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

Delete Account is available from Profile and is handled synchronously by the server. Same-origin confirmation and rate limiting are required. A valid Paddle Live subscription causes deletion to be rejected; the server does not automatically cancel it. Otherwise private Storage objects, owned database sessions and dependent data, and the Auth user are deleted in order. No persistent deletion request, retry, or audit state is written; billing cancellation/retained-record coordination remains a separate Payment concern. Deleting only `auth.users` is explicitly not a complete account deletion flow.

## Verification boundary

Automated tests cover validators, pagination limits, Source fields, single/object PostgREST relationship mapping, archived/deleted relationships, owner query contracts, three search result types and targets, filename normalization, FTS/RLS/index contracts, empty/invalid/no-result states, Profile fields/count isolation, navigation, API anonymous denial, and private SEO.

Real dev Product-3C two-account E2E passed after the migrations were applied. Account A verified My Guides/Recent, Library pagination and file-type filters, all real Source fields, archived relationships, Guide title/Topic/content/filename/span FTS, case/special-character/no-result/invalid-query/pagination behavior, rename/archive/delete semantics, Profile counts, Quick Check, Results, sign out, and relogin persistence. Account B was denied Account A data across My Guides, Library, Search, direct Guide URL, application APIs, authenticated Supabase reads, spans, metadata, and Search RPC; anonymous direct reads/RPC also failed closed.

Desktop and 390px browser QA found no horizontal overflow, no private metadata exposure, and no console warnings/errors. The mobile Workspace navigation uses a stable four-column layout so all destinations remain visible. The E2E used deterministic database fixtures and did not call the model pipeline; all four aggregates and both temporary Auth users were cleaned. The `portdan.com` Cloudflare 502 means real AI full-chain E2E remains a Production Readiness item, not a Product-3C pass claim.
