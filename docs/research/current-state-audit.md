# Folveta v5 Current State and Cleanup Audit

Status: **Historical repository snapshot from 2026-08-25; cleanup execution completed 2026-08-26. Do not use its implementation or open-work lists as current state.**

Audit date: 2026-08-25

Cleanup date: 2026-08-26

Repository: `C:\Users\毛彧\Documents\ChatGPT\study guide maker`

The original audit made no file or dependency changes. The separately approved archive and dependency cleanup was executed on 2026-08-26 and is recorded in section 11.

## 1. Audit method

Reviewed:

- All named product, UX, technical, SEO, implementation, validation, and competitor/research documents.
- All source paths under `app/`, `components/`, `lib/`, `tests/`, `supabase/migrations/`, and `scripts/`.
- `package.json`, lockfile top-level dependency tree, `.env.example`, non-secret environment-contract presence, configuration files, and `public/`.
- Import/reference scans and old-brand/route/product-language scans.
- Current desktop/mobile rendering of `/`, `/study/demo`, Quick Check ready/active, and demo Results.
- Public GitHub UI reference metadata/package/license/tree and ZippyStarter URL availability.
- Current test, typecheck, lint, and production build.

At audit time, the repository had no commits on `main` and all files were untracked. The approved cleanup task resolved this risk by creating the baseline commit recorded in section 11 before making any cleanup changes.

## 2. Verification result

| Check | Result |
| --- | --- |
| `npm test` | Passed: 4 files, 23 tests |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with no reported errors/warnings |
| `npm run build` | Passed with Next.js 16.3.2; 14 static/dynamic page outputs plus APIs |
| Desktop visual | Core pages rendered; no horizontal overflow observed |
| Mobile visual | No horizontal overflow observed; task/navigation issues documented below |

Automated coverage is focused, not comprehensive: parser, schemas, Quick Check validation/scoring, and SEO metadata/index rules. It does not cover Auth, multi-guide persistence, Storage/Postgres integration, full generation E2E, browser E2E, cleanup, billing, or production behavior.

## 3. Current product audit

### Verified implemented

- Folveta brand in current UI and site helper.
- Real landing upload for PDF, Word, Excel, PowerPoint (including legacy binary `.ppt/.doc/.xls`), and common image files, with five-file, 25 MB/file, 150-unit, and 300,000-character limits.
- Private signed upload, deterministic validation/hash/duplicate checks, PDF/DOCX/XLSX/PPTX page/slide/paragraph/sheet parsing, local legacy `.ppt` slide-text extraction, controlled Responses file-input extraction for legacy `.doc/.xls` where no local structural parser is available, image text extraction, stable spans, and Postgres persistence.
- Structured Guide generation with source evidence resolution and grounding verification.
- Rich Guide schema/UI and direct source excerpts.
- Optional five-question MCQ Quick Check, key-safe taking payload, deterministic scoring, persisted result, and return-to-Guide links.
- Anonymous high-entropy cookie ownership and seven-day access expiry.
- About/Privacy/Terms, canonical/social/JSON-LD, robots, sitemap, and private-route noindex.
- Synthetic demo/fixtures and current focused unit/contract tests.

### Verified not implemented

- Persistent Auth/account identity.
- More than one accessible anonymous session per browser cookie.
- My Guides, Recent Guides, Library, knowledge search, Profile, reopen, rename, archive/restore, delete, and multi-guide ownership.
- Payment/Billing, pricing, entitlements, usage meter/enforcement, checkout, webhooks, billing management, and billing legal copy.
- Scheduled deletion of expired database rows/private objects.
- Rate limiting/abuse prevention, analytics decision/instrumentation, support/privacy contact, production monitoring.
- Pasted text, source roles, source remove/replace/retry, advanced OCR/handwriting and visual-only chart/diagram interpretation, source viewing/download URLs.
- Durable generation lease/checkpoint/resume, queue/worker, and full integration/E2E suite.
- Production origin configuration and controlled pre-launch indexing mode.

## 4. UI/UX Polish v2 audit

### Current libraries

- Tailwind CSS 4 with local CSS variables and direct utility composition.
- `lucide-react` 1.34.0 (ISC license) as the current icon system.
- No shadcn registry/components, Radix primitives, CVA, `clsx`, `tailwind-merge`, headless dialog/menu/select library, animation library, or illustration library.

### Worth retaining

- Bricolage/Geist type pairing and document-oriented Academic Editorial direction.
- Existing semantic product structures and working flow logic in `UploadPanel`, `GuideWorkspace`, `QuickCheckRunner`, and `QuickCheckResultView`.
- Source-reference disclosure pattern, priority grouping, visible uncertainty, and Learning Loop.
- Lucide as the single icon language.
- Keyboard-focus foundation and current restrained transitions.

### Missing or inconsistent component types

- Shared Button/IconButton variants and size rules.
- Tooltip for unfamiliar icon-only controls.
- Accessible menu/select/dropdown and account menu.
- Dialog/Sheet/AlertDialog for mobile navigation and destructive confirmations.
- Shared Badge/Status/Alert/Toast patterns.
- Consistent Skeleton/Progress/empty/error/retry states.
- Mobile topic navigator and workspace navigation.
- Real account/billing/entitlement state components in later phases.

### Visual findings

- Large surfaces are dominated by pale green/white, so content levels often have insufficient visual separation.
- Cards, pills, chips, inputs, and buttons use many locally invented treatments without a centralized variant system.
- Icon containers repeat geometric square/circle treatments and can feel ornamental rather than informational.
- The landing transformation graphic is a generic code-built mockup; it is not strong proof of actual Folveta output.
- Feedback is mostly hover, spinner, pulse, and target highlight; transitions are not organized by interaction priority and reduced-motion policy.
- Desktop Guide hierarchy is usable, but long page length and similar surfaces reduce scan contrast.
- At 390x844, the homepage upload section began below the first viewport (around 972 CSS px from the top), so the core task is not directly visible.
- At mobile Guide size, the topic sidebar disappears with no equivalent topic menu; the search placeholder consumes the header.
- Active Quick Check has no H1 in the rendered question state, even though it is private/noindex; semantic page structure should still be reviewed for accessibility.

### Placeholder/control integrity findings

- Guide `Search your knowledge` is an editable-looking input without search behavior.
- Guide `My Guides` links to `#overview`, not a guide list.
- Guide `Library` links to `#sources`, not a Library.
- Guide Profile button is enabled-looking but has no action.
- Assessment-shell search/profile are read-only/disabled but still occupy prominent workspace UI.

These files are not unused; they are production baseline components. Their placeholder behavior must be removed, honestly disabled, or replaced in Phase 1/2 rather than deleted.

### External reference audit

`https://github.com/nobruf/shadcn-landing-page`:

- Access confirmed; reported by GitHub as `nobruf/shadcn-landing-page` with MIT license and no parent fork metadata.
- Stack: Next 14.2.3, React 18, Tailwind 3, shadcn/Radix, old Lucide, CVA/clsx/tailwind-merge, React Hook Form, Embla, theme/marquee/animation dependencies.
- Useful references: responsive Navbar/Sheet, Hero, Benefits/Features, FAQ Accordion, CTA/form rhythm, Footer, and shadcn composition.
- Not drop-in compatible with current Next 16/React 19/Tailwind 4; copying its dependency list would add substantial unused surface.
- Sponsors, Testimonials, Team, Community, Contact, Pricing, dark mode, carousel, and marquee are not Folveta requirements by default.

`https://zippystarter.com/tools/shadcn-ui-theme-generator`:

- Returned HTTP 200 at audit time.
- Useful for token/component-state comparison.
- Page availability does not establish a blanket license for every generated component/asset. Review component source and terms before reuse.

### UI dependency policy recommendation

- Keep Lucide; do not add another icon set.
- Use selective current shadcn-compatible/Radix primitives only for real accessibility/state complexity.
- Do not install the reference template or its dependency graph.
- Start motion with CSS plus `prefers-reduced-motion`; evaluate an MIT animation utility only for an identified interaction.
- Prefer real Folveta screenshots/output or explicitly licensed/generated bitmap assets over a general illustration library.

## 5. Data, API, security, and privacy audit

Strengths:

- Service role remains server-only.
- Anonymous access token is high entropy, hashed at rest, HttpOnly, SameSite=Lax, and Secure in production.
- Owner and expiry checks guard session/source APIs and private pages.
- Browser taking payload excludes answer key/explanation/reference/verdict.
- Private Storage and database RLS are enabled; browser roles have no table policies.
- Source span IDs prevent model-invented page/slide locators.

Launch blockers/gaps:

- Single-cookie identity cannot support Product-3.
- No user/customer owner, anonymous claim, account deletion, or cross-device recovery.
- No rate limit/abuse or generation entitlement enforcement.
- No scheduled purge even though access expires.
- No full IDOR/integration test suite across Storage/Postgres.
- No CSRF/origin policy documented for future authenticated/billing mutations.
- Inline long-running generation has no lease/idempotency/checkpoint resume.
- Privacy/Terms explicitly describe missing cleanup/support and no paid plan, so they require revision before launch.

## 6. SEO v2 audit

Current foundation is materially better than the historical `archive/seo-audit.md`: canonical metadata, social images, structured data, robots, sitemap, trust pages, and study-route noindex are implemented.

Current v5 corrections:

- Homepage title/header still prioritize `AI Study Guide Maker`; core owner must be `Study Guide Maker`.
- The H1 is a benefit line (`Your course material, made learnable.`) rather than a literal category/task owner; SEO v2 should reassess it against live intent while retaining humane copy.
- Production origin is not configured locally and not verified on `folveta.com`.
- Public pages are indexable by default; no pre-launch flag/protection contract exists.
- Sitemap always emits four public URLs.
- Current production checklist assumes launch indexing and does not fully separate protected pre-launch from cutover.
- Image SEO/product proof, CWV field data, real support, cleanup, billing facts, Search Console, monitoring, and post-launch operation remain open.

No new Blog, Pricing, Use Case, Tools, comparison, or pSEO pages are justified by this audit. Pricing remains conditional on Phase 3.

## 7. File and code hygiene classification

### A. Current production code — keep

- `app/` including public pages, API routes, private study routes, metadata images, robots, sitemap, favicon, and global CSS.
- `components/` all seven components; every component has current imports/route use.
- `lib/ai/`, `lib/schemas/`, `lib/server/`, `lib/site.ts`, `lib/config.ts`, `lib/env.ts`.
- `lib/fixtures/demo-guide.ts` and `demo-quick-check.ts`: used by public demo routes and tests, not stale mocks.
- `supabase/migrations/202608240001_phase1.sql` and `202608240002_phase2_quick_check.sql`: immutable schema history and required setup.
- `next.config.ts`, `tsconfig.json`, Tailwind/PostCSS/ESLint/Vitest configuration, package manifest/lockfile, `.env.example`, `.gitignore`, `AGENTS.md`.
- `CLAUDE.md`: intentional compatibility pointer to `AGENTS.md`; keep unless all supported agents no longer need it.

### B. Current tests/fixtures — keep

- `tests/unit/parser.test.ts`, `tests/unit/quick-check.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/seo.test.ts`.
- `tests/fixtures/sample-course.pdf` and `.pptx`.
- `scripts/fixtures/generate-test-fixtures.mjs` and its `fixtures:generate` package script.
- Test-only `jszip` and `pdf-lib` dependencies.

### C. Historical documents/research — keep as history

- Historical sections inside `docs/product/decisions.md`.
- `docs/research/user-pain-validation.md`.
- `docs/research/study-guide-maker-competitor-analysis.md`.
- `docs/archive/assessment-validity-plan.md` with explicit historical/archive status.
- `docs/archive/seo-audit.md` and `docs/archive/seo-implementation-report.md` as dated snapshots.

The approved cleanup moved these historical files into `docs/archive/` and fixed their links. Archiving was organizational, not deletion.

### D. Superseded/outdated planning — merge or mark

- `docs/archive/mvp-ux-spec.md`: superseded v3 plan with pasted text/source roles/short-answer possibilities not matching current implementation; preserved as UX history.
- `docs/archive/mvp-technical-plan.md`: superseded proposed plan; `technical-architecture.md` replaces current status.
- `docs/archive/seo-audit.md`: historical pre-SEO snapshot with now-fixed MISSING items.
- `docs/archive/seo-implementation-report.md`: historical v3 implementation snapshot; current open work lives in v5 docs.
- Original `docs/product/product-context.md` v4 and top `product/decisions.md` v4: updated to v5 while history remains.
- Root `README.md`: Phase 2 label is outdated; update to a v5 baseline/index without pretending missing features exist.
- `docs/operations/production-seo-checklist.md`: retain as active checklist but merge in pre-launch protection/noindex and billing launch gates.

### E. Clearly unused files safe to delete

No committed/source file met the evidence threshold for safe deletion in this audit.

Generated local outputs are already ignored and should not be treated as product files:

- `.next/`
- `tsconfig.tsbuildinfo`
- `next-env.d.ts`
- test/coverage reports if generated

They were not deleted.

### F. Suspected obsolete, manual confirmation required

- Direct dev dependency `tsx`: removed on 2026-08-26 after package scripts, lockfile, config, tests, migrations, scripts, tooling, CI, README/docs, source references, and dynamic invocation scans found no required use. Vitest declared it only as an optional peer; post-removal verification is recorded in section 11.
- Historical archive moves: completed on 2026-08-26; useful evidence was moved rather than deleted.
- Any previous Stitch exports not present in this repository: cannot classify or delete without their actual location.

### G. Duplicate/conflicting files

- `archive/seo-audit.md`, `archive/seo-implementation-report.md`, and `production-seo-checklist.md` describe different dates/stages; archive placement, status banners, and active `seo-architecture.md` now distinguish their authority without removing historical evidence.
- `archive/mvp-ux-spec.md` and current code conflict on pasted text, source roles, short answer, and page behavior.
- `archive/mvp-technical-plan.md` and current code conflict on status plus leases/checkpoints/pasted text/cleanup/rate limits.
- Root `README.md` Phase 2 framing conflicts with completed UI/SEO milestones and v5 roadmap.
- Decisions/product-context overlap intentionally but now have distinct governance roles.

### H. Old branding/assets

- No Lumina, Syllivo, or Folivio source file or static asset exists in the repository.
- No files exist under `public/`; there is no stale public asset to delete.
- Lumina is mentioned only in decision history/compatibility text.
- No raw Stitch export/code directory exists; current Stitch influence is already incorporated into Folveta components.
- `AI Study Guide Maker` occurrences in current homepage metadata/header and historical docs are not old brand files. Runtime occurrences are SEO v2 corrections; historical competitor evidence should remain unchanged.

### I. Dependency audit

Keep, verified direct use:

- `@supabase/supabase-js`, `file-type`, `lucide-react`, `officeparser`, `openai`, `unpdf`, `zod`.
- `next`, `react`, `react-dom`, Tailwind/PostCSS, TypeScript, ESLint/Next config, Vitest and React/Node types.
- `jszip`, `pdf-lib` for fixture/test tooling.
- `pdfjs-dist` override required by the PDF stack should not be removed without parser verification.

Removal result:

- `tsx` was the only unused direct dependency established and was removed through npm on 2026-08-26. No other dependency was removed.

## 8. Approved cleanup scope and outcome

### Dependency removal completed

1. Removed `tsx` from `devDependencies` through npm, updating `package.json`, `package-lock.json`, and the local dependency tree.

No file deletion was approved or performed.

### Archive completed

Moved into `docs/archive/`, retaining Git history and fixing links:

1. `docs/archive/assessment-validity-plan.md`
2. `docs/archive/mvp-ux-spec.md`
3. `docs/archive/mvp-technical-plan.md`
4. `docs/archive/seo-audit.md`
5. `docs/archive/seo-implementation-report.md`

Research references remain at `docs/research/user-pain-validation.md` and `docs/research/study-guide-maker-competitor-analysis.md`; they were intentionally not archived or deleted.

### Merge/replace in active governance

- Current product decisions: `decisions.md` v5, preserving old sections.
- Current context: `product-context.md` v5.
- Current roadmap: `v5-master-roadmap.md`.
- Current technical truth: `technical-architecture.md`.
- Current Folveta SEO truth: `seo-architecture.md` plus reusable `SEO_GUIDE.md`.
- Operational launch checks: `production-seo-checklist.md`.
- Root developer entry: updated `README.md` linking to the active index.

## 9. Cleanup execution protocol used

After explicit approval, the cleanup task followed this protocol:

1. Record the exact approved file moves/removals and dependency changes.
2. Re-run reference/import/link scans before changes.
3. Use recoverable Git moves for archives; do not rewrite historical content to look current.
4. Update all relative links and documentation index entries.
5. If removing `tsx`, update both manifest and lockfile through the package manager.
6. Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
7. Re-run route/import/brand/status scans and report every removed/moved item.

## 10. Audit conclusion

The repository does not contain a large body of dead production code or old-brand assets. The main hygiene problem is documentary and behavioral drift: active-looking v3/v4 plans, a Phase 2 README, historical SEO snapshots, and placeholder workspace controls coexist with a more advanced actual implementation.

The highest-value cleanup is therefore:

1. establish and enforce the active v5 document hierarchy;
2. mark/archive stale plans rather than delete evidence;
3. remove only the confirmed-unreferenced `tsx` dependency;
4. handle fake workspace controls through Phase 1/2 implementation, not file deletion;
5. create a first Git baseline before cleanup changes.

## 11. Approved cleanup execution record

Status: **Completed on 2026-08-26**

- Baseline commit created before cleanup: `58249b1` (`chore: establish Folveta v5 baseline`).
- Archived exactly the five historical documents listed in section 8; no historical or research document was deleted.
- Updated active-document references and archive-relative Markdown links for the new paths.
- Removed only `tsx` through `npm uninstall --save-dev tsx`; no package script, config, test, migration, script, tooling, CI file, README/doc workflow, source reference, or dynamic invocation required it. Vitest's declaration was an optional peer dependency, and `npm ls tsx --all` was empty after removal.
- Kept production code, demo fixtures, placeholder workspace components, assets, CSS, UI components, tests, migrations, Supabase code, research references, and all other dependencies unchanged.
- Cleanup verification result: 4/4 test files and 23/23 tests passed; typecheck, lint, and production build passed; the final Markdown check reported 0 broken links.
