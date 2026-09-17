# Technical SEO completion — September 18, 2026

Scope: the first three follow-up priorities — public-page caching, mobile rendering performance, and remaining technical SEO consistency. Content expansion, analytics instrumentation, backlinks, and promotion are separate work.

## Released implementation

Cache/SEO revision: `ed8e61062cfec2b49c9edd1f517d92136d6ac146`. Final runtime revision, including hero preload/paint: `0f45732bfc0e35f2d1d43b45063f3182b1b060ba`. GitHub `main` was confirmed with `git ls-remote`; the [final runtime Vercel deployment](https://vercel.com/creen-ai/folveta/FwbftEfT5ahirmjgzYDJkY3QZwxm) reported success. Production response and browser checks passed against `https://folveta.com`. A subsequent docs/test-only synchronization does not change the runtime measured here.

- All 9 approved public pages now prerender without reading cookies or resolving a user during HTML generation. They are served from Vercel's static cache. A follow-up production request returned `x-vercel-cache: HIT`, `x-nextjs-prerender: 1`, and `Cache-Control: public, max-age=0, must-revalidate`.
- Login navigation and upload limits load from `/api/viewer`; signed-in Recent Guides load from `/api/guides?limit=4`. The server still verifies identity and resolves entitlements. Both APIs are private/no-store and noindex, including error responses. Public HTML never contains an email, a private Guide, or personalized quotas.
- Returning from bfcache or a hidden tab clears the old viewer before revalidation. Recent Guide requests abort on account changes; results are keyed to the verified user. Uploads stay disabled while identity/limits are unavailable; failed loads expose a retry.
- Supabase's upload SDK loads on upload submission. Paddle's SDK and external script load on subscription intent, with a fresh identity check before opening checkout. Anonymous public visits do not load either action library or private Guide-management code.
- Primary/hover/active green and faint text were darkened to address the reported small-label contrast failure. Account controls reserve their width during loading. Source Sans 3 and the established illustration/layout system are preserved.
- Primary hero artwork is preloaded from the document head and appears without an entrance fade; below-fold illustrations stay lazy. Workflow and control animations remain. Shared CSS stays separately cacheable: a local inline-CSS experiment doubled the combined compressed first-load budget, so it was not shipped.
- Production root metadata no longer adds `index, follow` to unknown-page 404 responses. Approved pages explicitly define their own robots policy. Privacy, Terms, Refunds, and Contact now share the complete Open Graph/Twitter helper.
- `NEXT_PUBLIC_SITE_URL` must resolve exactly to `https://folveta.com` in Vercel Production. Wrong hosts, HTTP, credentials, paths, queries, and fragments fail the build. Preview/local behavior remains isolated and fail-closed for indexing.

## Verification

| Check | Result |
| --- | --- |
| Lint / TypeScript | Passed |
| Unit and contract tests | 253 passed; 11 existing live/database-gated skips |
| Workflow suite | 3 passed |
| Production-mode Next.js build | Passed; all 9 public routes marked static |
| Desktop/mobile browser suite | 33 passed; 3 intentional viewport/project skips |
| Production public/demo and viewer browser checks | 18 cases passed across the initial run and targeted rerun; private identities and Paddle remain mocked |
| Private viewer browser cases | Loading/error/retry, Pro-to-Free downgrade, account switch, navigation geometry, anonymous checkout, delayed checkout SDK, fresh checkout identity passed with mocked APIs/CDN |
| Chrome visual review | Desktop homepage; 390px homepage, primary CTA → upload, Pricing cards and subscription button; no clipped controls or horizontal overflow observed |
| Local production HTTP regression | Passed for all 9 public pages, with and without a synthetic auth cookie |
| Production HTTP regression | Passed for all 9 public pages, with and without a synthetic auth cookie |
| Metadata | Unique title/description/H1/canonical; exactly one `index, follow`; full page-specific social metadata and parseable JSON-LD where used |
| Exclusion and redirects | Missing URLs return 404/noindex without `index`; trailing slash redirects; anonymous Guide API returns 401/no-store; HTTP and `www` return 308 to matching HTTPS apex paths |
| Discovery | Sitemap returns exactly 9 approved production URLs; robots advertises it and excludes API/private study spaces |

The browser suite validates private-state transitions using fixtures and intercepts Paddle's external script. This pass did not create real uploads, generation jobs, purchases, or production test accounts. It does not claim a fresh paid-Pro transaction or a full real-user Auth acceptance run.

The first production browser run exposed a test timing assumption: Playwright's `setInputFiles` can populate a disabled hidden input before the viewer API resolves, while a user cannot open that picker. The two affected viewport cases now wait for the input to be enabled, then test the Free 3-file rejection. Both pass against production. The same wait was added to the upload queue regression.

Reproduce the HTTP regression:

```sh
PRELAUNCH=false VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://folveta.com npm run build
PRELAUNCH=false VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://folveta.com npm run start -- --hostname 127.0.0.1 --port 3122
# In another terminal:
npm run test:seo:responses
SEO_BASE_URL=https://folveta.com npm run test:seo:responses
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3122 npm run test:browser
```

No environment file, Vercel secret, database schema, billing price, quota, or generation switch was changed.

## Performance evidence

Baseline [PageSpeed report](https://pagespeed.web.dev/analysis/https-folveta-com/tgfb0219qa?form_factor=mobile), captured September 18 at 00:25 China time:

| Device | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 94 | 97 | 100 | 100 | 0.9s | 3.0s | 60ms | 0 |
| Desktop | 100 | 97 | 100 | 100 | 0.2s | 0.5s | 0ms | 0 |

The original mobile LCP element was the homepage H1; rendering, rather than a large image transfer, was the primary delay. The contrast failure identified the small “Your workspace” label using the primary green.

The [first post-deployment run](https://pagespeed.web.dev/analysis/https-folveta-com/00zq8aic6f?form_factor=mobile), 01:32, reported mobile 91 / accessibility 100 / best practices 96 / SEO 100, LCP 2.8s, TBT 30ms, CLS 0.034, and unused JavaScript down from 152 KiB to 24 KiB. It also recorded `ERR_TIMED_OUT` on a supporting SVG; the desktop audit recorded failed font/CSS/JS connections and was not a clean page-load measurement. Direct requests returned 200. This run was not accepted as the final performance gate; hero preload/paint changes and a new complete-load run follow.

Final [PageSpeed report](https://pagespeed.web.dev/analysis/https-folveta-com/i8t7uw78vb?form_factor=mobile), captured September 18 at 01:39 China time, against runtime `0f45732`:

| Device | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 99 | 100 | 100 | 100 | 0.9s | 2.1s | 0ms (rounded) | 0 | 1.9s |
| Desktop | 100 | 100 | 100 | 100 | 0.2s | 0.5s | 10ms | 0 | 0.7s |

Both final audits completed without the console resource-load failures. The mobile LCP target of 2.5s is met in this lab run. Unused JavaScript is approximately 25 KiB, down from the baseline 152 KiB; remaining framework/polyfill and CSS diagnostics are not treated as blockers solely to chase a score. Scores vary with conditions and are not real-user p75. GSC/CrUX still has insufficient field data, so no field Core Web Vitals pass is claimed.

## GSC state and remaining work

Authenticated Chrome review earlier on September 18: canonical property `https://folveta.com/` accessible; sitemap success, last read September 17, 9 discovered pages; coverage still dated September 14 with 3 indexed and 38 exclusions, largely historical commerce URLs. No manual actions or security issues. Mobile and desktop Core Web Vitals reports have insufficient real-user data.

Terms, PDF, and method-page indexing requests were accepted September 17. The method page is published. Do not treat submission, crawl eligibility, or a lab score as proof of indexing or field CWV success. The remaining work is to observe GSC's new coverage/canonical/query data, measure real user journeys under an approved analytics/privacy model, and plan content/outreach from those signals. This release does not set up recurring monitoring or resubmit unchanged URLs.
