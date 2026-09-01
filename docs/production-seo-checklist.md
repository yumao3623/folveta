# Folveta Production Pre-launch, Launch, and SEO Checklist

Status: **Active operational checklist; AI Workflow gate passed; public launch gates remain open**
Canonical target: `https://folveta.com`  
Architecture: `docs/seo-architecture.md`

Do not mark local assumptions as production verification. Protected deployment is allowed before this checklist is complete; public indexing is not.

## Scoped Production pre-launch Gate (2026-08-27)

The scoped pre-launch infrastructure gate first passed on GitHub `main@2dcc4d9`, deployed Ready in Vercel Production. Live evidence covers `folveta.com` domain/TLS/redirects, anonymous session persistence and cookie behavior, same-browser Auth email confirmation/PKCE (`/signup 200`, `/verify 303`, `/token 200`, `/user 200`), anonymous claim, sign-in/refresh/sign-out/relogin, My Guides, Recent Guides, Library, Search, Profile, Guide reopen, Quick Check, persisted Results, and public/private noindex safety. The empty pre-launch sitemap and robots behavior remain intentional. The AI reliability blocker that was open in that original record is closed by the later Workflow rollout update below; public launch, Live billing, deletion, retention, monitoring, rate-limit, privacy operations, SEO v2, and indexing cutover gates remain separate.

AI Workflow rollout update (2026-08-31): Production `main@613dbeb` is `READY`; the provider boundary probe, Workflow smoke, real PDF x3, legacy PPT x2, Supabase minute reconciler, Auth/claim, and Product-3 regression passed. `AI_GENERATION_WORKFLOW_ENABLED=true`, `PRELAUNCH=true`, and the temporary provider probe is absent. This closes the AI Workflow blocker only; it does not close Payment, retention/account deletion, monitoring, rate limiting, support/privacy, SEO v2, or public indexing.

## A. Before protected production testing

- [x] Confirm `https://folveta.com` is the selected non-`www` canonical origin and document the intended `www` -> apex redirect.
- [x] Set `NEXT_PUBLIC_SITE_URL=https://folveta.com` in Vercel Production and verify the live canonical origin.
- [ ] Isolate production Supabase, Storage, model, Auth, and billing sandbox/live environments from previews.
- [ ] Enable deployment/access protection where feasible.
- [x] Implement and automate-test a fail-safe `PRELAUNCH` index mode whose missing/invalid production value does not enable indexing.
- [x] In reachable pre-launch mode, verify public discovery pages emit `noindex` and the sitemap advertises no discovery URLs.
- [x] Keep private/account/search/billing routes access-controlled and `noindex` in every mode.
- [x] Verify no preview/localhost origin appears in production canonical, OG, JSON-LD, robots, or sitemap output.
- [x] Document rollback for protection/index-mode configuration.

## B. Product and commercial launch gates

- [x] Product-3 Auth/account ownership and multi-guide management pass their exit criteria.
- [x] My Guides, Recent Guides, Library, Search, Profile, reopen, rename, archive/restore, and delete are real or removed from launch UI.
- [ ] Production Live billing: the public offer is visible (Free: 2 successful Study Guides/month; Folveta Pro: US$12/month for 10), but Live merchant approval, catalog, checkout, webhook, and entitlement enforcement are not enabled.
- [ ] Checkout, verified billing events, subscription/payment status, billing management, success/cancel/failure, and server-side entitlement enforcement work.
- [ ] Duplicate/out-of-order billing events are idempotent and cannot grant incorrect access.
- [x] Public `/pricing`, `/refunds`, and `/contact` pages exist and are reachable; the paid offer must not be treated as purchasable until Live billing is enabled.
- [ ] No hidden result-stage paywall or undisclosed quota remains.

## C. Privacy, security, and operations gates

- [ ] Implement and verify scheduled deletion of expired session/account/Guide data and private Storage objects.
- [ ] Verify user Guide deletion and account deletion semantics, including restore/purge behavior.
- [x] Publish the real support and privacy-request contact channel: `yumao3623@gmail.com`.
- [ ] Review Privacy and Terms against actual hosting, Auth, model, storage, retention, analytics, billing, support, refunds/cancellation, and operating-entity facts.
- [ ] Verify service-role/provider secrets are server-only and environment-scoped.
- [ ] Complete IDOR/owner-isolation, CSRF/origin, rate-limit/abuse, session/token, webhook-signature, and sensitive-log reviews.
- [ ] Verify backups/recovery, incident owner, alert paths, and rollback.
- [ ] Do not add session recording/advertising/analytics without an explicit privacy and consent decision.

## D. Full release-candidate verification

- [x] `npm test` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes.
- [x] `npm run build` passes.
- [x] Full browser E2E passes for anonymous upload -> Guide -> Quick Check -> return.
- [x] Auth/anonymous claim/multi-guide/reopen/rename/archive/delete/search/Profile E2E passes.
- [ ] Free limit/upgrade/checkout/success/cancel/failure/billing-management/entitlement E2E passes.
- [ ] Cleanup and deletion jobs are observed completing against safe production-like fixtures.
- [ ] Model-quality release set passes Guide grounding/coverage and MCQ key/mapping gates.
- [ ] Mobile/desktop visual regression, keyboard, screen-reader names, focus, contrast, reduced motion, and cross-browser smoke checks pass.

## E. Domain and URL behavior

- [x] Production TLS certificate is valid.
- [x] HTTP permanently redirects to matching HTTPS.
- [x] `www` permanently redirects to non-`www` without a chain.
- [ ] Trailing-slash/case policy is consistent.
- [x] No canonical loops, cross-host canonicals, or preview/localhost canonicals.
- [x] `/`, `/about`, `/privacy`, `/terms`, `/pricing`, `/refunds`, and `/contact` return `200 text/html` with self-canonicals in pre-launch Production.
- [ ] Unknown URLs return real 404 behavior.
- [x] Private missing/expired/unauthorized records fail closed and do not leak existence.

## F. On-page ownership and public trust

- [ ] Homepage title/H1/supporting content clearly own `Study Guide Maker`; AI remains a capability descriptor.
- [ ] The real upload task is visible/reachable in the first mobile and desktop viewport.
- [ ] Visible formats, limits, account/payment requirements, retention, and source boundaries match runtime behavior.
- [ ] Real product examples/screenshots contain no private data and use useful alt text/dimensions.
- [ ] No fabricated users, ratings, reviews, guarantees, prices, authors, claims, or FAQ answers.
- [ ] No thin Blog, Use Case, Tools, comparison, template, or pSEO pages were added merely for coverage.

## G. Metadata, social, and structured data

- [ ] Every approved public canonical page has one unique title, description, H1, and self-canonical.
- [ ] Open Graph/Twitter metadata uses the production origin and correct page URL.
- [ ] Generated/share images return `200`, render externally, and represent the actual page/product.
- [ ] JSON-LD matches visible content and stable Folveta facts.
- [ ] No offer/price/rating/review/organization property is invented.
- [ ] Schema Markup Validator passes applicable pages.
- [ ] Google Rich Results Test is reviewed without assuming eligibility guarantees display.

## H. Robots, sitemap, and index modes

### Protected/pre-launch mode

- [x] Access protection is active and/or reachable discovery pages emit `noindex`.
- [x] Reachable noindex pages are not blocked from receiving the directive solely by robots.
- [x] Sitemap contains no pages intended to remain pre-launch noindex.
- [x] `/api/` and private application spaces follow the approved crawl policy.

### Launch mode

- [ ] `https://folveta.com/robots.txt` returns `200 text/plain` and references the production sitemap.
- [ ] `https://folveta.com/sitemap.xml` returns `200 application/xml`.
- [ ] Sitemap contains only approved canonical/indexable/200 pages: `/`, `/about`, `/privacy`, `/terms`, `/pricing`, `/refunds`, and `/contact` after final commercial approval.
- [ ] No demo, session ID, Guide, Quick Check, result, account, search, checkout, status, billing portal, API, preview, or localhost URL appears.
- [x] `/study/demo` and its Quick Check remain permanently `noindex,nofollow`.
- [ ] Valid private routes remain `noindex, nofollow` and access-controlled.
- [ ] Every sitemap URL matches its canonical and intended index state.

## I. Performance, mobile, and crawl health

- [ ] PageSpeed Insights mobile/desktop is recorded for public page templates.
- [ ] Lighthouse performance/accessibility/best-practices/SEO findings are reviewed as diagnostics.
- [ ] No horizontal overflow, overlap, clipped labels, unstable fixed UI, or hidden primary content on representative devices.
- [ ] LCP media/font/CSS and third-party scripts are optimized.
- [ ] A field plan exists for p75 LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- [ ] CDN/cache does not serve stale metadata, robots, sitemap, index mode, or social images.
- [ ] Logs/monitoring can identify crawler 4xx/5xx, redirect, timeout, and origin failures without storing private content.

## J. Explicit launch cutover

- [ ] Phase 5 has written sign-off with no open P0/P1 issue.
- [ ] Launch owner explicitly authorizes public indexing.
- [ ] Change only the approved access/index configuration; do not bundle unrelated feature work.
- [ ] Immediately verify live `/`, trust pages, optional Pricing, robots, sitemap, canonical, JSON-LD, OG images, redirects, 404, and private noindex.
- [ ] Run the critical product/Auth/billing smoke suite after cutover.
- [ ] Keep a tested rollback path.

## K. Search Console and post-launch monitoring

- [x] Verify the canonical URL-prefix property `https://folveta.com/` in Google Search Console using the deployed HTML verification file (2026-09-01). The property is verified; Google is still initializing data.
- [ ] Submit the production sitemap only after live cutover verification.
- [ ] Inspect/request indexing for approved public pages only.
- [ ] Monitor index coverage, crawl errors, impressions, clicks, CTR, queries, average position, and canonical selection.
- [ ] Confirm actual indexing; local metadata correctness does not prove inclusion.
- [ ] Monitor upload start/success, Guide success/failure, Quick Check loop, account conversion, entitlement/checkout, paid conversion, webhook failures, cleanup failures, and support signals under the approved privacy model.
- [ ] Complete 24-hour and 7-day launch reviews with owners for every issue.
- [ ] Re-run this checklist after material domain, routing, framework, billing, localization, or public-page changes.
