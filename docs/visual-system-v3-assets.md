# Folveta v3 asset index

Generated and visually inspected on 2026-09-16. All PNGs below are independent 1254×1254 RGBA files with verified non-opaque alpha, not checkerboard backgrounds. Selected palette: green `#0A9E4A`, sky `#3AB8F2`, coral `#FF6B6B`, yellow `#FFCF3E`, ink `#20332B`. Original book/material motifs; no Duolingo logo or character assets.

| File under `public/illustrations/` | Actual role | Animation capability |
| --- | --- | --- |
| `folveta-material-mascot.png` | Homepage hero and material step | Flat image; finite entrance/selection squash |
| `folveta-guide-book.png` | Guide/auth/public-page hero, workflow step | Flat image; page parts are not individually movable |
| `folveta-quick-check.png` | Quick Check intro/results and workflow | Flat image; selected/result reveal |
| `folveta-source-globe.png` | Source explanation, upload supporting section, public pages | Static; detailed citations use the SVG source marker instead |
| `folveta-quest-lightning.png` | Public explanatory illustration | Static; does not imply an XP/reward feature |
| `folveta-locked-guide.png` | Empty/protected/error/auth states | Static; not a real entitlement indicator by itself |
| `folveta-heart-recall.png` | Completed check/supportive public illustration | Finite reveal bound to existing result state |

Shared bitmap entry: `components/ui/asset-illustration.tsx`. Intrinsic dimensions and bounded image boxes reserve space; decorative mode avoids duplicate control labels. Hero images load eagerly; lower images load lazily. Detailed generation inventory: `public/illustrations/asset-manifest.json`.

## Vector family

Canonical source: `components/ui/cartoon-icon.tsx`; motion: `cartoon-icon.module.css`. 20 independent static vector exports: `public/icons/{home,upload,guide,library,search,profile,history,material,source,check,success,error,locked,loading,target,help,lightbulb,edit,trash,archive}.svg`. Regenerate with `node scripts/assets/export-cartoon-icons.mjs` using the existing locked toolchain. Exports contain actual SVG paths, not embedded PNGs.

- Navigation: home, guide, library, search, profile, history; typically 27–40px.
- Upload/file: upload/material/guide; typically 24–42px.
- Learning and citation: guide/source/target/lightbulb; 24–56px.
- Feedback: check/success/error/locked/loading/help; 24–56px.
- Independently controllable SVG parts: arrow, right book page, source marker, paper corner, check tick, warning mark, loading ring. Non-loading animation is finite; reduced motion disables transforms.
- Utility arrows, close, playback, calendar/time, external link and sign-out remain small functional symbols with consistent 2.5px stroke weight. They are not presented as generated business illustrations.

Brand: `public/brand/folveta-mark.svg`, `app/icon.svg`, derived `app/icon.png` and `app/favicon.ico`. Crisp original open-book/bookmark vector; no raster enlargement or textured logo. Shared component: `components/brand-mark.tsx`.

## Rejected and retained legacy assets

Two newly generated dark-halo images were rejected and moved out of public delivery to `/tmp/folveta-visual-v3/rejected/`. Their source generation outputs remain recoverable. Earlier existing `/public/art/` and logo-option assets were not deleted or overwritten; active product pages no longer reference the paper collage or old logo options. Original pre-crop illustrations were retained in `/tmp/folveta-illustration-originals-20260916/`.

Text, inputs, buttons, cards, dialogs, progress and answer controls are real HTML/React components. No generated page mockup or baked text is used as an interactive UI.
