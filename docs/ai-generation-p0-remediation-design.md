# AI Generation P0 Remediation Design

Status: Approved for implementation by Integrator/Arbiter
Date: 2026-08-28
Scope: Real-material upload to persisted, visible Study Guide
Root-cause report: current task evidence and production diagnostics at `main@6b018fa`

## 1. Objective

Replace browser-owned, request-bound generation with durable server-owned execution while preserving Folveta's private-source, evidence-grounded Guide contract.

This design must resolve the proven production failure mode:

- a nominal 120-second model attempt could contain OpenAI SDK retries and cross Vercel's 300-second Function limit;
- a real PDF merge request was terminated at 300 seconds, leaving an orphan run and lease;
- the full pipeline required approximately `2N + 2` serial model calls;
- progress depended on the browser repeatedly invoking the next continuation;
- the configured gateway has intermittent protocol and model-routing incompatibilities.

The target execution guarantee is:

> At-least-once Workflow execution + database-fenced operation ownership + idempotent/CAS persistence + globally bounded provider attempts + bounded but non-zero duplicate provider-call risk.

The design does not claim exactly-once provider execution. It does guarantee exactly-once logical persistence and rejection of stale writers.

## 2. Locked Requirements

- Vercel Workflows owns background orchestration. The browser only starts or observes a logical run.
- Supabase remains the source of truth for private source text, intermediate results, ownership, progress, and the final Guide.
- `generation_run_id` is the unique business identity for one logical generation.
- `workflow_run_id` identifies one Vercel execution instance for observability only. One logical run may have many Workflow instances.
- Closing, refreshing, or reopening the page must not stop or restart generation.
- Duplicate clicks, tabs, dispatches, Workflow replays, and lease takeovers must converge on the same database operations.
- OpenAI SDK retries are disabled. Workflow triggers retries; the database authorizes and counts provider invocations.
- Private content must not enter Workflow persistence, ordinary logs, diagnostics, exception messages, step names, or observability payloads.
- No provider or model switch is part of this change.
- Payment, SEO, indexing, account deletion, and broad product regression remain out of scope until the AI gate is ready.

## 3. Non-Functional Requirements

### Performance

For the initial acceptance cohort:

- at most 45,000 extracted characters;
- within the safe input token budget;
- at most 8 topics;
- measure from the user's Generate click until the complete Guide is rendered;
- include dispatch, queueing, provider work, retries, database commits, and up to two seconds of frontend polling;
- target p95 is at most 5 minutes.

The initial critical-path budget is:

| Segment | p95 budget |
| --- | ---: |
| Dispatch and queue | 15s |
| Topic planning | 75s |
| Two topic waves, including Guide and grounding | 200s |
| Finalize and frontend observation | 10s |
| Total | 300s |

Nine to twelve topics are measured separately. The product may not discard sources, reduce Guide content, or lower the topic limit to manufacture an SLO pass.

Five minutes is the product SLO. Fifteen minutes is the initial hard logical-run deadline that prevents permanent hangs. They are not interchangeable.

### Scale and fairness

- At most 4 active provider operations per logical run.
- At most 8 active provider operations globally.
- A large run cannot occupy more than half of global capacity.
- Contenders retry capacity acquisition after a durable sleep and never consume provider attempts or retry credits while waiting.
- All capacity, lease, and deadline decisions use PostgreSQL time.

### Reliability

- A database transaction grants every provider execution right.
- Every result commit is fenced by owner token and fencing version.
- Logical provider attempts are globally bounded across duplicate Workflow instances.
- Completed progress is monotonic and independently persisted by operation.
- Deployments, runtime crashes, browser closure, and lost dispatch acknowledgements are recoverable.

### Security and privacy

- New execution tables and RPCs are service-role-only. A `generation_run_id` is an identifier, not an authorization credential.
- Existing session/account authorization remains at the Route Handler boundary.
- Only allowlisted diagnostic fields may cross Workflow or logging boundaries.
- A synthetic sentinel audit must prove that private content is absent from Workflow persistence and ordinary logs.

## 4. Execution Identity

Three identities have distinct meanings:

1. **Logical generation run**: `generation_run_id`. Immutable source and execution contract, retry credits, deadline, lifecycle, and final outcome.
2. **Operation**: unique `(generation_run_id, operation_key)`. One planning batch, merge, Guide topic, grounding topic, or finalize unit.
3. **Provider attempt**: one reserved provider invocation. It records privacy-safe timing, status, usage, and outcome diagnostics.

`workflow_run_id` is a fourth, non-business identity. It records that Vercel started or acknowledged one orchestration instance. It never grants provider execution rights.

Operation keys are opaque. They may contain a fixed operation kind plus an internal random ID, such as `guide:op_01J...`; they may not contain topic titles, filenames, session IDs, user IDs, or source-derived text.

## 5. Data Model

### Logical-run relation

The expand phase creates this relation as `generation_executions` so the currently deployed application can continue using the historical `generation_runs` attempt table. After all application model-attempt writes use a stable RPC and legacy deployments are drained, a later cleanup transaction renames the historical table to `generation_attempts` and `generation_executions` to `generation_runs`. Application and Workflow code access logical runs through stable RPCs rather than direct table names, so that cleanup does not require an unsafe simultaneous application cutover.

One logical run:

- `id`, `session_id`, lifecycle state, fixed public stage;
- immutable `source_snapshot_hash` and `execution_contract_hash`;
- provider/model identity, prompt/schema version, pipeline version, and relevant parsing/generation contract versions;
- `retry_credits_remaining`, initially 4;
- `provider_invocations_used` and a hard `provider_invocation_limit`, initially 40;
- dispatch state and count, dispatch lease, last dispatch time, Workflow acknowledgement time, last progress time;
- requested, started, completed, and hard-deadline timestamps;
- privacy-safe `failure_category`, `error_code`, `retry_allowed`, and opaque support ID.

The row is also the transactional outbox because one logical generation needs one durable dispatch intent.

Dispatch lifecycle is separate from logical-run lifecycle. Dispatch state is explicit:

`dispatch_pending -> dispatch_claimed -> workflow_acked -> running -> succeeded | failed`

Logical run status remains `queued | running | succeeded | failed` and does not move backwards when a watchdog creates a new dispatch. Calling `start()` is not acknowledgement. Active execution begins only when a Workflow instance acknowledges the current dispatch epoch in the database.

### `generation_operations`

One independently committed unit:

- run ID, opaque operation key and kind/version;
- status and fixed dependency operation IDs;
- immutable operation input hash and dependency result hashes;
- private validated result JSON and result hash;
- owner token, fencing version, DB-time lease and next eligible time;
- provider attempt count, ready/claimed/settled timestamps;
- queue, slot wait, provider, DB commit, and total duration fields;
- privacy-safe terminal diagnostics;
- optional reuse provenance: source run ID and source operation ID.

Unique constraint: `(generation_run_id, operation_key)`.

### Historical model-attempt relation

The existing `generation_runs` table currently represents individual model calls. It remains unchanged during schema expansion so old deployments, Guide generation, and Quick Check keep working. The expansion adds a stable `record_generation_attempt` RPC and the compatible application moves every model-attempt write to that RPC. Only after old deployments and in-flight requests are drained does a separate forward-only cleanup transaction rename the table to `generation_attempts` without deleting historical rows. It retains its historical stage/status/model/usage/error/timing data, then gains nullable logical run/operation references and sanitized diagnostic fields for new calls.

Before migration, all table, policy, index, RPC, generated type, application, test, and diagnostic references must be inventoried. Row counts and representative field values are verified before and after rename. New and old semantics may not coexist under the same `generation_runs` name.

### `generation_workflow_instances`

One row per Vercel Workflow instance:

- logical run ID;
- Vercel Workflow run ID;
- workflow contract/version;
- dispatch and acknowledgement timestamps;
- privacy-safe lifecycle and diagnostic metadata.

This is a 1:N observability relation. It is not an ownership relation.

### Session compatibility

`preparation_sessions.current_generation_run_id` identifies the current logical run. Existing session-level checkpoint and lease columns remain temporarily for old deployment compatibility but are not read or written for new Workflow ownership. New execution truth is only the logical-run relation plus `generation_operations`; its physical expand-phase name does not change that business identity.

## 6. Database Transaction Boundaries

All operations below are PostgreSQL functions/RPCs that complete in one database transaction and verify that their CAS changed the expected row.

### Claim or reuse logical run

- Validate the authorized session and current source snapshot.
- Return an existing non-terminal compatible logical run, or create a new run.
- Set `preparation_sessions.current_generation_run_id`.
- Create initial planning operations and `dispatch_pending` intent.
- Pin the immutable execution contract and 15-minute DB-time deadline.

Manual retry creates a new logical run. It may reuse an immutable validated operation result only when the complete execution input identity matches: source snapshot/version, contract hash, operation kind/version, operation input hash, dependency result hashes, and validation/grounding requirement. Reuse records source run and operation provenance and consumes no provider attempt.

### Claim dispatch

- Claim only `dispatch_pending`, expired `dispatch_claimed`, or explicitly watchdog-reset runs.
- Under CAS, increment an integer dispatch epoch and create a new opaque dispatch token.
- Use a DB-time lease, bounded backoff, and a dispatch-attempt count.
- Never dispatch terminal or hard-deadline-expired runs.
- Pass the logical run ID and current opaque dispatch token to `start()`.

### Acknowledge Workflow instance

The first Workflow step writes the Vercel Workflow run ID, logical run ID, dispatch epoch/token, workflow contract/version, and acknowledgement time. The acknowledgement RPC uses CAS against the run's current dispatch token and epoch. A stale, delayed Workflow instance is recorded as a stale instance and exits; it cannot acknowledge the current dispatch or stop reconciliation. A valid acknowledgement stops initial dispatch reconciliation but grants no provider execution right.

### Claim operation

This is the only transaction that can authorize a provider call. Under one transaction-scoped advisory lock and consistent global-then-run lock ordering, it checks:

- the run is current, compatible, non-terminal, and before its DB-time hard deadline;
- execution contract and source snapshot still match;
- all required dependencies succeeded;
- the operation is not already successful;
- a stale lease may be recovered;
- active, non-expired operations are below global 8 and per-run 4 limits;
- the operation has fewer than 3 provider attempts;
- a retry has a logical-run retry credit available.
- the logical run remains below its absolute provider-invocation limit.

Only then it creates a new owner token, increments fencing version, assigns a DB-time lease, increments the operation attempt count and logical-run provider-invocation count, inserts a reserved/running attempt record, and, for attempt 2 or 3, atomically consumes one retry credit. The pre-reservation counts against the hard limit even if the process crashes before sending the network request; this conservatively bounds calls when the exact crash point is unknowable.

Initial attempt: attempt count +1, no retry credit.
Retry attempt: attempt count +1 and one retry credit.
Contention, unmet dependencies, duplicate Workflow, completed fast path, DB transient before claim, and Workflow replay without execution right consume neither.

Indexes must support active lease counts, run status/deadline scans, dispatch scans, dependency lookups, and the run/operation unique key.

### Settle operation

Success or failure settlement requires:

- generation run ID;
- operation key;
- current owner token;
- current fencing version;
- expected non-terminal operation state;
- current non-terminal logical run.

A late response from an expired owner is rejected. A successful transaction writes the validated result and hash, releases the lease, settles the attempt and operation, and advances only the committed run progress. No application-side read-then-update sequence is considered atomic.

A retryable provider failure must first call a fenced settlement RPC. In one transaction it writes the safe attempt failure, releases the provider lease/capacity, sets the operation to `retry_wait`, assigns `next_eligible_at` from DB time and updates progress telemetry. Only after that commit may Workflow schedule the retry. If operation attempts, logical retry credits, absolute provider invocations, or the hard deadline are exhausted, the same RPC instead marks the operation failed, cancels dependent pending operations, marks the logical run/session terminal with a safe category, and prevents further claims. Fatal failures take that terminal path immediately.

Known provider retry is orchestrated from the committed `retry_wait` state: Workflow durably waits until `next_eligible_at` and invokes the operation step again. `RetryableError` is reserved for sanitized transient Workflow/DB infrastructure failure or an implementation path that preserves the same database-authorized schedule; `FatalError` crosses the Workflow boundary only after terminal database settlement. Default framework replay never bypasses the claim RPC.

### Finalize operation

`finalize` is a normal, uniquely keyed, claimable, fenced operation. Its final transaction:

- verifies every required planning, Guide, and grounding operation succeeded;
- assembles or validates the final private Guide JSON;
- upserts `study_guides` for the current logical run;
- settles `finalize`;
- marks the logical run succeeded;
- marks the session `guide_ready`.

The Guide cannot exist as completed while the run/session is still running, or vice versa.

### Hard deadline

At 15 minutes, a DB transaction makes the logical run terminal, prevents new operation or dispatch claims, and rejects late settles. This is an execution ceiling, not the five-minute SLO.

## 7. Dispatch, Reconciliation, and Watchdog

The three roles are separate:

- **Generate API**: authorize, claim/reuse the logical run, best-effort call `start()`, and quickly return the logical run ID.
- **Reconciler**: recover `dispatch_pending` or dispatch-claimed-but-unacknowledged runs. It does not judge running progress.
- **Watchdog**: inspect Workflow-acknowledged/running runs with stale progress, reset them for redispatch using the same logical run ID, or enforce the hard deadline. It does not process ordinary pending dispatch.

A protected Vercel Cron Route Handler performs reconciliation and watchdog work with separate RPC predicates. It requires `CRON_SECRET`, uses bounded batches and backoff, and starts only the existing logical run ID.

Workflow acknowledgement, not the caller's `workflow_run_id` write, stops initial redispatch. Duplicate Workflow instances may exist, but every operation still needs a database execution right. A Workflow hook/token may reduce duplicate orchestration cost, but correctness never depends on only one successful `start()`.

## 8. Workflow Shape

Workflow input contains only `generationRunId` and the opaque `dispatchToken` for the dispatch epoch that created the instance.

1. Acknowledge the Workflow instance using `getWorkflowMetadata().workflowRunId` and the supplied dispatch token; exit if the epoch is stale.
2. Claim and execute topic planning.
3. If required, execute extraction batches with bounded parallelism, then merge.
4. Create opaque Guide and grounding operations from the committed topic plan.
5. Execute at most four topic branches concurrently. Each branch is `Guide -> grounding`.
6. Claim and execute `finalize`.

Every step reads private inputs from Supabase internally and writes private results back before returning. Step inputs, outputs, names, logs, errors, and closure captures contain only opaque IDs, enum states, counts, and timing metadata.

Workflow uses fixed-size batches and durable sleeps for contention. Capacity waiting does not hold compute and does not consume provider attempt budget.

## 9. Topic Planning and Token Guard

The 45,000-character threshold is only an initial heuristic. A single `plan_topics` call is allowed only when both conditions pass:

1. extracted characters are at most 45,000; and
2. estimated input tokens + prompt/schema overhead + source reference/metadata overhead + expected output reserve fit within the smaller of:
   - the configured model's verified context window; and
   - the gateway's production-probed request/token limit,
   with a safety margin.

If the formal model or gateway limit is unknown, use a conservative configured budget and take the batch path. The estimator must handle non-ASCII/CJK text conservatively and is verified against actual provider usage from privacy-safe probes.

For a safe single batch, `plan_topics` returns the final canonical topic map, eliminating the extra merge call. Larger inputs use bounded parallel extraction followed by one merge.

No source is dropped to satisfy the fast path.

## 10. Grounding

Current grounding is not only deterministic reference checking. Local code validates schema, supplied span IDs, and reference scope. The `grounding_verify` provider call independently judges whether each claim is entailed by cited evidence.

The redesign preserves both layers:

- local deterministic validation before and after provider calls;
- provider grounding only where entailment judgment is required.

It does not introduce any additional grounding call beyond this existing product requirement.

## 11. Retry and Provider Error Classification

Retry ownership is singular:

- OpenAI SDK: `maxRetries: 0`;
- OpenAI SDK: `logLevel: "off"`;
- gateway outer retry: removed;
- Workflow framework: triggers retries;
- database: records and authorizes each real provider invocation.

Each operation has at most 3 total provider attempts: attempt 1 plus at most 2 retries. Each logical run has 4 retry credits shared atomically across every operation and Workflow instance. It also has an absolute limit of 40 reserved provider invocations, including initial attempts and retries. The safe-path cohort with one planning call and at most eight topics can create at most 17 initial provider operations and therefore at most 21 invocations after all four retry credits. Operation-creation RPCs reject a dependency graph whose possible initial operations plus reserved retry allowance exceed the run limit.

The provider adapter interprets HTTP status, response status, and incomplete reason before classification.

Potentially retryable, only when verified by the gateway contract:

- 408;
- 409 only if a production probe confirms transient semantics;
- 429;
- allowlisted 500, 502, 503, and 504 conditions;
- provider deadline;
- temporary connection failure;
- transport/network interruption causing an incomplete response;
- an otherwise valid response that is temporarily empty.

Not all 5xx responses are automatically retried. The final allowlist is locked from production gateway probes.

Fatal/non-retryable:

- wrong response content type or protocol shape;
- requested/actual model mismatch;
- refusal or content restriction;
- invalid JSON or structured schema;
- invalid source references;
- source or execution contract superseded;
- deterministic output-token ceiling or other configuration limit;
- incomplete/empty output caused by model/protocol mismatch;
- incompatible pipeline version.

Persistent empty output reaches stable failure when the finite database budget is exhausted.

## 12. Privacy-Safe Provider Boundary

Raw SDK/provider exceptions may exist only inside the provider adapter. Outside it, callers receive a sanitized typed error without `cause`, raw message, provider payload, response body, request body, source text, prompt, Guide, or span.

The adapter and custom fetch layer may capture only allowlisted headers such as a bounded provider request ID and HTTP status. They validate content type without logging or persisting the body.

The implementation audits every wrapper, fetch interceptor, gateway helper, generic HTTP handler, and observability hook. Workflow code may not call a generic `console.error(error)` path. Invalid-reference errors may not embed model-generated topic titles.

Allowed diagnostic DTO:

- safe error code and failure category;
- fixed stage enum;
- opaque operation ID;
- provider status and bounded request ID;
- attempt number and fixed retry reason enum;
- queue, slot wait, provider, database commit, and total duration;
- deadline-exceeded boolean;
- retry-allowed boolean;
- opaque support ID.

## 13. User-Visible State Contract

The status API returns a fixed, privacy-safe projection. The UI never interprets raw errors.

| Backend state | Fixed UI label |
| --- | --- |
| Dispatch pending/claimed | Preparing your Study Guide |
| Planning | Planning topics |
| Guide branches | Generating your guide |
| Grounding branches | Checking grounding |
| Finalize | Finalizing |
| Slot wait | Waiting to continue |
| Retry | Automatically recovering |
| Success | Study Guide ready |

No label includes topic titles, source-derived text, Workflow step names, leases, fences, CAS state, or retry internals.

Progress is computed only from committed operation states and is monotonic. Replay, redispatch, and takeover cannot move it backwards. Before the topic graph exists, the UI uses an indeterminate state rather than fabricated percentages.

Terminal failures expose only `failure_category`, `retry_allowed`, a fixed user message, and an opaque support ID. The server, not the UI, decides whether to offer Retry, re-upload/restart, or no retry. Provider refusal/content restriction, superseded sources, contract mismatch, schema/protocol failure, and provider exhaustion have distinct fixed outcomes.

Refresh and multiple tabs observe the current logical run. They never implicitly start another run. Manual retry is explicit and creates a new logical run under the reuse rules in Section 6.

`succeeded` means the final transaction committed the Guide, run, operation, and session. When the client observes success, the same refresh must render the Guide. Polling stops only after visible Guide or stable terminal failure.

Status changes use `aria-live`; terminal errors use `role="alert"`; the existing Folveta Alert, Progress, Button, focus, contrast, responsive, and reduced-motion contracts remain unchanged. The external UI design-system suggestion was rejected because the repository's Folveta design system is authoritative; only its relevant feedback and accessibility guidance was adopted.

## 14. Migration and Deployment Sequence

This is an expand-and-switch deployment, not a destructive all-at-once cutover.

1. Inventory all old `generation_runs` dependencies, policies, indexes, RPCs, types, tests, and diagnostics.
2. Apply forward-only schema/RPC expansion: keep historical `generation_runs` intact, create logical `generation_executions`, operations/instances, claim/settle RPCs, and a stable model-attempt-write RPC.
3. Verify historical row counts, representative fields, FK/index/RLS behavior, and migration history.
4. Deploy an application version that understands both legacy session state and new logical-run state, routes all model-attempt writes through the stable RPC, but keeps the old execution path active.
5. Drain old deployments/in-flight writes, then apply a separate cleanup rename transaction: historical `generation_runs -> generation_attempts` and logical `generation_executions -> generation_runs`. Stable RPC signatures remain unchanged.
6. Deploy and verify Workflow registration, protected reconciliation, plan limits, dispatch-epoch acknowledgement, and gateway contract.
7. Switch new Generate requests to logical runs/Workflow through an explicit application flag.
8. Run production boundary validation.
9. Only after stable evidence, remove legacy writes and later clean up legacy session checkpoint/lease behavior in a separate migration/task.

A failure at any intermediate deployment must leave either the old path or the new compatible path usable. The expand-phase physical name `generation_executions` is explicit and temporary; it is not an alias and never shares the `generation_runs` name with a second meaning. The stable RPC layer is the compatibility boundary across the later rename.

## 15. Validation Plan

Validation is ordered:

1. Migration dependency, FK, index, RLS, RPC, and historical data verification.
2. Database concurrency tests: duplicate dispatch, stale dispatch acknowledgement, operation race, capacity contention, lease takeover, stale settle, retry-wait transition, operation/run invocation ceilings, attempt/retry credits, hard deadline, and atomic finalize.
3. Gateway contract, provider error classification, model identity, content-type, and sanitization tests.
4. Token guard, retry budget, concurrency fairness, and telemetry tests.
5. Workflow replay, duplicate dispatch, lost acknowledgement, crash, deployment, page close, refresh, and multi-tab tests.
6. Synthetic privacy-persistence canary audit.
7. `npm test`.
8. `npm run typecheck`.
9. `npm run lint`.
10. `npm run build`.
11. Production Vercel plan, Workflow step limit, Workflow registration, Cron authorization, and gateway capability preflight.
12. Compatible migration and Workflow deployment.
13. One real PDF layered E2E.
14. One real PPT layered E2E.

The synthetic privacy canary uses unique non-user sentinel text through the full Workflow. The audit searches Vercel Workflow persisted inputs, outputs, step names, errors, runtime logs, diagnostics, and execution-table metadata. The sentinel may exist only in approved private Supabase content/result fields. Real materials remain subject to privacy-safe observation only.

Only when the layered tests show no structural issue may the project begin:

- three repeated Production PDF E2Es;
- at least two repeated Production PPT E2Es;
- product regression;
- final AI Reliability Gate judgment.

Automated tests or a successful deployment are not substitutes for the real-material gate. A statistically meaningful p95 needs a representative sample beyond the first five acceptance runs; until then each measured run and its critical path are reported individually.

## 16. What Will Not Change

- Supabase private Storage upload for PDF/PPT.
- Local PDF/PPT/OOXML parsing and `source_spans` evidence flow.
- Source-grounded Guide schema and independent entailment grounding.
- Provider and configured model identities.
- Auth, RLS ownership model, Payment, SEO, indexing, or Product-3 scope.
- Public product claims or file-format claims unrelated to the P0 execution fix.

## 17. Decision Log

### D1. Use Vercel Workflows

- **Decision:** Vercel Workflows owns durable orchestration.
- **Alternatives:** Supabase Queues plus a custom consumer; Next.js `after()`.
- **Objections:** Workflow adds a dependency and managed persistence.
- **Resolution:** It directly provides queueing, replay, deployment survival, and observability on the existing host. `after()` remains request-duration-bound; Supabase Queues still needs a separately operated consumer. Private content is excluded from Workflow persistence by ID-only steps.

### D2. Separate business and Workflow identities

- **Decision:** `generation_run_id` is the logical business identity; Workflow instances are 1:N observability records.
- **Alternatives:** Treat the first successful `start()` or `workflow_run_id` as ownership.
- **Objections:** Supabase claim and Vercel start cannot be one atomic transaction.
- **Resolution:** The logical run row is a transactional outbox, each dispatch has an opaque epoch/token, Workflow self-acknowledges that exact epoch through CAS, and operation CAS/fencing supplies correctness even when duplicate Workflow instances exist.

### D3. Use at-least-once plus fencing

- **Decision:** Accept bounded duplicate provider-call risk while guaranteeing exactly-once logical persistence.
- **Alternatives:** Claim exactly-once model execution from checkpoints or leases.
- **Objections:** A provider success followed by a crash before commit can be repeated.
- **Resolution:** Provider idempotency is unproven on portdan. Attempts are globally bounded, every persistence transition is fenced, and the design states the remaining window honestly.

### D4. Normalize checkpoints into operations

- **Decision:** New Workflow progress lives in independently committed operation rows.
- **Alternatives:** Continue replacing one session-level JSON checkpoint.
- **Objections:** Parallel topic completion would create lost updates.
- **Resolution:** Unique operation rows and fenced settle transactions remove whole-snapshot write races. Legacy checkpoint remains compatibility-only.

### D5. Keep existing model grounding

- **Decision:** Preserve local reference validation plus provider entailment grounding.
- **Alternatives:** Remove provider grounding as deterministic citation validation.
- **Objections:** An unnecessary provider call would increase latency.
- **Resolution:** Code inspection confirmed current grounding makes a model entailment judgment; the redesign adds no extra grounding call and parallelizes existing topic branches.

### D6. Use bounded parallel topic branches

- **Decision:** Up to four per-run and eight global provider operations; each topic remains Guide then grounding.
- **Alternatives:** Keep all operations serial; generate all topics in one high-output call.
- **Objections:** Serial execution caused extreme wall time; one giant response increases timeout and schema failure blast radius.
- **Resolution:** Independent operations retain failure isolation and reduce critical-path waves. Database capacity and fairness constraints prevent one run from consuming global capacity.

### D7. Add a token guard to the planning fast path

- **Decision:** Character threshold plus verified token budget determines single-call planning.
- **Alternatives:** Always use 45,000 characters; always batch.
- **Objections:** CJK text, metadata, output reserve, model window, and gateway limits are not represented by character count.
- **Resolution:** Use a conservative estimator, configured verified limits, safety reserve, and batch fallback. Never drop sources for speed.

### D8. Make Workflow the retry trigger and DB the retry authority

- **Decision:** SDK and gateway retries are disabled; Workflow retries only after a database grant.
- **Alternatives:** SDK retry plus gateway retry plus Workflow retry.
- **Objections:** Layered retries caused unbounded request duration and cost.
- **Resolution:** Three total attempts per operation, four shared retry credits, and a 40-invocation absolute logical-run ceiling provide explicit global bounds. Retryable settlement commits `retry_wait`, releases capacity, and assigns DB-time eligibility before Workflow schedules another claim. Reason-aware fatal classification prevents protocol defects from being retried.

### D9. Use logical run row as outbox

- **Decision:** Dispatch fields live on the logical run; no separate outbox table.
- **Alternatives:** Add an outbox table.
- **Objections:** Dispatch still needs durable recovery and 1:N instance history.
- **Resolution:** One logical run has one current dispatch intent with monotonically increasing epochs, so the run row is sufficient. Workflow instances remain a separate 1:N observability table. Stale-epoch acknowledgements are rejected. This is the minimal native-database design.

### D10. Use advisory locking, not a semaphore table

- **Decision:** A transaction-scoped advisory lock and indexed active-lease counts enforce global and per-run capacity.
- **Alternatives:** Maintain eight physical slot rows or add a scheduler service.
- **Objections:** Capacity checks can race or starve work.
- **Resolution:** One lock ordering makes the check and claim atomic; per-run four prevents monopoly; durable contention sleeps and DB-time lease recovery are sufficient for prelaunch scale. Add a scheduler only if measured starvation appears.

### D11. Use compatible expand-and-switch deployment

- **Decision:** Expand schema/RPC, verify, deploy compatible code, verify Workflow, switch new requests, then clean up later.
- **Alternatives:** Rename tables and switch production code in one deployment.
- **Objections:** Mid-deployment failure could leave neither schema usable.
- **Resolution:** Expansion keeps the historical `generation_runs` table usable and creates logical runs under the unambiguous temporary physical name `generation_executions`. Compatible code moves all attempt writes behind a stable RPC before a later cleanup transaction renames both tables. An explicit execution flag keeps the old path active until Workflow preflight passes; no destructive cleanup occurs in the P0 cutover.

### D12. Preserve Folveta UI design

- **Decision:** Change only truthful generation states and accessibility behavior.
- **Alternatives:** Apply a new generic SaaS design system.
- **Objections:** Long-running tasks require clearer progress and errors, not visual redesign.
- **Resolution:** Reuse current Folveta Alert, Progress, Button, typography, colors, and responsive conventions. Add fixed status labels, monotonic committed progress, `aria-live`, and `role=alert`.

## 18. Open Preconditions Before Production Cutover

- Verify the current Vercel plan's Workflow availability, per-step runtime, Cron frequency, region, and Workflow retention.
- Verify Workflow SDK version compatibility with Next.js 16.3.2 and exclude `/.well-known/workflow/` from `proxy.ts`.
- Probe and lock the gateway HTTP transient allowlist, request/token ceiling, content type, model identity, and request-ID header.
- Confirm no Sentry or other observability integration records raw provider traffic; none is currently declared in `package.json`, but runtime/project integrations must also be inspected.
- Obtain real latency evidence for stage deadlines. A 240-second platform ceiling is not a normal provider deadline.

## 19. Final Integrator/Arbiter Disposition

**APPROVED** on 2026-08-28. Remaining blocking objections: none.

The final review confirmed that the three previously blocking design gaps are closed:

- the expand-and-switch migration keeps historical attempt storage usable, moves writes behind stable RPCs, drains old deployments, and performs the later table rename as a separate forward-only transaction;
- dispatch claim uses a monotonic epoch plus opaque token, and Workflow self-acknowledgement uses CAS so a stale or duplicate Workflow never gains logical-run ownership;
- retryable provider failures first commit a fenced `retry_wait` transition, while every real invocation is atomically authorized and counted against operation attempts, shared retry credits, and the absolute logical-run invocation ceiling.

The Arbiter also confirmed that the design still addresses the original P0 root cause rather than only its symptoms: request-bound execution is removed, private content stays outside Workflow persistence, retry ownership is singular, stale writers are fenced, concurrency and provider-call cost are bounded, browser/deploy/crash recovery is server-owned, the five-minute critical path is measurable, gateway incompatibilities are fatal where appropriate, and real Production PDF/PPT E2E remains the release gate.
