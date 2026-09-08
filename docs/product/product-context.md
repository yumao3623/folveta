# Folveta Current Product Context

Status: **Current v5 context**  
Last updated: 2026-09-07
Decision authority: `docs/product/decisions.md`
Delivery roadmap: `docs/product/v5-master-roadmap.md`

## Product identity

- Brand: **Folveta**
- Canonical production origin: **`https://folveta.com`**
- Primary SEO ownership: **`Study Guide Maker`**
- Target market: US college students in lecture-heavy, exam-based courses
- Primary task: upload supported course materials and generate a clear, source-grounded, priority-aware Study Guide

`AI` is a capability descriptor. It does not replace `Study Guide Maker` as the category, primary query, or homepage task.

## Product promise

> Upload your course materials, get a clear Study Guide, and quickly check what you still need to review.

Core loop:

`Upload PDF/Word/Excel/PowerPoint/image -> parse into anchored source units -> generate structured Study Guide -> optional five-question Quick Check -> return to relevant Guide sections`

The Guide is the primary artifact. Quick Check is optional and subordinate. Folveta does not claim exam prediction, complete coverage, mastery certification, professor-style simulation, or open-web supplementation.

## Actual implemented baseline

The following exists in the current repository. The 2026-09-07 local repository check passed; Production-specific claims below retain their original verification dates and are not revalidated by that local check:

- Next.js 16.3.2 App Router, React 19, TypeScript, Tailwind CSS 4.
- Folveta landing/upload experience with real PDF, Office, and image input.
- Private Supabase Storage upload through signed upload URLs.
- PDF, DOCX, XLSX, and PPTX parsing with page/slide/paragraph/sheet boundaries, warnings, duplicate detection, hashes, and stable evidence spans. Legacy `.ppt` uses local slide-text extraction; common images and legacy binary `.doc/.xls` use constrained model/file-input extraction with a single anchor only when no local structural parser is available.
- Structured multi-stage model pipeline for topic extraction, topic merge, Guide generation, grounding verification, and persisted Guide JSON.
- Durable Vercel Workflow orchestration with Supabase-backed logical runs, operation CAS/fencing/leases, database-authorized retries, four-per-run/eight-global provider capacity, minute reconciliation, privacy-safe telemetry, and browser-independent continuation.
- A controlled Generation V2 path with separate request/artifact/terminal-Guide persistence, thin Workflow execution, dedicated billing admission/settlement, formal Generate/status/view/list integration, and runtime/product/allowlist write gates. Production V2 enablement and acceptance remain unverified.
- Study Guide workspace with priorities, concepts, definitions, processes/relationships, confusions, gaps, and source references.
- Lazy five-question MCQ Quick Check, independent validation/filtering, answer-safe taking payload, deterministic scoring, persisted results, and Guide return links.
- Anonymous high-entropy session cookie with a default seven-day expiry, plus Supabase email/password Auth, owner claim, password recovery/reset, persistent Guide ownership, and synchronous account deletion.
- Account-owned My Guides and real Landing Recent Guides, with bounded pagination, source counts, stable-ID reopen, rename, archive/restore, and 30-day soft-delete staging from Product-3B.
- Account-owned Source Library with multi-format filtering, sorting, pagination, real source metadata, and archived/deleted Guide relationship handling from Product-3C.
- Private PostgreSQL full-text knowledge Search across active Guide titles/topics/content and Source filenames/spans, with Guide/Topic/Source result types and bounded pagination from Product-3C.
- A real Profile route with Supabase Auth email/creation date, owner-scoped Guide/Source totals, sign-out, and responsive Workspace navigation from Product-3C.
- About, Privacy, Terms, canonical metadata, social images, JSON-LD, robots, an eight-route current sitemap definition, explicit study-route noindex rules, and fail-closed pre-launch indexing control.
- Folveta favicon/app icon assets derived from the approved green Folveta wordmark without changing the in-page wordmark or Logo treatment.
- Synthetic demo Guide and Quick Check plus 188 ordinary tests passing (10 skipped) and 3 Workflow tests passing in the 2026-09-07 local repository check, across schema, parser, Workflow durability, provider contracts, Quick Check, Auth/persistence, Guide management, Library/Search/Profile, billing, Generation V2, SEO behavior, environment handling, and UI foundation contracts.

Implemented UI milestones are UI-1 Study Guide Workspace, UI-2 Landing / Upload, and UI-4 Quick Check / Results. They are implementation baselines, not final visual sign-off.

## Actual limitations and missing launch capabilities

- Product-3 Auth/claim/RLS/persistence and the private workspace passed a fresh Production regression after the AI Workflow rollout; deterministic test aggregates and Auth users were removed afterward.
- Product-3B Guide management passed a real dev Supabase two-account fixture E2E for owner lists, recent order, pagination, reopen, rename, archive/restore, soft delete, Quick Check/Results continuity, cross-owner denial, sign-out, and relogin persistence. Its migration is formally applied in dev.
- The official Supabase CLI channel is linked to the Production project. Remote migration history is traceable through `20260830080742`, including the AI reliability, source-format, durable Workflow, remote-validation, Supabase reconciler, and Cron registration migrations.
- Product-3C passed a real dev two-account/RLS/browser Gate covering Library, Search, Profile, workspace navigation, cross-owner page/API/direct-client denial, signed-out isolation, relogin persistence, query behavior, and regression paths. All temporary aggregates and Auth users were cleaned.
- A single `sgm_session` cookie represents one anonymous session token; creating another session replaces browser access to the prior session.
- Account deletion runs synchronously through Storage, owned database sessions, and the Auth user. A valid Paddle Live subscription causes the request to be rejected; the flow does not automatically cancel the subscription. There is no persisted deletion request, retry, or audit state, and deleting only `auth.users` remains disallowed.
- Live Payment and the approved public offer are implemented and validated in Production: Free (2 successful Study Guides/month) and Folveta Pro (10 successful Study Guides/month at US$12/month), with server-enforced usage, Checkout, signed/idempotent webhooks, Customer Portal, cancellation scheduling, and refund handling. Sandbox and Live state remain environment-scoped.
- Public indexing cutover is complete for the approved discovery pages. Production `PRELAUNCH` is explicitly false; public pages return `index,follow`, while private routes remain `noindex,nofollow`.
- Protected Storage-first retention cleanup is READY. Distributed rate limiting and production monitoring are READY; analytics consent and any broader support/privacy operations remain separate policy work.
- No pasted-text input, handwriting interpretation, audio/video/URL ingestion, or open-web research. Common image files use constrained visual-text extraction; scanned PDF pages and image/chart/diagram-heavy units may remain visible grounding gaps.
- Production Guide generation is server-owned and durable. The rollout gate passed one Workflow smoke, three complete real-PDF runs, two complete legacy-PPT runs, Guide rendering/reload, Cron/reconciler, provider boundary, and Product-3 regression checks. See `docs/operations/ai-generation-workflow-rollout.md`.
- The five real-material samples all completed below five minutes, but the sample is too small to establish p95. Provider variability and the bounded at-least-once duplicate-call window remain operational risks.
- `PRELAUNCH` now fails closed: a missing value, `PRELAUNCH=true`, or any Vercel non-production environment makes discovery pages `noindex,nofollow`; the sitemap is empty and robots does not advertise it. Only an explicit production `PRELAUNCH=false` restores the approved public index mode.
- Additional SEO v2 content expansion remains pending, although the homepage title, visible capability label, and first-viewport positioning use `Study Guide Maker` rather than `AI Study Guide Maker`.
- Vercel/GitHub integration, Production environment variables, Supabase Auth URLs, DNS, TLS, redirects, launch metadata, and the core live browser workflow are deployed and verified on `main@6107dac`. A fresh same-browser sign-up produced `/signup 200`, `/verify 303`, `/token 200`, `/user 200`, returned to `https://folveta.com/profile`, and passed Auth/session/claim validation. The cross-device confirmation attempt remains historical evidence only and is not used as the passing path.

## Current UI context

The Academic Editorial direction remains useful: Bricolage Grotesque headings, Geist UI/body type, paper-like surfaces, source-blue references, yellow study highlights, restrained borders, and a document-oriented workspace.

Current strengths:

- Consistent Folveta branding across current routes.
- Clear primary Guide hierarchy and source-grounding language.
- Lucide icon system already adopted consistently.
- Functional upload, parsing queue, Guide, Quick Check, and results states.
- No observed horizontal overflow at audited desktop/mobile viewports.

Current page-polish baseline:

- Landing now leads with `Study Guide Maker`, a literal upload-to-Guide offer, and a product transformation preview built from representative Folveta Guide content rather than anonymous skeleton lines.
- Mobile Landing exposes the Upload Workspace heading and beginning of the real upload tool in the first viewport; the taller transformation preview follows the upload tool on small screens.
- Upload title, dropzone, selected-file queue, progress, ready/error feedback, privacy, limits, and continuation action use the shared foundation states without changing the upload/parsing contract.
- Study Guide now uses a quieter context header, elevated Study First surface, consistent concept cards, a real priority-order Study Path, compact evidence disclosures, friendly confusion treatment, and one consolidated context rail.
- Quick Check now provides one semantic heading in every state, source/topic context, clearer selected options, a mobile fixed Previous/Next or Submit action area, and an inline Study Note.
- Results now bring the score and Learning Loop into the mobile first viewport, use sampled-performance language rather than mastery claims, and make review actions prominent without turning the page into a game layer.
- Landing, Guide, Quick Check, and Results were visually checked at 390, 768, 1440, and 1600 widths with no observed horizontal overflow. Manual desktop/mobile screenshots cover each core page.

Remaining UI limitations:

- The transformation preview uses accurate synthetic demo content, not a captured real-user Guide or external illustration asset.
- Process/relationship data remains a list of grounded claims. The UI does not invent nodes, edges, or ordered steps; Study Path visualizes only the real topic priority order.
- Long Guide density still depends on generated topic count and claim length, and there is no automated browser visual-regression suite yet.
- Product-3C Workspace navigation is implemented across My Guides, Library, Search, and Profile and passed desktop/390px browser QA. Password recovery, account deletion, and generation billing are implemented.

UI/UX Polish v2 must establish Folveta-owned tokens and reusable primitives before Product-3 pages multiply the current inconsistencies.

The Foundation v2 task completed the shared prerequisite on the `ui-polish-v2-foundation` branch. The `ui-polish-v2-pages` task then applied it to Landing/Upload, Study Guide, Quick Check, Results, parsing/generation states, and shared navigation. No dependency, schema, API, generation, scoring, ownership, or route change was introduced. `docs/architecture/ui-design-system.md` remains the current implementation policy.

## UI reference resources

- GitHub reference: `https://github.com/nobruf/shadcn-landing-page`
  - Access confirmed on 2026-08-25.
  - MIT license.
  - Useful as a composition reference for navigation, mobile sheet, hero responsiveness, CTA/form treatment, feature sections, accordion, and footer.
  - Not directly compatible as a drop-in: it targets Next 14, React 18, Tailwind 3 and carries many dependencies not present in Folveta.
  - Testimonials, sponsors, team, community, contact, and pricing modules must not be copied without real Folveta content and product need.
- Theme reference: `https://zippystarter.com/tools/shadcn-ui-theme-generator`
  - Access confirmed on 2026-08-25.
  - Useful for studying token relationships and component states, not for mechanically copying a full theme.
  - Generated code/assets still require license and source review before adoption.
- Existing icon library: `lucide-react`. Keep one icon language unless a future explicit migration replaces it end to end.

## Product-3 target

Product-3 adds persistent identity and a real multi-guide workspace:

- Auth and account lifecycle.
- My Guides and Recent Guides.
- Library and cross-guide knowledge search.
- Profile.
- Reopen, rename, archive, restore, and delete.
- Ownership-safe migration/claiming of eligible anonymous sessions.
- Clear retention and deletion behavior.

It does not turn Folveta into a general note-taking platform, social network, LMS, flashcard suite, or public content marketplace.

Product-3A repository implementation uses Supabase Auth email/password, preserves anonymous access, atomically claims the current anonymous aggregate after authentication, derives child ownership through `preparation_sessions.owner_user_id`, keeps Guide IDs stable across regeneration, and adds lifecycle metadata plus owner RLS. Product-3B uses that foundation for My Guides, Recent Guides, reopen, rename, archive/restore, and soft delete. Product-3C adds Source Library, owner-RLS PostgreSQL Search, Profile, and the real Workspace navigation without adding a profile table, semantic search platform, or billing state. See `docs/architecture/auth-and-persistence.md`, `docs/architecture/guide-management.md`, and `docs/architecture/library-search-profile.md`.

## Commercial target

Paddle Billing v1 is validated in both the isolated Sandbox deployment and the Production Live deployment. The public offer is Free + Folveta Pro monthly at US$12/month. The user-facing unit is one successful Study Guide generation; Quick Check is included, and failed generation, Workflow retry/replay, and duplicate requests do not consume an extra unit. Free is `2` successful Guides/month and Pro is `10`.

Billing ownership is `auth.users.id`; Checkout, webhooks, subscriptions, entitlements, usage, and generation reservations are scoped by a server-derived `billing_environment`. Raw-card handling remains Paddle-hosted. Signature-verified, idempotent webhooks, rather than a checkout redirect, grant access. The Customer Portal manages the subscription. A scheduled end-of-period cancellation preserves Pro and its quota until the effective date.

Paddle Live merchant/KYC, website approval, payout setup, Live catalog, checkout, webhook, payment acceptance, subscription cancellation, and the US$12 refund flow were completed in the inherited onboarding task. Production `PRELAUNCH=false` is the explicit launch state; future commercial or policy changes require a new reviewed decision.

## SEO and launch context

- `docs/architecture/SEO_GUIDE.md` is the reusable SEO standard.
- `docs/architecture/seo-architecture.md` is the Folveta-specific page ownership and indexing architecture.
- Do not create thin Blog, Use Case, Tools, comparison, or pSEO inventories.
- A public Pricing page exists only if the real billing product needs it.
- Production deployment may precede launch, under deployment protection and/or fail-safe pre-launch noindex; the 2026-09-02 cutover moved the approved discovery pages into public index mode.
- The current pre-launch configuration reuses the verified `study-guide-maker` Supabase project for localhost and Production while withholding its credentials from Vercel Preview. This is an explicit temporary testing constraint, not proof of full production/preview data isolation.
- Public canonical pages became indexable after Product-3, billing, legal/privacy, quality, performance, security, and production gates passed. Google inclusion remains asynchronous and is not guaranteed by metadata alone.
- Private workspace, account, search, and billing workflow routes remain noindex after launch.

## Evidence and open questions

Research retained in `docs/research/user-pain-validation.md` and `docs/research/study-guide-maker-competitor-analysis.md` supports information overload, uncertain priority, costly material conversion, recall gaps, and distrust of opaque AI output. It does not prove willingness to pay, the best entitlement unit, or the value of every proposed workspace feature.

Open questions for staged validation:

1. Which Guide structures and priority explanations most improve real study behavior?
2. Which free allowance proves value without making model cost unsustainable?
3. Which paid unit is clearest: Guides, source pages/slides, monthly processing allowance, or a hybrid?
4. ~~Should anonymous work be claimable after sign-up, and under what security/expiry rules?~~ Resolved: atomic one-time anonymous claim after authentication is implemented.
5. What cross-guide search scope is valuable without requiring a premature vector platform?
6. Which UI changes improve clarity and trust rather than adding decoration?
7. Which public pages have enough distinct user value to deserve indexing after launch?
8. Which provider can the operator actually onboard and settle to in the intended country/entity/bank configuration?
