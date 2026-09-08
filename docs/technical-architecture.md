# Folveta Technical Architecture

Status: **Current v5 architecture baseline and target boundaries**  
Last repository verification: 2026-09-07 (`npm run check`; no new Production verification)
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

There is no ORM, custom queue/worker service, vector database, component framework, or analytics SDK in the current application. Durable generation uses Vercel Workflow rather than a custom worker. Paddle.js and the Paddle Node SDK support both the isolated Paddle Sandbox deployment and the Production Live deployment.

## 3. Implemented routes

### Public and study routes

| Route | Current responsibility | Index state |
| --- | --- | --- |
| `/` | Landing, real upload entry, supporting product/FAQ content | `noindex,nofollow` while pre-launch; indexable only after explicit production cutover |
| `/about` | Current product purpose/boundaries | Same fail-closed public index policy |
| `/privacy` | Current storage/model/retention disclosure | Same fail-closed public index policy |
| `/terms` | Current service terms | Same fail-closed public index policy |
| `/pricing` | Current Free and Folveta Pro offer | Same fail-closed public index policy |
| `/study-guide-maker-from-pdf` | Focused public PDF-to-Study-Guide task page | Same fail-closed public index policy |
| `/refunds` | Current refund policy | Same fail-closed public index policy |
| `/contact` | Current support/contact route | Same fail-closed public index policy |
| `/study/demo` | Synthetic Guide demonstration | Permanently `noindex,nofollow` |
| `/study/demo/quick-check` | Synthetic Quick Check | Inherits demo `noindex,nofollow` |
| `/auth` | Email/password sign-in and sign-up | `noindex, nofollow` |
| `/auth/forgot-password` | Request a password-recovery email | `noindex, nofollow` |
| `/auth/reset-password` | Complete a verified password reset | `noindex, nofollow` |
| `/account` | Compatibility redirect to `/profile` | `noindex, nofollow` |
| `/my-guides` | Account-owned active/archived Guide list and management UI | `noindex, nofollow` |
| `/library` | Account-owned uploaded multi-format Source inventory | `noindex, nofollow` |
| `/search` | Account-owned Guide/Topic/Source full-text search | `noindex, nofollow` |
| `/profile` | Auth account facts, owner-scoped workspace counts, and sign-out | `noindex, nofollow` |
| `/billing/success`, `/billing/cancel` | Private Checkout return states | `noindex, nofollow` |
| `/study/[sessionId]` | Anonymous-token or account-owned materials/generation/Guide | `noindex, nofollow` |
| `/study/[sessionId]/quick-check` | Owned Quick Check | `noindex, nofollow` |
| `/study/[sessionId]/quick-check/[attemptId]/result` | Owned result | `noindex, nofollow` |

### API routes

| Method/path | Responsibility |
| --- | --- |
| `POST /api/sessions` | Create an anonymous token session or an authenticated owned session |
| `GET /auth/callback` | Exchange a Supabase PKCE code, claim current anonymous work, redirect safely |
| `POST /api/auth/claim` | Claim the current anonymous aggregate for the authenticated user |
| `DELETE /api/account` | Same-origin, rate-limited, confirmed synchronous account deletion; rejects accounts with an active Paddle Live subscription |
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
| `GET /api/sessions/[sessionId]/status` | Return owned session/source/Guide state, preferring the latest V2 request when present |
| `POST /api/sessions/[sessionId]/generate` | Authorize the session, enforce rate and billing admission, select allowlisted V2 when all V2 write gates match, otherwise use Workflow V1 or the legacy fallback |
| `GET /api/internal/generation-reconcile` | Bearer-protected dispatch-gap and watchdog reconciliation invoked by Supabase Cron |
| `POST /api/internal/generation-v2` | Owner-authorized, fully gated V2 request creation/join and Workflow start |
| `GET /api/internal/generation-v2/status` | Owner-authorized V2 request/artifact/terminal-Guide status projection |
| `POST /api/paddle/webhook` | Verify Paddle signatures and process environment-scoped events idempotently |
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
| `rate_limit_windows` | Distributed, database-backed request-rate windows |
| `billing_customers`, `billing_subscriptions`, `billing_usage_periods` | Environment-scoped Paddle customer/subscription mirror and monthly entitlement usage |
| `billing_generation_reservations`, `billing_webhook_events` | Idempotent V1 generation admission/settlement and Paddle event ledger |
| `generation_v2_requests`, `generation_v2_artifacts`, `generation_v2_request_artifacts` | V2 request identity, immutable artifact state, leases/retries, and request manifest joins |
| `generation_v2_guides` | One immutable terminal V2 Guide snapshot per V2 request |
| `billing_generation_v2_reservations` | V2-specific generation admission and terminal settlement |

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
- Email/password sign-up, sign-in, PKCE callback, sign-out, cookie refresh, forgot-password email initiation, verified password reset, and minimal account state are implemented.
- An atomic database function claims only the current unexpired anonymous token into `auth.uid()` and clears the anonymous credential.
- Account-owned sessions have no anonymous expiry and can be reopened across browser sessions through owner authorization.
- One unauthenticated browser cookie still represents only its current anonymous session. Product-3B provides durable multi-Guide listing only for authenticated owners.
- Profile exposes confirmed account deletion. The server requires same-origin confirmation and rate-limits the request. An active Paddle Live subscription causes deletion to be rejected; the server does not automatically cancel it. Otherwise Storage, owned database sessions, and the Auth user are deleted synchronously. No persistent deletion request, retry, or audit state is written.

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

Generation V2 is implemented alongside V1 behind `GENERATION_V2_RUNTIME_ENABLED`, `GENERATION_V2_PRODUCT_ENABLED`, and `GENERATION_V2_ROLLOUT_ALLOWLIST`. The formal Generate route can create or join a V2 request and start its thin Workflow runner; the status route, Study page, Guide lists, reopen, and Guide management can read delivered V2 Guides. V2 persists requests, artifacts, request-artifact joins, terminal Guide snapshots, and dedicated billing reservations in separate tables. Search, Quick Check, and Library related-Guide reads remain V1-only, and Production V2 enablement has not been verified by this document.

Important limitations:

- At-least-once execution retains a bounded duplicate provider-call window if a provider succeeds immediately before a crash; settlement and Guide persistence remain fenced/idempotent.
- Generation has distributed rate limiting plus server-side billing admission. Quick Check has distributed rate limiting but no separate billing entitlement check or quota unit.
- Five real-material Production samples are insufficient to establish p95 or a broad model-quality release set.

## 7. Current environment contract

`.env.example` declares:

- `NEXT_PUBLIC_SITE_URL`
- `PRELAUNCH`
- Supabase URL, anon key, Storage bucket, service-role key
- OpenAI-compatible base URL/API key
- task model aliases for topic extraction/merge, Guide, grounding, Quick Check, and question verification
- `AI_GENERATION_WORKFLOW_ENABLED` and the server-only reconciler secret
- `GENERATION_V2_RUNTIME_ENABLED`, `GENERATION_V2_PRODUCT_ENABLED`, and `GENERATION_V2_ROLLOUT_ALLOWLIST` for controlled Generation v2 routing
- Paddle server/client environment, client token, API key, webhook secret, Product ID, and Price ID
- prompt/schema versions and session retention days

Current behavior and gaps:

- `PRELAUNCH` is server-only and fail-closed. Only exact `false` in Vercel Production enables discovery-page indexing; Vercel Preview remains pre-launch regardless of the variable.
- Pre-launch discovery pages emit `noindex,nofollow`, sitemap returns no URLs, and robots omits the sitemap declaration while keeping discovery pages crawlable enough to observe their page directive.
- Auth redirect uses `NEXT_PUBLIC_SITE_URL` with the localhost fallback. The current Supabase project allows exact callbacks for `https://folveta.com/auth/callback` and `http://localhost:3000/auth/callback`.
- `@supabase/ssr` uses PKCE. A fresh same-browser Production run passed `/signup 200`, `/verify 303`, `/token 200`, `/user 200`, returned to `https://folveta.com/profile`, and preserved the anonymous aggregate through claim. A separate cross-device confirmation attempt lacked a usable callback `code` and remains historical evidence only. The current default Supabase email template cannot be converted to a `token_hash`/`verifyOtp` pattern without Custom SMTP/template editing.
- The isolated `folveta-paddle-sandbox` deployment uses `PADDLE_ENV=sandbox` and `NEXT_PUBLIC_PADDLE_ENV=sandbox`. Production `folveta.com` uses `PADDLE_ENV=live` and `NEXT_PUBLIC_PADDLE_ENV=production`, with Live Product/Price/Checkout/webhook, server-side billing, Customer Portal, and environment-scoped entitlement enforcement.
- Supabase Cron invokes the generation reconciler every minute. Protected Storage-first retention cleanup is scheduled daily. Distributed rate limiting, account deletion, password recovery, and generation billing admission are implemented.
- Production environment values are live in Vercel Production; no secret values are recorded in the repository. Production Supabase/OpenAI credentials remain withheld from Preview.

## 8. Reliability, security, and privacy status

Implemented:

- The protected retention endpoint is scheduled through the daily Vercel Cron job.
- Distributed request-rate limits and per-account generation entitlement quotas are implemented.
- Password recovery and synchronous Storage/database/Auth account deletion are implemented. Active Paddle Live subscriptions are rejected, not automatically cancelled; no persistent deletion retry, audit, or request state exists.
- Paddle Live merchant onboarding, Live webhook configuration, and billing-record retention policy: completed and active.

Missing or not fully verified:

- Production observability, structured redaction rules, alerting, support/privacy channel, and incident runbook. Production monitoring is READY but broader observability work remains open.
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

## 10. Payment architecture boundaries

The current Payment/Billing v1 record is in `docs/payment-billing-architecture.md`. Paddle is implemented and validated in both the Sandbox deployment and the Production Live deployment. The application has billing tables, entitlement enforcement, Checkout, webhooks, Customer Portal, and environment-scoped subscription/usage enforcement for both Sandbox and Live.

- Product code owns provider-independent plan, entitlement, usage, and account access decisions.
- The provider owns sensitive payment method handling and the hosted payment/customer-management surface where practical.
- A verified server event or reconciliation result changes durable billing state; a browser redirect never grants entitlement.
- Store unique external event IDs and process events idempotently and order-tolerantly.
- Enforce usage at the server entry to expensive generation, with atomic/reservation behavior where concurrency can exceed a limit.
- Checkout, portal, success/cancel/failure, and account billing routes are private/noindex.
- Paddle is implemented for both Sandbox and Live. Merchant approval, website review, and Live configuration are completed.
- Billing wraps the existing generation admission boundary with an atomic, `auth.users.id`-owned usage reservation and does not alter durable AI Workflow execution semantics. A successful Guide is consumed exactly once; Quick Check is included.
- Every provider-specific record and access query is scoped to a server-derived `billing_environment` of `sandbox` or `live`. Missing, unknown, and legacy environments fail closed. Sandbox paid access cannot produce formal Live paid access, and the reverse is also true.
- The public plan is Free + Folveta Pro monthly at USD 12/month, with Free `2` and Pro `10` successful Guides/month. Active subscriptions scheduled to cancel remain entitled through their current period.

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
