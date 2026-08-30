# Folveta Technical Architecture

Status: **Current v5 architecture baseline and target boundaries**  
Last verified: 2026-08-31
Decision authority: `docs/decisions.md`

## 1. Architecture principle

This document distinguishes three states:

- **Implemented** — verified in current code/migrations/tests.
- **Missing** — required or previously planned but not present.
- **Target** — approved v5 direction that still requires a dedicated design/implementation task.

The historical `archive/mvp-technical-plan.md` is not an implementation report. Where it differs from this document, current code and this architecture are authoritative.

## 2. Implemented system

```text
Browser
  |-- Next.js server-rendered public/study routes
  |-- Client upload and Quick Check interactions
  |-- signed private Storage upload
  v
Next.js 16 App Router / Node Route Handlers
  |-- Supabase Auth owner checks plus anonymous session-token compatibility
  |-- PDF/Office/image validation and parsing
  |-- stable source unit/span creation
  |-- 202 dispatch and status polling
  |-- deterministic reference resolution and MCQ scoring
  v
Vercel Workflow
  |-- opaque-ID orchestration and durable replay
  |-- plan -> bounded topic waves -> grounding -> finalize
  `-- no private source/prompt/Guide content in Workflow state
  v
Supabase Auth / Postgres / Storage
  |-- private Storage bucket
  |-- Postgres artifacts and owner-scoped authenticated RLS
  `-- logical runs, fenced operations, leases, retry/capacity authority

Supabase Cron (every minute)
  `-- authenticated dispatch reconciliation and watchdog recovery

Configured OpenAI-compatible Responses API
  `-- task-specific structured outputs and verifier calls
```

### Runtime and libraries

| Layer | Implemented choice |
| --- | --- |
| Web | Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5 |
| Styling | Tailwind CSS 4, Folveta semantic tokens and local UI primitives, Bricolage Grotesque/Geist via `next/font` |
| Icons | `lucide-react` |
| Identity/database/storage | Supabase Auth, Supabase Postgres, private Storage, `@supabase/ssr` |
| Validation | Zod 4 strict schemas |
| Model API | OpenAI SDK Responses structured parsing behind `ModelGateway` |
| Durable execution | Vercel Workflow DevKit with Supabase Postgres ownership, idempotency, telemetry, and Supabase Cron reconciliation |
| Parsing | `unpdf`, `officeparser`, `ppt-to-text`, `file-type`; PDF/DOCX/XLSX/PPTX are parsed into anchored units, legacy `.ppt` is parsed locally into slide anchors, images use constrained visual-text extraction, and legacy `.doc/.xls` use controlled Responses file-input extraction with explicit file anchors |
| Tests | Vitest; synthetic PDF/PPTX fixtures use `pdf-lib` and `jszip`, plus real PDF and legacy Office material parser regressions |

There is no ORM, custom queue/worker service, vector database, component framework, analytics SDK, or billing SDK in the current application. Durable generation uses Vercel Workflow rather than a custom worker.

## 3. Implemented routes

### Public and study routes

| Route | Current responsibility | Index state |
| --- | --- | --- |
| `/` | Landing, real upload entry, supporting product/FAQ content | `noindex,nofollow` while pre-launch; indexable only after explicit production cutover |
| `/about` | Current product purpose/boundaries | Same fail-closed public index policy |
| `/privacy` | Current storage/model/retention disclosure | Same fail-closed public index policy |
| `/terms` | Current pre-launch terms | Same fail-closed public index policy |
| `/study/demo` | Synthetic Guide demonstration | Permanently `noindex,nofollow` |
| `/study/demo/quick-check` | Synthetic Quick Check | Inherits demo `noindex,nofollow` |
| `/auth` | Email/password sign-in and sign-up | `noindex, nofollow` |
| `/account` | Compatibility redirect to `/profile` | `noindex, nofollow` |
| `/my-guides` | Account-owned active/archived Guide list and management UI | `noindex, nofollow` |
| `/library` | Account-owned uploaded multi-format Source inventory | `noindex, nofollow` |
| `/search` | Account-owned Guide/Topic/Source full-text search | `noindex, nofollow` |
| `/profile` | Auth account facts, owner-scoped workspace counts, and sign-out | `noindex, nofollow` |
| `/study/[sessionId]` | Anonymous-token or account-owned materials/generation/Guide | `noindex, nofollow` |
| `/study/[sessionId]/quick-check` | Owned Quick Check | `noindex, nofollow` |
| `/study/[sessionId]/quick-check/[attemptId]/result` | Owned result | `noindex, nofollow` |

### API routes

| Method/path | Responsibility |
| --- | --- |
| `POST /api/sessions` | Create an anonymous token session or an authenticated owned session |
| `GET /auth/callback` | Exchange a Supabase PKCE code, claim current anonymous work, redirect safely |
| `POST /api/auth/claim` | Claim the current anonymous aggregate for the authenticated user |
| `GET /api/guides/[guideId]` | Return owner-authorized persistence metadata and reopen path |
| `GET /api/guides` | Return a bounded owner-only active or archived Guide page with source counts |
| `GET /api/guides/[guideId]/reopen` | Resolve stable Guide ID, update last access, and redirect to the owned workspace |
| `PATCH /api/guides/[guideId]` | Owner-authorized rename, archive, or restore |
| `DELETE /api/guides/[guideId]` | Owner-authorized soft delete and delayed purge staging |
| `GET /api/library` | Return a bounded owner-only Source page with filter/sort metadata |
| `GET /api/search` | Return a bounded authenticated PostgreSQL FTS result page |
| `POST /api/internal/retention` | Secret-protected Storage-first purge of due aggregates |
| `POST /api/sessions/[sessionId]/sources/upload-url` | Verify ownership/limits, create source row, issue signed upload URL |
| `POST /api/sources/[sourceId]/parse` | Verify ownership, download private object, validate/hash/parse, persist units/spans |
| `POST /api/sources/[sourceId]/upload-failed` | Persist failed upload state |
| `GET /api/sessions/[sessionId]/status` | Return owned session/source/Guide state |
| `POST /api/sessions/[sessionId]/generate` | Authorize and claim a logical run, dispatch Workflow, and return `202` when the Workflow flag is enabled; retain the legacy inline path behind the OFF fallback |
| `GET /api/internal/generation-reconcile` | Bearer-protected dispatch-gap and watchdog reconciliation invoked by Supabase Cron |
| `POST /api/sessions/[sessionId]/quick-check` | Reuse or lazily generate a five-to-ten item request; UI currently requests five |
| `POST /api/sessions/[sessionId]/quick-check/submit` | Validate complete answers, score by immutable IDs, persist result |

## 4. Implemented data model

| Table | Current role |
| --- | --- |
| `preparation_sessions` | Anonymous token or Auth owner, title/state/failure, claim/access/archive/delete/purge lifecycle |
| `sources` | Session-owned file metadata, private object path, hash, parse state/counts/warnings |
| `source_units` | Page/slide/paragraph/sheet/image raw and normalized text plus readability/warnings |
| `source_spans` | Stable evidence blocks selected by model output, with the same locator kinds |
| `generation_runs` | Historical per-provider-attempt metadata, compatibly expanded with operation telemetry |
| `generation_executions` | Logical generation identity, immutable input/contract identity, dispatch state, retry/invocation budgets, lifecycle, and privacy-safe terminal diagnostics |
| `generation_operations` | Unique operation identity, dependencies, CAS owner/fence/lease, attempt state, private input/result references, and timing telemetry |
| `generation_workflow_instances` | One-to-many Workflow execution/acknowledgement observability for a logical run |
| `study_guides` | Stable-ID versioned Guide JSON plus normalized title/access/archive/delete metadata |
| `quick_checks` | Versioned Quick Check JSON keyed to Guide checksum/requested count |
| `quick_check_attempts` | Submitted answer and deterministic result JSON |

All tables enable RLS. Authenticated select policies compare the aggregate owner to `auth.uid()`; child ownership is derived through the non-deleted parent session. Direct writes to generated artifacts and all anonymous direct table access remain closed. Server routes use the service role only after the shared DAL validates either the Supabase user owner or the high-entropy anonymous cookie hash and expiry.

The private Storage bucket allows PDF, Office OOXML, legacy Office, and common image MIME values, a 25 MB object limit, and signed upload. No current route issues a user-facing signed source download/view URL. Product-3B Guide lists use bounded page/limit input, deterministic last-access ordering, an embedded source count, and partial indexes for active/archive/recent and cleanup paths. Product-3C Library starts from `sources`, joins the owner aggregate and related Guide in one request, and uses look-ahead pagination without N+1 reads.

Product-3C Search calls `search_owned_knowledge` through the authenticated Supabase server client. The `security invoker` function requires `auth.uid()`, relies on existing owner RLS, excludes archived/deleted aggregates, unions Guide title, structured Topic, normalized Source filename, and Source span matches, and caps page size at 24. GIN FTS indexes support Guide JSON/title, punctuation-normalized Source filename, and span text. A dev query plan used the Source filename GIN index. No search content is loaded wholesale into the browser.

## 5. Identity and ownership reality

The anonymous identity model is intentionally narrow:

1. `POST /api/sessions` creates a random 32-byte base64url token.
2. Only its hash is stored in `preparation_sessions`.
3. The raw token is stored in one HttpOnly, SameSite=Lax cookie named `sgm_session`.
4. Every owned read/mutation matches token hash and a non-expired session.

Product-3A adds the durable path:

- Supabase Auth `auth.users.id` is the durable owner and future entitlement owner.
- Email/password sign-up, sign-in, PKCE callback, sign-out, cookie refresh, and minimal account state are implemented.
- An atomic database function claims only the current unexpired anonymous token into `auth.uid()` and clears the anonymous credential.
- Account-owned sessions have no anonymous expiry and can be reopened across browser sessions through owner authorization.
- One unauthenticated browser cookie still represents only its current anonymous session. Product-3B provides durable multi-Guide listing only for authenticated owners.

The schema and threat model are detailed in `docs/auth-and-persistence.md`. The official Supabase channel is linked, and Production migration history is traceable through `20260830080742`. Product-3 ownership/RLS and Auth claim passed a fresh Production regression on 2026-08-31 after the Workflow rollout; temporary fixtures were cleaned.

## 6. Generation and assessment contracts

Implemented generation path:

1. Validate, hash, de-duplicate, parse, and assign stable spans in deterministic code.
2. Extract topic candidates by source batches.
3. Merge canonical topics in a separate structured call.
4. Generate structured topic content from bounded evidence.
5. Resolve supplied span IDs to real source/page/slide/excerpt values.
6. Run grounding verification, remove/downgrade failed claims, enforce prohibited language, validate the final Guide with Zod, and persist it.
7. Generate Quick Check only on request.
8. Filter candidate MCQs for structure, evidence, topic/anchor mapping, duplication, forbidden language, and verifier verdicts.
9. Send the browser a taking payload without key, explanation, references, or verdicts.
10. Score a complete submission deterministically and persist the result.

Guide generation is now durable and browser-independent. `generation_run_id` is the business identity; a `workflow_run_id` never grants execution rights. At-least-once Workflow steps must acquire database ownership, fencing, a DB-time lease, capacity, and attempt authorization before a provider call. SDK/gateway retries are disabled; Workflow schedules only database-authorized retry state. Capacity is four calls per run and eight globally. Current evidence and remaining risks are recorded in `docs/ai-generation-workflow-rollout.md`.

Important limitations:

- At-least-once execution retains a bounded duplicate provider-call window if a provider succeeds immediately before a crash; settlement and Guide persistence remain fenced/idempotent.
- Generation and Quick Check endpoints have no application rate limiter or entitlement check.
- Five real-material Production samples are insufficient to establish p95 or a broad model-quality release set.

## 7. Current environment contract

`.env.example` declares:

- `NEXT_PUBLIC_SITE_URL`
- `PRELAUNCH`
- Supabase URL, anon key, Storage bucket, service-role key
- OpenAI-compatible base URL/API key
- task model aliases for topic extraction/merge, Guide, grounding, Quick Check, and question verification
- `AI_GENERATION_WORKFLOW_ENABLED` and the server-only reconciler secret
- prompt/schema versions and session retention days

Current behavior and gaps:

- `PRELAUNCH` is server-only and fail-closed. Only exact `false` in Vercel Production enables discovery-page indexing; Vercel Preview remains pre-launch regardless of the variable.
- Pre-launch discovery pages emit `noindex,nofollow`, sitemap returns no URLs, and robots omits the sitemap declaration while keeping discovery pages crawlable enough to observe their page directive.
- Auth redirect uses `NEXT_PUBLIC_SITE_URL` with the localhost fallback. The current Supabase project allows exact callbacks for `https://folveta.com/auth/callback` and `http://localhost:3000/auth/callback`.
- `@supabase/ssr` uses PKCE. A fresh same-browser Production run passed `/signup 200`, `/verify 303`, `/token 200`, `/user 200`, returned to `https://folveta.com/profile`, and preserved the anonymous aggregate through claim. A separate cross-device confirmation attempt lacked a usable callback `code` and remains historical evidence only. The current default Supabase email template cannot be converted to a `token_hash`/`verifyOtp` pattern without Custom SMTP/template editing.
- No payment provider/customer/webhook/price configuration.
- Supabase Cron invokes the generation reconciler every minute. Retention cleanup scheduling remains separate and unverified; no rate-limit configuration exists.
- Production environment values are live in Vercel Production; no secret values are recorded in the repository. Production Supabase/OpenAI credentials remain withheld from Preview.

## 8. Missing reliability, security, and privacy capabilities

- Deployment scheduling and monitoring for the implemented retention endpoint.
- Application rate limits, abuse detection, and per-account/entitlement quotas.
- Explicit origin/CSRF policy for future authenticated and billing mutations.
- Password recovery, full Storage-first account deletion orchestration, and production support/privacy request handling. No Delete Account UI or request endpoint is exposed before that workflow exists.
- Billing signature verification, event idempotency/reconciliation, and entitlement enforcement.
- Production observability, structured redaction rules, alerting, support/privacy channel, and incident runbook.
- Reusable automated migration/RLS CI, cross-browser verification, and a statistically meaningful Production latency/model-quality sample beyond the completed Workflow and Product-3 gates.
- Separate production/preview service isolation proof.

## 9. Product-3 target architecture decisions

Product-3A resolved identity/persistence, Product-3B implements Guide management, and Product-3C implements Library/Search/Profile within these boundaries:

1. **Durable owner:** Supabase Auth user ID; add a profile row only for real application-specific fields.
2. **Guide aggregate:** `preparation_sessions` is the aggregate root and `study_guides` is the stable persistent artifact; do not add a parallel Guide container.
3. **Anonymous claim:** exact token possession plus authenticated `auth.uid()`, atomic and one-time, with no claim-by-ID API.
4. **Lifecycle:** define active, archived, deleted/pending-deletion, expiry, restore window, and permanent purge behavior.
5. **Authorization:** every query filters by the durable owner; add appropriate database constraints/indexes and an explicit RLS/server-access strategy.
6. **Search:** bounded owner-scoped Postgres FTS over Guide titles/topics/content and Source filenames/spans is implemented. Embeddings/vector infrastructure remains deferred until relevance and scale require it.
7. **Storage:** preserve private object paths and verify ownership before issuing any view/download URL.
8. **Deletion:** account/Guide deletion must cascade to generated artifacts and Storage through a reliable, observable cleanup workflow.

## 10. Payment target architecture boundaries

- Product code owns provider-independent plan, entitlement, usage, and account access decisions.
- The provider owns sensitive payment method handling and the hosted payment/customer-management surface where practical.
- A verified server event or reconciliation result changes durable billing state; a browser redirect never grants entitlement.
- Store unique external event IDs and process events idempotently and order-tolerantly.
- Enforce usage at the server entry to expensive generation, with atomic/reservation behavior where concurrency can exceed a limit.
- Checkout, portal, success/cancel/failure, and account billing routes are private/noindex.
- No provider is selected in the current architecture.

## 11. Pre-launch and deployment target

Use layered controls:

1. Deployment/access protection for non-public production testing where feasible.
2. The implemented `PRELAUNCH` switch fails closed and Vercel Preview is always treated as pre-launch.
3. When pre-launch is active and the site is reachable, approved discovery pages emit `noindex,nofollow`; sitemap excludes them. Do not block those reachable URLs in robots before crawlers can observe `noindex`.
4. Private/account/search/billing workflow routes remain access-controlled and `noindex` in every environment.
5. Launch cutover is one explicit configuration change followed by live verification and rollback readiness.

The staged pre-launch currently reuses the verified Supabase `study-guide-maker` backend for localhost and Vercel Production. Supabase credentials are scoped to Production only and withheld from Preview. This prevents Preview from reaching private production data but does not yet provide fully separate localhost/production data stores; that remaining isolation decision is documented in `docs/production-deployment.md`.

## 12. Test architecture target

Retain current fast unit/contract tests and add by risk:

- Supabase migration/integration and owner-isolation tests.
- Auth/anonymous-claim/account lifecycle tests.
- Guide management/search/delete/cleanup tests.
- Billing sandbox, webhook signature/idempotency/order, entitlement concurrency tests.
- Playwright E2E for anonymous, authenticated, multi-guide, Quick Check, billing, deletion, and recovery workflows.
- Visual/accessibility/responsive regression for core UI states.
- Production smoke, redirect/canonical/index, performance, and synthetic monitoring.

Every code phase must read the relevant Next.js 16 documentation under `node_modules/next/dist/docs/` before implementation, as required by `AGENTS.md`.
