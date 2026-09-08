# Study Guide Maker MVP Technical Plan

> Status: **Superseded proposed v3 technical plan; historical baseline only.** Much of the core was implemented, while pasted text, source roles, lease/checkpoint resume, cleanup, rate limits, and other items were not. Use `docs/architecture/technical-architecture.md` for actual current state and `docs/product/v5-master-roadmap.md` for future work.
> Historical product decision authority: `docs/product/decisions.md` v3
> Product: **Study Guide Maker + optional Quick Check**  
> Core loop: `Upload materials → Generate Study Guide → Review priority sections → Optional Quick Check → Return to weak Study Guide sections`

## 0. Decision summary

Build one TypeScript web application, not a platform:

- **Frontend and backend:** Next.js App Router + TypeScript, with Route Handlers for upload, parsing, generation, status, and Quick Check APIs. Server Actions are limited to small UI mutations; long generation does not depend on a Server Action.
- **UI:** React + Tailwind CSS; no separate SPA/backend repositories and no large component framework requirement.
- **Database and file storage:** one Supabase project: Postgres for session/artifact state and a private Storage bucket for original files.
- **PDF parsing:** `unpdf`/PDF.js in the Node runtime, one page at a time.
- **PPTX parsing:** `officeparser` in the Node runtime, using slide AST nodes and preserving slide numbers. OCR and attachment/image interpretation stay disabled.
- **Model API:** a small internal `ModelGateway` interface, initially backed by the OpenAI Responses API with JSON Schema Structured Outputs. Task-specific model names come from environment configuration and are never embedded in business logic.
- **Schema:** Zod is the application source of truth; JSON Schema is derived from it for model output. Every persisted model artifact is parsed again by Zod before use.
- **Deployment:** Vercel for the Next.js app and Supabase for Postgres/Storage. No worker service, Redis, vector database, message broker, or microservice in MVP.

This plan uses provider-hosted structured output because the official OpenAI API supports JSON Schema output, but the domain layer does not depend on a specific model name or provider. [OpenAI Responses API reference](https://developers.openai.com/api/reference/cli/resources/beta/subresources/responses)

## 1. Product and scope guardrails

### 1.1 Included in MVP

- Text-based PDF.
- Text-based PPTX.
- Pasted text.
- Several sources in one preparation session, within disclosed limits.
- One complete, structured, priority-aware Study Guide as the first result.
- Optional 5–10 question **MCQ-only** Quick Check.
- Deterministic scoring and wrong-answer links back to exact Guide subsections.
- Visible parse gaps, source conflicts, partial support, and unsupported gaps.
- Page/slide references for important factual content when supporting evidence exists.

Recommended initial limits, kept in configuration rather than UI literals:

- Maximum 5 sources per session.
- Maximum 25 MB per file.
- Maximum 150 combined PDF pages/PPTX slides.
- Maximum 100,000 pasted characters per pasted source.
- Maximum 300,000 normalized extracted characters per session.

These are cost and reliability limits, not product differentiation. They must be shown before generation and can be tuned after measuring real parsing and model latency.

### 1.2 Explicitly excluded

- OCR, scanned/image-only documents, handwriting.
- Audio, video, YouTube, URL ingestion, or web research.
- Image, chart, diagram, and complex math understanding.
- Mock Exam Simulator, timer, exam mode, question blueprint, professor-style simulation, long assessment, or psychometric scoring.
- Short-answer grading in the first release.
- AI Tutor, AI chat, AI Oral Exam, voice interaction.
- Flashcard system, spaced repetition, mastery tracking, progress dashboard, retake program.
- Full notes editor, knowledge graph, social/community, LMS, native mobile application.
- Vector search/RAG infrastructure, external search, or open-web supplementation.

### 1.3 Language rules enforced in product and prompts

Allowed priority labels only:

- `Study first`
- `Study next`
- `Review if time allows`

Never output real-exam probability, `mastered`, `safe to skip`, guaranteed coverage/readiness, or prediction language. Priority is always a suggestion based on visible uploaded signals.

## 2. MVP architecture

```text
Browser
  ├─ Next.js pages/components
  ├─ direct signed upload ───────────────► Supabase private Storage
  └─ Route Handler calls/status polling ─► Next.js Node runtime
                                             ├─ parse PDF/PPTX/text
                                             ├─ validate/chunk/source-anchor
                                             ├─ call ModelGateway
                                             └─ read/write Supabase Postgres

ModelGateway ────────────────────────────► configured model provider
```

### 2.1 Frontend

Use Next.js App Router, React, TypeScript, and Tailwind CSS.

- Server Components render landing, saved Guide data, and result data.
- Client Components are limited to dropzone/upload progress, source-role controls, generation polling, collapsible Guide outline, Quick Check answers, and hash/section navigation.
- Use accessible native controls first. Add a small headless primitive only when a component such as dialog or select materially benefits from it.
- No global client state framework. Route params plus small local state are sufficient; durable state lives in Postgres.

### 2.2 Backend / Server Actions / APIs

Use the same Next.js project as a backend-for-frontend. Next.js Route Handlers are appropriate for custom HTTP endpoints; do not create a separate Express/FastAPI service. [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

Use Route Handlers for:

- creating an anonymous preparation session;
- issuing signed upload URLs;
- completing and validating uploads;
- parsing a source;
- starting/resuming Study Guide generation;
- reading generation status;
- creating a Quick Check;
- submitting/scoring an attempt;
- issuing short-lived source download/view URLs.

Use Server Actions only for small mutations such as changing a source role or title. Do not place the multi-stage generation pipeline in a Server Action because actions are UI mutations and are less suitable for explicit status/retry semantics.

### 2.3 Generation execution without a queue

The first release uses a bounded, checkpointed request rather than a queue:

1. `POST generate` acquires a short database lease for the session.
2. It resumes from the last completed stage, runs the next stages inline, and writes a checkpoint after each stage.
3. The Generating UI polls a status endpoint every 2–3 seconds.
4. A retry reuses successful parse/topic/Guide artifacts and only resumes the failed stage.
5. An idempotency key and lease prevent duplicate simultaneous generation.

This works because MVP input is explicitly bounded and Vercel functions support configurable execution duration. If production p95 approaches the configured function limit, introducing a durable workflow is a later evidence-driven change—not part of the initial architecture. [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration)

Do not rely on an in-memory job object or local filesystem between requests. Every reusable stage result is persisted.

### 2.4 File upload

Use a private Supabase Storage bucket.

1. The server creates a source row and a unique object path.
2. The server issues a time-limited signed upload token.
3. The browser uploads directly to Supabase Storage, avoiding a large file passing through the Next.js function.
4. The server downloads the object privately for validation and parsing.

Supabase supports upload with a token created by `createSignedUploadUrl`; this keeps service credentials off the browser. [Supabase signed upload](https://supabase.com/docs/reference/javascript/file-buckets-uploadtosignedurl)

Validation after upload is deterministic:

- extension and MIME allowlist;
- magic/container signature inspection;
- size limit;
- SHA-256 file hash for exact-duplicate detection;
- PPTX container/content-type verification;
- password/encryption detection where the parser exposes it;
- session ownership/access-token check.

Use unique immutable object paths rather than overwriting. Original files remain private.

### 2.5 PDF parsing

Use `unpdf` with its serverless PDF.js build and parse one page at a time. It supports Node/serverless text extraction without introducing a Python parsing service. [unpdf repository](https://github.com/unjs/unpdf)

For every page persist:

- source ID;
- one-based page number;
- normalized page text;
- extracted blocks/spans;
- character/token estimates;
- parse warnings;
- a content hash.

Deterministic checks:

- mark an empty or very low-text page as unreadable/image-heavy;
- detect recurring header/footer text and remove it from topic frequency while preserving raw extraction;
- preserve page boundaries—never merge pages before anchors are assigned;
- detect suspiciously broken reading order and show `Ready with gaps` rather than silently claiming coverage.

The MVP does not render or understand images, formulas, or diagrams. A page dominated by these is a visible gap.

### 2.6 PPTX parsing

Use `officeparser` to parse the file buffer into an AST and traverse top-level `slide` nodes, preserving one-based slide order and text blocks. The library exposes structured slide nodes, notes, warnings, and buffer input. OCR remains disabled. [officeparser repository](https://github.com/harshankur/officeParser)

For every slide persist:

- source ID;
- one-based slide number;
- title when detectable;
- ordered visible text blocks;
- optional speaker-note text as a separately labeled block;
- parse warnings and content hash;
- flags for image/chart/table-heavy content that was not interpreted.

Before accepting the parser, test it against a local fixture set containing titles, multiple text boxes, grouped elements, tables, speaker notes, hidden slides, and repeated masters. If slide numbering or separation is unreliable, fail the fixture and fix the adapter; do not fall back to a single merged text string.

### 2.7 Pasted text

Treat pasted text as a source with `locator_type = text` and numbered logical sections/blocks. Preserve paragraph boundaries and assign stable span IDs. It has no invented page number.

### 2.8 Chunk and evidence model

Do not send original files directly to the model provider. Parse locally, then send only bounded evidence blocks.

Each normalized block receives an opaque stable `span_id` derived from the source, locator, and block hash. The model is allowed to cite only supplied `span_id` values. Application code resolves those IDs to source/page/slide and excerpt after generation.

This is a key grounding rule: **the model never invents a page or slide number**. It chooses from provided evidence IDs; deterministic code creates the displayed reference.

### 2.9 Data persistence

Use Supabase Postgres with SQL migrations and generated TypeScript database types. Do not add an ORM in the first release. Store core relationships as rows and versioned generated artifacts as validated JSONB.

Minimum tables:

| Table | Purpose |
| --- | --- |
| `preparation_sessions` | Anonymous session, access-token hash, title, state, current stage, warnings, expiry |
| `sources` | File/text metadata, role, storage path, hash, parse status, counts, warnings |
| `source_units` | Page/slide/text-section extraction with locator and warnings |
| `source_spans` | Stable evidence blocks used by models and references |
| `generation_runs` | Stage, status, lease, attempt, prompt/schema version, configured provider/model, token/latency/error metadata |
| `study_guides` | One current versioned Guide JSONB plus status and checksum |
| `quick_checks` | Versioned final MCQ set tied to one Guide version |
| `quick_check_attempts` | Answers and deterministic result JSONB |

No embeddings table and no vector database.

Every generated artifact stores:

- `schema_version`;
- Guide/source version checksum;
- prompt version;
- provider and actual model returned by the provider;
- creation time;
- validated JSON;
- validation warnings.

For a no-account MVP, issue a high-entropy session access token in an HttpOnly, Secure, SameSite cookie and store only its hash. Apply an expiry and delete raw files/extracted content/artifacts with a simple daily cleanup job. Do not log extracted source text or model prompts in general application logs.

### 2.10 Deployment

- Vercel: Next.js web application and Node Route Handlers.
- Supabase: one managed Postgres database and one private Storage bucket.
- Environment variables: Supabase URL/keys, model provider key, task model aliases, configured limits, retention period, and prompt/schema versions.
- Preview deployments use a separate Supabase project or isolated test schema/bucket; never point preview code at production course files.
- Basic observability: structured stage logs without course text, generation run status, latency, token use, parse warning rate, validation rejection rate, and error code.

## 3. Strict Study Guide schema

The runtime implementation should use Zod and derive the model JSON Schema from the same definition. The shapes below are the contract, not production code.

### 3.1 Shared evidence types

```text
PriorityBand =
  | "study_first"
  | "study_next"
  | "review_if_time_allows"

SourceRole =
  | "lecture_slides_or_course_notes"
  | "reading_or_textbook_excerpt"
  | "learning_objectives_or_review_sheet"
  | "syllabus_or_course_outline"
  | "sample_or_past_questions"
  | "pasted_course_text"

SupportStatus =
  | "direct"
  | "partial"
  | "conflict"
  | "unsupported_gap"

SourceReference {
  ref_id: string
  span_id: string
  source_id: uuid
  locator: {
    kind: "page" | "slide" | "text"
    start: positive_integer
    end?: positive_integer
  }
  excerpt: string
  support_status: "direct" | "partial" | "conflict"
}

GroundedStatement {
  id: string
  text: non_empty_string
  support_status: SupportStatus
  source_refs: SourceReference[]
}
```

`GroundedStatement` invariants:

- An important factual statement with `direct`, `partial`, or `conflict` must have at least one valid reference.
- `unsupported_gap` may have no reference only when it explicitly describes missing evidence; it cannot contain a positive factual explanation.
- Every `span_id` must exist in the same preparation session and resolve to the persisted `source_id` and locator.
- Displayed locator/excerpt values are populated by deterministic code from `span_id`, not trusted from model text.

### 3.2 Guide

```text
Guide {
  schema_version: "1.0"
  guide_id: uuid
  session_id: uuid
  title: non_empty_string
  based_on_uploaded_materials: true

  source_summary: {
    overview: GroundedStatement[]
    included_sources: SourceDigest[]
    excluded_or_unreadable: SourceIssue[]
    conflicts: SourceIssue[]
  }

  priority_method_summary: string
  topics: Topic[]                 // at least 1; stable explicit order
  overall_gaps: GroundedStatement[]
  generated_at: iso_datetime
}

SourceDigest {
  source_id: uuid
  display_name: string
  role: SourceRole
  locator_kind: "page" | "slide" | "text"
  usable_range_summary: string
  parse_status: "ready" | "ready_with_gaps"
}

SourceIssue {
  issue_id: string
  source_id?: uuid
  kind: "unreadable" | "excluded" | "duplicate" | "conflict" | "limited_support"
  locator?: { kind, start, end? }
  message: string
}
```

### 3.3 Topic

```text
Topic {
  topic_id: string
  topic_title: non_empty_string
  priority: PriorityBand

  why_focus_on_this: {
    explanation: string
    signals: PrioritySignal[]
    source_refs: SourceReference[]
    uncertainty_note?: string
  }

  concise_explanation: GroundedStatement[]

  key_concepts: KeyConcept[]
  important_definitions: Definition[]
  processes_relationships: ProcessOrRelationship[]
  common_confusions: CommonConfusion[]

  not_established_by_sources: GroundedStatement[]
  source_references: SourceReference[]   // de-duplicated topic-level index
}

PrioritySignal {
  kind:
    | "learning_objective"
    | "review_sheet"
    | "repeated_across_content_sources"
    | "explicit_user_emphasis"
    | "sample_question_depth"
    | "course_structure"
    | "source_conflict"
    | "limited_evidence"
  explanation: string
  source_refs: SourceReference[]
}

KeyConcept {
  concept_id: string
  name: string
  explanation: GroundedStatement[]
}

Definition {
  definition_id: string
  term: string
  definition: GroundedStatement[]
}

ProcessOrRelationship {
  item_id: string
  type: "process" | "relationship" | "formula" | "comparison"
  title: string
  explanation: GroundedStatement[]
  steps?: Array<{ step: positive_integer, text: string, source_refs: SourceReference[] }>
}

CommonConfusion {
  confusion_id: string
  confusion: GroundedStatement[]
  clarification: GroundedStatement[]
}
```

Fields may be empty arrays when the uploaded material does not support useful content; the UI hides empty subsections. The model must not fill a field merely to make the Guide look complete.

### 3.4 Guide validation after model output

Deterministic application checks run before persistence/display:

1. Strict schema parse; reject unknown fields.
2. Unique and stable IDs; valid topic ordering.
3. References resolve to supplied evidence spans and included sources.
4. Every important factual statement satisfies the reference invariant.
5. Topic-level reference index equals the de-duplicated references used in the topic.
6. Priority labels are only the three v3 bands.
7. Priority signals have evidence when the signal requires a source.
8. Forbidden prediction/mastery/coverage language is rejected.
9. Conflicting source claims remain marked `conflict`; the system does not silently select one.
10. Unsupported objectives become gaps and cannot produce explanations or Quick Check questions.

Important factual claims also receive a bounded entailment verification pass against their cited evidence. A failed claim is removed, downgraded to partial support, or regenerated once with the same evidence; it is never silently retained without support.

## 4. Strict Quick Check schema

### 4.1 Recommendation: MCQ-only in v1

The first release should be **MCQ-only**.

Short answer would add rubric generation, semantic grading, partial-credit rules, grading confidence, unscored states, extra latency, and a risk that an unreliable grade sends the user to the wrong Guide section. None of that strengthens the primary Study Guide promise. MCQ permits deterministic option-ID scoring and leaves model effort focused on question/key quality and source grounding.

Reconsider short answer only after a separate response-bank evaluation demonstrates reliable grading and users show that MCQ-only misses important value. This is a later product decision, not hidden MVP scope.

### 4.2 Quick Check

```text
QuickCheck {
  schema_version: "1.0"
  quick_check_id: uuid
  guide_id: uuid
  guide_checksum: string
  question_count: integer          // 5..10
  format: "mcq_only"
  disclaimer: string
  questions: MCQQuestion[]
}

MCQQuestion {
  question_id: string
  question: non_empty_string
  options: MCQOption[]              // exactly 4 in v1
  correct_option_id: string
  explanation: GroundedStatement[]
  related_topic_id: string
  related_section: {
    section_type:
      | "concise_explanation"
      | "key_concept"
      | "definition"
      | "process_relationship"
      | "common_confusion"
    section_item_id: string
    anchor: string
  }
  source_references: SourceReference[]
  validation: {
    status: "validated"
    single_best_answer: true
    question_grounded: true
    answer_grounded: true
  }
}

MCQOption {
  option_id: "A" | "B" | "C" | "D"
  text: non_empty_string
}
```

The `validation` block is assigned by the application validation stage, not trusted from the generating model.

Quick Check invariants:

- The final set contains 5–10 questions unless the UI explicitly enters the permitted shorter-sample limitation state.
- Every question ID and option ID is unique and immutable; options have unique normalized text.
- `correct_option_id` must identify exactly one present option.
- `related_topic_id`, `section_item_id`, and `anchor` must exist in the exact referenced Guide checksum.
- The correct answer and explanation must be supported by valid source spans; unsupported/conflicting evidence cannot create a scored item.
- A known ambiguous or invalid candidate is discarded before display and never enters a scored denominator.
- The final set contains no exact or near-duplicate questions and does not claim representative coverage or mastery.

### 4.3 Attempt and result

```text
QuickCheckAttempt {
  attempt_id: uuid
  quick_check_id: uuid
  status: "active" | "submitted" | "abandoned"
  answers: Array<{
    question_id: string
    selected_option_id?: "A" | "B" | "C" | "D"
  }>
  result?: QuickCheckResult
}

QuickCheckResult {
  correct_count: non_negative_integer
  scored_count: positive_integer
  wrong_items: WrongItem[]
  review_topics: ReviewTopic[]
  disclaimer: string
}

WrongItem {
  question_id: string
  selected_option_id?: string
  correct_option_id: string
  explanation: GroundedStatement[]
  related_topic_id: string
  related_section: { section_type, section_item_id, anchor }
  source_references: SourceReference[]
}

ReviewTopic {
  related_topic_id: string
  wrong_question_count: positive_integer
  label: "review_this_topic" | "one_gap_found"
  section_anchors: string[]
}
```

MCQ grading is a pure deterministic comparison of immutable option IDs. No model call occurs on submission. Only confidently validated final questions enter the Quick Check; an invalid candidate is discarded before the user sees it.

## 5. Model call strategy

### 5.1 Provider abstraction and configuration

Create one narrow interface conceptually equivalent to:

```text
generateStructured(task, modelAlias, schema, instructions, evidence) → validated object + usage metadata
```

Configuration:

- `MODEL_PROVIDER`
- `MODEL_TOPIC_EXTRACT`
- `MODEL_TOPIC_MERGE`
- `MODEL_GUIDE`
- `MODEL_GROUNDING_VERIFY`
- `MODEL_QUICK_CHECK`
- `MODEL_QUESTION_VERIFY`

The business layer asks for a task alias, never a concrete model name. Model/provider changes require configuration and evaluation, not edits to Guide or Quick Check logic.

Use temperature/reasoning controls supported by the chosen provider conservatively, but do not confuse low temperature with factual correctness. JSON Schema, evidence restriction, validation, and abstention are the primary controls.

### 5.2 Pipeline

```text
Upload
  ↓
Parse + normalize + duplicate/gap detection                 [deterministic]
  ↓
Source-level topic candidates → global topic merge          [LLM + schema]
  ↓
Evidence-map and priority-signal validation                 [deterministic]
  ↓
Study Guide topic-section generation in small batches       [LLM + schema]
  ↓
Reference resolution + claim grounding checks + assembly    [code + bounded verifier]
  ↓
Persist/display complete Study Guide
  ↓ user explicitly starts Quick Check
Candidate MCQ generation from Guide topic + source evidence [LLM + schema]
  ↓
Question/key/reference validation and candidate filtering   [code + bounded verifier]
  ↓
Persist 5–10 final MCQs
  ↓ user submits
Option-ID scoring + wrong answer → Guide anchor              [deterministic]
```

### 5.3 Step responsibilities

#### A. Parse — deterministic code only

- Verify file, hash, deduplicate, parse by page/slide/text section.
- Normalize text without losing locators.
- Detect unreadable/image-heavy units, duplicates, and suspicious extraction.
- Create stable spans and token estimates.
- Classify the user-selected source role; automatic suggestions may assist but never silently override the user.

#### B. Topic extraction — LLM plus deterministic merge checks

- Work in bounded source batches instead of one huge prompt.
- Extract topic candidates, aliases, evidence span IDs, conflicts, and priority-signal candidates.
- Merge candidates into a canonical topic map in a separate structured call that sees candidate summaries and necessary evidence—not every raw page again.
- Require content evidence for a topic. A review sheet, syllabus, objective, or sample question alone may create an unsupported gap/signal but not a factual Study Guide section.
- Do not use a universal source hierarchy or numeric exam-probability score.

#### C. Study Guide generation — LLM in small topic batches

- Generate one topic or a small group of topics per call, using only the topic's evidence bundle and global Guide context.
- Ask for the strict Topic schema, not Markdown prose.
- Generate source overview and limitations separately from detailed topic sections.
- Assemble Guide order and de-duplicated reference indexes in code.
- Check evidence IDs deterministically and verify important claim entailment against the cited spans. Allow at most one targeted repair; otherwise remove/downgrade/show a gap.

#### D. Quick Check generation — only on user request

- Do not pre-generate Quick Check during Guide creation; it is optional and should not delay first value or incur cost when skipped.
- Select 5–10 topic/section targets using Guide priorities and supported content. This is a coverage heuristic, not an exam blueprint.
- Generate roughly 1.5–2× candidate MCQs, then filter for exact schema, unique options, valid key ID, supported answer/explanation, related Guide anchor, duplicate questions, and single-best-answer quality.
- If fewer than five valid questions survive, do not lower the bar. Show that a supported Quick Check could not be created for the full requested sample, or allow the shorter explicitly limited state permitted by the UX spec.

#### E. Scoring and return loop — deterministic code only

- Compare selected option ID with immutable correct option ID.
- Group only wrong scored items by related topic.
- Use `One gap found` for a single miss; do not call the topic mastered/weak from sparse evidence.
- Navigate to the stored exact section anchor and display the question-context banner.

## 6. MVP pages and technical mapping

Use **4 actual pages/routes**. Several UX steps are states/components, not independent pages.

| # | Route | User-visible responsibility | Components/states on the page |
| ---: | --- | --- | --- |
| 1 | `/` | SEO landing and first upload entry | Hero, limits disclosure, supported formats, dropzone/paste entry, example Guide |
| 2 | `/study/[sessionId]` | Preparation workspace and primary Study Guide surface | `Materials`, parse readiness, source roles, `Generating`, failure/retry, Guide overview, priority groups, topic outline, Guide sections, source/gap drawer, return-from-check banner |
| 3 | `/study/[sessionId]/quick-check` | Optional Quick Check | Ready state and disclaimer, active 5–10 MCQs, progress, exit/back-to-Guide |
| 4 | `/study/[sessionId]/quick-check/[attemptId]/result` | Compact result and corrective return | Score, wrong items, review topics, source explanations, `Review this Guide section` links |

Decisions:

- **Landing and Upload:** the landing contains the initial upload entry, but detailed multi-source readiness is a state on the session workspace.
- **Generating:** not a separate route. It is a resumable state on `/study/[sessionId]`; refresh reads the persisted stage.
- **Study Guide:** the main state of the same workspace route and the product's primary surface.
- **Quick Check Ready and Active:** two states on one page.
- **Result:** separate page because it is addressable after submission and must survive refresh; its primary links return to Guide anchors.
- Source references and warnings are drawers/panels, not top-level pages.

No top-level Exam, Assessment, Performance, Dashboard, Notes, Tutor, or Library pages.

## 7. Error and state model

### 7.1 Session generation states

```text
DRAFT_MATERIALS
  → PARSING
  → READY | READY_WITH_GAPS
  → EXTRACTING_TOPICS
  → GENERATING_GUIDE
  → VERIFYING_GUIDE
  → GUIDE_READY

Any stage → FAILED_RETRYABLE | FAILED_TERMINAL
```

Persist `failed_stage`, stable error code, safe user message, and prior completed artifact. Retry resumes from the last valid checkpoint.

### 7.2 Source parse states

```text
UPLOADING → UPLOADED → PARSING → READY | READY_WITH_GAPS | CANNOT_USE
```

At least one usable content source is required. Objectives/review sheets/sample questions alone cannot generate a complete Guide.

### 7.3 Quick Check states

Follow the UX v3 state model:

```text
NOT_STARTED → GENERATING → READY → ACTIVE → CHECKING → RESULT
                               └────── exit → ABANDONED / Guide
```

`CHECKING` is deterministic validation/scoring in MCQ-only v1; it should be brief.

## 8. Development order

Each phase must leave a runnable and independently testable vertical slice.

### Phase 1 — Foundation, schemas, and fixtures

Deliver:

- Next.js/TypeScript project shell and environment validation.
- SQL migrations for sessions, sources, spans, runs, Guide, Quick Check, and attempts.
- Zod contracts for all persistent states and artifacts.
- Fixture corpus of licensed/synthetic text PDFs, PPTX decks, pasted text, duplicates, image-only pages, conflicts, and malformed files.
- Pure validation tests for Guide references, forbidden language, priority enums, MCQ keys, and section anchors.

Runnable/testable outcome: schema/DB migration tests and fixture validation run without any model call.

### Phase 2 — Upload + parsing

Deliver:

- Session creation, signed private uploads, paste text.
- File/type/hash/limit validation.
- PDF page and PPTX slide extraction with gaps and preview.
- Source roles, add/remove/replace/retry, duplicate warnings.
- Materials/Generating workspace states up to `READY_WITH_GAPS`.

Runnable/testable outcome: upload fixtures and inspect exact extracted page/slide anchors; no Guide generation yet.

### Phase 3 — Structured Study Guide generation

Deliver:

- Provider-neutral `ModelGateway` and environment model aliases.
- Topic candidate/merge stage.
- Batched Topic generation, Guide assembly, evidence resolution, claim checks, retry checkpoints.
- Persisted Guide JSON and generation-run metadata.
- Offline golden/fixture evaluation for topic coverage, reference validity, critical-claim support, and priority explanation quality.

Runnable/testable outcome: API/CLI fixture run produces a schema-valid Guide JSON with page/slide evidence and visible gaps, independent of final UI.

### Phase 4 — Study Guide UI

Deliver:

- Guide overview, priority bands/reasons, persistent topic outline, topic sections.
- Empty-section hiding, partial/conflict/gap states.
- Evidence drawer with source excerpt and page/slide; PDF may deep-link to its page. PPTX v1 shows extracted slide evidence plus original-file download, not a rendered visual thumbnail.
- Reading-position and exact subsection anchors.

Runnable/testable outcome: render fixture Guides and verify navigation, warnings, anchors, keyboard/mobile behavior without model calls.

### Phase 5 — MCQ-only Quick Check

Deliver:

- Lazy Quick Check generation from the current Guide version.
- Candidate generation/filtering and 5–10 final MCQs.
- Ready/active page, immutable question order/option IDs, progress and exit.
- Deterministic submission scoring and result persistence.
- Evaluation fixtures for unsupported questions, ambiguous keys, duplicated options, invalid topic mapping, and known correct/incorrect answers.

Runnable/testable outcome: a fixture Guide can generate, take, submit, and reproduce the same score without an LLM grading call.

### Phase 6 — Wrong answer → Guide section loop

Deliver:

- Exact `related_topic_id + related_section.anchor` mapping.
- Result grouping and `One gap found`/`Review this topic` language.
- Return link, opened subsection, context banner, and misconception highlight.
- No global mastery or reprioritization model.

Runnable/testable outcome: every wrong fixture answer deep-links to the expected Guide subsection and survives refresh/back navigation.

### Phase 7 — Landing, SEO, reliability, and launch polish

Deliver:

- v3 landing copy/metadata and example Guide.
- Pre-generation limits/privacy/retention disclosure.
- Rate limits, safe errors, cleanup job, production storage policies, observability, accessibility, responsive QA.
- End-to-end tests for happy path, gaps, partial failure/retry, expired session, and model failure.
- Small frozen Quick Check/Guide quality protocol before public traffic; no v2 psychometric program.

Runnable/testable outcome: production-like preview deployment passes end-to-end and privacy/cleanup checks.

## 9. Testing strategy

### 9.1 Deterministic tests

- Unit: MIME/signature, hashes, normalization, page/slide anchors, chunk IDs, reference resolution, state transitions, Guide invariants, MCQ scoring, result grouping.
- Contract: every model response fixture parses the current schema; migrations preserve prior artifact versions.
- Integration: Storage upload/download, Postgres RLS/access-token checks, stage lease/idempotency, retry after each failed stage.
- E2E: upload → gaps → Guide → Quick Check → wrong answer → exact Guide section.

### 9.2 Model quality evaluation

Before public launch, freeze a small licensed/de-identified course-pack set and manually review:

- major-topic omissions and unsupported topics;
- important definition/process/relationship claim grounding;
- page/slide anchor correctness;
- priority explanation evidence and prohibited probability language;
- source conflict/gap abstention;
- MCQ single-best-answer quality, answer-key support, explanation support, and section mapping.

Known wrong or ambiguous MCQ keys have zero tolerance in scored output. The Quick Check evaluation is an item-quality protocol, not psychometrics or a mastery validation program.

### 9.3 Operational measurements

- parse failure/gap rate by file type;
- p50/p95 duration per generation stage;
- model validation and candidate rejection rate;
- retries and timeouts;
- tokens/cost per successful Guide and Quick Check;
- percentage of Guide sessions that start Quick Check;
- percentage of wrong-answer links that return to a Guide section.

## 10. Largest technical risks and containment

### Risk 1 — A polished Guide can omit or misprioritize important content

This is the largest risk. Quick Check is generated from the same evidence boundary and cannot discover content the parse/topic/Guide pipeline already missed.

Containment:

- page/slide-preserving parsing and visible unreadable ranges;
- duplicate detection so repeated uploads do not inflate priority;
- topic extraction separate from Guide prose generation;
- content evidence required for every factual topic;
- fixed structured sections and important-claim references;
- explicit conflicts/unsupported gaps;
- frozen course-pack review focused on topic recall and critical-claim grounding;
- priority bands and reasons, never probabilities or false precision.

### Risk 2 — Page/slide citation looks valid but does not support the claim

Containment:

- model selects supplied span IDs instead of emitting locators;
- deterministic ref resolution and excerpt display;
- bounded entailment check for important claims;
- source issue state when support is partial/conflicting;
- citations are spot-check aids, never proof of complete coverage.

### Risk 3 — MCQ key or mapping is wrong

Containment:

- generate extra candidates and filter before display;
- validate one present immutable correct option ID, explanation evidence, topic ID, and exact section anchor;
- bounded single-best-answer verification;
- deterministic scoring only;
- discard unsupported/ambiguous candidates rather than filling the requested count with weak items.

### Risk 4 — A serverless generation request exceeds its time budget

Containment:

- direct-to-storage upload, bounded inputs, small model batches;
- stage checkpoints and idempotent resume;
- explicit configured duration and p95 monitoring;
- no local-only state;
- add a durable workflow only if measured production duration/reliability requires it.

## 11. Decisions to approve before implementation

1. Approve the recommended stack: Next.js + TypeScript + Tailwind + Supabase Postgres/Storage + Vercel + configurable structured-output model API.
2. Approve 4 actual pages/routes, with Generating as workspace state.
3. Approve the strict evidence-first Guide schema and span-ID reference rule.
4. Approve MCQ-only Quick Check in v1.
5. Approve the checkpointed no-queue generation pipeline.
6. Approve the initial configured input limits and anonymous-session retention approach; exact displayed values may be tuned before launch.

No formal MVP implementation begins until these decisions are confirmed.
