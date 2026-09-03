# Folveta Generation v2 Design

**Status: design only.** This document authorizes no production, database, UI, provider, or workflow change. It is the implementation contract for a later, separately approved task.

## 1. Decision summary

Folveta should build Generation v2 as a strangler replacement for the generation engine, not as another extension of `workflow-v1`.

The product artifact is an **evidence-backed study map** for the student's own course materials. Its first screen should answer:

1. What should I study first?
2. Why is it prioritized?
3. Where in my materials is the evidence?
4. What do these materials not cover?
5. What should I review after I miss a Quick Check question?

The minimum reliable runtime is:

```text
immutable source snapshot
  -> deterministic readable section manifest and coverage report
  -> one structured Guide call for bounded input
     or independent section calls for long input
  -> local shape and source-anchor validation
  -> immediate artifact persistence
  -> deterministic assembly into a Guide snapshot
  -> optional, non-gating synthesis/prioritization artifact
  -> on-demand Quick Check over delivered sections
```

The key decisions are:

- The user-visible success unit is a persisted Guide snapshot, not a workflow, operation, model attempt, or all internal sections.
- `complete_with_gaps` is a successful delivery state when the core study map and at least one valid section are available and every missing area is explicit.
- Small and medium bounded material use one call. Long and multi-file material use a bounded number of section artifacts. There is no topic-generation plus per-topic grounding graph.
- Planning is a product output, not a mandatory standalone model stage. For bounded input it is included in the one Guide call. For long input section priorities are produced locally by each section call; one optional synthesis call can improve global ordering.
- Grounding is enforced by allowed source-span IDs plus deterministic resolution of the canonical source name, locator, and excerpt. Runtime LLM verification is not a delivery gate.
- Reuse is private and contract-bound: the same stable preparation-session lineage, source snapshot, parsing contract, generation contract, artifact kind, partition, and output-language policy. The session's current owner controls authorization; anonymous-to-account claim does not alter content identity. There is no cross-user global content cache.
- Vercel Workflow remains temporarily as one thin, at-least-once job runner. Supabase remains authoritative for request/artifact claims and persistence, but the v1 operation DAG, fencing graph, and per-topic workflow branches are not copied.
- Existing sources, spans, ownership, `study_guides`, Quick Check, and billing read models are retained. Historical v1 Guides remain readable forever under their existing schema.

This design corrects the audit's central finding while making one deliberate refinement: cache reuse is scoped to an owner (or anonymous session), not globally content-addressed across users. A source hash alone is not a sufficient privacy boundary.

## 2. Evidence and constraints

### Current facts used

- `lib/server/parser.ts` already produces normalized text, readable/unreadable units, warnings, stable source spans, locators, excerpts, and content hashes.
- `sources`, `source_units`, and `source_spans` are private, owned by a preparation session, and are the correct ingestion boundary.
- `study_guides` stores a durable JSON artifact and the existing viewer reads the stored Guide rather than reconstructing it from provider calls.
- Quick Check is generated on demand, uses the Guide's source references, and already has a separate two-call path with deterministic scoring. It is not part of Guide generation success.
- `generation_executions` and `generation_operations` implement DB-time leases, fencing, retry credits, capacity, dispatch epochs, and a strict finalizer. They are production-proven as a durability experiment but are much finer-grained than the user artifact.
- The current Guide schema requires a rich topic shape and an exact grounding verdict set. `finalize_generation_execution` refuses to persist while required operations are incomplete.
- Production rollout records five successful real-material samples at roughly 175-189 seconds wall time and 452-475 seconds summed provider time. They are useful evidence of call-graph cost, not a p95 claim.
- Current billing uses one successful Study Guide as the user-facing unit. Quick Check is included, retries/replays and duplicate requests do not consume another unit, and reservation/settlement is server-owned.
- The 2026-09-03 billing reservation sequencing migration moved reservation to an `AFTER INSERT` trigger so the parent `generation_executions` row exists before its FK-backed reservation. This is evidence that billing admission is coupled to the v1 execution table and must be treated as a release boundary during v2 migration.
- Production QA verified browser loss/reload recovery and the minute reconciler, but the rollout document explicitly says five samples do not establish p95 and the duplicate provider-call window remains accepted.

### Non-goals

Generation v2 does not add a vector database, general chat, a multi-agent system, a full exam simulator, spaced repetition, OCR/layout understanding, new provider/model selection, or a second Quick Check product. It does not regenerate historical Guides.

## 3. User-facing Guide contract

### Delivery states

| Request state | Meaning | User result | Billing |
| --- | --- | --- | --- |
| `queued` / `working` | Server-owned work is continuing | Progress and any already assembled snapshot | No settlement yet |
| `complete` | Every required readable partition has a valid artifact | Full Guide | One unit consumed |
| `complete_with_gaps` | Core map plus one or more valid sections are persisted; remaining work is exhausted, deferred, or unavailable | Usable Guide with an explicit coverage-gap view and retry actions | One unit consumed because a usable Guide was delivered |
| `failed_no_guide` | No valid core section can be delivered, or no readable source exists | No Guide; actionable source/provider message | Reservation released |

`complete_with_gaps` is intentionally not an error disguised as success. The Guide displays the gap source, locator/range when known, reason (`unreadable`, `provider_transient_exhausted`, `invalid_output`, `not_requested`, or `synthesis_unavailable`), and the action available to the user.

### True success unit

A Guide snapshot is deliverable only if all of the following hold:

- It is bound to one immutable source snapshot and one v2 generation contract.
- It has a non-empty study map and at least one section with an understandable body.
- Every non-gap claim has at least one supplied source span ID.
- Every source reference resolves server-side to the current source, locator, and canonical excerpt.
- The JSON passes the v2 schema and deterministic referential-integrity checks.
- The snapshot, request status, and billing settlement are committed consistently.

For long input, "full" means every readable partition in the manifest has a section artifact. A section that contains no useful readable text is a parser gap, not a provider failure and is excluded from the required-partition denominator.

### Canonical v2 shape

The canonical v2 Guide is deliberately smaller than schema 1.0:

```text
Guide  (required)
  schema_version: "2.0"
  id, session_id, title
  source_snapshot_hash
  generation_status: complete | complete_with_gaps
  coverage: readable_units, covered_units, total_units, gaps[]
  study_map[]
  sections[]
  generated_at

StudyMapItem (required)
  section_id, priority, why_this_matters, source_refs[]

Section (required)
  id, title, priority, focus_reason
  explanation[]
  source_refs[]
  gaps[]
  review_targets[] (optional)

Optional section blocks
  key_concepts[]
  definitions[]
  processes_relationships[]
  common_confusions[]
  practice_prompts[]
```

Required content is identity, priority rationale, an understandable explanation, and provenance. `review_targets` and the other optional blocks are emitted when supported, but their absence does not block delivery. A definition, process, confusion, or review target may instead be represented as an explicit optional gap such as "No definition was present in the supplied material."

Claim IDs remain stable within a snapshot and section. The server, not the model, constructs `source_refs` from span IDs; model-supplied source names, locators, and excerpts are ignored. A claim marked `unsupported_gap` has no reference and cannot appear in the explanatory body.

### Product structure

Keep `Study First`, `Study Next`, and `Review If Time`. They are useful navigation bands and already exist in the viewer, but their meaning changes:

- `Study First`: repeated emphasis, explicit scope evidence, or prerequisite relationship in the uploaded material.
- `Study Next`: supported material that follows the first band or completes a prerequisite chain.
- `Review If Time`: lower-emphasis or peripheral material that is still present in the course pack.

No band claims to predict an exam or certify mastery. The Guide should render, in order: priority map, why, concise explanation, source click-back, visible coverage gaps, and the Quick Check review target. Existing rich blocks remain compatible as optional presentations rather than generation gates.

## 4. Generation flow

### Step 0: source snapshot

The server collects only `ready` and `ready_with_gaps` sources and readable spans. It computes a deterministic snapshot from sorted source content hashes plus source role metadata (ordinary material, optional scope/review-sheet material). A changed file creates a new snapshot; artifacts from different snapshots are never mixed.

The parser contract records unit counts and warnings in the request. A parser warning is carried into `coverage.gaps[]`; it does not silently disappear at finalization.

### Step 1: deterministic manifest

The server groups spans into ordered partitions while preserving source and locator boundaries. It chooses the smallest safe path based on estimated input tokens, gateway limits, and non-ASCII/CJK safety margins:

- **Small/medium:** all readable evidence plus metadata fits in one bounded request. One Guide artifact call.
- **Long:** partitions are independently sized evidence bundles. One section artifact call per partition, with bounded concurrency.
- **Multi-file:** the same partition engine, but never crosses a source boundary unless a source is itself split. File identity and late-file coverage remain visible.

There is no separate `extract_topics` or `merge_topics` call on the bounded path. A planning artifact is the `study_map` in the Guide response. On the long path, each section call emits its priority and rationale. If more than one section succeeds, one optional `synthesis` artifact may reorder the map and explain cross-file dependencies; it is never required to show the sections.

### Step 2: provider artifact

Each provider request receives only an opaque request/artifact ID in orchestration state. The loaded evidence bundle contains span IDs and text, with a schema whose evidence enum is exactly the allowed set for that artifact. The model must either cite a supplied span ID or emit a gap. The response is parsed strictly before persistence.

### Step 3: local validation

Validation has separate responsibilities:

1. Strict shape and size limits.
2. Allowed-span referential integrity.
3. Canonical source/locator/excerpt resolution.
4. Required-vs-optional content policy.
5. Language-neutral forbidden overclaim checks (no exam prediction or mastery guarantees).

An invalid artifact is not inserted as content. It becomes a retryable or terminal artifact gap according to the error classification.

### Step 4: immediate persistence and assembly

After each successful artifact settlement, the server writes the immutable artifact and rebuilds the current Guide snapshot deterministically. A snapshot can therefore be visible while later long-document sections are still working. Assembly has no provider call and never rewrites a completed artifact.

When all required partitions are complete, the request becomes `complete`. When the deadline or retry policy leaves gaps but the minimum delivery contract is met, it becomes `complete_with_gaps`. A synthesis failure only adds a `synthesis_unavailable` gap and falls back to deterministic priority ordering.

## 5. Small, long, and multi-file policy

The product does need different *sizing* paths, but not three different semantic pipelines.

| Input class | Selection rule | Normal provider calls | Delivery behavior |
| --- | --- | ---: | --- |
| Small text PDF | One bounded evidence bundle | 1 | One atomic Guide artifact and snapshot |
| Medium PDF | Still fits gateway/model safety budget | 1 | Same as small; no hidden planner |
| Long PDF | Readable spans exceed safe budget | `S + optional 1` | Section artifacts stream into a partial/full Guide |
| Multi-file pack | Combined evidence exceeds budget or source boundaries matter | `S + optional 1 + X` | Section artifacts retain file coverage; `X` is existing best-effort image/legacy extraction calls |

`S` is the deterministic number of readable partitions. It is bounded by a configured maximum and is based on characters/tokens, not an arbitrary topic count. A five-file pack that fits the one-call budget takes the one-call path. A 100-page PDF and a five-file pack that do not fit take the same section path.

## 6. Grounding and multilingual behavior

### Runtime grounding

Grounding is a local contract first:

- Structured output can cite only span IDs present in the artifact's evidence bundle.
- Duplicate and unknown IDs are rejected.
- The server resolves the ID to the immutable source row, locator, and stored excerpt.
- The server checks the span belongs to the request snapshot and owner scope.
- The viewer links to the canonical source location, never to model-generated coordinates.

The model may label support as `direct`, `partial`, or `conflict`, but this label is explanatory metadata, not an independent acceptance oracle. A claim without support becomes a gap. Runtime per-topic entailment verification is removed from the default path.

Quality work continues through a small golden set and sampled offline verifier audits. The verifier may identify prompt or model regressions, but it does not block delivery of every normal Guide. High-risk policy changes require a separate release decision.

### Language policy

The request carries `output_language: match_materials | en | zh` (with a future explicit locale extension). `match_materials` uses deterministic Unicode/script statistics to choose the dominant language; mixed-language material preserves technical terms and permits section-level language matching. The language policy is part of the contract hash.

Schemas, IDs, locators, and anchor validation are language-neutral. Token estimates use a conservative CJK multiplier and are tested against actual gateway usage. Fixtures must include English, Simplified Chinese, and mixed English/Chinese with punctuation, Unicode normalization, and source click-back assertions. No English-only regex is used as a quality proxy for Chinese content.

## 7. Retry, timeout, and partial recovery

The gateway keeps SDK retries disabled. A v2 artifact has at most two provider attempts: the initial call and one bounded retry. The retry is scheduled only after the failed attempt is durably recorded.

Retryable classes are limited to verified transient behavior: timeout/deadline, connection interruption, 408, 429 (respecting a bounded `Retry-After`), and allowlisted 5xx responses. A schema-invalid response may receive one constrained repair attempt if the request itself was valid. Refusal, wrong model/protocol, unknown source references, contract mismatch, deterministic size-limit failure, and unsupported source content become terminal gaps without another provider call.

The retry delay is exponential with jitter and a request deadline. A lost response can produce one duplicate external call because exactly-once provider execution is unavailable; artifact-key idempotency makes the database result safe. A late response cannot overwrite a newer artifact claim.

Retry is per user-visible artifact, not per workflow. Completed sections are never retried. A failed synthesis is not allowed to retry sections. A user Retry creates or rejoins a request with the same snapshot and contract and retries only artifacts in `retry_wait` or `gap` states that are eligible for retry.

## 8. Resume, duplicate Generate, and reuse

### Request identity

Keep four identities separate:

- **Content identity:** `source_snapshot_hash` and the source role/order embedded in it. It contains no owner, session, or account value.
- **Request content key:** source snapshot hash + immutable generation contract hash + output-language policy. It contains no owner and survives an anonymous claim.
- **Authorization/reuse boundary:** the stable `preparation_sessions.id` lineage that owns the sources and spans. Its active authorization is the parent session's current anonymous token or authenticated user; claim changes only that parent authorization field.
- **Request row identity:** `session_id + request_content_key`, enforced by a unique constraint.

The first Generate for an active or terminal matching key returns the existing request. A browser refresh, second tab, lost response, or page leave only observes that request; it does not create a second reservation or provider call. This initial persistence slice deliberately does not cache across different sessions, even when they later belong to the same account: source/span anchors are session-private and a session lineage is the smallest safe reuse boundary in the current data model.

### Artifact identity

```text
artifact content key = SHA-256(
  source snapshot hash
  + v2 contract hash
  + artifact kind
  + deterministic partition key
  + exact ordered span content hashes
  + output-language policy
)
```

The artifact payload is immutable after `complete`. Storage uniqueness is `session_id + artifact content key`; the session is intentionally not part of the content key, but it is the private storage and authorization boundary. This makes the content key stable through anonymous claim while preventing any cross-session or cross-user reuse. Cache rows are deleted with the source/Guide retention lifecycle; there is no global semantic cache or embedding index.

The existing `study_guides` table remains the v1 one-row-per-session aggregate. V2 uses an immutable `generation_v2_guides` snapshot row per v2 request instead of mutating `study_guides`; this preserves v1/v2 coexistence and does not force the v2 delivery shape into the v1 schema.

Reuse is allowed only for validated completed artifacts. A v1 operation result, a different schema version, a different model/prompt contract, a changed parser contract, or a changed source snapshot is not reusable. Reuse consumes no provider attempt and no additional billing unit.

## 9. Persistence model

### Keep and reuse

- `sources`, `source_units`, and `source_spans`: ingestion, ownership, stable anchors, warnings, and snapshot inputs.
- `study_guides`: durable user-visible delivery record. Add a nullable v2 schema/delivery discriminator or use the JSON `schema_version`; retain 1.0 rows unchanged.
- Existing Quick Check tables and guide-target logic: adapt the target reader to v2 `review_targets` and section source refs.
- Billing customer, entitlement, usage-period, reservation, and webhook read models: keep `auth.users.id` as owner and keep Quick Check included.
- Existing rate limits and protected reconciliation route: reuse the enforcement and operational boundary, with a v2-specific request predicate.

### Add only these v2 structures

The exact SQL names are implementation decisions, but the shape should remain this small:

1. **`generation_v2_requests`**: one logical user request. Stores owner/session lineage, source snapshot, contract hash, idempotency key, manifest/coverage metadata, request status, and safe timestamps. It solves duplicate Generate, refresh/resume, and partial status at the user-artifact boundary.
2. **`generation_v2_artifacts`**: one immutable reusable `guide`, `section`, or optional `synthesis` result. Stores content key, artifact kind/partition, span identity, status, validated result JSON/hash, gap reason, attempt count, and bounded lease. It solves partial persistence, per-artifact retry, and reuse without a dependency graph.
3. **`generation_v2_request_artifacts`**: a narrow join from a request to its manifest artifacts, including stable session lineage, order, and `required` flag. Composite session foreign keys prevent cross-session ownership leaks.
4. **`generation_v2_guides`**: one immutable assembled v2 Guide snapshot per request, with delivery status and the full validated JSON. It is separate from v1 `study_guides` so both schemas coexist without a single-row-per-session conflict.

No v2 queue service, vector store, per-claim verifier table, provider fallback pool, or generalized lease/fencing framework is added. Request/artifact leases are enough to protect at-least-once Workflow execution. Existing v1 tables remain for historical reads and old attempts; they are not used as the v2 state machine.

### Study Guide persistence compatibility

`study_guides` must support both `schema_version = 1.0` and `2.0`. The viewer and search path perform a dual read: v1 rows use the current topic renderer and topic-oriented search extraction; v2 rows use sections and study-map fields. No historical JSON is migrated or rewritten. A v2 assembly snapshot is written after each successful artifact, but only one current Guide row exists per session.

## 10. Billing boundary

Billing remains at **request admission and Guide delivery**, never at a provider call or artifact retry.

1. Resolve billing ownership from the authenticated user (or existing anonymous-session policy) on the server.
2. Atomically reserve one Guide unit when a new v2 request is accepted. A duplicate request joins the existing reservation.
3. Reuse-only requests do not create a new reservation.
4. Settle the reservation when a `complete` or qualifying `complete_with_gaps` Guide snapshot is committed.
5. Release it for `failed_no_guide`, source-only failure, contract supersession, or an admission failure before a usable artifact exists.

The existing billing tables and idempotent usage semantics are retained. Because the current reservation trigger is tied to `generation_executions`, v2 needs one narrow v2 reservation/settlement RPC path or a compatibility adapter; it must not insert fake v1 operations merely to trigger billing. This is a direct response to the FK/trigger sequencing issue fixed on 2026-09-03.

The product must state plainly that a useful partial Guide consumes one Guide unit, while a no-Guide failure does not. Quick Check remains included and may reuse a cached result without another unit.

## 11. Vercel Workflow decision

Keep Vercel Workflow during and after the first v2 release, but reduce its role to a single request runner:

```text
ack request
 -> claim a bounded batch of pending artifacts
 -> call provider and settle each artifact
 -> assemble snapshot after each settlement
 -> optionally run synthesis
 -> settle request and billing
```

There is one Workflow per v2 request, not one dynamic Workflow branch per topic or grounding operation. Workflow input contains only the opaque request ID and dispatch token. Supabase owns claim/lease/status truth; replay is expected and harmless.

The existing reconciler remains useful for lost starts and stale request leases, so it can be extended with a v2 predicate. No new scheduler or worker fleet is introduced. Once production evidence shows that v2 jobs fit a simpler runtime, replacing Workflow is a separate decision; it is not needed to achieve the generation reliability goal.

## 12. Quantitative comparison

The following estimates exclude Quick Check and count provider attempts, not database-only assembly. "Retry case" means one transient or repair retry for each provider artifact where the policy permits it; v1 is limited by its existing four shared retry credits, while v2 retries each failed artifact at most once.

| Input | v1 normal calls | v1 retry case | v2 normal calls | v2 retry case | Persistence unit | Main failure points | Latency/cost profile | Partial delivery |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Small text PDF, 10 pages, 6 topics | 13 (`1 plan + 6 guide + 6 grounding`) | up to 17 | 1 | up to 2 | 1 request + 1 Guide artifact | parse, one provider response, strict validation, finalizer | v1 commonly 2-3 min; v2 target one short request and about 50%+ fewer calls | v1 no; v2 one artifact can be delivered or fail clearly |
| Medium PDF, 50 pages, 10 topics | about 26 (`5 extract + merge + 20`) | about 30 | 1 if within safe budget; otherwise 4 sections + synthesis = 5 | 2 or up to 10 | 1 request + 1 or 4 section artifacts | v1 batch/merge plus 20 gates; v2 per-artifact provider/validation | v2 bounded single-call fast path, or parallel section cost proportional to sections | v1 no; v2 completed sections remain visible |
| Long PDF, 100 pages, 8 partitions | about 32 (`7 extract + merge + 24`) | up to 36 | 9 (`8 sections + optional synthesis`) | up to 18 | 1 request + 8 reusable sections + assembled snapshots | v1 32-operation graph and hard finalizer; v2 section timeout/validation and optional synthesis | v2 parallel work, lower summed tokens and roughly half the failure opportunities | v1 no; v2 yes after any valid section, with coverage gaps |
| Five-file course pack near cap, 6 partitions, 2 image/legacy extraction calls | about 34 (`7 + merge + 24 + 2 extraction`) | up to 38 | 9 (`6 sections + synthesis + 2 extraction`) | up to 18 | 1 request + extraction/section artifacts + join rows | v1 opaque pre-generation extraction plus all topic gates; v2 source-specific gaps and section retries | v2 cost is `S + X + optional 1`, not topic x verifier; parallelism protects wall time | v1 no; v2 readable files/sections deliver while failed files remain gaps |

These are planning estimates, not provider SLOs. The important change is the slope: v1 grows with planning batches plus twice the selected topic count; v2 grows with deterministic evidence partitions and at most one optional synthesis. A v2 retry never repeats a completed sibling. For bounded material the normal call reduction is approximately 13x for the representative small case and 5x or more for a medium case that fits one call.

## 13. Parsing contract

The Guide tells the truth about parsing before it tells a story about the course.

| Tier | Current/recommended coverage | Product contract |
| --- | --- | --- |
| Reliable text | Text PDFs, text-heavy PPTX, DOCX, simple XLSX, and successfully text-extracted legacy PPT | Source-backed generation with stable page/slide/paragraph/sheet/file anchors; visual semantics are not implied |
| Best effort | Scanned/image material, visual-heavy slides, charts/drawings, and legacy DOC/XLS fallback extraction | Use only readable extracted text; show a source warning and coverage gap; never claim the diagram/chart/handwriting was understood |
| Unsupported/blocked | Password-protected, corrupt, or no-readable-text sources | Explain the file-level reason; other readable files may still generate |

Scanned PDF pages without a reliable text layer remain gaps until an independently approved OCR/layout capability exists. Existing model extraction for image and legacy inputs is counted as provider work and has the same artifact retry/telemetry policy; it is not hidden inside the Guide call.

## 14. Migration and rollback

1. **Freeze v1 feature work.** Only emergency production fixes are allowed. Record v1 as a historical reader and rollback engine.
2. **Build the v2 contract offline.** Add schemas, manifest fixtures, deterministic assembly tests, and English/Chinese/mixed/long/parser-gap corpora without changing production behavior.
3. **Expand persistence.** Add v2 request/artifact/join storage and the minimum billing adapter. Verify RLS, retention, idempotency, and owner-scoped reuse before routing users.
4. **Dual-read first.** Teach the Guide loader, search extraction, Quick Check target collection, and status projection to read v1 or v2 by schema/version. Historical rows are untouched.
5. **Internal gate.** Run v2 only for explicit internal/test sessions and dedicated fixture provider calls. Do not shadow every real-user request, double-charge, or make a second provider call merely for comparison. Existing production v1 telemetry is a baseline; v2 quality evaluation uses a fixed redacted/golden corpus and opt-in test requests.
6. **Controlled routing.** Enable `GENERATION_V2_ENABLED` for an allowlist, then a small percentage/cohort flag. The request records its pipeline version immutably. Never switch an in-flight request between engines.
7. **Observe and compare.** Track Guide delivery, complete-with-gaps rate, calls/Guide, provider duration, total latency, reuse rate, anchor failures, parser gaps, and post-Quick-Check return actions.
8. **Default and rollback.** Make v2 default only after all gates below pass. Rollback means set new-request routing to v1 and leave v2 rows readable; it does not automatically fall back after a v2 provider call, which would duplicate cost and make billing ambiguous.
9. **Retire later.** After a measured rollback window, stop creating v1 runs, keep v1 reads and historical attempts for retention, then remove v1 machinery in a separately approved cleanup task.

Recommended flags:

- `GENERATION_V2_ENABLED`: global kill switch, default false during development.
- `GENERATION_V2_ALLOWLIST`: internal/test owner IDs or session IDs.
- `GENERATION_V2_ROLLOUT_PERCENT`: controlled new-request routing after allowlist pass.
- `GENERATION_V2_READ_ENABLED`: optional operational guard for v2 viewer/search reads; historical v1 reads remain unconditional.

## 15. Acceptance gates before implementation/cutover

The first implementation slice is not ready for user routing until these are executable tests or measured reports:

### Reliability and delivery

- 100% of fixture artifacts with unknown/foreign span IDs are rejected and never persisted as explanatory content.
- Injecting one transient failure into any long-document section produces a `complete_with_gaps` Guide when another required section succeeds; no sibling is retried or deleted.
- Injecting failure into every section produces `failed_no_guide`, releases billing, and leaves a safe retry state.
- A refresh, lost HTTP response, duplicate Generate, and two concurrent tabs result in one request identity, one reservation, and no duplicate provider call for completed artifacts.
- A stale lease or Workflow replay cannot overwrite a newer artifact result.

### Calls, latency, and cost

- Small/medium bounded fixtures use exactly one normal Guide provider call; one permitted retry yields at most two attempts.
- Long/multi-file calls equal `readable partitions + optional synthesis + explicit extraction calls`; no hidden planner or verifier calls exist.
- On the release corpus, median calls/Guide are at least 50% below the v1 baseline for bounded inputs and at least 40% below the sampled long/multi-file baseline, measured with the same parser and model contract.
- p95 fixture/test-service wall time is <=120 seconds for bounded inputs and <=300 seconds for long/multi-file inputs; Production rollout thresholds must be confirmed from a statistically meaningful sample before changing the flag percentage.
- Token usage and provider status are recorded without source text, prompts, or raw provider bodies in logs.

### Quality and contract

- 100% of rendered source links resolve to the correct source ID, locator, and stored excerpt in the fixture corpus.
- Invalid JSON, schema-invalid output, refusal, and contract mismatch create a gap or terminal failure; no unvalidated JSON reaches `study_guides`.
- Required fields pass v2 schema; optional blocks may be absent without blocking delivery.
- Late-document and late-file fixtures appear in the manifest or an explicit coverage gap; no truncation is silently presented as full coverage.
- English, Simplified Chinese, and mixed-language fixtures pass structural, anchor, Unicode-normalization, and language-policy tests.
- Reliable, best-effort, and unsupported parser tiers are visible in coverage and failure messages.

### Reuse and migration

- Same-owner same-contract retries reuse completed artifacts with zero provider calls and zero new billing units.
- Different owner, source snapshot, parser contract, language policy, or schema/model contract never reuses an artifact.
- v1 schema 1.0 Guides render and Quick Check exactly as before; v2 schema 2.0 Guides render through the new reader.
- Turning the v2 flag off routes new requests to v1 without changing or deleting v2 or historical rows.

## 16. V1 retirement list

After v2 has passed the rollback window, retire in a separate change set:

- topic extraction plus merge for bounded input;
- per-topic `generate_guide` operations as the default artifact model;
- mandatory per-topic `grounding_verify` calls;
- strict finalization that waits for every internal operation;
- shared retry-credit and provider-invocation accounting tied to the v1 DAG;
- v1 dispatch epochs, Workflow-instance observability, and generalized operation fencing for new work;
- session checkpoint/lease fields used only by the legacy direct path;
- generation-panel copy and status labels that describe internal pipeline stages;
- v1-only Guide finalization RPCs after historical reads and retention requirements are satisfied.

Keep indefinitely or until a separate retention decision: private source storage, source units/spans, owner/auth controls, durable `study_guides`, Quick Check records, billing history, safe rate limits, and read compatibility for historical v1 Guides.

## 17. Implementation slices

The first slice should be deliberately narrow:

**Slice 1: v2 contract and offline artifact runner.** Implement the v2 Zod schema, deterministic manifest/partitioner, allowed-span validation, canonical reference resolver, owner/contract reuse-key functions, and a local runner against fixed fixture evidence. No database migration, UI route, provider switch, or production flag change is included.

**Slice 2: persistence and assembly.** Add the three v2 structures, idempotent request/artifact claims, immediate assembly snapshots, and dual-read adapters for `study_guides`, search, and Quick Check.

**Slice 3: one-call bounded path.** Route internal fixtures through the thin Workflow runner with billing adapter disabled or test-scoped, then fault-inject timeout, invalid output, duplicate Generate, refresh, and lost acknowledgement.

**Slice 4: long/multi-file path.** Add bounded section concurrency, optional non-gating synthesis, parser-gap display, and reuse tests.

**Slice 5: controlled production cohort.** Enable allowlisted sessions, verify the gates and telemetry, then increase rollout only through an explicit release decision.

## 18. Decision log

| Decision | Alternative rejected | Reason |
| --- | --- | --- |
| Guide snapshot is success unit | Workflow/run/operation success | Matches what the student can use and bill for |
| One call for bounded evidence | Preserve topic planner/merge | Removes avoidable calls and failure joins |
| Section artifact for long input | One giant call or topic x verifier | Protects coverage while keeping retries meaningful |
| Runtime deterministic grounding | Mandatory LLM verifier per topic | Anchor integrity is testable locally; verifier was a delivery bottleneck |
| Owner-scoped reuse | Global hash cache | Prevents cross-user derived-content leakage |
| Keep but thin Vercel Workflow | Immediate runner rewrite | Existing production continuation/reconciler is valuable infrastructure |
| New v2 state tables | Reuse v1 operation DAG | Prevents v1 semantics from leaking into a simpler artifact model |
| Partial Guide consumes one unit | Treat partial as invisible failure | A useful delivered artifact is the product result; no-Guide still releases |
| Optional blocks | Require every rich topic block | Source absence is a coverage gap, not a generation failure |

## 19. Final recommendation

Implement Generation v2 as a small, owner-scoped, artifact-persisting engine behind a feature flag. Preserve the proven ingestion, ownership, Guide storage, Quick Check, billing concepts, and thin Workflow shell. Remove the v1 assumption that every internal operation must succeed before a student can see anything. The first code should prove the contract and artifact boundaries offline; only then should persistence, Workflow routing, and controlled production migration begin.
