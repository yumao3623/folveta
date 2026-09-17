# Folveta SEO v2 Architecture

Status: **Current project-specific SEO architecture**  
Last updated: 2026-09-18
Reusable standard: `docs/architecture/SEO_GUIDE.md`
Canonical production origin: `https://folveta.com`

Current evidence: [`../operations/technical-seo-2026-09-18.md`](../operations/technical-seo-2026-09-18.md). All nine approved public pages are published. Chrome GSC review on September 18 found the sitemap successfully read on September 17 with 9 discovered URLs; coverage still showed the September 14 snapshot (3 indexed). No manual actions or security issues were reported. Discovery, technical eligibility, and actual indexing are separate states. The September 2 cutover below is historical.

## 0. Public launch cutover record (2026-09-02)

Production `PRELAUNCH=false` is confirmed operationally by the live `index,follow` response on approved discovery pages. `/`, `/about`, `/privacy`, `/terms`, `/pricing`, `/refunds`, and `/contact` returned 200 responses with self-canonicals on `https://folveta.com` at launch. SEO Growth v1 adds the distinct task page `/study-guide-maker-from-pdf`; after its deployment the production sitemap contains eight intended-indexable URLs. Private, account, study, search, checkout, and billing workflow routes remain `noindex,nofollow` and are absent from the sitemap. `robots.txt` advertises the production sitemap. Search Console ownership and sitemap submission passed; indexing requests were submitted for `/`, `/pricing`, and `/about`.

## 1. Ownership decision

The homepage owns the primary transactional/mixed product intent **`Study Guide Maker`**.

- Primary category phrase: `Study Guide Maker`
- Brand: `Folveta`
- Capability descriptor: AI-assisted/source-grounded generation
- Primary user task: upload course materials and generate a Study Guide
- Secondary product loop: optional Quick Check that returns mistakes to Guide sections

`AI Study Guide Maker` may appear naturally as a supporting variation or capability explanation, but it must not replace the category owner in the title, H1, navigation label, product name, or architecture.

The current homepage title and first-viewport positioning now use `Study Guide Maker`. SEO Growth v1 additionally assigns `/study-guide-maker-from-pdf` to the narrower PDF task without changing homepage ownership. The current ownership map and measurement record live in `docs/operations/seo-growth-v1.md`.

## 2. Search intent

The target result must behave as a usable tool/product page:

1. Clearly identify the Study Guide Maker task.
2. Make upload/generation accessible immediately.
3. Explain supported inputs and the actual output.
4. Show a truthful example and constraints.
5. Establish trust around grounding, retention, privacy, limits, and pricing/account requirements.
6. Lead to a successful Guide rather than an article-only experience.

Do not turn the homepage into a generic workspace dashboard. Persistent workspace features support retention after the initial Study Guide Maker task.

## 3. Page ownership map

| Intent/query family | Canonical owner | Page type | Index after launch | Notes |
| --- | --- | --- | --- | --- |
| Study Guide Maker | `/` | Usable product/tool page | Yes | Primary owner; real upload near first viewport |
| Folveta brand | `/` | Brand/product homepage | Yes | Homepage also owns brand navigation intent |
| PDF to study guide | `/study-guide-maker-from-pdf` | Focused product task page | Yes | Live; preserve PDF-specific ownership |
| How to make a study guide | `/how-to-make-a-study-guide` | Practical instructional page | Yes | Published; steps, synthetic example, checklist; does not own Study Guide Maker |
| What Folveta does / product boundaries | `/about` | Trust/about page | Yes | Distinct trust intent; not keyword clone |
| Folveta privacy / data handling | `/privacy` | Legal/trust page | Yes | Must match Auth, model, storage, analytics, billing reality |
| Folveta terms | `/terms` | Legal page | Yes | Must match paid service and refund/cancellation reality |
| Folveta pricing | `/pricing` | Pricing/product page | Yes | Existing public Free/Pro offer |
| Demo Guide / Quick Check | `/study/demo...` | Product demonstration | No by default | Useful internal proof; retain `noindex` unless a later distinct-public-demo decision changes it |
| User Guides / Recent / Library | `/my-guides`, `/library` and private Guide routes | Private product pages | No | Never in sitemap |
| Knowledge search | `/search` | Private search results | No | Prevent crawl spaces and private excerpt leakage |
| Profile/account/Auth | `/profile`, `/account`, `/auth` | Private/account pages | No | Access control plus noindex |
| Checkout/success/cancel/failure/billing portal | `/billing/...` and billing actions | Private transaction pages | No | No sitemap or public schema owner |

No current justification exists for a Blog, Use Case hub, Tools hub, comparison/alternatives cluster, industry pages, template library, or pSEO system. A new page requires a distinct intent, real user value, stable canonical owner, useful content/product function, and maintenance owner.

## 4. Current implementation baseline

Implemented:

- The nine public pages are statically prerendered; the public HTML is identical for anonymous and authenticated requests.
- `PublicViewerProvider` retrieves verified identity and plan limits from `/api/viewer`. Signed-in Recent Guides load separately from `/api/guides?limit=4`. Both endpoints use `private, no-store`, `Vary: Cookie`, and `X-Robots-Tag: noindex, nofollow`, including errors.
- `proxy.ts` skips auth refresh only on the approved public paths; private APIs/app routes still validate and refresh sessions. No user data, cookie-based entitlement, or private Guide is embedded in the shared cache. Client state resets when a bfcache page or hidden tab becomes active again.
- Unique title, description, H1, canonical, Open Graph URL/type/site name/image, and Twitter metadata on all 9 pages. Production builds reject a missing or noncanonical `NEXT_PUBLIC_SITE_URL`; localhost fallback is restricted to nonpublic local use.
- Positive robots directives are assigned by `publicPageMetadata` to approved pages. Production root metadata does not add `index` to the framework's `noindex` 404 response. Preview/prelaunch fail closed; private and demo pages remain noindex.
- Homepage `WebSite`, `WebApplication`, and `WebPage` JSON-LD; supporting page and visible breadcrumb schema. Visible FAQs remain, without FAQPage rich-result claims.
- `robots.ts` advertises the production sitemap; `sitemap.ts` lists exactly 9 approved pages and no private/transaction routes.
- Supabase upload and Paddle checkout libraries load on the corresponding user action. Checkout revalidates the current user before opening. Quotas and payment authorization remain server-enforced.
- Unit, browser, and actual HTTP response tests cover the cache/privacy boundary, metadata, 404, redirect, sitemap, and robots. Run `npm run test:seo:responses` against a production build or production host.

Current operational boundaries:

- The active public offer remains Free / Pro at US$12 per month. This technical SEO pass does not repeat a real payment or alter billing enforcement.
- Privacy now documents retention cleanup and account deletion; completion of scheduled cleanup jobs is a separate operational check.
- Narrative illustrations use documented IRA Design source assets; public demo content is synthetic, without private student material.
- GSC verification/submission is complete, but Google has not yet reported all 9 pages as indexed. Real-user CWV has insufficient data; lab results do not establish a field pass.

## 5. On-page v2 requirements

Homepage:

- One H1 whose literal task/category is clear; supporting copy carries benefits and AI/source-grounding detail.
- Real upload task in the first viewport on mobile and desktop, or an immediate first-viewport action that reveals it without navigation confusion.
- Natural coverage of Study Guide Maker, PDF, PowerPoint/PPTX, course materials, structured Guide, source grounding, priorities, and optional Quick Check.
- Truthful input limits, account requirement, free/paid limits, retention, and result restrictions before expensive generation.
- Real example output and limitations; no ratings, user counts, guarantees, exam prediction, or fabricated proof.
- Useful FAQ only where answers reduce real task/trust friction.

Public trust pages must use Folveta consistently rather than generic unnamed `Study Guide Maker` as the operator/product identity.

## 6. Canonical and URL rules

- Preferred origin: `https://folveta.com` with no `www` unless deployment explicitly redirects and the decision changes.
- All public canonical, Open Graph, JSON-LD, sitemap, and robots sitemap URLs use that origin in production.
- HTTP and any alternate hostname permanently redirect to the preferred origin.
- Private IDs never appear in public sitemaps, structured data, share images, or discovery-page metadata.
- Unknown/missing private records return real 404 behavior and noindex.
- Do not change a launched canonical path casually; treat it as a migration.

## 7. Index policy by lifecycle

### Local and preview

- Preview deployments require access protection where possible.
- Preview discovery pages are noindex and omitted from production sitemaps.
- Preview must never point at production private course data.

### Production pre-launch

Preferred layered state:

1. Deployment/access protection for the whole test deployment.
2. The implemented server-only `PRELAUNCH` flag, whose missing or invalid value does not enable indexing.
3. If discovery pages are reachable for testing, their rendered metadata emits `noindex`; sitemap contains no discovery URLs.
4. Reachable noindex pages must not be blocked by robots before crawlers can read the directive. Access protection, not robots, provides privacy.
5. Private workspace/account/search/billing routes remain access-controlled and noindex.

### Public launch

- Explicitly set the approved indexing flag only after Phase 5 sign-off.
- Make only approved public canonical pages indexable and list only those pages in sitemap.
- Keep demo/private/account/search/checkout/portal/status routes `noindex,nofollow`.
- Verify the live result before submitting the sitemap or requesting indexing.

### Rollback

If launch metadata, billing, privacy, security, or core product behavior is materially wrong, restore protection/noindex as appropriate, correct the issue, and re-run the launch gate. Robots is not an emergency privacy boundary.

## 8. Robots and sitemap behavior

Pre-launch reachable site:

- Do not advertise discovery URLs in sitemap.
- Ensure discovery pages can return their noindex directive if not access-protected.
- Disallow API and non-crawlable private application spaces where appropriate, without treating robots as access control.

Launch site:

- Sitemap contains exactly 9 approved public URLs: `/`, `/about`, `/privacy`, `/terms`, `/pricing`, `/study-guide-maker-from-pdf`, `/how-to-make-a-study-guide`, `/refunds`, and `/contact`.
- Exclude demo, user Guide IDs, Quick Checks, results, account, search, checkout, success/cancel/failure, portal, APIs, previews, and noindex URLs.
- Do not emit fake `lastmod`; use a real material-update timestamp or omit it.

## 9. Structured data and social metadata

- Keep `WebApplication` only while the homepage visibly presents a usable web application.
- Use stable Folveta name/URL/description and match visible capability/limit facts.
- Keep FAQs visible where they help the task. Google retired FAQ rich results in May 2026; Folveta does not add FAQPage or promise a FAQ search enhancement.
- Add `Offer`/price data only after billing plans are real, public, and consistent.
- Never add aggregate ratings, reviews, authors, organization details, or availability claims that are not real.
- Social images should represent the actual product/output and remain readable when cropped.

## 10. Private and dynamic content

- Default every user-specific route and internal search result to noindex.
- Do not expose Guide/source titles or excerpts in public metadata for private pages.
- Never make a session URL indexable because it returns 200 for its owner.
- Public sharing is not in Product-3 scope. Any future public Guide sharing needs a separate privacy, moderation, canonical, quality, and indexability decision.

## 11. Image, mobile, accessibility, and CWV

- Prefer accurate Folveta UI/output images over decorative stock imagery.
- Use explicit dimensions/aspect ratio, responsive sizing, modern formats, and useful alt text.
- Keep primary explanatory content in HTML.
- Mobile and desktop must expose equivalent discovery content and metadata.
- Core mobile task must not be pushed below a long decorative hero.
- Targets: field p75 LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 where sufficient data exists.
- Lighthouse is diagnostic; production field data and task completion are the operating signals.

## 12. Trust, GEO, and AEO

- Publish extractable product facts, supported formats, limits, data handling, source boundary, and failure cases in visible HTML.
- Keep product name, domain, claims, dates, structured data, and legal pages consistent.
- Cite primary sources only where needed; do not manufacture citations or authorship.
- No special GEO page type or schema is required. Clear ownership, canonical facts, useful examples, and trustworthy mentions support both search and answer engines.

## 13. Pre-launch test matrix

Required automated and live checks:

- Both index modes: title/description/H1/canonical/robots/sitemap/JSON-LD.
- Public, demo, private, missing, Auth, search, and billing route classes.
- HTTP/HTTPS, alternate host, slash, redirect-chain, and status behavior.
- Rendered HTML for duplicate metadata/canonical and accidental noindex/index.
- Mobile content parity, keyboard/focus, alt text, dimensions, overflow, and structured headings.
- Rich Results Test, Schema Markup Validator, PageSpeed Insights, crawl check, OG/Twitter image requests.
- Search Console only after launch approval.

## 14. Post-launch operating cadence

- Daily during first week: uptime, errors, billing/webhooks, crawl/index anomalies, sitemap fetch, core conversions.
- Weekly during first month: queries, impressions/clicks/CTR, canonical/index coverage, CWV, landing activation, Guide completion, paid conversion, support issues.
- Monthly afterward: page ownership, intent mismatch, product facts, trust copy, links/mentions, stale screenshots, and privacy/terms accuracy.
- Add or remove pages based on distinct value and evidence, not a URL-count target.
