# GSC recheck and SEO engineering — 2026-09-17

Status: **Production deployment verified; authenticated GSC follow-up and indexing actions completed.**
SEO code release reviewed: `main@e8c8d93`. Review uses Chrome and the canonical URL-prefix property `https://folveta.com/`.

## Production and GSC follow-up after publication

- SEO code commit `e8c8d935e8bac6a64d9def0d03c22a644649d8d1` was pushed to GitHub and its linked Vercel deployment completed successfully.
- All nine public sitemap URLs, `robots.txt`, and `sitemap.xml` returned `200` in production. The live sitemap contains nine `https://folveta.com` canonicals, including `/how-to-make-a-study-guide`; robots advertises that sitemap.
- The method page rendered its production title, index/follow directive, self-canonical, WebPage/Breadcrumb JSON-LD, internal links, and student illustration in Chrome.
- GSC still shows the September 14 coverage snapshot: 3 indexed and 38 excluded across all known pages; the sitemap filter remains 3 indexed and 5 excluded. This report has not incorporated the new ninth URL.
- The existing sitemap was resubmitted successfully on September 17. GSC now shows the submitted date as September 17, but its last read remains September 13 and its discovered count remains 8. The live file has 9 URLs, so this is a pending re-read rather than a sitemap-code discrepancy.
- The method page is discovered through the sitemap but not yet indexed. Its September 17 Live Test says it can be indexed and detects one valid Breadcrumb item. GSC now shows that indexing was requested.
- The PDF page is discovered but not yet indexed. Its September 17 Live Test says it can be indexed and detects one valid Breadcrumb item. GSC confirmed that it was added to the priority crawl queue.
- Terms still reflects Google's August 29 noindex crawl in the index report. Its September 17 Live Test says the current page can be indexed. A first submission returned a temporary GSC error; one later retry was accepted and GSC confirmed that the URL was added to the priority crawl queue.
- Ownership remains verified. Manual actions and security issues both show no detected problems. HTTPS remains 3 valid and 0 non-HTTPS in the September 11 report.
- Search performance remains sparse: 2 clicks, 12 impressions, 16.7% CTR, and average position 16.8 for August 30–September 14. The only exposed queries are `voluta` (2 impressions) and `volixta` (1); no Study Guide query is available yet. Homepage, About, and Pricing are the only pages with reported impressions.

An indexing request is a crawl-queue action, not evidence that Google has indexed or selected the URL as canonical.

## 1. Current evidence, separate from the September 2 launch record

| Check | Observed result | Evidence |
| --- | --- | --- |
| Property | Verified owner; HTML file verification successful | GSC Settings → Ownership verification; property added September 1 |
| Verification file | `200`, expected verification body | `https://folveta.com/google14a276efa04bb12e.html` |
| Sitemap | `/sitemap.xml`: Success; resubmitted September 17; last read September 13; 8 discovered pages pending re-read | Authenticated GSC Sitemaps |
| Live sitemap / robots | Both `200`; sitemap has 9 public URLs; robots advertises it | Direct production GET on September 17 |
| Index coverage | 3 indexed, 38 excluded; report last updated September 14 | GSC All known pages, refreshed after initial cached September 4 view |
| Sitemap coverage | 3 indexed, 5 excluded: 1 old noindex and 4 discovered, not indexed | GSC `/sitemap.xml` filter, September 14 data |
| Manual actions | No issues detected | Authenticated Manual actions report |
| Security issues | No issues detected | Authenticated Security issues report |
| Core Web Vitals | No field data shown | GSC overview; not a performance pass/fail |
| HTTPS | 3 HTTPS, 0 non-HTTPS pages shown | GSC overview |

GSC links: [Sitemaps](https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Ffolveta.com%2F), [Index coverage](https://search.google.com/search-console/index?resource_id=https%3A%2F%2Ffolveta.com%2F), [Manual actions](https://search.google.com/search-console/manual-actions?resource_id=https%3A%2F%2Ffolveta.com%2F), [Ownership](https://search.google.com/search-console/ownership?resource_id=https%3A%2F%2Ffolveta.com%2F).

### The nine intended public URLs

| URL | GSC indexed-state evidence | Current live evidence |
| --- | --- | --- |
| `/` | Indexed; last crawl September 3 | `200`, index/follow, self-canonical |
| `/about` | Indexed; last crawl September 2 | `200`, index/follow, self-canonical |
| `/pricing` | Indexed; last crawl September 2 | `200`, index/follow, self-canonical |
| `/terms` | Excluded by noindex from the August 29 crawl; indexing requested September 17 | Current HTML is index/follow; GSC Live Test says URL can be indexed |
| `/study-guide-maker-from-pdf` | Discovered, not indexed; no crawl reported; indexing requested September 17 | `200`, index/follow, self-canonical; Live Test says URL can be indexed and detects one valid Breadcrumb item |
| `/how-to-make-a-study-guide` | Discovered through the sitemap, not indexed; no crawl reported; indexing requested September 17 | `200`, index/follow, self-canonical; Live Test says URL can be indexed and detects one valid Breadcrumb item |
| `/contact` | Discovered, not indexed; no last crawl reported | `200`, index/follow, self-canonical; in live sitemap |
| `/privacy` | Discovered, not indexed; no last crawl reported | `200`, index/follow, self-canonical; in live sitemap |
| `/refunds` | Discovered, not indexed; no last crawl reported | `200`, index/follow, self-canonical; in live sitemap |

The PDF, method, and Terms requests are not interpreted as successful crawls or indexing. A successful Live Test demonstrates fetch/index eligibility at test time; it does not mean Google has indexed the URL. Terms does not currently need a code change to remove noindex.

### Historical URL inventory

The 32 “Crawled — currently not indexed” examples are from an earlier commerce site: `/product/...`, `/product-category/...`, `/product-tag/...`, `/shop/`, `/impressum/`, `/about-us/`, `/returns-exchanges/`, `/order-tracking/`, fashion/bicycle posts, `/contact/`, and `/?ecomus_builder=checkout-page`. Their listed crawl dates span March–July 2026. These are not 32 current Study Guide pages failing to index.

The separate 404 example is an old `/product/naipo-premium-massagesessel-.../` URL, last crawled August 27. Sample current checks for `/product/kid-warm-knit/`, `/shop/`, `/impressum/`, and `/about-us/` follow a trailing-slash 308 to a real 404. There is no relevant replacement for these product URLs, so they are not redirected to the Study Guide homepage. The old root query parameter returns the homepage and its root canonical.

HTTP and `www` permanently redirect to the apex HTTPS origin. An unknown path returns a real 404. The same verified GSC property was retained; no property, user, removal, or security setting changed. After publication, the sitemap was resubmitted and the URL Inspection actions are recorded above.

## 2. Search baseline and keyword ownership

GSC Web search, selected **28 days**, displayed chart data August 30–September 14 and “updated 7 hours ago” at inspection:

- Property totals: **2 clicks, 12 impressions, 16.7% CTR, average position 16.8**.
- Page rows: `/` 2 clicks / 12 impressions; `/about` 0 / 7; `/pricing` 0 / 6. Preserve the UI's separate totals and row values; do not sum the rows into a replacement property total.
- Visible query rows: `voluta` 0 clicks / 2 impressions; `volixta` 0 / 1. No Study Guide query appeared in the exposed rows. This is not evidence of zero search demand, nor a volume or keyword-difficulty estimate.

Current search-result review on September 17 distinguishes usable product pages for `study guide maker`, upload-task pages for `PDF to study guide`, and instructional pages for `how to make a study guide`. Examples inspected: [StudyFetch](https://www.studyfetch.com/study-guide-maker), [Quizgecko](https://quizgecko.com/pdf-to-study-guide), [Scholarly](https://scholarly.so/tools/study-guide-maker), and [MoreExams](https://moreexams.com/blog/how-to-make-a-study-guide). These show result types, not fixed Google rankings or demand estimates. Competitor claims are not copied into Folveta.

| Canonical owner | Primary intent / query | Supporting phrases | Concrete page value | Internal path |
| --- | --- | --- | --- | --- |
| `/` | Use a **Study Guide Maker** | study guide generator, AI study guide maker, study guide from notes/slides | Real upload, source-linked output, priorities and Quick Check; homepage remains the sole broad product owner | PDF, method, About, Pricing → upload |
| `/study-guide-maker-from-pdf` | **PDF to study guide** / study guide maker from PDF | readable PDF, PDF study guide generator, scanned PDF limitations | File preparation, plan limits, page-reference checking, unreadable-page handling | Method / home / About / Pricing → PDF → upload or example |
| `/how-to-make-a-study-guide` | **How to make a study guide** | what to include in a study guide, study guide example, review questions | Five steps, clearly labeled synthetic example, usable readiness checklist | Home / PDF / About / Pricing / footer → method → PDF, example, upload |
| `/about` | Folveta capabilities and trust | Folveta Study Guide Maker, source grounding, product boundaries | Who it helps, evidence limits, paths to method/PDF/pricing/privacy/support | Evaluation → suitable workflow |
| `/pricing` | Folveta pricing | Study Guide Maker pricing, Free vs Pro limits | Existing offer, visible limits, Free upload CTA, example before purchase | Evaluation → upload or existing checkout |

The user explicitly selected one practical method page on September 17. No additional format, blog, comparison, template-library, or programmatic page cluster is included.

## 3. Published implementation

- New method page with unique title/description/canonical and reciprocal contextual links.
- Expanded PDF page: readable-text check, limits, privacy link, verification steps, relevant FAQs, method link, and bottom upload CTA.
- Homepage H1 and title explicitly identify Study Guide Maker. About uses Folveta as the product identity. Pricing adds a Free upload path.
- Shared public metadata and safe JSON-LD serialization; stable WebSite/WebApplication IDs on the homepage; WebPage/AboutPage and visible BreadcrumbList on supporting pages.
- Explicit shared Open Graph/Twitter image references on edited public pages, preventing nested metadata from losing the existing social previews.
- Visible FAQs stay useful, but FAQPage JSON-LD is removed. Google retired FAQ rich results in May 2026 and removed their documentation in June: [official changelog](https://developers.google.com/search/updates#june-2026). No ratings, reviews, authors, offers, or rich-result guarantee is fabricated.
- New method page is live in the nine-URL production sitemap. Preview/prelaunch exclusion and private-route rules stay in place.
- Upload UI now receives the existing server-resolved plan file limit, fixing the hardcoded 5-file display/selection cap against Free 3 / Pro 10. Billing entitlements, quotas, prices, and enforcement are not changed.
- Production/public builds now require `NEXT_PUBLIC_SITE_URL` instead of silently emitting localhost canonical, JSON-LD, robots, or sitemap URLs. The homepage now explains the AI-assisted, uploaded-material-only boundary with its owned supporting phrases and links to Privacy and retention details beside the upload trust note.

The method page links to [UNC Learning Center's Studying 101](https://learningcenter.unc.edu/tips-and-tools/studying-101-study-smarter-not-harder/) as further reading on active and spaced study; the workflow and synthetic example are original Folveta content. No source handout was reproduced.

## 4. Verification and publication status

Verified September 17 against the local implementation:

| Check | Result |
| --- | --- |
| `npm run check` | Passed: lint, typecheck, unit/contract suite (231 passed, 11 gated tests skipped), workflow suite (3 passed), Next.js production build |
| Final SEO hardening | Targeted lint and SEO unit suite (10 tests) passed; production-mode build passed with 44 prerendered entries |
| Desktop/mobile browser suite | 23 passed, 3 intentional project/viewport skips; browser console/page error assertions passed |
| New conversion path | Method → PDF → expanded scanned-PDF FAQ → Pricing → Free CTA → upload; 4-file selection displays the Free 3-file limit and leaves submission disabled |
| Rendered production-mode SEO | All 9 public routes: `200`, one H1, one title, one description, one correct production canonical, index/follow |
| Metadata and structured data | Five edited landing pages have correct Open Graph URLs/images, Twitter images, parseable JSON-LD, and stable production IDs; both shared image routes return PNG/200 |
| Internal links | 113 rendered internal links/anchors on the five edited landing pages resolve to successful routes and existing target IDs |
| Discovery and privacy boundaries | Production-mode sitemap has exactly 9 approved URLs and robots advertises it; `/auth`, demo Guide, and demo Quick Check remain noindex/nofollow; private/API routes remain excluded |
| Chrome visual review | Desktop homepage and new method page; 400px responsive homepage, method steps, PDF page, and Pricing Free CTA reviewed |

The first browser run exposed an ambiguous test locator matching both the upload alert and Next.js's route announcer. The locator now targets the plan warning, and both viewport cases pass. The rendered metadata check exposed missing social images on supporting pages; explicit image references fixed it before the final successful checks.

The default local prelaunch build correctly emitted noindex/nofollow and an empty sitemap. For production-mode verification only, the build and local server used `PRELAUNCH=false VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://folveta.com`. No environment file or Vercel setting was changed. React review kept authentication and plan resolution on the server and passed only the numeric file cap into the upload client component.

No real course upload, paid checkout, provider generation, or authenticated Pro session was exercised in this SEO acceptance pass. The gated database/live-material checks were not enabled. Chrome showed a CSS preload timing warning; this was not a page error. No field Core Web Vitals pass is claimed. Production and GSC evidence is recorded at the top of this document.

Next checks:

1. Wait for GSC to re-read the nine-URL sitemap and update the September 14 coverage snapshot.
2. Compare like-for-like weekly GSC periods for non-brand discovery, page impressions, canonical selection, and all nine public URLs. No analytics/trackers are added in this task; conversion attribution remains unavailable.
3. External links and promotion remain a subsequent planning phase. The existing backlink tracker is retained; nothing was submitted, posted, emailed, purchased, or promised here.
