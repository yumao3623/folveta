# Folveta Current Product Context

Status: **Current v5 context**  
Last updated: 2026-08-26
Decision authority: `docs/decisions.md`  
Delivery roadmap: `docs/v5-master-roadmap.md`

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

`Upload PDF/PPTX -> parse by page/slide -> generate structured Study Guide -> optional five-question Quick Check -> return to relevant Guide sections`

The Guide is the primary artifact. Quick Check is optional and subordinate. Folveta does not claim exam prediction, complete coverage, mastery certification, professor-style simulation, or open-web supplementation.

## Actual implemented baseline

The following exists in the current repository and passed build/typecheck/lint/tests on 2026-08-26:

- Next.js 16.3.2 App Router, React 19, TypeScript, Tailwind CSS 4.
- Folveta landing/upload experience with real PDF/PPTX input.
- Private Supabase Storage upload through signed upload URLs.
- Text-based PDF and PPTX parsing with page/slide boundaries, warnings, duplicate detection, hashes, and stable evidence spans.
- Structured multi-stage model pipeline for topic extraction, topic merge, Guide generation, grounding verification, and persisted Guide JSON.
- Study Guide workspace with priorities, concepts, definitions, processes/relationships, confusions, gaps, and source references.
- Lazy five-question MCQ Quick Check, independent validation/filtering, answer-safe taking payload, deterministic scoring, persisted results, and Guide return links.
- Anonymous high-entropy session cookie with a default seven-day expiry, plus repository-level Supabase Auth, owner claim, and persistent Guide foundations from Product-3A.
- Account-owned My Guides and real Landing Recent Guides, with bounded pagination, source counts, stable-ID reopen, rename, archive/restore, and 30-day soft-delete staging from Product-3B.
- Account-owned Source Library with PDF/PPTX filtering, sorting, pagination, real source metadata, and archived/deleted Guide relationship handling from Product-3C.
- Private PostgreSQL full-text knowledge Search across active Guide titles/topics/content and Source filenames/spans, with Guide/Topic/Source result types and bounded pagination from Product-3C.
- A real Profile route with Supabase Auth email/creation date, owner-scoped Guide/Source totals, sign-out, and responsive Workspace navigation from Product-3C.
- About, Privacy, Terms, canonical metadata, social images, JSON-LD, robots, sitemap, explicit study-route noindex rules, and fail-closed pre-launch indexing control.
- Folveta favicon/app icon assets derived from the approved green Folveta wordmark without changing the in-page wordmark or Logo treatment.
- Synthetic demo Guide and Quick Check plus 71 automated tests across schema, parser, Quick Check, Auth/persistence, Guide management, Library/Search/Profile, SEO behavior, and UI foundation contracts.

Implemented UI milestones are UI-1 Study Guide Workspace, UI-2 Landing / Upload, and UI-4 Quick Check / Results. They are implementation baselines, not final visual sign-off.

## Actual limitations and missing launch capabilities

- The Product-3A Auth/ownership migration is applied in the configured Supabase dev project and the scoped two-user Auth/claim/RLS/persistence flow is verified. Real AI Guide generation in that E2E remains unverified because the configured external model gateway returned retryable Cloudflare 502 responses.
- Product-3B Guide management passed a real dev Supabase two-account fixture E2E for owner lists, recent order, pagination, reopen, rename, archive/restore, soft delete, Quick Check/Results continuity, cross-owner denial, sign-out, and relogin persistence. Its migration is formally applied in dev.
- The official Supabase CLI channel is linked to the dev project. Local and remote history match through `202608260005`; Product-3B/Product-3C indexes, GIN search indexes, authenticated Search RPC, and claim-RPC execute grants were verified against the deployed schema.
- Product-3C passed a real dev two-account/RLS/browser Gate covering Library, Search, Profile, workspace navigation, cross-owner page/API/direct-client denial, signed-out isolation, relogin persistence, query behavior, and regression paths. All temporary aggregates and Auth users were cleaned.
- A single `sgm_session` cookie represents one anonymous session token; creating another session replaces browser access to the prior session.
- Account deletion is deliberately unavailable rather than partially implemented. The required Storage-first, child-record/Auth cleanup, retry, retention, request-channel, and future billing-cancellation orchestration is deferred as a mandatory Payment/Production prerequisite; deleting only `auth.users` is not accepted.
- Payment, Pricing, final SEO v2, completed production deployment, and public indexing remain unimplemented.
- No Payment/Billing, pricing model, entitlement ledger, checkout, subscription status, billing portal, webhooks, or usage enforcement.
- A protected Storage-first retention endpoint exists, but no deployment scheduler has been configured or verified yet.
- No application rate limiting, abuse controls, analytics decision, real support/privacy-request channel, or production monitoring.
- No pasted-text input, OCR, handwriting, image/chart/diagram interpretation, audio/video/URL ingestion, or open-web research.
- No generation lease/checkpoint resume implementation despite those items appearing in the historical technical plan.
- No reusable automated browser suite, automated migration/RLS CI suite, webhook tests, billing tests, or production Core Web Vitals data. Product-3 now has a completed scoped dev two-account migration/RLS/browser Gate, backed by a deterministic fixture script; the external AI full chain remains outside that fixture.
- `PRELAUNCH` now fails closed: a missing value, `PRELAUNCH=true`, or any Vercel non-production environment makes discovery pages `noindex,nofollow`; the sitemap is empty and robots does not advertise it. Only an explicit production `PRELAUNCH=false` restores the approved public index mode.
- Full SEO v2 intent/page-ownership implementation remains pending, although the homepage title, visible capability label, and first-viewport positioning now use `Study Guide Maker` rather than `AI Study Guide Maker`.
- Vercel/GitHub import, production environment variables, Supabase Auth URLs, domain, TLS, redirects, and live browser behavior remain staged or unverified until the feature branch is approved for `main` and deployed.

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
- Product-3C Workspace navigation is implemented across My Guides, Library, Search, and Profile and passed desktop/390px browser QA. Full account deletion/recovery orchestration remains a Payment/Production prerequisite.

UI/UX Polish v2 must establish Folveta-owned tokens and reusable primitives before Product-3 pages multiply the current inconsistencies.

The Foundation v2 task completed the shared prerequisite on the `ui-polish-v2-foundation` branch. The `ui-polish-v2-pages` task then applied it to Landing/Upload, Study Guide, Quick Check, Results, parsing/generation states, and shared navigation. No dependency, schema, API, generation, scoring, ownership, or route change was introduced. `docs/ui-design-system.md` remains the current implementation policy.

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

Product-3A repository implementation uses Supabase Auth email/password, preserves anonymous access, atomically claims the current anonymous aggregate after authentication, derives child ownership through `preparation_sessions.owner_user_id`, keeps Guide IDs stable across regeneration, and adds lifecycle metadata plus owner RLS. Product-3B uses that foundation for My Guides, Recent Guides, reopen, rename, archive/restore, and soft delete. Product-3C adds Source Library, owner-RLS PostgreSQL Search, Profile, and the real Workspace navigation without adding a profile table, semantic search platform, or billing state. See `docs/auth-and-persistence.md`, `docs/guide-management.md`, and `docs/library-search-profile.md`.

## Commercial target

Payment is a launch requirement, not yet an implementation choice. The product must define predictable free/paid value, usage units, limits, entitlement states, checkout and billing management, server-verified events, enforcement, recovery states, and billing/privacy/terms copy. Pricing must be visible before a student commits costly processing and must not introduce a surprise result-stage paywall.

## SEO and launch context

- `docs/SEO_GUIDE.md` is the reusable SEO standard.
- `docs/seo-architecture.md` is the Folveta-specific page ownership and indexing architecture.
- Do not create thin Blog, Use Case, Tools, comparison, or pSEO inventories.
- A public Pricing page exists only if the real billing product needs it.
- Production deployment for testing may precede launch, under deployment protection and/or fail-safe pre-launch noindex.
- The current pre-launch configuration reuses the verified `study-guide-maker` Supabase project for localhost and Production while withholding its credentials from Vercel Preview. This is an explicit temporary testing constraint, not proof of full production/preview data isolation.
- Public canonical pages become indexable only after Product-3, billing, legal/privacy, quality, performance, security, and production gates pass.
- Private workspace, account, search, and billing workflow routes remain noindex after launch.

## Evidence and open questions

Research retained in `docs/user-pain-validation.md` and `docs/study-guide-maker-competitor-analysis.md` supports information overload, uncertain priority, costly material conversion, recall gaps, and distrust of opaque AI output. It does not prove willingness to pay, the best entitlement unit, or the value of every proposed workspace feature.

Open questions for staged validation:

1. Which Guide structures and priority explanations most improve real study behavior?
2. Which free allowance proves value without making model cost unsustainable?
3. Which paid unit is clearest: Guides, source pages/slides, monthly processing allowance, or a hybrid?
4. Should anonymous work be claimable after sign-up, and under what security/expiry rules?
5. What cross-guide search scope is valuable without requiring a premature vector platform?
6. Which UI changes improve clarity and trust rather than adding decoration?
7. Which public pages have enough distinct user value to deserve indexing after launch?
