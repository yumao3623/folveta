# Folveta Visual System v3: verification record

Date: 2026-09-16  
Environment: local development server, `http://localhost:3100`  
Scope: visual presentation, responsive layout, public demo interactions, and shared dialog behavior. This is not a production release or real-provider acceptance record.

## Public route and responsive audit

An independent Playwright browser context inspected these 13 routes without signing in or submitting account, upload, generation, billing, or deletion requests:

`/`, `/about`, `/pricing`, `/contact`, `/privacy`, `/refunds`, `/terms`, `/study-guide-maker-from-pdf`, `/auth`, `/auth/forgot-password`, `/auth/reset-password`, `/study/demo`, `/study/demo/quick-check`.

Each route was checked at 360, 390, 639, 640, 641, 767, 768, 769, 1023, 1024, 1025, 1279, 1280, 1281, and 1440 CSS pixels with a 900px height. Each was also checked at 390, 1024, and 1440px with a short 600px height: **234 route/viewport states** in total.

Results: no document-level horizontal overflow, no failed loaded images, no browser `pageerror`, and no console errors were recorded. The scan also found no unintended main-content elements extending beyond the viewport, excluding the intentional horizontal topic-navigation scroller.

Evidence files:

- Metrics: `/tmp/folveta-responsive-audit/metrics.json`
- 390px and 1440px screenshots for every route: `/tmp/folveta-responsive-audit/`
- Additional short-height screenshots: Auth, Guide, and Quick Check at 390, 1024, and 1440px in the same directory.

The screenshots were not treated as an automatic visual pass. Actual image inspection covered Guide at 390/1440px, Auth at 390px, Quick Check at 390px and 1024×600px, About at 1440px, and PDF workflow at 390px. Observed: paper collage is absent; headings and controls remain readable; the Guide uses a visible book illustration and filled topic glyphs; Quick Check uses the same filled visual family; short-height controls remain reachable by scrolling.

Intentional layout changes remain: the September 17 consolidation reveals the compact learning sidebar at 1024px, and Auth changes from a centered form to a two-column composition at the same breakpoint. The adjacent-width checks do not imply that the layouts are identical across these explicit breakpoints.

## Study UI checks

The public V2 demo Guide and Quick Check were opened in a separate `agent-browser` session. Quick Check was started, an answer was selected, and the selected state was inspected: one selected answer, zero overflow, zero missing images, and no browser errors. No external generation request is made by this demo path.

The study changes remove paper backgrounds, use the shared `StudyIcon` semantic entry point, reserve source-documented `AssetIllustration` scenes for larger illustration roles, replace nested V2 content panels with open learning blocks, and align the Quick Check action region with the learning shell. Forward/backward direction and selected/loading/error/completed presentation states are bound to existing local or business state.

Additional evidence: `/tmp/folveta-study-rebuild-390.png`, `/tmp/folveta-check-rebuild-390-ready.png`, and `/tmp/folveta-check-rebuild-390-selected.png`. The larger responsive audit directory contains later screenshots after shared visual integration.

## Remaining route-state coverage

The Library, Profile, Search, and My Guides loading/error boundaries, study preparation/source rows, study error/not-found pages, and billing return pages now use the same filled glyphs, shared buttons, and typography. Only actual loading states use continuous animation. The billing-success return page retains its existing webhook-confirmation wording and has no celebration animation; visiting this URL is not proof of a payment.

Additional browser checks opened `/billing/cancel`, `/billing/success`, and an unavailable study-session URL in the independent anonymous browser at 390px. All three screenshots were opened and visually inspected; headings and actions fit the viewport, and the unavailable study page had no horizontal overflow or missing images. Evidence: `billing-cancel-390.png`, `billing-success-390.png`, and `study-notfound-390.png` in `/tmp/folveta-responsive-audit/`. These were GET-only presentation checks, not checkout or authenticated session verification. Authenticated loading/error boundaries were typechecked and linted, but real backend failures were not induced to force those states.

## Shared dialog verification

`DialogFrame` is used by Guide management and account deletion. The browser test bundles and mounts the **actual React component** in an isolated local test document using the already installed toolchain. It is not a screenshot mock or a substitute implementation.

Verified on desktop Chromium and mobile Chromium:

- Initial focus and Tab/Shift+Tab containment.
- Escape dismissal, with Escape blocked while an operation is pending.
- Cancel and backdrop dismissal, followed by focus returning to the trigger.
- Body scroll lock and release, with no horizontal position change of the trigger.
- Reduced-motion behavior disables dialog animation and removes the closing delay.

Tests: `tests/browser/dialog-frame.spec.ts`, 4 passed; `tests/unit/dialog-behavior.test.ts`, 4 passed. Open-dialog screenshots are retained under the corresponding `test-results/dialog-frame-*/dialog-open.png` directories. These are explicitly **test-harness screenshots**, not authenticated account-page screenshots.

## Technical checks performed during integration

- TypeScript: passed.
- ESLint for the changed study/dialog files: passed.
- `git diff --check`: passed.
- Relevant unit suite (`dialog-behavior`, `ui-foundation`, `guide-management`, `quick-check`, `generation-panel`): 38 passed.
- The full browser suite at the preceding checkpoint: 12 passed, including public demo completion and visual-system checks. Two additional dialog reduced-motion cases were then added and the 4 dialog cases were re-run successfully. Final whole-project test/build results belong in the final integration record below.

## Explicit verification limits

No real authenticated account was read in this audit. No registration, login, upload, real AI generation, payment, Guide mutation, account deletion, database migration, production deployment, or production provider call was performed. The public demo validates its fixture-backed presentation and navigation only. The isolated dialog tests validate component mechanics only; neither is evidence that a real account or provider workflow passed.

## Final integration pass

The final application was rebuilt and run using `npm run start -- --port 3100` (production mode, local only). The responsive audit was repeated against that build and expanded to `/auth?mode=sign-up`: **14 route/form variants × 18 width/height combinations = 252 states, zero measured overflow, missing loaded images, page errors or console errors**. The requested 360/390/768/1024/1440 sizes and 1279/1280/1281 neighbors are included. A separate continuous sequence traverses 26 widths between 1440 and 360px; the homepage keeps its column skeleton until the explicit 768px breakpoint.

Final checks:

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 230 passed, 11 existing skipped tests (34 passed test files, 2 skipped).
- `npm run test:workflow`: 3 passed.
- `PLAYWRIGHT_BASE_URL=http://localhost:3100 npm run test:browser`: 17 passed, 1 intentionally skipped duplicate mouse-only test in the mobile project. Mobile touch selection is separately exercised.
- `npm run build -- --webpack`: passed. The existing `file-type/source/index.js` dynamic-dependency warning remains; no dependency upgrade was attempted.
- `git diff --check`: passed. README retains `cp .env.example .env.local`; package manifest/lock, API/server code and migrations have no changes from this task. No secret values were read or printed; no commit/push/deployment was performed.

Browser cases include button hit-target stability while its face moves 4px; Study Loop visibility sampled every ~80ms through two autoplay changes and rapid manual interruptions; reduced-motion; keyboard radio selection; mobile taps; previous/next retention; full fixture-backed demo submission/result/return; unsupported-file errors and removing a queued local file without a network write; real shared-dialog focus/backdrop/Escape/pending behavior.

### Visual evidence and recording limitations

Delivered evidence is in the Git-ignored `playwright-report/visual-system-v3/` directory, indexed by its `README.md`. It includes five-width screenshots of Home, Guide, Quick Check and Auth; viewport screenshots of all audited public/form routes; the 20-vector icon inventory; and the measured layout JSON.

`core-interactions.webm` is the delivered **18.96-second native Playwright browser recording**, covering button press/release, workflow selection and rapid interruptions, Guide navigation, Quick Check selection/previous/next, fixture-backed submission/results, and return. Replay was checked by decoding video frames at 1, 7, and 16 seconds; they show different expected stages, including the calculated result.

An initial replay checker incorrectly treated its full-file HTTP mock as a seekable range server and kept showing the first frame. Loading the same video into a Blob URL corrected seeking; this was a verification-tool issue, not evidence that the recording was frozen. No native video was accepted until that check was corrected.

Additional evidence records **94 actual sequential browser screenshots over 8.488 seconds**, including intermediate squash/rotation, button press/release, rapid selection and Quick Check forward/backward. `frame-timestamps.json` records each capture time; `frames/` contains the originals. `interaction-sequence.webm` is a secondary convenience video assembled from those captured frames using the already installed Playwright FFmpeg, not generated or interpolated animation. Its ~11fps sampling does not establish exact frame-by-frame easing performance.

Visual self-review separately inspected desktop/mobile Home, workflow intermediate frames, Guide, Auth, Quick Check, public/short-height pages and the complete icon inventory. Rework included removal of paper collage, enlargement of visible illustration boxes, removal of duplicate homepage workflow content, always-opaque Study Loop cards, finite instead of endless non-loading icon motion, fixed button hit rectangles, consistent empty-state artwork bounds, and semantic edit/archive/delete symbols. No unresolved public-page layout defect was found in those checks; authenticated-data/provider limitations above still apply.

## September 17 typography, icon, and layout follow-up

The current local pass replaces the mixed display/body pairing with self-hosted Source Sans 3, replaces the multicolor control glyph set with `StudyIcon` plus consistent 2px Lucide utility glyphs, and rebuilds the open-book brand SVG, PNG, and favicon. The GitHub-sourced IRA student scenes remain the narrative illustration family; they are not used as button or navigation icons.

Shared public navigation now covers the homepage and public content pages. Legal/contact heroes are compact, the learning sidebar begins at 1024px, generation readiness precedes individual source rows, the mobile upload control uses touch language, and the Quick Check phone layout reserves visible space above its fixed toolbar.

Chrome visual review inspected the desktop homepage, the Guide at an approximately 1100px content width, and 390×844 Home, Guide, Quick Check intro/first-question, method, and Privacy views. The first Quick Check question showed two complete answers above the toolbar. Automated layout checks cover nine public routes on desktop and mobile, explicit 1100px sidebar geometry, and explicit 390px answer/toolbar geometry. This is local presentation verification only; no deployment or provider workflow was performed.
