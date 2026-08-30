# AI Generation Workflow Production Rollout

Status: **AI Workflow Rollout Gate passed; public launch remains blocked**  
Verified: 2026-08-31  
Production commit: `613dbeb007d6af6652c1019494e62e279d70631b`  
Production deployment: `dpl_F9X9ZYcRK1bBjeFyvVzZmBarHoj9` (`READY`)

## Production state

- `AI_GENERATION_WORKFLOW_ENABLED=true` in Vercel Production.
- `PRELAUNCH=true`; public discovery pages remain `noindex,nofollow`.
- The legacy generation path remains in code as the feature-flag OFF fallback.
- Supabase migration history is traceable through `20260830080742_register_generation_reconciler_cron`.
- Supabase Cron is the only reconciler scheduler. `generation-reconcile` is active at `* * * * *`; Vercel Cron is absent.
- The protected reconciler returned `200`; an unauthenticated request returned `401`.
- The temporary protected provider-probe route was removed and returns `404` in Production.

## Execution contract

`POST generate` authorizes the owner, claims or reuses one logical `generation_run_id`, dispatches a Vercel Workflow, and returns `202`. The browser polls status and renders the persisted Guide; closing or reloading the page does not own execution.

Workflow execution is at least once. `workflow_run_id` is observability metadata only. Database CAS, dispatch epochs/tokens, operation owner tokens, fencing versions, DB-time leases, and unique operation keys authorize progress and make settlement idempotent. The design does not claim exactly-once provider execution; a bounded duplicate-call window remains if a provider succeeds immediately before a worker crash.

The OpenAI SDK has `maxRetries: 0`, and the gateway has no outer retry. Workflow schedules retries only after the database settles a retryable failure. Each operation has three total attempts, a logical run has four shared retry credits, and initial attempts, contention, replay, completed-operation resume, and stale Workflow rejection do not consume retry credits.

Provider capacity is database-authorized at four concurrent calls per logical run and eight globally. Capacity wait does not consume an attempt. Expired leases are reclaimable, and the minute reconciler repairs dispatch gaps and stale Workflow progress.

Workflow inputs, outputs, step state, diagnostics, and errors contain opaque IDs and allowlisted metadata only. Source material, prompts, Guide content, source spans, and raw provider request/response bodies remain in private Supabase data and are not persisted in Workflow state or ordinary logs.

## Provider and real-material acceptance

The Production provider boundary probe executed once inside Vercel Production using the deployed provider/model environment. It passed response envelope, content type, model identity, structured contract, request-ID, timeout, and privacy-safe diagnostic checks. No prompt or model output was returned or logged.

The first real-PDF rollout exposed `MODEL_INVALID_SOURCE_REFERENCE`. Read-only evidence showed that the operation used the complete source snapshot and that no batching omission occurred. Commit `613dbeb` constrains every operation's structured `evidence_span_id` to the operation's actual allowed IDs while retaining post-response referential validation. It does not filter, repair, or retry illegal references.

The following acceptance runs started from new Production sessions after that fix. Provider time is summed across parallel operations and may exceed wall time.

| Run | Result | Wall ms | Operations / provider attempts | Queue ms | Slot wait ms | Provider ms | DB commit ms | Retries | Deadline exceeded |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Workflow smoke | PASS | about 61,100 | 4 / 3 | recorded | 0 | recorded | recorded | 0 | false |
| Real PDF 1 | PASS | 174,777 | 18 / 17 | 25,004 | 0 | 451,865 | 17 | 0 | false |
| Real PDF 2 | PASS | 175,569 | 18 / 17 | 20,703 | 0 | 463,009 | 264 | 0 | false |
| Real PDF 3 | PASS | 188,889 | 16 / 15 | 18,754 | 0 | 474,707 | 20 | 0 | false |
| Legacy PPT 1 | PASS | 71,268 | 10 / 9 | 12,204 | 0 | 163,315 | 19 | 0 | false |
| Legacy PPT 2 | PASS | 118,140 | 12 / 11 | 14,769 | 0 | 227,358 | 19 | 0 | false |

Each run produced one completed Workflow instance and one persisted Guide. No acceptance run used a provider retry or exceeded a deadline. Browser reload/automation loss was observed during the smoke/PDF cohort while the server-owned Workflow continued and the final Guide rendered. Automated tests cover duplicate dispatch/start, stale acknowledgement and fencing, completed-operation replay, lease reclaim, retry-credit atomicity, and the 4/run and 8/global limits; those fault cases were not artificially induced in Production.

## Product regression and validation

Production regression passed for anonymous session creation, Auth claim, My Guides, Recent Guides, Library, Search, Profile, stable Guide reopen, Quick Check, Results, relogin persistence, signed-out isolation, and cross-owner page/API/RLS denial. Deterministic test aggregates and Auth users were removed afterward. A separate claim probe verified authenticated access `200` and rejection of the superseded anonymous credential with `404`.

Final local validation on the Production commit plus documentation changes:

- `npm test`: 124 passed, 4 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; Workflow compiler produced 12 steps and 1 workflow.
- `npm run test:workflow`: 3 passed.

There are not enough representative Production samples to establish p95. The five real-material runs above all completed below five minutes, but **p95 remains unproven**.

## Remaining risks and next gate

- Provider latency and protocol behavior remain external risks; the current sample observed no retry path in Production.
- The bounded duplicate provider-call window inherent in at-least-once execution remains.
- Rate limits, monitoring/alerting, retention scheduling, account deletion, support/privacy operations, billing, SEO v2, and public indexing are separate launch gates.
- Payment work may resume as a separate task because the AI Workflow blocker is closed. This record does not start or approve a Payment implementation by itself.
