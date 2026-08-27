# Folveta Product Decisions

## Current decision — v5 (Launch-ready Study Guide Workspace)

Decision date: 2026-08-25

### Product-3A identity and persistence decision

Decision date: 2026-08-26

- Supabase Auth is the formal account identity; Product-3A uses email/password and PKCE confirmation without social providers.
- Anonymous Study Guide Maker use remains available through the existing seven-day high-entropy cookie session.
- `auth.users.id` is the durable owner and future billing/entitlement owner. A separate profile or multi-member workspace model is deferred until real product fields or collaboration require it.
- `preparation_sessions` remains the ownership aggregate root; Sources, source evidence, generation runs, Guides, Quick Checks, and results derive ownership through `session_id`.
- `study_guides` remains the independent, stable-ID persistent artifact and receives normalized title/access/lifecycle metadata.
- Anonymous conversion requires both a verified Supabase user and possession of the current anonymous cookie. The database claim is atomic, uses `auth.uid()`, accepts no Guide ID, clears anonymous credentials, and cannot claim expired, deleted, or already-owned data.
- Authenticated RLS is owner-scoped; anonymous roles retain no direct table access. Server service-role queries remain behind explicit DAL authorization.
- Payment is not implemented. Future provider-independent customer, entitlement, plan, and usage records attach to the durable user owner.
- The full rationale, lifecycle, retention, repair, and privacy contract is in `docs/auth-and-persistence.md`.

### Product-3B Guide management decision

Decision date: 2026-08-26

- My Guides is an authenticated private route. Anonymous requests redirect to Auth, and all account/Guide routes remain `noindex,nofollow` and absent from the sitemap.
- Recent Guides reuses the bounded owner list and never substitutes demo data for signed-out or empty accounts.
- `study_guides.last_accessed_at DESC`, then `updated_at DESC`, then stable Guide ID defines deterministic recent ordering.
- List requests are paginated and capped; source counts are aggregated in the list query rather than loaded per Guide.
- Reopen begins with the stable Guide ID but resolves the session and updates access time only after server-side owner authorization.
- Rename changes only the normalized `study_guides.title`; generated Guide JSON, Sources, and AI output are not rewritten.
- Archive is reversible through the minimal Archived filter and removes a Guide from default and Recent lists.
- Delete is a real soft delete. The aggregate is inaccessible immediately and is scheduled for the existing Storage-first retention flow after a 30-day window; Product-3B does not directly purge Storage or database children.
- Browser mutations go through owner-authorized, same-origin Route Handlers. Direct authenticated table writes remain closed by RLS.
- Library, Search, full Profile, Payment, SEO v2, deployment, and public indexing remain outside Product-3B.
- The detailed contract is in `docs/guide-management.md`.

### Product-3C Library, Search, and Profile decision

Decision date: 2026-08-26

- Library is the private, account-owned inventory of uploaded Sources, not a second Guide manager. It supports only the real PDF/PPTX formats, bounded pagination, type filtering, sorting, source status/count metadata, and related Guide navigation.
- Sources belonging to archived Guides remain visible in Library with an archived relationship; deleted aggregates are excluded. A deleted Guide relationship is never linked or exposed.
- Knowledge Search is an authenticated PostgreSQL full-text search over active Guide titles, Guide topics/structured content, Source filenames, and Source spans. It returns Guide, Topic, and Source results with bounded pagination and real private destinations.
- Search executes under the authenticated Supabase session through a `security invoker` RPC and existing owner RLS. It does not use embeddings, a vector database, RAG, or new AI calls.
- Profile is an account page backed by Supabase Auth and owner-scoped counts. It shows only email, account creation date, Guide count, Source count, and sign-out. No profile table, social fields, or invented plan state is added.
- `/account` remains a compatibility redirect to `/profile`. My Guides, Library, Search, and Profile share a real responsive Workspace navigation.
- Account deletion is intentionally not implemented. A complete design must stage owned aggregates, remove private Storage first, handle spans/Quick Checks/results and retention observably, then delete the Auth user, and later coordinate billing state. This lifecycle decision is required before Payment/Production completion.
- `202608260003_product_3c_library_search_profile.sql` is the formal Product-3C migration. It and the earlier Product-3B migration were applied to dev in order through the official Supabase CLI during the Product-3 Gate, followed by forward-only security and filename-search repairs `202608260004` and `202608260005`.
- The detailed contract is in `docs/library-search-profile.md`.

### Product-3 Phase 2 Gate decision

Decision date: 2026-08-26

- The official Supabase CLI migration channel is the only approved dev DDL path. Existing remote schema was verified before repairing historical records; local and remote migration history now match through `202608260005`.
- Search remains PostgreSQL FTS, not semantic/AI search. The deployed RPC is `security invoker`, authenticated-only, owner/RLS scoped, excludes archived/deleted aggregates, and uses punctuation-normalized Source filename indexing.
- The Product-3 deterministic two-account dev Gate passed My Guides, Library, Search, Profile, Guide lifecycle, Quick Check/Results regression, page/API/direct-client/RPC isolation, sign-out, relogin, desktop/390px, noindex, and console checks. Test data and Auth users were removed.
- Sign out and Auth expiry revoke browser access but do not delete owned data. Guide delete is immediate access revocation plus 30-day purge eligibility; it is not a promise of automatic physical deletion because production scheduling/retry monitoring is not deployed.
- No Delete Account UI or request endpoint may appear before a complete Storage-first deletion orchestrator exists. That future flow must stop writes, coordinate billing cancellation, remove Storage, cascade database children, handle retries/audit needs, and delete the Auth user last.
- With these current boundaries documented truthfully, Product-3/Phase 2 passes. The scoped Production pre-launch Gate also passed on `main@2dcc4d9`, including Auth/PKCE, anonymous claim, workspace regression, and real AI full-chain. Full account deletion/recovery, deployed retention scheduling and retry monitoring, rate limiting, production monitoring, support/privacy channel, Payment, SEO v2, and indexing cutover remain later gates.

### Product identity and category ownership

- The formal brand is **Folveta**.
- The canonical production origin is **`https://folveta.com`**.
- The primary SEO query and category ownership are **`Study Guide Maker`**.
- `AI` may describe how Folveta works, but **`AI Study Guide Maker` is not the primary SEO owner, product name, or required lead phrase**.
- The homepage's first job remains: let a student upload supported learning materials and generate a useful Study Guide.

### Product model

Folveta is a Study Guide Maker that grows into a persistent study workspace. Its core loop remains:

`Upload materials -> Generate Study Guide -> Review priority sections -> Optional Quick Check -> Return to relevant sections`

The Study Guide is the primary artifact. Quick Check is a short, source-grounded learning loop, not a mock exam, mastery certification, or independent assessment product.

The current seven-day private session is an implemented anonymous-access baseline, not the final workspace identity model. A launch-ready workspace requires persistent Auth, multi-guide ownership, My Guides, Recent Guides, Library, knowledge search, Profile, reopen, rename, delete, and archive behavior.

### Commercial and launch gate

A working Payment / Billing system is part of the formal public-launch scope. Pricing, free and paid entitlements, usage limits, checkout, subscription/payment status, billing management, server-side verification, webhook processing, enforcement, and billing/legal copy must be defined and implemented before Folveta invites Google to index its public discovery pages.

No payment provider is selected by this decision. Provider selection follows the product entitlement model and an implementation review.

Folveta may be deployed to `https://folveta.com` earlier for production testing, but unfinished public discovery pages must remain protected and/or controlled by a fail-safe pre-launch `noindex` mode. Public canonical pages become indexable only through an explicit launch cutover. Private workspace, account, search, checkout, success/cancel/failure, and billing-management routes remain `noindex` after launch.

### UI decision

UI-1 Study Guide Workspace, UI-2 Landing / Upload, and UI-4 Quick Check / Results are implemented baselines, not frozen visual specifications. v5 adds **UI/UX Polish v2** to improve hierarchy, typography, color balance, component depth, state quality, icon treatment, responsive ergonomics, feedback, and restrained motion.

The existing Academic Editorial direction, current Folveta screens, and prior Stitch work are design inputs. Final v5 decisions are captured in the current product context and roadmap; no external template is the product-design source of truth.

The accessible repository `https://github.com/nobruf/shadcn-landing-page` and the ZippyStarter shadcn theme generator are reference resources only. They do not authorize wholesale replacement of Folveta or automatic dependency adoption. Any reused code or new library must pass license, compatibility, accessibility, maintenance, bundle, and visual-consistency review.

Folveta UI Foundation v2 is established in `docs/ui-design-system.md`. It keeps Bricolage Grotesque, Geist, and Lucide; adopts Folveta-owned semantic tokens and local shared primitives; introduces no new runtime dependency; removes visually misleading Product-3 shell controls until their real routes exist; and requires reduced-motion plus visible-focus behavior. Page-level polish remains a separate Phase 1 task.

### SEO decision

SEO v2 follows `docs/SEO_GUIDE.md` and the Folveta-specific `docs/seo-architecture.md`. The homepage owns `Study Guide Maker`. Folveta will not create a Blog, Pricing page, Use Case hub, Tools hub, comparison cluster, or programmatic SEO inventory without distinct user value and a real product/search requirement. A public Pricing page is justified only by the implemented commercial model.

### Documentation decision

- `docs/decisions.md` is the highest product-decision authority and preserves decision history.
- `docs/product-context.md` is the concise current product context.
- `docs/v5-master-roadmap.md` is the active delivery roadmap.
- `docs/seo-architecture.md` is the project-specific SEO architecture; `docs/SEO_GUIDE.md` is the reusable standard.
- `docs/technical-architecture.md` records the actual technical baseline and approved target boundaries.
- `docs/current-state-audit.md` records the 2026-08-25 audit and cleanup classifications.
- Historical plans and implementation reports must carry an explicit status banner and must not be interpreted as current authorization.

### v5 implementation sequence

1. Phase 0 — Master Audit, Documentation, and approved cleanup.
2. Phase 1 — UI/UX Polish v2 for the implemented core flow and reusable design foundation.
3. Phase 2 — Product-3 Auth, persistence, and real workspace management.
4. Phase 3 — Payment and Billing.
5. Phase 4 — SEO v2 implementation against the settled public product and pricing facts.
6. Phase 5 — Protected production pre-launch, full E2E, security/privacy, accessibility, and performance QA.
7. Phase 6 — Public launch, explicit indexing cutover, and monitoring.

The design-token foundation, Product-3 technical design, SEO research/page ownership, and pre-launch infrastructure design may overlap where `docs/v5-master-roadmap.md` permits. Identity must precede entitlement enforcement; product/pricing facts must settle before final SEO copy and structured data; all launch gates must pass before indexing is enabled.

### v5 final judgment

**GO with the v5 staged route.** This decision authorizes planning and documentation governance in the current task. It does not authorize Product-3 implementation, payment integration, broad UI changes, SEO v2 code changes, deployment, indexing, or file deletion.

## Historical decision — v4 (Folveta Study Workspace)

Status: **Superseded by v5.** Retained as the decision that established Folveta, the Academic Editorial direction, and the staged workspace concept. Its claim that Stitch is the final design source of truth and its phase list are replaced by the v5 decision above.

### Decision

**GO with Folveta as the formal product brand and Stitch as the product design source of truth.**

The current formal Stitch screens are:

- Folveta - Landing & Upload Refined
- Folveta - Study Guide Workspace Refined
- Folveta - Quick Check Refined
- Folveta - Results & Review Refined

The formal design system is **Academic Editorial**. It defines the Folveta visual language: Bricolage Grotesque headlines, Geist body/UI text, paper-like green surfaces, editorial content widths, source-blue citations, yellow highlights, restrained borders, and asymmetric study-document margins.

The product remains a Study Guide Maker at its core, but it will progressively expand from a single session-bound guide into a Folveta study workspace. The planned workspace includes:

- App Shell
- Study Guide Workspace
- My Guides
- Recent Guides
- Library
- Search your knowledge
- Profile
- Quick Check
- Results / Learning Loop

This expansion must preserve `study guide maker` as the homepage's primary SEO intent and core value proposition. Workspace capabilities are a product extension, not a replacement for the public Study Guide Maker entry point.

### Implementation phases

1. **Phase UI-1 — App Shell + Study Guide Workspace:** high-fidelity reconstruction of the formal Folveta shell and the Study Guide document, including Study First, Key Concepts, process visualization, glossary, Common Confusions, source chips, and margin notes.
2. **Phase UI-2 — Landing / Upload + Processing Queue:** high-fidelity reconstruction of Landing & Upload, drag-and-drop states, supported upload workspace, and processing queue presentation.
3. **Phase Product-3 — Persistent workspace:** introduce the identity and data model required for My Guides, Recent Guides, Library, Search your knowledge, and Profile.
4. **Phase UI-4 — Quick Check + Results:** align question states, learning notes, result feedback, score presentation, Learning Loop, review actions, and continuation behavior with the formal Stitch screens.

### Compatibility rules

- Reuse the existing Upload, Study Guide, Quick Check, AI, Supabase, private-session, and SEO logic wherever it is already correct.
- Do not rewrite working AI generation, grounding, scoring, storage, or session-ownership flows merely to match Stitch visuals.
- Add persistent identity and workspace schema only in Product-3, after the Study Guide Workspace has been aligned.
- Keep private workspace routes `noindex`; do not weaken the current high-entropy session ownership model while the product is session-scoped.
- The old Lumina assets, old Dashboard and Generate Guide screens, and Concept exploration screens are not formal implementation targets.

### v4 final judgment

**GO** to the staged Folveta workspace evolution, with the Study Guide document and the `study guide maker` SEO entry point remaining the center of the product.

## Historical decision — v3 (Study Guide Core + Quick Check)

### Decision

**GO with a Study Guide Maker whose first and primary value is a high-quality, structured, priority-aware Study Guide. Quick Check is an optional secondary loop for verifying understanding and returning the student to weak guide sections.**

The core SEO keyword remains `study guide maker`. The product category, landing promise, first completed artifact, and main UX surface must therefore remain Study Guide Maker. Testing supports the guide; it is not a separate exam-simulation product.

Current core loop:

`Upload materials → Generate Study Guide → Review priority sections → Optional Quick Check → Review weak sections`

### Why v3 changes v2

v2 correctly identified the validated gap between passive familiarity and active recall, but it promoted the solution too far. The UX and validation scope expanded into exam configuration, a full exam blueprint, 30/60-minute timed sessions, mixed-format allocation, delayed grading, provisional score ranges, psychometric calibration, NDCG-based reprioritization, and an assessment dashboard. That created three problems:

1. **Category drift:** the product began behaving like an independent Mock Exam Simulator even though users arrive with `study guide maker` intent.
2. **Evidence overreach:** the user report strongly validates active recall, practice questions, weak-area review, priority uncertainty, and costly material conversion. It does not validate demand for a full AI-generated exam simulation or trust in sophisticated automated grading.
3. **MVP risk:** assessment validity became the gating product thesis instead of a bounded quality requirement for a supporting feature.

v3 preserves the useful v2 insight—students need to test whether they can retrieve and apply what they reviewed—but implements it as a 5–10 minute Quick Check attached to the current Study Guide.

### Current product positioning

#### Target user

A US college student in a lecture-heavy, exam-based course who has too many course materials, limited study time, and no clear way to turn those materials into one useful review guide.

#### Core pain

The student lacks one clear, learnable, priority-aware guide, so time is lost reorganizing material and rereading content without knowing what matters or what remains misunderstood.

#### Product promise

> For college students who have too much course material and too little time before an exam, this product helps them understand what matters and study it efficiently by turning their materials into a clear, priority-focused Study Guide with an optional Quick Check that links mistakes back to the right sections.

#### One-sentence description

> Upload your course materials, get a clear Study Guide, and quickly check what you still need to review.

### v3 evidence alignment

| Validated user evidence | v3 response | Role in product |
| --- | --- | --- |
| Materials are too numerous and time is limited | Consolidate supported course materials into one structured guide | Core |
| Students do not know what to prioritize | Order sections and explain what to focus on first | Core |
| Converting slides/notes into usable study resources is time-consuming | Generate a fixed, learnable Study Guide structure | Core |
| Rereading/summary creates familiarity without recall/application | Offer a short optional Quick Check after review | Secondary validation |
| AI output can omit, mix, or invent material | Ground important guide claims, questions, and explanations in uploaded sources; show uncertainty/gaps | Trust requirement |
| Hidden paywalls and unclear quotas damage trust | Disclose limits and result restrictions before generation | Access requirement, not a differentiator |

Multi-file/multi-source input remains a **Table Stake** supported by several existing competitors. It is necessary infrastructure but not the product differentiation.

### v3 MVP — maximum four core capabilities

1. **Course-material input — Table Stake**  
   Accept a bounded set of text-based PDF/PPTX files or pasted text; show parsing status and gaps; optionally classify review sheets, learning objectives, syllabi, and legitimate sample questions without granting any source type universal highest weight.

2. **Structured priority Study Guide — Primary product**  
   Produce topic structure, key concepts, important definitions, relationships/processes, concise explanations, common confusions, priority/focus guidance, and useful page/slide references. The first successful result is the complete guide—not exam configuration or a test shell.

3. **Optional Quick Check — Secondary loop**  
   Generate 5–10 questions for approximately 5–10 minutes, primarily MCQ with at most a small number of short answers, based on the current Study Guide and uploaded sources. The user may skip it without losing the guide's value.

4. **Weak-topic return and review loop**  
   After completion, show the score, wrong questions, concise source-grounded explanations, weak Study Guide topics, and a direct button back to the exact relevant guide section. Do not create a full assessment dashboard or sophisticated global reprioritization model.

### Role of Quick Check

Quick Check answers one narrow question: **“After reviewing this Study Guide, which parts should I revisit now?”**

It is not a Mock Exam, exam predictor, mastery assessment, psychometric instrument, or independent product mode. It should:

- remain optional;
- take about 5–10 minutes;
- use 5–10 questions;
- be mostly MCQ, with only a small number of short answers when reliable;
- derive questions and answer explanations from the current guide and uploaded material;
- reveal results after completion;
- map each wrong answer to a specific Study Guide topic/section;
- return the student directly to that section.

It should not introduce a separate exam setup, long-form timer, full exam blueprint, professor-style realism claim, complex format allocation, provisional score range, psychometric calibration, NDCG ranking, AI oral interaction, or assessment dashboard.

### What v3 removes or downgrades from v2

| v2 capability | v3 status | Reason |
| --- | --- | --- |
| Mock Exam Simulator as core differentiation | Removed from current positioning | Drifted away from `study guide maker` and lacked direct demand validation |
| Full exam blueprint | Deferred | More complex than required to generate a useful guide and short check |
| 30/60-minute timed exam | Removed | Quick Check targets 5–10 minutes; long exam behavior is not required |
| Sophisticated timing/session-integrity model | Removed | Not necessary for lightweight understanding validation |
| Mandatory mixed-format exam allocation | Removed | MCQ is primary; only a small number of reliable short answers are optional |
| Submit-without-feedback exam simulation | Downgraded | Quick Check can withhold results until completion, but does not claim exam realism |
| Provisional score ranges | Removed | Too complex and misleading for a lightweight check |
| Psychometric calibration and mock-realism pilot | Deferred | Belongs to a future full-assessment direction, not the current MVP |
| NDCG-based reprioritization | Removed | Wrong answers link to weak guide sections; no global ranking model is required |
| Full assessment/quality dashboard | Removed | Results remain a compact return-to-guide screen |
| AI Oral Exam / voice examiner | Deferred | User demand is unvalidated and technical scope is disproportionate |

### v3 core flow

1. **Upload materials:** add supported course files/text and review visible parsing gaps.
2. **Generate Study Guide:** receive a complete, structured, priority-ordered guide as the first result.
3. **Review:** study the highest-priority sections, open source references when useful, and move through the guide by topic.
4. **Optional Quick Check:** answer 5–10 mostly-MCQ questions in approximately 5–10 minutes.
5. **Return to weak sections:** review score/wrong answers and jump directly to the exact guide sections that need attention.

### v3 risks and open questions

Largest risk: **the Study Guide may look clear while still omitting or misprioritizing important course content.** Quick Check cannot repair a weak guide because it is generated from the same evidence boundary. Guide quality, grounding, topic coverage, priority explanations, and common-confusion accuracy therefore matter more than test sophistication.

Additional open questions:

1. Which guide structure is most learnable across the first target course category?
2. Which priority explanations cause students to start with the recommended sections?
3. Does the guide reduce manual reorganization time?
4. Do students actually take the optional Quick Check after reviewing?
5. Does a 5–10 question sample identify useful weak sections without creating false confidence?
6. Are optional short answers reliable enough to score, or should the first release remain MCQ-only?
7. Do mistake-to-section links cause immediate corrective review?
8. Which source references are useful during learning rather than visual noise?

### v3 final judgment

**GO** to the focused Study Guide Maker + Quick Check MVP definition and UX validation. This decision does not authorize development in the current task.

## Historical decision — v2 (Mock Exam Core)

Status: **Superseded by v3, which was the next product direction at that time.** Retained below because it established useful distinctions between ordinary quizzes and real exam simulation, documented assessment-validity risks, and preserved Mock Exam / AI Oral Exam as possible future directions. Its full simulation scope is not part of v5.

### v2 decision adjustment (historical)

**v2 recommendation at the time: Study Guide + Mock Exam Simulator.**

The previous Priority-first Study Guide decision is retained below as a historical record. It is not discarded: priority ranking remains the study-guide layer and the post-exam action. The product differentiation is adjusted because:

1. **Multi-file/multi-source intake is a Table Stake, not a differentiator.** RemNote, Atlas, NotebookLM, StudyPDF, and Flint already support it; the market question begins after upload.
2. **Ordinary quiz generation is also widely available.** Quiz, practice-question, and flashcard generation cannot by themselves create a credible wedge.
3. **The user evidence validates a performance gap.** Students repeatedly describe passive familiarity without recall/application, time lost converting materials into practice, and the value of past papers for depth, timing, and weak-point diagnosis.
4. **A complete simulation can turn prioritization into evidence.** The first priority list is inferred from source signals; the next priority list can be updated from the student's own performance.

This is a decision to proceed to a focused product prototype/specification stage only. It is not a decision to begin UI design or implementation in this task.

### Table Stake reclassification

| Capability | Current classification | Evidence | Product implication |
| --- | --- | --- | --- |
| Multiple course files / sources | Table Stake | Verified in Flint, RemNote, Atlas, NotebookLM, and StudyPDF; the user research also shows students work across slides, notes, review sheets, textbooks, and past questions. | Support a bounded set of course files reliably, but do not market multi-file upload as the core difference. Evaluate the guide, assessment, and feedback experience after upload. |

### Definitions that must not be collapsed

#### Quiz Generator vs Mock Exam Simulator

| Ordinary Quiz Generator | True Mock Exam Simulator |
| --- | --- |
| Produces a set of questions, often as another study artifact. | Starts from an exam blueprint tied to course scope, expected depth, and question mix. |
| May show answers or feedback question by question. | Withholds answers, correctness, explanations, and tutor hints until final submission. |
| Timing, session integrity, and exam conditions may be absent. | Runs a timed, bounded assessment session. |
| May use one dominant question type. | Uses a deliberate mix of question types, at minimum multiple-choice and short/free response in the MVP. |
| Often ends with per-question correctness. | Grades the completed attempt, maps errors to topics/reasoning gaps, and updates next-study priorities. |

#### AI Tutor vs AI Oral Examiner

| AI Tutor | AI Oral Examiner |
| --- | --- |
| Optimizes for teaching, explaining, scaffolding, and correcting the learner during practice. | Optimizes for assessment: asks the question, listens without coaching, probes the student's reasoning, and judges performance. |
| May give hints, examples, or immediate correction. | Withholds teaching and final feedback until the assessment session ends. |
| Follow-up is commonly learner-initiated (“explain this again”). | Follow-up is examiner-initiated and chosen to test depth, justification, consistency, or application. |
| Voice input/output does not by itself make the interaction an oral exam. | Requires voice answers, adaptive examiner follow-ups, reasoning evaluation, and session-level scoring/feedback. |

### Current competitor evidence — quizzes and exam practice

Legend: `✅` = explicitly verified in the competitor report; `⚠️` = adjacent, limited, or suite-level capability that does not meet the named behavior; `—` = not verified in the existing reports. `—` does not prove a product lacks the capability.

| Competitor | Quiz | Practice test | Test Mode | Practice exam | Timed test | Free response | Essay questions | Weak-point analysis |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flint | ✅ | ⚠️ practice questions only | — | — | — | — | — | — |
| RemNote | ✅ | ⚠️ practice quiz | ✅ | — | — | ✅ | — | ✅ quiz feedback/mastery |
| Atlas | ✅ | ⚠️ practice quizzes | — | — | — | — | — | — |
| Quizlet | ✅ | ✅ | ⚠️ practice-test flow, not named Test Mode | — | ✅ time limits | ⚠️ customizable types, exact support not verified | ✅ sample essay questions | — |
| NoteGPT | ⚠️ broader suite only; not in tested Study Guide output | — | — | — | — | — | — | — |
| NotebookLM | ✅ | ⚠️ review/retake quiz only | — | — | — | — | — | — |
| Penseum | ✅ | ⚠️ practice questions | — | — | — | — | — | ✅ tracks weak spots |
| StudyPDF | ✅ | ⚠️ practice exam is verified, generic practice-test flow is not described | — | ✅ | — | — | — | ✅ weak-spot memory |
| Piktochart | — | — | — | — | — | — | — | — |

#### Does any verified competitor provide a full Mock Exam Simulator?

**Not on the evidence in the existing reports.** Components are distributed across products:

- Quizlet has practice tests, customizable question types, time limits, and sample essay questions.
- RemNote has multiple-choice/free-response quizzes, Study Mode/Test Mode, difficulty controls, feedback, and mastery tracking.
- StudyPDF has practice exams and weak-spot memory.
- Penseum has practice questions, real-time correction, and weak-spot tracking.

The reports do not verify one end-to-end competitor flow that combines a course-derived exam blueprint, a timed no-answer session, mixed question types, final submission before feedback, post-session grading, topic-level weakness analysis, and automatic update of next-study priorities. That complete sequence—not “more quiz questions”—is the candidate differentiation.

### Current competitor evidence — tutor and oral-exam interaction

| Competitor | AI tutor | Voice tutor | Real-time questioning | AI asks follow-up questions | Oral examination | Voice-answer evaluation | Examiner-style interaction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Flint | ⚠️ AI chat | ⚠️ chat has voice input/output, not a verified voice tutor | — | — | — | — | — |
| RemNote | ✅ | — | ⚠️ guided quiz flow, not live oral questioning | — | — | — | — |
| Atlas | ⚠️ AI chat | — | — | — | — | — | — |
| Quizlet | — | — | — | — | — | — | — |
| NoteGPT | ⚠️ AI chat in broader suite | — | — | — | — | — | — |
| NotebookLM | ⚠️ source-grounded chat, not a tutor | — | — | — | — | — | — |
| Penseum | ✅ 1:1 tutor | ✅ real-time voice explanation | ⚠️ observes practice and corrects in real time | ⚠️ tutor interaction is described, examiner-led probing is not verified | — | — | — |
| StudyPDF | ⚠️ cited AI chat | — | — | — | — | — | — |
| Piktochart | — | — | — | — | — | — | — |

No existing report evidence verifies a true AI Oral Examiner flow: **AI asks a question → student answers by voice → AI asks an examiner-style follow-up → AI evaluates reasoning → score/feedback is released after the session**. Penseum is the nearest adjacent product, but its verified behavior is tutoring, explanation, observation, and real-time correction—the opposite of withholding coaching during an examination.

### Three-direction comparison

All dimensions use 1–10. Higher is better except **Technical complexity**, where 1 is simplest and 10 is most complex. These are comparative judgments based only on the existing competitor and user-evidence reports.

| Direction | Validated user pain fit | Differentiation vs current SERP competitors | Fit with keyword `study guide maker` | User value clarity | 2–4 week MVP feasibility | Technical complexity | Retention potential | Monetization potential |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. Priority-first Study Guide | 9 | 8 | 9 | 8 | 7 | 6 | 6 | 7 |
| 2. Study Guide + Mock Exam Simulator | 9 | 8 | 8 | 10 | 5 | 8 | 9 | 8 |
| 3. Study Guide + AI Oral Exam | 7 | 9 | 6 | 8 | 3 | 9 | 8 | 8 |

#### Interpretation

- **Priority-first Study Guide** has the best evidence-to-feasibility balance and directly addresses the Strong priority pain, but it can remain a passive artifact and has lower repeat-use potential.
- **Study Guide + Mock Exam Simulator** directly addresses both the priority pain and the Strong recall/application pain. Its value is easy to understand, and each attempt creates new performance evidence for reprioritization. Its disadvantage is materially higher quality and grading complexity.
- **Study Guide + AI Oral Exam** is the clearest whitespace in the reviewed competitor set, but voice/oral-exam demand is not validated by the user report. It also has the weakest keyword fit and is not credible as a broad 2–4 week MVP because reliable turn-taking, examiner follow-ups, reasoning evaluation, and voice interaction all need validation.

### Is Mock Exam more direct than Priority-first for “I understand it, but I cannot do it in the exam”?

**Yes.** A priority guide tells the student where to allocate attention, but it does not demonstrate unaided retrieval or application. A timed, no-hint, mixed-format mock requires the student to produce answers under constraints and therefore surfaces performance gaps directly.

This does not make priority ranking obsolete. Mock Exam should sit on top of the guide:

`Course materials → exam blueprint + initial study priorities → timed mixed-format mock exam → submit without answers → source-grounded grading → weak topics/reasoning gaps → updated next-study priorities`

The evidence supports active recall, practice questions, past-paper calibration, timing, and weak-point diagnosis. It does **not yet validate** that students specifically want an AI-generated full simulation, will complete it, or will trust free-response grading. Those are the central hypotheses of the new direction.

### Recommended MVP — maximum four core capabilities

1. **Course-material intake and exam setup — Table Stake**  
   Accept a bounded set of text-based PDF/PPTX files or pasted text, optional review sheet/objectives/legal sample questions, and the desired exam duration/question mix. This is required infrastructure, not the marketed difference.

2. **Exam blueprint + priority study guide**  
   Produce topic priorities, intended depth, and question-type allocation with page/slide evidence and visible uncertainty. Do not claim to predict exact exam questions or let past questions define complete scope.

3. **Timed, closed-answer Mock Exam**  
   Run one bounded assessment with mixed multiple-choice and short/free-response questions. Show no answers, correctness, explanations, or tutor hints until the student submits the entire attempt.

4. **Post-exam grading + reprioritization**  
   Release the score only after submission, explain decisions against uploaded sources, identify topic and reasoning weaknesses, and generate the next study order. Every generated question and grading rationale must remain auditable against course material.

Not in this MVP: essay grading, voice interaction, oral examination, general AI tutor, spaced repetition, full note-taking, native mobile, social/community, complex handwriting/audio parsing, or external-web research.

### Why this direction is recommended

1. It preserves the strongest validated pain—uncertain study priority—but grounds the next priority list in student performance rather than source inference alone.
2. It more directly addresses the validated recognition-versus-recall problem than another static guide or ordinary quiz generator.
3. It automates the repeatedly reported time sink of converting course material into meaningful practice.
4. It offers a clearer repeat loop and monetization unit: generate, take, review, improve, retake.
5. The reviewed competitors verify many components but not the complete simulation-to-reprioritization experience.

### Largest risk

**Assessment validity is the largest risk.** If the generated blueprint, question difficulty, answer key, or free-response grading is wrong, the product can falsely reassure students or redirect scarce study time away from examinable material. Page citations alone do not solve this because a cited question may still be irrelevant, badly calibrated, or graded inconsistently.

The MVP must therefore treat realism and grading quality—not number of questions—as the success criterion. It should expose uncertainty, retain source evidence for questions and grading, avoid essay scoring in the first version, and be evaluated by course type. These safeguards are product requirements, not proof that the risk is already solved.

### Open questions introduced by v2

1. Will students finish a timed, no-hint mock when faster quizzes and summaries are available?
2. Which first course category supports reliable mixed multiple-choice and short/free-response generation?
3. What evidence makes a generated mock feel realistic: professor samples, learning objectives, review sheets, or course-material structure?
4. How accurate and stable must short/free-response grading be before students trust the weak-topic map?
5. Does post-exam reprioritization improve the next study action more than a source-derived priority list alone?
6. How much assessment length is enough to diagnose weakness without making first value too slow?
7. Will users pay for repeated mock attempts, grading, or progress comparison?
8. Which course types genuinely value oral examination enough to revisit AI Oral Examiner later?

## Historical decision record — v1 (Priority-first Study Guide)

Status: **Superseded first by v2 and then by v3; retained as the foundation and historical record.** Priority ranking remains a core layer in the implemented Guide, while Quick Check restores the short validation loop instead of the v2 full Mock Exam Simulator.

### Product decision

**GO to UI/UX prototyping for a narrow Priority-first Exam Study Guide. Do not proceed with a generic AI study guide generator or a full study platform.**

The primary problem is option **B: help users determine study priorities**. The product may generate a guide and a short recall check, but those are supporting mechanisms rather than competing primary promises.

This decision deliberately replaces the competitor report's `citation-first exam blueprint` recommendation. Citation remains a verification aid, syllabus is only a context-dependent signal, and past questions calibrate format and depth rather than define the full exam scope.

### Final product positioning

#### Target User

A US college student in a lecture-heavy, exam-based course who is preparing under severe time pressure.

#### User Situation

The student opens the product several days before an exam, with multiple lecture decks or notes and possibly a review sheet, learning objectives, or past questions, but no confident study order.

#### Core Pain

The student cannot tell what to study first, so limited preparation time is spread across material of uncertain exam relevance.

#### Product Promise

> For college students who have too many course materials and too little time before an exam, this product helps them decide what to study first by turning their materials and available exam signals into a ranked, explainable study guide with a short recall check.

#### One sentence product description

> Upload your course materials and get a study guide that tells you what to study first and tests what you remember.

### Minimum MVP

1. **Course-material intake**  
   → **User pain solved:** Students face too many fragmented lecture materials and do not know where to begin.  
   → **Why needed in MVP:** The core job requires comparing course content and any available exam signals; support should stay limited to several text-based PDF/PPTX files and pasted text.

2. **Priority-ranked exam guide with reasons, evidence, and uncertainty**  
   → **User pain solved:** Students do not know which topics matter most for the next exam, and AI-generated priorities are hard to trust when their basis is invisible.  
   → **Why needed in MVP:** This is the product's single differentiating job. Ranking must show the supporting signals, link important claims to the relevant page/slide, flag unsupported output, and avoid false prediction claims.

3. **Exam-ready study sections rather than a generic summary**  
   → **User pain solved:** Manually turning slides into concise concepts, formulas, processes, comparisons, and usable study material consumes scarce time.  
   → **Why needed in MVP:** A ranking without enough material to act on becomes another planning task; each priority needs a concise, fixed study structure.

4. **Lightweight active-recall check with weak-topic reordering**  
   → **User pain solved:** Passive rereading produces familiarity without recall, while manually writing questions takes time.  
   → **Why needed in MVP:** Five to ten source-grounded questions turn the result into a study action and provide a simple feedback loop without building spaced repetition.

5. **Transparent access**  
   → **User pain solved:** Hidden paywalls, unclear quotas, and restrictions revealed after the student has invested effort create distrust.  
   → **Why needed in MVP:** The complete free allowance and output restrictions must be disclosed before generation, with no surprise result-stage paywall. This does not assume that no-login access is essential.

### Not in MVP

- A generic summarizer or open-ended feature suite.
- Formal citation management or citation-first positioning.
- Universal syllabus weighting; administrative syllabi are not automatically privileged.
- Past-exam prediction or letting old questions define complete coverage.
- A full coverage-audit system that claims every page or objective was understood.
- A complete note-taking system, knowledge graph, or general AI chat workspace.
- Flashcard deck management or a spaced-repetition platform.
- Social, community, public libraries, classroom collaboration, or LMS integrations.
- Native mobile apps, offline sync, or complex cross-device history.
- A live voice tutor, screen watching, complex AI tutor, podcasts, mind maps, or video generation.
- Broad external-web research or supplementation beyond uploaded course material.

### Core flow

1. **Input:** Upload lecture slides/notes and specify the exam scope; optionally add a review sheet, learning objectives, professor emphasis, or past questions.
2. **Processing:** Parse the materials, distinguish content from exam-calibration signals, and detect agreements, conflicts, and unsupported areas without assigning a universal source hierarchy.
3. **Result:** Show a ranked exam study guide with reasons, uncertainty, concise study sections, and page/slide evidence.
4. **Study action:** Complete a 5–10 question recall check; weak topics move up the suggested study order and link back to the relevant material.

### Final judgment

1. **Continue making a study guide maker?** Yes, but only as the search-facing category. The actual product job must be exam prioritization, not generic summarization.
2. **What exactly should it become?** A Priority-first Exam Study Guide that ranks what to study, explains why, supplies concise exam-ready content, and closes with a lightweight recall check.
3. **Biggest difference from existing Study Guide Makers?** The output begins with an explainable study order rather than treating all uploaded content equally or merely shortening it.
4. **Which difference has user evidence?** The need to identify exam priorities is Strong and cross-platform; the associated information overload and limited-time context are also Strong.
5. **Which parts remain hypotheses?** The most trusted ranking formula, exact multi-file requirement, effect of automatic questions, citation click behavior, no-login conversion impact, willingness to pay, and discipline-specific rules.
6. **Worth entering UI/UX design?** Yes, for a focused prototype and usability/behavior test. This is not authorization to begin full product development.

**Final verdict: GO**

## Evidence

### Evidence conflict check

| Hypothesis | Competitor analysis says | User evidence says | Final status |
| --- | --- | --- | --- |
| Students need exam prioritization | Generic generation is commoditized; an exam blueprint and prioritization are presented as the strongest gap. | Strong cross-platform evidence shows students cannot decide what is important or examinable when material volume is high. | Validated |
| Students need citation/source pages | StudyPDF, NotebookLM, and RemNote use source links to build trust; the competitor report recommends citation-first positioning. | Click-back is useful mainly to medicine, certification, and research-heavy users. Ordinary student discussions rarely name it as a primary need, and citations do not prove coverage. | Partially validated |
| A syllabus should be a high-weight input | The recommended competitor wedge assigns syllabus/rubric/review material elevated assessment weight. | Syllabi are useful checklists in standardized or objective-led contexts, but ordinary university syllabi may be administrative and broad. Review sheets, professor emphasis, or past questions can be stronger signals. | Contradicted |
| Past questions are an important input | Past-question pattern extraction is proposed as a differentiator for question type, depth, and distractors. | Strong evidence supports using them for format, depth, timing, repeated themes, and weak-point diagnosis; clear counterevidence rejects using them as complete scope or prediction. | Validated |
| A generic summary is insufficient for exam review | Summary generation is saturated and does not create a defensible product; competitors increasingly add testing, mastery, or grounding. | Students already make summaries. Stronger needs are prioritization, reduced conversion cost, and recall. AI output errors are real, though the narrower claim that generic summaries universally miss exam-critical facts is only partially supported. | Validated |
| Active recall/practice questions have value | Practice questions, quizzes, diagnostics, and weak-spot loops are common table stakes or differentiators. | Strong evidence distinguishes recognition from recall and shows repeated use of self-questions, whiteboards, past papers, and practice tests. Whether automatically generated questions improve behavior remains unproven. | Validated |
| A no-login first result is important | NoteGPT is the low-friction benchmark; the competitor report recommends anonymous first value. | There is insufficient repeated evidence that login itself causes abandonment. Many students accept accounts for established tools. | Needs further validation |
| Students care about hidden paywalls and free allowances | Cross-year complaints about Quizlet and quota/refund complaints about NoteGPT show pricing and access friction. | Students seek free tools and object to hidden paywalls; the report explicitly distinguishes this validated adjacent pain from the unvalidated no-login hypothesis. | Validated |
| Multi-file input is necessary | Most major competitors support multiple sources, and the recommended exam blueprint assumes several files. | Students clearly work across slides, notes, review sheets, textbooks, and past questions, but the research does not prove that they require simultaneous multi-file upload in an MVP or will tolerate its complexity. | Partially validated |
| Users need an exam-preparation workflow rather than merely a study guide | Stronger competitors connect guides to quizzes, mastery, weak spots, or course-grounded workflows; static generation is commoditized. | The user-evidence chain runs from overload to prioritization to costly conversion to recall and verification. Students do not primarily lack another summary. | Validated |

### Validated Jobs-to-be-done, ranked by evidence strength

1. **Strong — Prioritization**  
   When I have more course material than I can fully review before an exam,  
   I want to know what I should study first and why,  
   so I can use my limited preparation time effectively.

2. **Strong — Reduce preparation overhead**  
   When my lecture slides and notes are too large to turn into usable revision material by hand,  
   I want to reduce the work required to organize them for study,  
   so I can spend more time actually learning and practicing.

3. **Strong — Recall rather than familiarity**  
   When rereading notes makes the material feel familiar but I cannot retrieve it unaided,  
   I want to test myself from memory and find my weak areas,  
   so I can recall and apply the material during the exam.

4. **Strong — Calibrate to the real assessment**  
   When I have legitimate past or sample questions,  
   I want to understand the expected question style, depth, timing, and my weak topics,  
   so I can practice at the right level without assuming old questions define the whole exam.

5. **Medium-Strong among AI users — Verify generated study material**  
   When I use AI to convert course material into study resources,  
   I want to check important output against my own sources and see uncertainty,  
   so I do not waste time studying omissions, unrelated content, or errors.

### Why prioritization is the core problem

**User evidence:** “Too much material and too little time” is the strongest pain, and inability to determine what matters is its most repeated decision bottleneck. Students already know how to make summaries and questions; the problem is deciding where scarce effort should go.

**Competitor state:** Generic summaries, key concepts, quizzes, and flashcards are widely available. Some competitors market exam preparation, but most begin with content generation or broad workspaces rather than an explainable, uncertainty-aware study order.

**Why this is the best wedge:** It addresses a Strong user pain, retains the exact `study guide maker` search intent by returning a guide, and avoids competing head-on with mature note-taking, spaced-repetition, grounded-research, and public-content ecosystems. It also produces a falsifiable MVP test: whether students change their study order and find the ranking credible.

## Alternatives considered

### Candidate direction scoring

All dimensions use 1–10. Higher is better except the two cost dimensions: **User understanding cost** and **Technical complexity**, where 1 is lowest and 10 is highest. Scores are comparative judgments derived only from the two existing reports, not new market evidence.

| Direction | User pain strength | Search intent fit | Differentiation | 2–4 week MVP feasibility | User understanding cost | SEO fit | Monetization potential | Technical complexity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. Generic AI Study Guide Maker | 4 | 10 | 2 | 9 | 1 | 10 | 4 | 3 |
| 2. Exam-focused Study Guide Maker | 8 | 9 | 6 | 8 | 1 | 9 | 7 | 4 |
| 3. Study Priority Planner | 9 | 6 | 8 | 7 | 4 | 6 | 7 | 5 |
| 4. Study Guide + Active Recall Generator | 8 | 9 | 5 | 6 | 2 | 9 | 7 | 6 |
| 5. Citation-first Study Guide | 6 | 8 | 7 | 6 | 3 | 8 | 6 | 6 |
| 6. Syllabus-weighted Exam Blueprint | 7 | 7 | 9 | 5 | 5 | 7 | 7 | 7 |
| 7. Priority-first Exam Study Guide | 9 | 9 | 8 | 7 | 2 | 9 | 8 | 6 |

**Recommended direction: 7. Priority-first Exam Study Guide.** It combines the strongest user pain with the familiar search category, while making priority ranking—not citation, syllabus weighting, or a broad feature suite—the clear differentiator.

## Why alternatives were rejected

- **Generic AI Study Guide Maker:** Excellent keyword fit and easy to build, but the output is commoditized and does not solve the strongest decision pain.
- **Exam-focused Study Guide Maker:** Directionally correct but still too broad; without a concrete priority mechanism it can collapse into generic summary plus quiz.
- **Study Priority Planner:** Solves the right pain but creates a category-understanding and SEO gap, and a plan alone forces the student to do another conversion step.
- **Study Guide + Active Recall Generator:** Strong supporting workflow, but questions and flashcards are already common. It risks making recall generation, not prioritization, the product story.
- **Citation-first Study Guide:** Useful as a trust layer for some users, but user evidence does not support citation as the mainstream core job or primary conversion reason.
- **Syllabus-weighted Exam Blueprint:** Differentiated but relies on a universal weighting rule contradicted by the user report. It also assumes students possess a useful syllabus type.

## Risks

1. **Priority credibility:** The product can cause harm if a confident ranking makes students skip examinable content. Rankings need reasons, uncertainty, and an explicit “not complete coverage” state.
2. **Signal conflict:** Review sheets, professor emphasis, learning objectives, and past questions may disagree. A universal hierarchy is unsupported.
3. **AI output quality:** Page links can verify claims but cannot prove complete processing; exhaustive coverage claims should not be made in the MVP.
4. **Scope pressure:** Multi-file parsing, citations, diagnostics, export, accounts, and payments can exceed a 2–4 week build if treated as a suite.
5. **Discipline variance:** Memorization-heavy, quantitative, and essay courses need different output structures and priority cues.
6. **Behavioral value:** Students may read the ranked guide passively without changing study behavior or completing the recall check.
7. **Commercial risk:** Search demand and competitor subscriptions do not prove willingness to pay for this specific wedge; students are price-sensitive and expect useful free access.
8. **Acquisition assumption:** Removing login may not improve conversion; surprise paywalls and opaque limits are better-supported problems.

## Open questions

1. Which ranking evidence makes students trust or reject a priority recommendation?
2. When signals conflict, should the product expose the conflict, ask the student to choose, or apply a course-specific rule?
3. Does the ranked guide measurably change study order, time allocation, confidence, or recall performance?
4. How many files and which source types are actually needed in the first successful session?
5. Do automatically generated questions trigger retrieval practice, or simply create another document to skim?
6. Which source-linked verification cues are used in practice, and which are noise during recall?
7. Is a complete free preview sufficient, or does mandatory login materially reduce activation?
8. Are legitimate, current past questions available often enough to influence product adoption?
9. Which initial course category gives the most consistent priority signals and study-guide structure?
10. What concrete free and paid usage units will feel predictable without a hidden result-stage paywall?
