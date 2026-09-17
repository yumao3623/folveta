# Folveta student illustration asset index

Reworked on 2026-09-17 after the first visual pass was rejected for being too sparse and disconnected from the icon policy. The active family is now a source-documented SVG system for US students: faceless student figures, study desks, laptops, books, calendars, source pages, review cards, and private study folders. All active scenes are transparent SVGs built from the MIT-licensed [IRA Design outline components](https://github.com/ira-design/ira-illustrations) plus Folveta primitives. The source components used by the build are kept in `scripts/assets/vendor/ira/`; the license copy is in `public/illustrations/third-party/ira/LICENSE.md`.

Selected illustration palette: paper `#F8F3E9`, ink `#20332B`, forest `#0A9E4A`, cobalt `#3AB8F2`, coral `#FF6B6B`, mint `#BCEFD0`, yellow `#FFCF3E`. This richer palette belongs to narrative scenes; functional icons remain single-color. No baked text, facial detail, mascots, emoji, gradients, neon fills, or drop shadows are allowed in the derived scenes.

| File under `public/illustrations/` | Actual role | Animation capability |
| --- | --- | --- |
| `folveta-material-student.svg` | Homepage hero, PDF entry, and material step | Flat SVG; restrained whole-artwork entrance |
| `folveta-guide-student.svg` | Guide/auth/public-page hero and workflow step | Flat SVG; restrained whole-artwork entrance |
| `folveta-quick-check-student.svg` | Quick Check intro/results and workflow | Flat SVG; restrained result reveal |
| `folveta-source-student.svg` | Source explanation, upload support, and public pages | Static; evidence labels remain real text |
| `folveta-progress-student.svg` | Pricing and progress states | Static; calendar/marker do not imply an XP system |
| `folveta-locked-student.svg` | Empty/protected/error/auth states | Static; folder lock is not an entitlement indicator by itself |
| `folveta-heart-student.svg` | Recall, retry, and supportive feedback | Finite reveal bound to existing result state |

Shared entry: `components/ui/asset-illustration.tsx`. Intrinsic 800×540 viewBox dimensions and bounded image boxes reserve space; decorative mode avoids duplicate control labels. Hero scenes load eagerly; lower scenes load lazily. Provenance inventory: `public/illustrations/student-illustrations.json`.

## Vector family

Canonical functional source: `components/ui/study-icon.tsx`; finite/loading motion: `study-icon.module.css`. `StudyIcon` maps product semantics to 2px, `currentColor` Lucide glyphs. The 20 stable static exports remain at `public/icons/{home,upload,guide,library,search,profile,history,material,source,check,success,error,locked,loading,target,help,lightbulb,edit,trash,archive}.svg`. Regenerate them with `node scripts/assets/export-study-icons.mjs`. The custom open-book brand mark is stored in `public/brand/folveta-mark.svg` and `app/icon.svg`; regenerate `app/icon.png` and `app/favicon.ico` with `node scripts/assets/build-brand-icons.mjs`.

- Navigation: home, guide, library, search, profile, history; typically 27–40px.
- Upload/file: upload/material/guide; typically 24–42px.
- Learning and citation: guide/source/target/lightbulb; 24–56px.
- Feedback: check/success/error/locked/loading/help; 24–56px.
- Independently controllable SVG parts: arrow, right book page, source marker, paper corner, check tick, warning mark, loading ring. Non-loading animation is finite; reduced motion disables transforms.
- Utility arrows, close, playback, calendar/time, external link and sign-out remain small functional symbols with consistent 2.5px stroke weight. They are not presented as generated business illustrations.

Brand: `public/brand/folveta-mark.svg`, `app/icon.svg`, derived `app/icon.png` and `app/favicon.ico`. Crisp original open-book/bookmark vector; no raster enlargement or textured logo. Shared component: `components/brand-mark.tsx`.

## Rejected and retained legacy assets

The previous seven generated editorial PNGs were replaced by the source-documented student SVG family and are no longer referenced by the application. Earlier existing `/public/art/` and logo-option assets were not deleted or overwritten; active product pages continue to avoid the paper collage and old logo options. The generated PNGs are intentionally removed from active delivery so future contributors do not accidentally reintroduce an unproven visual family.

Text, inputs, buttons, cards, dialogs, progress and answer controls are real HTML/React components. No generated page mockup or baked text is used as an interactive UI.
