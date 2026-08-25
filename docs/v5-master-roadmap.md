# Folveta v5 Master Roadmap

Status: **Current roadmap**  
Last updated: 2026-08-26
Decision authority: `docs/decisions.md`  
Baseline audit: `docs/current-state-audit.md`

## Roadmap outcome

Folveta v5 turns the current anonymous, single-session Study Guide Maker into a launch-ready persistent workspace with coherent UI, real account ownership, billing and entitlement enforcement, project-specific SEO, protected production validation, and an explicit indexing cutover.

The roadmap deliberately does not restart the working upload, parsing, Guide, grounding, Quick Check, or SEO foundation. It closes launch-critical gaps around design consistency, identity, lifecycle management, commerce, privacy, indexing control, reliability, and monitoring.

## Ordering decision

The proposed Phase 0-6 order is retained with one refinement: design, SEO research, Product-3 schema design, and pre-launch infrastructure design may overlap, but implementation gates remain ordered.

| Dependency | Reason |
| --- | --- |
| Phase 0 before all implementation | Active documents and cleanup boundaries must stop old plans from steering new code |
| Phase 1 design foundation before Product-3 UI | New workspace pages should use stable Folveta tokens and primitives instead of multiplying current inconsistencies |
| Phase 2 before Phase 3 enforcement | Paid entitlements require a durable account/customer owner and multi-guide usage model |
| Phase 3 product decisions before final Phase 4 copy/schema | Pricing, limits, offers, and billing facts must be real before public SEO and structured data describe them |
| Phases 1-4 before Phase 5 exit | Pre-launch E2E and performance QA must test the release candidate, not a moving product |
| Phase 5 exit before Phase 6 indexing | Deployment alone is not approval to expose unfinished canonical pages to Google |

Safe parallel work:

- Phase 1 token/primitives work can overlap with Phase 2 schema/API design after Phase 0.
- Phase 4 search-intent research and page-ownership drafting can begin during Phases 2-3; final implementation waits for settled routes and commercial facts.
- Phase 5 deployment-protection design, test-harness design, and monitoring selection can begin during Phases 2-4.
- Within each phase, UI, API, migration, test, and copy tasks may run in parallel only after their shared contract is approved.

Must remain sequential:

- Anonymous-to-account ownership migration before multi-guide management is considered complete.
- Account/customer mapping before entitlement enforcement.
- Server-side billing event verification before paid access is granted.
- Privacy/Terms/billing copy after actual provider/data flow is known.
- Public indexing only after the launch checklist is signed off.

## Phase 0 — Master Audit, Documentation, and Project Cleanup

**Goal**

Create a trusted v5 baseline, eliminate planning ambiguity, and prepare a reversible cleanup that does not remove referenced code or historical evidence.

**Scope**

- Audit current routes, components, libraries, tests, migrations, environment contract, assets, UI references, and dependencies.
- Establish the v5 decision, product context, roadmap, technical architecture, SEO architecture, and documentation governance.
- Classify files A-I and produce delete/archive/merge candidates.
- Mark stale plans and implementation snapshots with explicit status banners.
- After separate user approval, perform only the approved cleanup and dependency removals.

**Out of scope**

- Product-3, billing, broad UI work, SEO v2 implementation, deployment, indexing, and unapproved deletion.

**Dependencies**

- Current repository and the latest explicit product decisions.

**Data/schema impact**

- None during audit/documentation. Cleanup must not change migrations or production data behavior.

**API impact**

- None.

**UI impact**

- None beyond documenting current placeholders and future requirements.

**SEO impact**

- Corrects ownership in planning; no runtime metadata/index changes in this phase.

**Security/privacy impact**

- Records unresolved cleanup, retention, access, and support-channel risks.

**Required tests**

- Before documentation-only close: existing test, typecheck, lint, and build baseline.
- After any approved deletion or dependency cleanup: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, plus reference scans.

**Exit criteria**

- Active source-of-truth files agree on Folveta, `https://folveta.com`, `Study Guide Maker`, Product-3, Payment, SEO v2, and pre-launch indexing control.
- Every old planning document has an explicit status.
- No file is deleted without approval.
- Cleanup candidates include evidence and post-cleanup verification requirements.

**Separate Codex task**

- Yes. The audit/documentation task is this task; approved physical cleanup should be a second, narrow task.

## Phase 1 — UI/UX Polish v2

Implementation status: **Phase 1 foundation and page-level polish complete on dedicated feature branches.** See `docs/ui-design-system.md`.

**Goal**

Turn the implemented UI baseline into a coherent, modern, accessible Folveta design foundation and polish the current Landing/Upload, Study Guide, Quick Check, and Results flows without changing their product logic.

**Scope**

- Define Folveta-owned semantic tokens for color, typography, spacing, radius, elevation, borders, focus, motion, and state feedback.
- Keep Bricolage Grotesque, Geist, Academic Editorial, source-blue evidence, and study-highlight concepts where they improve the product.
- Improve palette balance so large surfaces are not uniformly green; retain functional status colors and readable contrast.
- Establish reusable primitives for Button, IconButton, Input, Textarea, Select/Menu, Badge/Status, Tooltip, Tabs, Dialog/Sheet, Alert, Skeleton/Progress, Empty State, and Confirm Destructive Action.
- Polish upload/dropzone/queue, Guide hierarchy, source references, priority sections, Quick Check states, score/result blocks, small buttons, disabled/error/loading states, focus treatment, and reduced-motion behavior.
- Restore equivalent mobile navigation for Guide topics and core actions.
- Move the real upload task into or immediately adjacent to the mobile first viewport; do not let a decorative preview delay the primary job.
- Remove or clearly disable placeholder Product-3 controls until their real Phase 2 routes exist.
- Use real product output/screenshots or higher-quality license-cleared visual evidence where needed.
- Validate any component/library adoption against the current Next 16, React 19, Tailwind 4 docs and local conventions.

**Out of scope**

- Auth, My Guides, Library data, knowledge search, billing, new SEO hubs, or rewriting the generation pipeline.

**Dependencies**

- Phase 0 decisions and current route behavior.
- A short visual acceptance brief before implementation.

**Data/schema impact**

- None expected. Local presentation preferences must not become durable product data without a separate decision.

**API impact**

- None expected. Existing request/response contracts remain stable.

**UI impact**

- High across all current public and study surfaces.

**SEO impact**

- Preserve server-rendered discovery copy, heading semantics, upload visibility, canonical behavior, and mobile content parity.
- Do not change primary keyword ownership in this phase unless included as a small, separately reviewed SEO correction.

**Security/privacy impact**

- Destructive-looking controls must not be decorative.
- Tooltips/dialogs must not expose private source content in global overlays or logs.
- Motion must honor `prefers-reduced-motion`.

**Required tests**

- Component state tests for critical primitives and form controls.
- Existing unit tests and production build.
- Browser checks at representative mobile, tablet, desktop, and wide desktop sizes.
- Keyboard-only navigation, visible focus, screen-reader names, contrast, reduced motion, loading/error/empty/disabled states.
- Screenshot regression coverage for Landing, Upload queue, Guide, Quick Check ready/active, and Results.
- No horizontal overflow, overlap, content clipping, or layout shift caused by dynamic labels.

**Exit criteria**

- One documented token/primitives system is used across current surfaces.
- Lucide remains the single icon language or an approved full migration replaces it; no mixed icon patchwork.
- Core controls cover hover, active, focus, disabled, loading, success, warning, and error states.
- Mobile users can reach upload and navigate Guide topics efficiently.
- Placeholder workspace controls no longer imply working features.
- Accessibility and responsive visual QA pass without regression in current product behavior.

**Separate Codex task**

- Yes. Recommended split: 1A token/primitives audit and implementation; 1B Landing/Upload polish; 1C Guide/Quick Check/Results polish and responsive QA.

Phase 1A implementation record (2026-08-26): Folveta-owned semantic tokens and local primitives are implemented without a new dependency; Lucide remains the single icon language; fake Product-3 shell controls are removed; mobile topic navigation is present; component contract tests and reduced-motion rules are included. At the end of 1A, page-level polish and screenshot coverage remained separate work; the 1B/1C record below closes that scope.

Phase 1B/1C implementation record (2026-08-26): Landing/Upload, parsing/generation, Study Guide, Quick Check, and Results now use the foundation page composition rules. The Landing first viewport owns `Study Guide Maker`, mobile upload appears in the first viewport, representative product evidence replaces generic skeleton lines, Study First and Learning Loop have stronger hierarchy, source/warning states are lighter, and Quick Check has stable mobile actions plus a semantic heading in every state. Manual browser QA covered 390, 768, 1440, and 1600 widths, desktop/mobile screenshots for every core page, keyboard focus, reduced-motion rule presence, console output, control sizing, and horizontal overflow. No product logic, schema, API, route ownership, dependency, Product-3, or billing change was introduced.

### UI resource decision for Phase 1

| Area | Current state | v5 recommendation |
| --- | --- | --- |
| Icon library | `lucide-react` is used throughout | Keep and standardize sizes/strokes/containers; do not add a second icon library |
| Component library | No shadcn/Radix component layer; components are local Tailwind markup | Adopt only selected accessible primitives when they remove real state/behavior complexity |
| Existing components worth retaining | Upload workflow, Guide data sections, source reference disclosure, Assessment shell concept, Quick Check runner/result logic | Refactor presentation around them; preserve contracts and product logic |
| Missing components | Tooltip, menu/select, dialog/sheet, mobile topic navigator, destructive confirm, consistent toast/alert, skeleton/progress, empty state, account menu | Build/adopt selectively under one Folveta API and token layer |
| shadcn ecosystem candidates | Button variants, Sheet, Dialog/AlertDialog, DropdownMenu, Tabs, Tooltip, Select, Badge, input/form patterns | Verify current shadcn instructions, Tailwind 4 output, Radix licenses, and bundle impact before adoption |
| GitHub template references | Responsive navbar/mobile sheet, CTA/form composition, FAQ accordion, feature/benefit layout, footer rhythm | Reference structure only; do not import the full app or irrelevant social-proof/pricing sections |
| Visual assets | Current code-drawn transformation preview and UI examples | Prefer accurate Folveta output/screenshots; commission/generate or license any additional bitmap/illustration assets explicitly |
| Animation | CSS transitions, spinner, pulse, target fade | Start with CSS and reduced-motion rules; consider a maintained MIT utility only for interactions CSS cannot express cleanly |
| Replace candidates | Fake Search/My Guides/Library/Profile interactions; generic transformation mockup; inconsistent pill/button/status treatments | Remove, disable honestly, or replace with real Phase 2 behavior and polished primitives |

Dependency/license constraints:

- The reference template is MIT but targets Next 14 / React 18 / Tailwind 3 and includes many unnecessary dependencies; no bulk package copy.
- shadcn-generated components inherit licenses from their component sources; record copied component source/version and retain required notices.
- The ZippyStarter theme page is a design reference; do not assume all generated assets or third-party components share one license.
- A new animation or illustration library requires explicit bundle, maintenance, accessibility, SSR, and license review.

## Phase 2 — Product-3 Workspace, Auth, and Persistence

**Goal**

Replace the one-cookie/one-session limitation and visual placeholders with durable account identity, multi-guide ownership, real workspace management, and privacy-safe search.

**Scope**

- Product requirements and threat model for sign-up, sign-in, sign-out, verification/recovery, session refresh, account deletion, and anonymous conversion.
- Supabase Auth integration unless a separate architecture decision replaces it.
- Ownership model for profiles, guides/workspaces, sources, attempts, and future billing customer links.
- Safe claim flow for an eligible anonymous session after authentication; never claim by guessable guide ID alone.
- My Guides, Recent Guides, Library, Profile, reopen, rename, archive, restore, and delete.
- Knowledge search over the signed-in user's own guides/sources with an explicitly bounded first implementation.
- Pagination, empty/loading/error states, mobile workspace navigation, and stale/expired-content behavior.
- Actual deletion/retention jobs and user-visible deletion semantics.

**Out of scope**

- Teams/classes, public sharing, collaboration, LMS, public library/UGC, advanced semantic knowledge graph, social/community, and payment integration.

**Dependencies**

- Phase 0 architecture decisions.
- Phase 1 token/primitives foundation for new UI.
- Approved identity provider, account lifecycle, anonymous-claim policy, retention policy, and search scope.

**Data/schema impact**

- Add profiles/account metadata keyed to the identity provider user ID.
- Add durable owner references and lifecycle fields such as `archived_at`, `deleted_at`, and normalized display title where approved.
- Decide whether `preparation_sessions` remains the guide container or becomes a generation/work unit behind a durable Guide record.
- Add indexes for owner/recent/archive/search access patterns.
- Add deletion job/audit metadata and explicit cascade behavior.
- Migrate existing anonymous rows without weakening current token ownership.

**API impact**

- Auth callbacks/session handling.
- Guide list/detail/reopen/rename/archive/restore/delete APIs or Server Actions.
- Profile APIs.
- Search endpoint with owner enforcement, pagination, limits, and safe excerpts.
- Anonymous-claim endpoint with one-time verification and idempotency.

**UI impact**

- Real app shell, My Guides, Recent Guides, Library, Search, Profile, account states, confirmations, and recovery/expired states.

**SEO impact**

- All account, workspace, user search, profile, and user content routes remain `noindex`; exclude them from sitemap and public structured data.
- Public homepage remains the Study Guide Maker owner and cannot become a dashboard-first page.

**Security/privacy impact**

- Owner checks on every query and object path; service-role use remains server-only.
- RLS strategy must be explicit even if server-mediated access continues.
- CSRF/origin, session fixation, token rotation, enumeration, IDOR, rate limit, audit logging, account deletion, and storage cleanup reviews.
- Search must never cross users or leak private excerpts into logs/metadata.

**Required tests**

- Auth lifecycle and protected-route integration tests.
- Anonymous claim success, replay, wrong-user, expired-token, and concurrent-claim tests.
- Owner isolation/IDOR tests for every guide/source/attempt/search mutation and read.
- Rename/archive/restore/delete/reopen and cascade/cleanup tests.
- Pagination/search correctness and injection/abuse limits.
- Full browser flows across desktop/mobile, including refresh and multi-device account access.

**Exit criteria**

- A user can create/authenticate an account, own multiple Guides, find/reopen/manage them, and safely claim eligible anonymous work.
- Fake workspace controls are replaced by real routes and states.
- Cross-user access tests fail closed.
- Expired/deleted content and Storage objects follow documented retention behavior.
- Private routes are noindex and absent from sitemap.

**Separate Codex task**

- Yes. Recommended split: 2A identity/schema threat model; 2B Auth and anonymous claim; 2C guide management; 2D Library/search/Profile; 2E security/privacy/E2E hardening.

## Phase 3 — Payment and Billing

**Goal**

Introduce a truthful, server-verified commercial model with predictable limits and durable entitlements, without surprise paywalls or provider-coupled product logic.

**Scope**

- Decide pricing model, currency/region assumptions, free allowance, paid plans, entitlement units, grace/recovery behavior, cancellation, refunds/support policy, and student-facing copy.
- Evaluate providers only after requirements are approved.
- Customer/account mapping, checkout, success/cancel/failure handling, payment/subscription status, billing management, webhook/event processing, idempotency, reconciliation, and server-side verification.
- Usage metering and enforcement at the expensive server action, not only in the UI.
- Pre-generation disclosure of relevant limits and current entitlement.
- Privacy, Terms, billing, refund/cancellation, tax/invoice, and support/contact review appropriate to the chosen provider and operating entity.

**Out of scope**

- Multiple speculative plans, enterprise sales, team billing, marketplace payouts, affiliate systems, or a public Pricing page before the real offer is approved.

**Dependencies**

- Phase 2 persistent account identity and ownership.
- Cost data from actual Guide/Quick Check generation.
- Legal/operator/support decisions and provider evaluation.

**Data/schema impact**

- Provider-independent customer, plan/price reference, entitlement, usage ledger, billing status, and processed-event records.
- Unique provider event IDs and idempotency constraints.
- Keep raw sensitive payment data out of Folveta; store provider references and required status only.

**API impact**

- Checkout session creation.
- Verified webhook endpoint.
- Billing portal/management session creation.
- Entitlement/status endpoint and server-side quota checks.
- Reconciliation/admin-safe operational tooling as needed.

**UI impact**

- Pricing/limit disclosure, upgrade entry, checkout handoff, success/cancel/failure, billing status, manage/cancel flows, quota states, grace/past-due states, and support path.

**SEO impact**

- Checkout, success, cancel, failure, portal, invoice, and account billing routes are noindex.
- A canonical public Pricing page is optional and created only if the implemented offer has stable, useful public information.
- Structured data must not publish invented prices, offers, ratings, or availability.

**Security/privacy impact**

- Verify webhook signatures against the raw request and tolerate replay through idempotency.
- Never grant access from client redirects or unverified client status.
- Separate provider secrets by environment; least privilege and secret rotation.
- Audit event retention, support access, taxes/receipts, privacy disclosure, and account deletion interactions.

**Required tests**

- Provider sandbox/contract tests for success, cancel, failure, renewal, upgrade/downgrade, cancellation, past due, refund, dispute, delayed/out-of-order/duplicate events.
- Webhook signature, replay, malformed payload, unknown customer, and idempotency tests.
- Entitlement race/concurrency and server-side enforcement tests.
- Browser E2E for free limit, upgrade, successful return, failed/cancelled return, manage billing, and expired entitlement.

**Exit criteria**

- Approved pricing and entitlement specification exists.
- Paid access is granted/revoked only from trusted server state.
- Duplicate/out-of-order events do not corrupt entitlement.
- Usage limits are visible before generation and enforced server-side.
- Billing management and failure recovery work; legal/privacy/support copy matches reality.

**Separate Codex task**

- Yes. Recommended split: 3A commercial requirements/provider evaluation; 3B schema/entitlement engine; 3C checkout/webhooks/management; 3D UI/legal/test hardening.

## Phase 4 — SEO v2 Implementation

**Goal**

Make `https://folveta.com` the canonical, technically sound owner of the `Study Guide Maker` intent while keeping private/product workflow routes out of search.

**Scope**

- Revalidate live search intent and maintain a query-to-page ownership map.
- Shift homepage title, H1/supporting copy, navigation labels, and structured data to primary `Study Guide Maker` ownership; use AI only as a capability descriptor.
- Re-audit on-page content, canonical, robots, sitemap, JSON-LD, social metadata, image SEO, internal links, 404/redirects, mobile, accessibility, CWV, trust, GEO/AEO, and route-level index policy.
- Add a pricing owner only if Phase 3 creates a stable public offer.
- Add real product visuals/examples where they materially increase trust and information gain.
- Implement fail-safe environment-aware pre-launch index behavior.

**Out of scope**

- Thin Blog, Use Case, Tools, comparison, alternative, template, industry, or pSEO inventories without validated distinct value.
- Fabricated authors, users, ratings, reviews, claims, prices, FAQs, or company facts.

**Dependencies**

- Stable Phase 2 public/private route map.
- Stable Phase 3 pricing/offer facts for any pricing content.
- `docs/SEO_GUIDE.md` and `docs/seo-architecture.md`.

**Data/schema impact**

- Usually none. Any metadata/page registry should remain code-owned and minimal; no content CMS is required by default.

**API impact**

- Robots and sitemap behavior may become environment-aware.
- Optional health/verification output only if needed for deployment checks.

**UI impact**

- Homepage messaging and content hierarchy, public trust pages, product examples, footer/internal links, and optional real Pricing page.

**SEO impact**

- High; this is the implementation phase for search ownership and technical correctness.

**Security/privacy impact**

- Never expose private guide content, search results, user/account data, checkout state, or session identifiers in metadata, JSON-LD, sitemaps, logs, or public examples.
- Pre-launch protection is access control/index control, not robots-only privacy.

**Required tests**

- Metadata/canonical/robots/sitemap/index matrix tests for launch and pre-launch modes.
- Rendered HTML checks for one H1, duplicate metadata/canonical, JSON-LD-visible content parity, private-route noindex, and correct status codes.
- Mobile parity, accessibility, internal-link, image-alt/dimension, OG image, Rich Results/Schema validator, crawl, redirect, and performance checks.

**Exit criteria**

- Homepage clearly owns `Study Guide Maker` in visible content and metadata.
- Canonical origin is `https://folveta.com` in the production environment.
- Pre-launch mode fails closed; launch mode contains only approved public canonical URLs.
- Private/account/search/billing routes remain noindex and absent from sitemap.
- No low-value pages were created for coverage alone.

**Separate Codex task**

- Yes. Recommended split: 4A intent/page ownership; 4B on-page/public trust content; 4C technical SEO and index-mode tests; 4D production validation.

## Phase 5 — Production Pre-launch Deployment, Full E2E, and Performance QA

**Goal**

Run the complete release candidate on `https://folveta.com` under controlled access/indexing and prove product, billing, privacy, security, accessibility, reliability, and performance before public discovery.

**Scope**

- Protected production deployment and isolated production data configuration.
- Deployment protection and fail-safe pre-launch noindex verification.
- Domain/TLS/host/redirect/canonical checks.
- Full E2E from anonymous upload through Auth/claim, multi-guide management, Quick Check, entitlement/checkout, billing management, deletion, and recovery.
- Scheduled cleanup, backups/recovery, abuse/rate limits, observability, support channel, incident/runbook, privacy/terms/billing review.
- Mobile/desktop accessibility and performance, production error/timeout/retry behavior, cross-browser smoke tests, and model-quality release set.

**Out of scope**

- Public indexing, broad traffic acquisition, and unreviewed feature expansion.

**Dependencies**

- Release-candidate exits from Phases 1-4.
- Production secrets, domain, provider environments, support/legal decisions, and test accounts.

**Data/schema impact**

- Production migrations, cleanup schedules, backup/recovery verification, retention checks, and operational records.

**API impact**

- Production endpoint/security verification; no new API unless a failed release gate requires it.

**UI impact**

- Fix-only stabilization, complete error/recovery/support states, and performance/accessibility corrections.

**SEO impact**

- Public discovery pages remain noindex or access-protected throughout the phase.
- Validate production canonicals/robots/sitemap/schema without requesting indexing.

**Security/privacy impact**

- Formal threat review, secret/environment isolation, IDOR/CSRF/rate-limit checks, webhook security, deletion/retention proof, least-privilege review, and no sensitive data in logs/analytics.

**Required tests**

- Full automated browser E2E on release deployment.
- API/integration/contract/migration tests against isolated production-like services.
- Billing sandbox event matrix.
- Security regression, accessibility audit, visual regression, cross-browser smoke, load/concurrency/timeout tests, CWV/Lighthouse diagnostics, and cleanup job proof.

**Exit criteria**

- All required CI and production smoke tests pass.
- Protected/noindex production behavior is independently verified.
- No P0/P1 defects; accepted lower risks have owners and dates.
- Cleanup, account deletion, billing state, support, privacy, terms, monitoring, and rollback are operational.
- Launch owner explicitly approves the indexing cutover.

**Separate Codex task**

- Yes. Recommended split: 5A protected deployment/config; 5B E2E and integration suite; 5C security/privacy/billing QA; 5D performance/accessibility/cross-browser; 5E launch readiness review.

## Phase 6 — Public Launch, Google Indexing, and Monitoring

**Goal**

Make approved public canonical pages discoverable, submit them for indexing, and operate Folveta with measurable product/search health and a rollback path.

**Scope**

- Explicitly disable pre-launch protection/noindex for approved discovery pages only.
- Verify live robots, sitemap, canonical, metadata, structured data, status codes, redirects, and private-route noindex after cutover.
- Verify Search Console, submit sitemap, inspect/request indexing for approved pages, and monitor crawl/index coverage.
- Monitor uptime/errors, generation completion, billing/webhooks, abuse, deletion jobs, CWV, qualified non-brand search, activation, conversion, and support issues.
- Run post-launch review and correct indexing/product regressions without expanding content blindly.

**Out of scope**

- Automatic Blog/pSEO expansion, ranking promises, or bypassing failed launch gates.

**Dependencies**

- Explicit Phase 5 sign-off and launch owner authorization.

**Data/schema impact**

- Operational metrics/events only as approved by privacy/consent decisions.

**API impact**

- No planned feature APIs; monitoring and incident fixes only.

**UI impact**

- Launch-state messaging and urgent production corrections only.

**SEO impact**

- Public homepage/trust pages and any approved Pricing page become indexable.
- Private routes remain noindex permanently.

**Security/privacy impact**

- Monitor abuse, access anomalies, webhook failures, data requests/deletion, and third-party telemetry compliance.

**Required tests**

- Immediate post-cutover smoke suite.
- Live URL/header/rendered metadata checks.
- Search Console URL inspection and sitemap validation.
- Ongoing synthetic uptime, critical-flow, billing-event, cleanup-job, and CWV monitoring.

**Exit criteria**

- Approved public pages are crawlable/indexable with correct canonicals and sitemap membership.
- Private/account/search/billing workflow pages remain excluded.
- Production, billing, cleanup, and support monitoring are active with owners and alert paths.
- A 24-hour and 7-day review records issues, metrics, and next decisions.

**Separate Codex task**

- Yes. Use a tightly scoped launch task with explicit indexing authorization, followed by a separate monitoring/review task.

## Recommended Codex task sequence

1. `v5-cleanup-execution` — only after approving `docs/current-state-audit.md` candidates.
2. `ui-polish-v2-foundation` — tokens, primitives, license/compatibility decision, visual acceptance fixtures.
3. `ui-polish-v2-core-surfaces` — Landing/Upload then Guide/Quick Check/Results.
4. `product3-identity-schema-threat-model`.
5. `product3-auth-anonymous-claim`.
6. `product3-guide-management`.
7. `product3-library-search-profile`.
8. `product3-security-e2e`.
9. `billing-requirements-provider-evaluation`.
10. `billing-entitlements-schema`.
11. `billing-checkout-webhooks-management`.
12. `billing-legal-ui-e2e`.
13. `seo-v2-intent-page-ownership`.
14. `seo-v2-onpage-technical-index-control`.
15. `protected-production-deployment`.
16. `release-e2e-security-performance-qa`.
17. `public-launch-indexing-cutover`.
18. `post-launch-monitoring-review`.

Each task must reread `AGENTS.md`, the relevant Next.js 16 documentation under `node_modules/next/dist/docs/`, and the active governance documents before editing code.
