# Folveta SEO Growth v1

Status: **Active: first focused page published in code; external submissions pending owner action**
Started: 2026-09-02
Canonical production origin: `https://folveta.com`

This document is the operating record for the SEO growth phase following the public-launch indexing cutover. It is not a target-volume content calendar. The working model is:

`search-fit product + information gain + technical foundation + trust and operations`

## 1. Baseline

| Signal | Baseline | Source / interpretation |
| --- | --- | --- |
| Public, intended-indexable URLs | 7 before this change; 8 after the PDF page deploys | Production sitemap at launch; the new URL is in `app/sitemap.ts` |
| Sitemap | `/sitemap.xml` submitted and successfully read on 2026-09-02; 7 URLs discovered | Search Console sitemap report checked on 2026-09-02 |
| Ownership | Verified | Public launch record |
| Requested indexing | `/`, `/pricing`, `/about` | Public launch record |
| Search clicks | 0 | Search Console overview checked on 2026-09-02 |
| Index report | Processing data; expected in about one day | Search Console checked on 2026-09-02 |
| Experience / enhanced reports | No data yet | New site; not a quality conclusion |
| Product attribution baseline | Not available in-repo | The public Privacy page states that Folveta does not use GA4 or marketing analytics |

The site is new enough that a 24-hour or two-day ranking change is not a decision signal. Keep the initial baseline intact and compare like-for-like weekly periods once Search Console reports are populated.

## 2. Research record

Research was completed on 2026-09-02 using Google search results and the authenticated Search Console UI. Search results were personalized and location-inferred, so they establish intent and result type, not dependable volume or position estimates.

| Query / cluster | SERP pattern | User task | Folveta fit | Decision |
| --- | --- | --- | --- | --- |
| `study guide maker` | Usable product and tool pages from Flint, RemNote, Quizlet, Atlas, Scribe, Penseum, StudyFetch, and NoteGPT | Use a tool to create a guide | Core product fit | Homepage owns it uniquely |
| `study guide generator` | Same product-tool category | Find a product that makes a guide | Core product fit | Homepage supporting query; no new owner |
| `study guide maker from PDF` / `PDF to study guide` | Upload-oriented product pages; repeated emphasis on source PDF, concepts, definitions, priorities, practice, and checking accuracy | Turn a PDF into an organized study guide | Strong and distinct task fit | Publish one focused PDF task page |
| `study guide maker from lecture notes` | Close variation of tool pages | Organize notes into a guide | Current input support is broad, but there is no distinct notes-specific workflow | Homepage for now; observe before creating a page |
| `study guide maker from PowerPoint` | Related input-specific task | Create a guide from slides | Supported product capability but needs its own SERP/value review | Defer until the PDF page has crawl/impression data |
| `study guide template college students` | Design/download template pages from Canva, Airtable, Pinterest, and document-template sites | Download or copy a template | Mismatched with uploaded-material workflow | Do not create a template library |

### Information gain retained in the first task page

The PDF page is grounded in real Folveta behavior rather than generic SEO copy: readable-PDF intake, source evidence and visible gaps, priority bands, concepts/definitions/processes/relationships, common confusions, source page references, and the optional Quick Check review loop. It also states the product boundary for image-only pages, handwriting, charts, and diagrams.

## 3. Keyword-to-page ownership

| Query cluster | Dominant intent | Canonical URL | Page type | Funnel | Audience | Supporting queries | Internal sources | Internal destinations | Publication / index state | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Study Guide Maker | Transactional / mixed product discovery | `/` | Usable product homepage | Activation | Students organizing course materials | study guide generator, AI study guide maker, study guide maker from notes, study guide maker from lecture notes | Footer, About, Pricing, PDF page | Upload workspace, Pricing, product pages | Live; intended indexable | P0 |
| Study Guide Maker from PDF | Transactional / task-specific | `/study-guide-maker-from-pdf` | Product task page | Activation | Students with a readable course PDF | PDF to study guide, make a study guide from PDF, PDF study guide generator | Homepage PDF module, footer | Homepage upload, Pricing, About | Added in code; intended indexable after deploy | P1 |
| Folveta brand | Navigational | `/` | Homepage | Navigation / activation | Existing users and people who heard about Folveta | Folveta study guide maker | About, Pricing, footer | Homepage | Live; intended indexable | P1 |
| Folveta pricing | Commercial / transactional | `/pricing` | Pricing page | Conversion | Prospective users comparing limits | Folveta price, Study Guide Maker pricing | Homepage, PDF page, footer | Signup / checkout flow | Live; intended indexable | P1 |
| Folveta trust and boundaries | Informational / trust | `/about`, `/privacy`, `/terms`, `/refunds`, `/contact` | Trust pages | Evaluation / support | Prospective and existing users | Folveta privacy, refunds, contact | Footer, relevant product pages | Homepage, Pricing, support path | Live; intended indexable | P2 |

`Study Guide Maker` has one canonical owner: the homepage. The PDF route must stay specific to the uploaded-PDF task and link back to the homepage for the wider category. It must not take the core phrase as its H1 or primary title.

## 4. Page and internal-link decisions

### Publish now

- `/study-guide-maker-from-pdf`: a task page for an independently expressed upload intent, with a direct conversion path to `/#upload`.
- Homepage contextual link from its real PDF capability to the PDF task page.
- Footer discovery link to the PDF page.
- PDF page contextual links to the homepage, Pricing, and About.

### Explicitly deferred

- No blog, content hub, generic resources hub, templates library, comparisons, alternatives, or pSEO system.
- No PowerPoint/Word/Excel pages until separate SERP review and initial PDF crawl/index/impression observations establish that a distinct page will help users rather than fragmenting ownership.
- No lecture-notes page until there is a dedicated workflow or materially distinct evidence to show.

### Minimum hub -> cluster -> action path

`Homepage (Study Guide Maker) -> PDF task page -> /#upload`
`PDF task page -> Homepage / Pricing / About`
`Footer -> PDF task page, trust and pricing pages`

All anchors describe a real task or destination. The footer supports discovery but does not replace contextual links in page body copy.

## 5. Measurement and operating cadence

### First 24 hours after deploy

1. Inspect the production PDF route for `200`, self-canonical, index/follow, title, description, and a rendered upload CTA.
2. Confirm the new canonical URL is present in `sitemap.xml` and can be fetched without errors.
3. Watch production error and generation-failure monitoring; no changes to the already-stable payment, webhook, or AI workflow are in scope.
4. In Search Console, inspect URL indexing status for the new URL after natural discovery; request indexing only if the normal inspection workflow calls for it.

### First 7 days

1. Record indexed canonical URL count, page-level impressions/clicks, query discovery, position, crawl/index issues, and referring domains.
2. Separate brand from non-brand Search Console queries. Attribute a query to its ownership page before changing copy or adding pages.
3. Review organic product usage only where existing operational data makes it observable; do not invent analytics coverage.
4. Do not make ranking or content-expansion decisions from one or two days of data.

### Weekly thereafter

1. Compare the same trailing seven-day window for non-brand impressions, clicks, average position, indexed URLs, and page-level impressions.
2. Classify any discovered query as owned, supporting, or unowned. Add a page only when it has a distinct task, a likely useful page type, and Folveta-specific information gain.
3. Check new mentions and referral quality in the backlink tracker. Prefer a small number of relevant sources over volume targets.

## 6. Next page and link priorities

The next page candidate is **not approved yet**: a PowerPoint task page only after a separate SERP review plus early data from the PDF page. The next link effort is a small, relevant launch/discovery set documented in `docs/seo-growth-backlink-tracker.md`, followed by editorial resource-page discovery from student and study-productivity audiences.
