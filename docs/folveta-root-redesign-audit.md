# Folveta Root Redesign Audit

Status: **Historical Generation v2 research and architecture decision snapshot from 2026-09-03. Current implementation is tracked in `docs/generation-v2-design.md`.**

This document does not authorize or include a production, database, provider, UI, SEO, retry-policy, or deployment change.

## 1. Executive conclusion

Folveta's current generation path is over-engineered for the value currently delivered. It has durable-operation machinery appropriate for a high-value, long-running workflow, but the product still delivers a broadly commoditized "upload material, get a study guide" result. The machinery has not removed the largest reliability risk: a Guide is withheld unless every planning, topic, grounding, and finalization operation succeeds.

The recommended direction is **Option C: Generation v2, implemented as a strangler replacement inside the existing application**. This is not a rewrite of identity, storage, parsing, Guide viewing, or Quick Check. It is a new, smaller generation engine with artifact-level persistence, partial delivery, cross-run cache reuse, and an intentionally limited call graph. New work should not continue to add safeguards to `workflow-v1` except for an emergency production incident.

The product should not continue as a generic AI study-guide maker. Its plausible wedge is an **evidence-backed exam blueprint for a student's own course pack**: upload slides/notes plus a syllabus, review sheet, or past questions; receive what to study first, the source-backed reasons, explicit coverage gaps, and a short practice loop that routes errors to relevant material. This is promising, not yet proven. Generic summaries, flashcards, quizzes, multi-file upload, and citations alone are table stakes.

## 2. GitHub reference projects

Metadata below was checked through GitHub's public API on 2026-09-03. Stars and open issue counts are context, not quality proof. Source-code/README review was used for the listed implementation lessons; no code should be copied without a separate license and security review.

| Project | License and activity | Architecture and LLM flow | Parsing/reliability evidence | What Folveta should learn | What not to copy |
| --- | --- | --- | --- | --- | --- |
| [Skill-Anything](https://github.com/SYuan03/Skill-Anything) | MIT; pushed 2026-06-01; 327 stars | Section-aware map/reduce. Concurrent per-section map calls, then one reduce call; detailed notes assembled deterministically. | README documents outline/heading/time-bucket sectioning, SHA-256 prompt/model/version disk cache, quotas per section, and per-section failure isolation. | Cache content-addressed artifacts, preserve late-document coverage, and isolate a failed section. | Its 12-output "everything" pack, CLI/local assumptions, and unverified marketing retention claims. |
| [RAGFlow](https://github.com/infiniflow/ragflow) | Apache-2.0; pushed 2026-09-03; about 90k stars | Production document-to-RAG platform: parsing/chunking, retrieval, and grounded answer/agent layers are separate concerns. | Mature ingestion and document-understanding focus; its large issue volume is also evidence that document systems need observable boundaries. | Treat ingestion quality, retrieval/evidence, and answer generation as distinct layers with their own metrics. | A full RAG platform, agent surface, and infrastructure footprint are disproportionate for one Guide flow. |
| [Haystack](https://github.com/deepset-ai/haystack) | Apache-2.0; pushed 2026-09-02; about 26k stars | Explicit modular pipeline components for conversion, preprocessing, retrieval, routing, generation, and evaluation. | Components make policy and failure boundaries inspectable rather than implicit in prompts. | Define small composable stages and evaluate them independently. | A general-purpose framework or a vector store before Folveta has a retrieval use case. |
| [AnythingLLM](https://github.com/Mintplex-Labs/anything-llm) | MIT; pushed 2026-09-03; about 66k stars | Persistent document workspaces with ingestion, embeddings/retrieval, chat, and provider abstraction. | Public issue feed includes continuing document/search/provider regressions, a reminder that broad format/provider support carries operational cost. | Workspace/source persistence and a provider abstraction that does not leak into product semantics. | "Chat with anything" breadth, self-hosting complexity, and a generic assistant as the primary study experience. |
| [PrivateGPT](https://github.com/zylon-ai/private-gpt) | Apache-2.0; pushed 2026-09-02; about 57k stars | Local/private RAG application with an API layer, ingestion, retrieval, model components, and execution/event abstractions. | Repository structure includes schedulers/checkpoint-oriented execution components; its goal is privacy/local deployment, not study workflow. | Persistent artifacts and observable background work are valid when the artifact itself is valuable. | Its local-model deployment architecture and generic chat product shape. |
| [anki-card-forge](https://github.com/FrostySL/anki-card-forge) | MIT; pushed 2026-07-08; small, recent project | Local extraction, LLM card authoring, heuristic grounding, preview, then validation with the actual Anki engine. | Stable GUIDs permit re-import/update without losing learning history; source-page coverage is checked. | Validate against the consumer's real contract, preserve stable identities, and measure coverage rather than only schema validity. | Claude/local tooling dependency and its narrow card-export design. |
| [rag-course-assistant](https://github.com/polarbear233333/rag-course-assistant) | No license; pushed 2026-06-15 | Course RAG with dense plus BM25 retrieval, reciprocal-rank fusion, source tracing, and learning-profile/mistake ideas. | Supports PDF/PPTX/DOCX/TXT and optional OCR; exposes pure-LLM versus RAG evaluation concepts. | Measure grounding and source tracing against a baseline. | Any direct code reuse (no license), unproven maintenance, and premature retrieval complexity. |
| [Multi-Agent-Study-Assistant](https://github.com/A-R007/Multi-Agent-Study-Assistant) | No license; pushed 2025-11-04 | Claims a six-agent analyzer/roadmap/quiz/tutor/resource/RAG assistant. | Broad scope, but no production reliability evidence comparable to the claims. | It is negative evidence: feature-agent multiplication is not product differentiation. | Its multi-agent architecture and unlicensed implementation. |

The most instructive direct analogue is Skill-Anything, despite its small size: it fixed long-input truncation by changing the unit of work and making outputs cacheable, rather than by making an all-or-nothing workflow retry harder. RAGFlow, Haystack, AnythingLLM, and PrivateGPT are architecture references, not templates for Folveta's product scope.

## 3. Competitor and product research

This audit reuses the detailed public-product investigation in [study-guide-maker-competitor-analysis.md](study-guide-maker-competitor-analysis.md) (dated 2026-08-25) and rechecked its public product/category claims against the linked product/help pages on 2026-09-03. Prices, limits, and feature matrices change frequently and are intentionally not treated as durable facts here.

| Product | What a student can already get | Strategic implication |
| --- | --- | --- |
| [NotebookLM](https://notebook.google/students) | Multi-source notebooks, source-grounded chat, citations, summaries, flashcards/quizzes and other study artifacts. | "Grounded in your sources" is necessary trust language, not a sufficient reason to switch. |
| [RemNote](https://www.remnote.com/feature/study-guide-maker) | Import from course materials into notes, cards, guided learning, practice, and memory/mastery workflows. | Do not try to recreate a full note-taking and spaced-repetition system. |
| [StudyPDF](https://studypdf.net/ai-study-guide) | Course-material-derived guide, cited chat, summaries, cards, and practice/exam modes. | It is the closest category competitor; citations plus a guide are not a unique wedge. |
| [Quizlet](https://quizlet.com/features/study-guides/) | Massive distribution, user-created corpus, guide creation, practice tests, and established practice habits. | A new product cannot win on generic quiz generation or a broad feature checklist. |
| [Atlas](https://www.atlas.org/features/ai-study-guide-maker) | A broad student suite with multi-file learning tools and mobile distribution. | Multi-file upload is expected behavior. |
| [NoteGPT](https://notegpt.io/ai-study-guide-maker) | Low-friction generation and a broad AI utility suite. | A fast, comprehensible first result is a real conversion benchmark. |
| [Penseum](https://www.penseum.com/) | Study artifacts plus tutoring/voice and weak-spot feedback. | The useful primitive is feedback-to-next-study, not another content type. |
| [Flint](https://flintk12.com/tools/ai-study-guide-maker) | Institution-oriented material, educator, rubric, and workflow context. | Scope/rubric inputs can be high-value, while Folveta can retain a lighter individual-student entry. |

Public product research has one consistent conclusion: the category is crowded because generation is cheap to describe and easy to demo. Users choose a product for an established study habit, course/exam specificity, trustworthy source links, speed, lower friction, or pricing clarity. A long list of generated artifacts does not itself create preference.

## 4. Reference architecture patterns

Four patterns recur in the stronger references:

1. **Deterministic intake first.** Extract, normalize, classify readability, partition, and anchor sources before asking a model to reason over them.
2. **A bounded unit of generation.** For small material, one structured call is often sufficient. For large material, independent source sections are the retry/cache boundary, not a whole Guide.
3. **Persist useful artifacts immediately.** A completed section is a result, not transient workflow state waiting for every peer to succeed.
4. **Separate structural validity from content coverage.** Schema validation, source-anchor validation, coverage measurement, and product policy have different jobs. Treating all four as a terminal model failure produces a fragile system.

RAG is useful when a user asks iterative questions over a large corpus or needs selective retrieval. It is not automatically needed for a first-pass Guide when the engine already processes a bounded, source-section evidence bundle. A vector database would add ingestion, embedding, retrieval, evaluation, and staleness failure modes before it fixes Folveta's present problem.

## 5. Reliability patterns

| Failure | Recommended product behavior | Generation v2 mechanism |
| --- | --- | --- |
| Provider timeout, 429, connection reset | Retry the affected artifact a bounded number of times; never discard completed siblings. | Per-artifact state, short deadline, classified transport error, exponential retry with a visible retry time. |
| Invalid structured output | One constrained repair/retry at most, then mark the artifact as unavailable. | Strict parser plus an explicit gap record, not whole-Guide failure. |
| Browser refresh/leave | Continue asynchronously and resume the same immutable source/contract request. | Server-owned job and durable artifact records; browser only observes. |
| Duplicate request | Return/rejoin the existing active or completed request. | Idempotency key based on source snapshot plus generation contract. |
| User retry | Reuse successful plan/sections from the same source snapshot and contract; retry only failed artifacts. | Cross-run artifact cache keyed by source snapshot, artifact kind/index, prompt/schema/model contract. |
| Partial completion | Deliver the usable Guide with a readable "not covered" section and retry control for missing content. | `complete`, `complete_with_gaps`, and `failed_no_guide` are separate outcomes. |
| Source changed | Do not mix material. Create a new snapshot and retain old artifact history. | Immutable snapshot identity remains a strong current idea. |
| Provider outage | Save progress, show a plain delay state, and retry later or let the user return. | Queue/job lease only at job level; optional provider fallback is a later, measured decision. |

Exactly-once external LLM execution is impossible across a provider request and a database commit without provider-side idempotency. The present design correctly acknowledges a bounded duplicate-call window, but the user benefits more from idempotent artifact persistence and reuse than from increasingly elaborate execution fencing.

## 6. Parsing patterns

Folveta's current parser is strongest where it is deterministic: PDF text via `unpdf`; structured PPTX/DOCX/XLSX through `officeparser`; local legacy PPT text; stable page/slide/paragraph/sheet anchors; chunking; source hashes; and warnings for unreadable units. It already permits many unreadable units to become gaps.

The product promise should nevertheless distinguish three tiers:

| Tier | Formats | Product promise |
| --- | --- | --- |
| Reliable text | Text PDFs, text-heavy PPTX, DOCX, and simple XLSX | Supported for source-backed guide generation, subject to visible unreadable-unit warnings. |
| Best effort | Images, scanned PDFs, visual-heavy slides/charts, legacy DOC/XLS | Extract readable text only; show a coverage warning and never imply diagrams, handwriting, tables, or charts were understood. |
| Unsupported/blocked | Password-protected, corrupt, or no-readable-text sources | Explain the file-level reason; other readable files may still generate a Guide. |

Current code uses model extraction for images and legacy DOC/XLS, so those files already add provider calls before generation. It does not perform layout-aware chart/diagram understanding, and PPTX parser warnings explicitly say visual content was not interpreted. Generation v2 should keep this honest boundary. Scanned PDFs need an explicit OCR fallback or a "text layer missing" result; they should not silently be described as reliably parsed. Unicode normalization and source text use JavaScript strings rather than an English-only token model, but multilingual quality still requires Chinese and mixed-language fixtures, font/encoding tests, and prompt-evaluation cases.

## 7. Generation patterns

The minimum reliable pipeline is not "topics, merge, rich topic generation, per-topic verifier, all-or-nothing finalization." It is:

```text
source snapshot
  -> deterministic readable sections plus source anchors
  -> small/medium: one structured Guide call
     large: independent section Guide calls, then optional synthesis call
  -> local source-ID and shape validation
  -> persist each successful section
  -> assemble and deliver Guide, including explicit gaps
  -> generate Quick Check on demand
```

For a small or medium source, one strong structured response can produce a sufficiently useful Guide if its evidence is bounded and citations can only name supplied anchor IDs. For a large source, map/reduce remains justified to protect coverage and context limits, but the map output should itself be user-deliverable section content. The reduce should improve navigation and cross-section prioritization, not be a mandatory gate for basic delivery.

This reduces calls before retries are considered. A smaller call graph reduces provider cost, latency, invalid-output surface, and the number of opportunities for an external timeout to defeat a completed artifact.

## 8. UI and UX patterns

The first screen should establish the task and its distinctive output in seconds: upload a course pack, optionally add an exam scope document, and see an example of a prioritized evidence map. It should not lead with internal pipeline detail or an expansive AI-feature list.

Generation progress should describe customer outcomes, for example "Reading 3 sources", "Building your study map", and "Your guide is ready with 2 gaps", rather than operations, leases, grounding stages, or retry credits. A Guide that is 80 percent ready should open as a Guide with marked gaps, not show 99 percent until a hidden auxiliary task passes.

The result screen should privilege, in this order: what to study first; concise source-backed explanation; source location; visible missing/low-confidence coverage; then Quick Check and return-to-study links. Mobile must preserve topic navigation and the primary upload action in the first viewport. Error copy must answer whether the material is unusable, one section is pending, or the service will resume, followed by a single appropriate action.

## 9. Product differentiation findings

There is **not yet sufficient evidence that Folveta has a defendable advantage as a general-purpose AI Study Guide Maker**. Its currently visible primitives are sensible but individually common:

| Current capability | Market status | Decision |
| --- | --- | --- |
| PDF/Office/image, multi-file intake | Table stake | Keep only formats that can be described honestly. |
| Priorities: Study First / Next / If Time | Potentially useful, not unique | Keep, but bind the reason to course scope and evidence, not a model's exam prediction. |
| Key concepts, definitions, processes, confusions | Common generated-guide structure | Simplify into optional section blocks. |
| Source references | Valuable trust primitive, offered by NotebookLM/StudyPDF/RemNote | Keep, but pair it with coverage and gaps. |
| Quick Check and wrong-answer return links | Useful learning loop, not unique | Keep and make it the lightweight active-recall loop. |
| Broad multi-format support | Expensive to maintain | Downgrade best-effort formats; do not market breadth as the wedge. |

The strongest candidate proposition is: **"Turn your own lecture pack and exam scope into an evidence-backed plan for what to study first, what is missing, and what to review after a mistake."** It is more specific than a summary and more actionable than generic chat. It must be validated with target students before large product investment: can they supply scope material, do coverage gaps alter their study behavior, and will they return after a Quick Check?

## 10. Current Folveta architecture map

Current `workflow-v1` follows this path:

```text
Upload/private storage
  -> file validation, hash, deterministic parsing, units and source spans
  -> source snapshot + execution contract hash + billing reservation
  -> generation execution claimed and Vercel Workflow dispatched
  -> plan_topics (single input) OR extract_topics for each batch -> merge_topics
  -> for each of up to 12 topics, in waves of four:
       generate_guide -> grounding_verify
  -> finalize operation reads all validated topics -> strict Guide schema
  -> atomic Guide persistence and session state = guide_ready
  -> Quick Check generated separately/on demand
```

Supabase is authoritative for session/run/operation/attempt status, source and contract identity, DB-time leases, fencing, capacity, retry credits, dispatch leases, workflow acknowledgement, finalization, and a Cron watchdog/reconciler. The browser polls status. Vercel Workflow is at-least-once and may execute steps again; the database protects logical state rather than the external call itself.

State-bearing layers are: `preparation_sessions`, `sources`, `source_units`, `source_spans`, `generation_executions`, `generation_operations`, `generation_attempts`, `generation_workflow_instances`, `study_guides`, and Quick Check records. This is a credible durable-workflow design, but its operation granularity is much finer than the user-visible artifact.

## 11. Current Folveta failure model

| Current path | Current effect | Correct classification |
| --- | --- | --- |
| No readable source spans, password-protected/corrupt file, or all input unusable | No Guide can be grounded. | Terminal for that snapshot. |
| A file/page/slide is unreadable while other content is readable | Often represented as a warning during parsing. | Degrade: retain readable material and disclose the gap. |
| Source snapshot changed / logical run superseded / contract mismatch | Prevents mixing artifacts from different inputs/contracts. | Stop that run; let a new snapshot/contract run replace it. |
| DB claim, lease, capacity, dispatch, workflow stall, deadline, or billing admission issue | Can block/reclassify an otherwise useful job. | Infrastructure retry or recoverable delay; do not discard persisted artifacts. |
| Provider timeout/rate limit/connection failure | Operation retries consume shared credits; eventually run failure. | Retry only failed artifact; deliver completed artifacts. |
| Provider refusal or invalid/incorrect structured output | Current operation may become terminal; workflow throws fatal error. | Retry once if plausibly repairable, otherwise convert that artifact to a gap. |
| Missing plan/guide/grounding dependency or exact verdict mismatch | Workflow returns terminal or finalization cannot proceed. | Degrade if a section exists; terminal only if no usable Guide can be assembled. |
| One incomplete operation among all topics | SQL finalization requires every non-finalize operation succeeded. | This is the principal incorrect all-or-nothing gate. |

`app/workflows/generation.ts` throws a fatal workflow error when a provider operation, planning, or finalization does not return `completed`. The SQL finalizer additionally refuses to persist while any operation in the run is not `succeeded`. Therefore a provider failure in a non-essential topic, a malformed grounding verdict, or an exhausted retry budget can convert a valuable partial Guide into no user-visible Guide.

## 12. Over-engineering findings

Folveta is over-engineered **in the generation path**, not universally. Source hashes, private storage, ownership controls, stable spans, durable Guide persistence, and on-demand Quick Check are justified foundations. The following mechanisms add failure surface without commensurate current user value:

1. Per-topic planning/generation/grounding makes a typical Guide many external calls rather than one user artifact.
2. Mandatory per-claim exact grounding verdict coverage adds a second model contract for every topic, then uses it as a delivery gate.
3. Leases, fencing, retry credits, per-run/global capacity, dispatch epochs, workflow acknowledgement, Cron reconciliation, and strict finalization solve overlap/infrastructure races but cannot make the external provider exactly once and cannot deliver partial value.
4. Retry is bound primarily to an execution. Completed operation replay exists within a run, but a user retry can create another execution without a cross-run cache of completed Guide artifacts.
5. The rich mandatory shape makes content absence look like total generation failure, even when a source simply has no definition/process/confusion for a topic.

This is not an argument to remove all durability. It is an argument to move the durability boundary from every internal transition to independently useful, cacheable user-facing artifacts.

## 13. Guide schema and validation audit

The current schema requires a top-level Guide with at least one topic and, for every topic, title, priority, focus reason, explanation, key concepts, definitions, processes/relationships, common confusions, gaps, and a source reference index. Claims require source references unless explicitly an unsupported gap. Claim IDs must be globally unique and topic references must match topic-level indices. Grounding requires an exact verdict set for every claim ID.

Some arrays do not use `min(1)`, so a topic can technically contain empty arrays. The practical blast radius is nevertheless high: every topic must be generated, every grounding operation must return an exact verdict set, all unsupported content must be transformed correctly, and finalization must pass the complete strict Guide parse. The finalizer passes `source_issues: []` and `overall_gaps: []`, so parser warnings and section omissions are not first-class delivery content at that point.

Generation v2 should use a smaller core schema:

```text
Guide: title, source snapshot, status, coverage/gaps, sections[]
Section: id, title, priority rationale, explanation, source anchors[], gaps[]
Optional blocks: concepts, definitions, process, common-confusion, practice
```

Only identity, provenance, an understandable section body, and valid supplied source anchors should be required for delivery. Missing optional content becomes an empty/absent block with a gap reason. Claim-level citations remain available where they matter, but "every claim needs a second model verdict" should not be a terminal acceptance condition.

## 14. Complexity, cost, and latency analysis

Current call count is approximately `P + 2T + E`, where `P` is planning calls, `T` is selected topics (capped at 12), and `E` is model-based image/legacy Office extraction calls. Finalization is a database operation, not a provider call. For a source below the approximately 45,000-character planning threshold, `P = 1`; above it, `P = number of batches + 1` (the merge). Provider operations run in waves of four, but provider-call count and failure opportunities remain.

| Input, stated assumptions | Current normal provider calls | Current logical operations | Main risk |
| --- | ---: | ---: | --- |
| 10-page text PDF, 30k-50k chars, 4-8 topics | 9-17 (`1 or 3` planning plus `2T`) | calls plus one finalizer | One or two slow topic/grounding calls can block all delivery. |
| 50-page PDF, 150k-250k chars, 8-12 topics | about 21-31 (`4-6` batch plans plus merge plus `2T`) | calls plus one finalizer | More batches, more schema/verifier calls, and a 15-minute hard deadline. |
| 100-page PDF, up to 300k extraction cap, 10-12 topics | about 32 (`7` planning batches plus merge plus `24`) | about 33 | Near the 40 logical provider-invocation ceiling before retries. |
| Five mixed files near the same character cap | about 32 plus 0-5 model extraction calls | corresponding calls plus finalizer | Image/legacy extraction adds opaque provider work before planning. |

These are estimates, not promises: page density, chunk token budgets, and the planner's topic count vary. The configured invocation ceiling is 40, three total attempts per operation, and four shared retry credits, so retry cannot safely be described as a fixed maximum calls per Guide without modeling the DB admission state. It can nevertheless push an already broad call graph toward its global budget.

Production rollout evidence recorded in [ai-generation-workflow-rollout.md](ai-generation-workflow-rollout.md) shows real PDFs using 16-18 operations and 15-17 provider attempts, roughly 175-189 seconds wall time, with 452-475 seconds summed provider time. That is consistent with an 8-topic single-plan Guide requiring one plan, eight Guide calls, eight grounding calls, and a finalizer. Five successful samples do not establish p95.

Generation v2 target:

| Input class | Target normal calls | Delivery rule |
| --- | ---: | --- |
| Small/medium, bounded evidence | 1 | Deliver after one validated structured Guide call. |
| Long text | `S` independent section calls, optional 1 synthesis | Deliver completed sections even if synthesis/fewer sections fail. |
| Image/legacy material | 1 extraction per affected file plus the applicable generation calls | Mark unextracted content as a gap; do not claim visual comprehension. |

The target reduces costs and p50 latency for common small inputs; for long inputs it retains enough parallelism to protect coverage, with a bounded number of meaningful artifacts rather than an arbitrary per-topic verifier multiplication.

## 15. What should be kept

- Private upload/storage, ownership, durable Guides, and the existing account and anonymous-to-account persistence work.
- Deterministic parsing, source warnings, source snapshot hashes, normalized text, stable source spans, and source-reference click-back.
- The restriction that a Guide is based on uploaded materials, not arbitrary model knowledge.
- Priorities only when described as evidence-based study planning rather than prediction of an exam.
- Quick Check generated on demand and the wrong-answer-to-relevant-guide loop.
- A job-level idempotency concept, observability, and the ability to resume a server-owned job after the browser leaves.

## 16. What should be removed or simplified

- Mandatory per-topic LLM grounding verification as the default delivery gate.
- Topic extraction plus merge for sources that fit a single bounded call.
- A fixed rich shape for every topic, especially treating auxiliary blocks as required work.
- The requirement that every operation in an execution succeeds before any Guide is persisted.
- Per-operation retry/capacity/fencing machinery where it protects no separately reusable user artifact; replace it with simpler artifact/job semantics.
- Marketing emphasis on all file types and all generated study artifacts.
- Internal operation terminology/progress from the customer experience.

## 17. What should be redesigned

1. The delivery contract: `complete_with_gaps` must be a successful product outcome, not a hidden failure.
2. Artifact persistence: key a reusable plan/section/synthesis by source snapshot and immutable generation contract across runs.
3. Grounding: use source-anchor allowlists and deterministic checks by default; use sampled/offline verifier evaluation to improve prompts and measure risk.
4. The Guide model: make optional instructional blocks optional and surface source/parser/model gaps to the learner.
5. User retry: join or resume the same request when the snapshot/contract match; avoid repeat generation and billing for completed artifacts.
6. Product intake: let students add an explicit course-scope input, and explain what evidence is missing rather than pretending the model knows the exam.

## 18. Option A: conservative simplification

Keep `workflow-v1` and its existing database model. Remove obvious gates: permit optional topic blocks, treat failed grounding/topic operations as gaps, persist a partial Guide, skip per-topic grounding for small inputs, and reuse completed operations more aggressively.

| Dimension | Assessment |
| --- | --- |
| Reliability | Better than today, but core orchestration remains complex and hard to reason about. |
| Development effort | Low to medium. |
| Risk/migration | Lowest schema/migration risk; high risk of preserving accidental complexity. |
| LLM cost/latency | Falls for small inputs only if grounding is removed; long-input graph remains broad. |
| Maintenance | Still high due to workflow/lease/operation state surface. |
| Feature retention | Highest. |
| Current problems solved | All-or-nothing delivery partially; not cross-run artifact reuse or core complexity. |

Option A is appropriate only if a near-term production stabilization deadline precludes an engine replacement. It should not become the long-term strategy.

## 19. Option B: core pipeline redesign

Retain `generation_executions` and much of the operations schema, but replace the topic/grounding graph with a small/single-call path and long-document section/map/reduce path. Add partial persistence and cache records within the current operation model.

| Dimension | Assessment |
| --- | --- |
| Reliability | Materially better; artifact boundaries can become useful units. |
| Development effort | Medium to high. |
| Risk/migration | Moderate because current RPCs, retry semantics, finalizer, and billing admission are coupled to operations. |
| LLM cost/latency | Meaningfully lower for small inputs; bounded for long inputs. |
| Maintenance | Lower than A, but legacy concepts may remain embedded in every path. |
| Feature retention | High. |
| Current problems solved | Most, but migration constraints can compromise the new mental model. |

Option B is viable if the team can demonstrate that the existing operation schema naturally supports `complete_with_gaps` and reusable cross-run artifacts without adding parallel state concepts. Current evidence suggests that will be more difficult than it sounds.

## 20. Option C: Generation v2

Create a new engine and artifact model alongside the current application. The new model owns generation-specific request, artifact, cache, status, and partial assembly semantics; existing sources/spans, ownership, Guide viewer, and Quick Check remain integration points. `workflow-v1` stays read-only for existing runs and a rollback path until v2 passes defined evaluation gates.

| Dimension | Assessment |
| --- | --- |
| Reliability | Highest expected improvement because the unit of success is a deliverable section, not every internal step. |
| Development effort | High but bounded to generation, schema adaptation, and migration. |
| Risk/migration | Moderate; needs dual-read/feature gating and careful billing/idempotency integration. |
| LLM cost/latency | Lowest expected small-input cost; long-input work is proportional to source sections, not topic times verifier. |
| Maintenance | Lowest steady-state complexity if v1 is retired after migration. |
| Feature retention | Retains product surface while deliberately shedding hidden workflow behavior. |
| Current problems solved | All-or-nothing finalization, needless calls, retry repetition, cross-run reuse, and opaque progress. |

## 21. Recommended target architecture

Recommend **Option C** with this target:

```text
existing private sources + stable spans
  -> immutable v2 request (source snapshot + prompt/schema/model contract)
  -> idempotent request lookup / cache lookup
  -> deterministic section manifest and readability/coverage report
  -> small/medium: one Guide artifact call
     long: N independent section artifact calls, bounded concurrency
  -> local strict shape + supplied-anchor validation for each artifact
  -> persist successful artifacts immediately
  -> optional synthesis/prioritization artifact
  -> assembler emits complete or complete_with_gaps Guide
  -> Quick Check requests existing completed Guide sections on demand
```

Suggested records are conceptually `generation_v2_requests`, `generation_v2_artifacts`, and a content-addressed `generation_v2_cache`, not a prescription for final table names. A request has a small number of states: `queued`, `working`, `complete`, `complete_with_gaps`, and `failed_no_guide`. An artifact has `pending`, `working`, `complete`, `retry_wait`, `gap`, or `failed`. A lease and idempotency key exist at request/artifact boundaries, not as a generalized graph engine.

Grounding uses: (a) a model response that can cite only provided span IDs, (b) deterministic source-ID/locator/excerpt resolution, (c) a content policy that marks unsupported statements as gaps, and (d) sampled offline evaluation or an optional verifier for high-risk claims. This is a measurable quality program, not a claim that citations guarantee truth.

## 22. Recommended target product experience

Core user: a university, college, certification, or intensive-course student preparing for a near-term assessment from their own fragmented course pack.

Core use case: upload lecture slides/notes plus a syllabus, review sheet, or past questions; receive an honest, prioritized study map with source evidence, coverage gaps, and a compact active-recall loop.

Suggested homepage proposition: **"Turn your course pack into an evidence-backed exam study plan."** Supporting copy should explain that it identifies what to study first, cites the uploaded materials, and flags what the materials do not cover. It must not claim to predict an exam or understand unreadable diagrams.

The first outcome should be a useful, complete-or-partial Guide before login or payment friction where abuse/cost policy permits. Pricing must communicate a plain result allowance and a predictable unit; opaque credit accounting is a known category complaint. Do not add mind maps, social collaboration, general chat, broad spaced repetition, or a tutor until the course-pack-to-study-plan loop demonstrates repeat use.

## 23. Migration strategy

1. Freeze feature work on `workflow-v1`; document emergency-only operational criteria. Define v2 quality, reliability, cost, and latency acceptance metrics before coding.
2. Build a deterministic v2 section manifest and cache key using existing source snapshots/spans. Create a fixture set covering English, Chinese, mixed Unicode, long text PDFs, scans, visual slides, DOCX/XLSX, legacy inputs, and multi-file course packs.
3. Implement v2 behind an internal feature gate with no user-visible change. Run shadow evaluation on fixtures and explicit test requests only; never charge twice or call a provider twice for a user merely to compare engines.
4. Add partial Guide rendering and `complete_with_gaps` semantics. Verify source anchor correctness, coverage, invalid-output behavior, refresh/retry reuse, and recovery after injected provider failures.
5. Route a controlled cohort of new requests to v2. Observe completion rate, partial delivery rate, calls/Guide, cost, p50/p95 latency, retry reuse, source anchor accuracy, and user actions after Quick Check.
6. Make v2 default only after gates pass. Preserve v1 reads for historical Guides; do not automatically regenerate or mutate user Guides. Retire v1 only after a measured rollback window and data-retention decision.

## 24. Risks

| Risk | Mitigation |
| --- | --- |
| A single call loses coverage on long sources | Use deterministic section manifest and map calls above an evaluated threshold. |
| Partial delivery harms trust | Make gaps explicit, source-specific, and actionable; never label incomplete content as complete. |
| Removing per-claim verifier lowers factual quality | Maintain anchor allowlists, offline golden-set evaluation, sampled verifier audits, and user-visible evidence. |
| V2 doubles operational surface temporarily | Time-box dual-run support; define a v1 retirement gate. |
| Cross-run cache serves stale/different output | Key cache on immutable source snapshot and full model/prompt/schema contract; invalidate by version. |
| Exam-blueprint wedge is not wanted | Validate with interviews and task tests before expanding scope; measure whether scope inputs and gaps affect study decisions. |
| Cost abuse/free result tension | Keep server-side entitlement/admission ownership, but avoid coupling billing trigger timing to every internal artifact transition. |

## 25. Final recommendation

Choose **C: Generation v2**, preserving Folveta's application and data foundations while replacing the current generation engine progressively. The present architecture was a serious attempt to make long-running work durable, but it has optimized the wrong unit: internal operations instead of a useful study artifact. More patch-driven retry/fencing work will not solve the fact that one missing optional section can withhold an almost completed Guide.

Continue investing in Folveta only if the narrower course-pack/exam-blueprint proposition is validated. The product should win by being an honest study planning tool with evidence and explicit gaps, not by claiming more AI-generated features than established study products. Build and test that v2 proposition before any broad refactor or further production-generation repair.

## Evidence and scope notes

- Current-code findings were inspected in `lib/ai/`, `lib/server/parser.ts`, `lib/schemas/guide.ts`, `app/workflows/`, `components/generation-panel.tsx`, and the generation/billing Supabase migrations on 2026-09-03.
- Historical real-material timing and operation measurements are quoted from `docs/ai-generation-workflow-rollout.md`; they are not a p95 claim.
- GitHub repository metadata, READMEs, source trees, and selected public issue feeds were reviewed on 2026-09-03. Public issue reports are signals, not verified root causes.
- Product observations are public information only. Product limits/prices and landing-page details can change; the linked dated competitor analysis retains the detailed capture record.
