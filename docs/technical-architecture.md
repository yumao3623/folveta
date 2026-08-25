# Folveta Technical Architecture

Status: **Current v5 architecture baseline and target boundaries**  
Last verified: 2026-08-25  
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
  |-- anonymous session-token ownership checks
  |-- PDF/PPTX validation and parsing
  |-- stable source unit/span creation
  |-- model gateway and structured generation
  |-- deterministic reference resolution and MCQ scoring
  v
Supabase
  |-- private Storage bucket
  `-- Postgres artifacts and state, closed RLS for browser roles

Configured OpenAI-compatible Responses API
  `-- task-specific structured outputs and verifier calls
```

### Runtime and libraries

| Layer | Implemented choice |
| --- | --- |
| Web | Next.js 16.3.2 App Router, React 19.2.8, TypeScript 5 |
| Styling | Tailwind CSS 4, local CSS variables, Bricolage Grotesque/Geist via `next/font` |
| Icons | `lucide-react` |
| Database/storage | Supabase Postgres and private Storage |
| Validation | Zod 4 strict schemas |
| Model API | OpenAI SDK Responses structured parsing behind `ModelGateway` |
| Parsing | `unpdf`, `officeparser`, `file-type` |
| Tests | Vitest; synthetic PDF/PPTX fixtures use `pdf-lib` and `jszip` |

There is no ORM, job queue, worker, vector database, component framework, analytics SDK, Auth provider integration, or billing SDK in the current application.

## 3. Implemented routes

### Public and study routes

| Route | Current responsibility | Index state |
| --- | --- | --- |
| `/` | Landing, real upload entry, supporting product/FAQ content | Currently indexable; pre-launch control missing |
| `/about` | Current product purpose/boundaries | Currently indexable |
| `/privacy` | Current storage/model/retention disclosure | Currently indexable |
| `/terms` | Current pre-launch terms | Currently indexable |
| `/study/demo` | Synthetic Guide demonstration | `noindex, follow` |
| `/study/demo/quick-check` | Synthetic Quick Check | Inherits demo `noindex, follow` |
| `/study/[sessionId]` | Owned anonymous materials/generation/Guide | `noindex, nofollow` |
| `/study/[sessionId]/quick-check` | Owned Quick Check | `noindex, nofollow` |
| `/study/[sessionId]/quick-check/[attemptId]/result` | Owned result | `noindex, nofollow` |

### API routes

| Method/path | Responsibility |
| --- | --- |
| `POST /api/sessions` | Create an anonymous preparation session and set its token cookie |
| `POST /api/sessions/[sessionId]/sources/upload-url` | Verify ownership/limits, create source row, issue signed upload URL |
| `POST /api/sources/[sourceId]/parse` | Verify ownership, download private object, validate/hash/parse, persist units/spans |
| `POST /api/sources/[sourceId]/upload-failed` | Persist failed upload state |
| `GET /api/sessions/[sessionId]/status` | Return owned session/source/Guide state |
| `POST /api/sessions/[sessionId]/generate` | Run Guide generation inline with a 300-second max duration |
| `POST /api/sessions/[sessionId]/quick-check` | Reuse or lazily generate a five-to-ten item request; UI currently requests five |
| `POST /api/sessions/[sessionId]/quick-check/submit` | Validate complete answers, score by immutable IDs, persist result |

## 4. Implemented data model

| Table | Current role |
| --- | --- |
| `preparation_sessions` | Anonymous token hash, title, generation state, failure, expiry |
| `sources` | Session-owned file metadata, private object path, hash, parse state/counts/warnings |
| `source_units` | Page/slide raw and normalized text plus readability/warnings |
| `source_spans` | Stable evidence blocks selected by model output |
| `generation_runs` | Model stage/status/version/provider/model/usage/error metadata |
| `study_guides` | One versioned Guide JSON per session |
| `quick_checks` | Versioned Quick Check JSON keyed to Guide checksum/requested count |
| `quick_check_attempts` | Submitted answer and deterministic result JSON |

All tables enable RLS and define no browser policies. Server routes use the Supabase service role only after checking the high-entropy session cookie against a stored SHA-256 token hash and expiry.

The private Storage bucket allows PDF/PPTX-related MIME values, a 25 MB object limit, and signed upload. No current route issues a user-facing signed source download/view URL.

## 5. Identity and ownership reality

The anonymous identity model is intentionally narrow:

1. `POST /api/sessions` creates a random 32-byte base64url token.
2. Only its hash is stored in `preparation_sessions`.
3. The raw token is stored in one HttpOnly, SameSite=Lax cookie named `sgm_session`.
4. Every owned read/mutation matches token hash and a non-expired session.

Consequences:

- There is no persistent user identity.
- One browser cookie can represent only the most recently created session token.
- A second Guide session overwrites access to the earlier one in that browser, even though its database row still exists until deletion.
- There is no cross-device access, account recovery, guide list, or durable customer owner.

This model must remain protected until Product-3 replaces it. Product-3 must not weaken token entropy or introduce claim-by-ID behavior.

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

Important limitations:

- Guide generation runs inline in one request. Stage state is persisted, but the historical lease/checkpoint/resume design is not implemented.
- There is no durable queue or worker.
- Generation and Quick Check endpoints have no application rate limiter or entitlement check.
- Model quality has deterministic tests and demo fixtures, but no frozen multi-course release evaluation set is present.

## 7. Current environment contract

`.env.example` declares:

- `NEXT_PUBLIC_SITE_URL`
- Supabase URL, anon key, Storage bucket, service-role key
- OpenAI-compatible base URL/API key
- task model aliases for topic extraction/merge, Guide, grounding, Quick Check, and question verification
- prompt/schema versions and session retention days

Current gaps:

- No pre-launch indexing flag.
- No Auth redirect/site configuration contract.
- No payment provider/customer/webhook/price configuration.
- No cleanup scheduler secret/endpoint or rate-limit configuration.
- `.env.local` did not contain `NEXT_PUBLIC_SITE_URL` at audit time; no secret values were inspected or recorded.

## 8. Missing reliability, security, and privacy capabilities

- Scheduled deletion of expired Postgres rows and private Storage objects.
- Application rate limits, abuse detection, and per-account/entitlement quotas.
- Explicit origin/CSRF policy for future authenticated and billing mutations.
- Durable generation concurrency lease/idempotency and resume strategy.
- Auth/account lifecycle, token rotation, anonymous claim, and account deletion.
- Billing signature verification, event idempotency/reconciliation, and entitlement enforcement.
- Production observability, structured redaction rules, alerting, support/privacy channel, and incident runbook.
- Supabase integration/RLS tests and full browser E2E.
- Separate production/preview service isolation proof.

## 9. Product-3 target architecture decisions

The Product-3 design task must decide and document before migrations:

1. **Durable owner:** use the selected Auth user ID as the stable owner key; add a profile row only for application-specific fields.
2. **Guide aggregate:** decide whether `preparation_sessions` becomes the durable Guide/workspace record or remains a generation session behind a new `guides` table. Prefer the option that minimizes risky migration while making one user -> many Guides explicit.
3. **Anonymous claim:** store claim eligibility separately from user ownership; require possession of the existing high-entropy token and an authenticated user; make claim atomic and one-time.
4. **Lifecycle:** define active, archived, deleted/pending-deletion, expiry, restore window, and permanent purge behavior.
5. **Authorization:** every query filters by the durable owner; add appropriate database constraints/indexes and an explicit RLS/server-access strategy.
6. **Search:** begin with bounded owner-scoped Postgres text search over Guide titles/topics/content if it meets product requirements. Do not add embeddings/vector infrastructure until relevance and scale require it.
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
2. A fail-safe environment-controlled public-index mode.
3. When pre-launch is active and the site is reachable, approved discovery pages emit `noindex`; sitemap excludes them. Do not block those reachable URLs in robots before crawlers can observe `noindex`.
4. Private/account/search/billing workflow routes remain access-controlled and `noindex` in every environment.
5. Launch cutover is one explicit configuration change followed by live verification and rollback readiness.

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
