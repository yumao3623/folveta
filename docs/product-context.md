# Folveta Current Product Context

Status: **Current v5 context**  
Last updated: 2026-08-25  
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

The following exists in the current repository and passed build/typecheck/lint/tests on 2026-08-25:

- Next.js 16.3.2 App Router, React 19, TypeScript, Tailwind CSS 4.
- Folveta landing/upload experience with real PDF/PPTX input.
- Private Supabase Storage upload through signed upload URLs.
- Text-based PDF and PPTX parsing with page/slide boundaries, warnings, duplicate detection, hashes, and stable evidence spans.
- Structured multi-stage model pipeline for topic extraction, topic merge, Guide generation, grounding verification, and persisted Guide JSON.
- Study Guide workspace with priorities, concepts, definitions, processes/relationships, confusions, gaps, and source references.
- Lazy five-question MCQ Quick Check, independent validation/filtering, answer-safe taking payload, deterministic scoring, persisted results, and Guide return links.
- Anonymous high-entropy session cookie with a default seven-day expiry.
- About, Privacy, Terms, canonical metadata, social images, JSON-LD, robots, sitemap, and explicit study-route noindex rules.
- Synthetic demo Guide and Quick Check plus 23 automated tests across schema, parser, Quick Check, and SEO behavior.

Implemented UI milestones are UI-1 Study Guide Workspace, UI-2 Landing / Upload, and UI-4 Quick Check / Results. They are implementation baselines, not final visual sign-off.

## Actual limitations and missing launch capabilities

- No persistent user Auth or `user_id` ownership model.
- A single `sgm_session` cookie represents one anonymous session token; creating another session replaces browser access to the prior session.
- No My Guides, Recent Guides, real Library, knowledge search, Profile, reopen, rename, archive, delete, or multi-guide management.
- The visible Search, My Guides, Library, and Profile controls in the current workspace are placeholders, not implemented Product-3 features.
- No Payment/Billing, pricing model, entitlement ledger, checkout, subscription status, billing portal, webhooks, or usage enforcement.
- No scheduled deletion job for expired database rows and private Storage objects.
- No application rate limiting, abuse controls, analytics decision, real support/privacy-request channel, or production monitoring.
- No pasted-text input, OCR, handwriting, image/chart/diagram interpretation, audio/video/URL ingestion, or open-web research.
- No generation lease/checkpoint resume implementation despite those items appearing in the historical technical plan.
- No full browser E2E suite, Supabase integration test suite, webhook tests, Auth tests, billing tests, or production Core Web Vitals data.
- `NEXT_PUBLIC_SITE_URL` is not currently configured in `.env.local`; local metadata falls back to `http://localhost:3000`.
- The homepage still uses `AI Study Guide Maker` in its title and header label; SEO v2 must shift primary ownership to `Study Guide Maker`.
- Current robots/sitemap/public metadata do not implement a controlled pre-launch indexing mode.

## Current UI context

The Academic Editorial direction remains useful: Bricolage Grotesque headings, Geist UI/body type, paper-like surfaces, source-blue references, yellow study highlights, restrained borders, and a document-oriented workspace.

Current strengths:

- Consistent Folveta branding across current routes.
- Clear primary Guide hierarchy and source-grounding language.
- Lucide icon system already adopted consistently.
- Functional upload, parsing queue, Guide, Quick Check, and results states.
- No observed horizontal overflow at audited desktop/mobile viewports.

Current weaknesses:

- The palette reads as too uniformly green and low-contrast across large surfaces.
- Many controls and content regions are flat white/green rectangles with similar elevation and border treatment.
- Small labels, chips, buttons, and disabled/status states need a more deliberate component system.
- The landing transformation preview is code-drawn and generic rather than strong product evidence.
- Motion and feedback are limited mainly to hover transitions, spinners, pulse, and anchor highlighting.
- Mobile homepage places the upload workspace below the first viewport, weakening the core task.
- Mobile Guide hides the topic sidebar without an equivalent topic-navigation control.
- Placeholder workspace controls visually imply functionality that does not exist.

UI/UX Polish v2 must establish Folveta-owned tokens and reusable primitives before Product-3 pages multiply the current inconsistencies.

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

## Commercial target

Payment is a launch requirement, not yet an implementation choice. The product must define predictable free/paid value, usage units, limits, entitlement states, checkout and billing management, server-verified events, enforcement, recovery states, and billing/privacy/terms copy. Pricing must be visible before a student commits costly processing and must not introduce a surprise result-stage paywall.

## SEO and launch context

- `docs/SEO_GUIDE.md` is the reusable SEO standard.
- `docs/seo-architecture.md` is the Folveta-specific page ownership and indexing architecture.
- Do not create thin Blog, Use Case, Tools, comparison, or pSEO inventories.
- A public Pricing page exists only if the real billing product needs it.
- Production deployment for testing may precede launch, under deployment protection and/or fail-safe pre-launch noindex.
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
