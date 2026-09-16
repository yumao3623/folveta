# Visual system v3: reference and decisions

2026-09-16. This is a presentation refactor, not a new product or a release claim.

## Skills actually used

- `/Users/maoyu/.codex/skills/taste-skill/SKILL.md` (read in full): brief-first hierarchy, image-first asset exploration, cohesive art direction, fixed layout skeletons, existing-stack implementation, and visual self-review. Applied marketing composition rules to the homepage/public pages; did not impose experimental marketing layouts on Study Guide or Quick Check. The user's explicit cartoon/SVG/motion requirements take precedence over generic skill defaults.
- `/Users/maoyu/.codex/skills/.system/imagegen/SKILL.md`: actual image generation, reference-based asset family, saving and opening outputs, rejecting inconsistent artwork. Generated PNGs are not misrepresented as layered SVG.
- `/Users/maoyu/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/agent-browser/SKILL.md`: real local browser navigation, selection, screenshots, console checks.
- `/Users/maoyu/.codex/plugins/cache/openai-curated-remote/vercel/0.21.4/skills/react-best-practices/SKILL.md`: stable functional state updates, effect cleanup, media-query subscription, accessibility and component review. Local Next.js image/CSS documentation was checked before implementation.

## Actual Chrome observations

Reference: [Duolingo](https://www.duolingo.com/). Native Chrome interaction was used; textual page extraction was not treated as experience. No signup, purchase, payment, or access-control bypass was performed.

| Reference element | Action and observed feedback | Folveta implementation |
| --- | --- | --- |
| Onboarding level options | Click an option: filled pale-blue selected card, stronger border, related speech changes, Continue becomes green/enabled. | `quick-check-runner.tsx`: real selected radio state, filled selection, animated confirmation marker; Next stays disabled before selection. |
| Onboarding forward/close | Continue replaces question with starting-path cards; X closes the overlay and restores the underlying map. | `DialogFrame`: consistent entrance/exit, focus return, scroll lock; Quick Check uses forward/backward direction. |
| Lesson node and answer | Node opens lesson popover; wrong submission disables options, reveals red bottom feedback, updates progress and heart count. | Existing result/error data drives `Alert`, `QuickCheckResult` and `GenerationPanel`; no invented reward state. |
| Characters page | Click a pronunciation card: audio activity is shown without rearranging the grid. | Interaction stays inside stable component bounds; source detail is intentionally expandable. |
| Quests page | Scroll task banner, illustrated progress rows and locked task; images have distinct semantic roles. | Separate guide, material, check, source, lock and loading artwork; no fake quests or points. |
| Shop and leaderboard | Large independent illustrations; disabled/unlock content differs from active controls. Leaderboard data remained unavailable/loading. No purchase clicked. | Disabled controls and empty/error/loading components use the same family; no commerce redesign beyond presentation. |

Evidence: native Chrome screenshots and accessibility states were inspected in the research tool responses. The research channel did not provide reliable millisecond intermediate-frame capture. Therefore exact official easing curves, durations or button-press acceleration are **not** claimed as measured.

One early lesson inspection used an already signed-in Duolingo session and submitted a wrong answer; hearts visibly changed from 3 to 2. Subsequent research was restricted to onboarding/navigation and did not submit lessons. This was an external reference-account side effect, not a Folveta test or product-data change.

## User-provided recording observations (not our browser actions)

Both supplied videos were read using the existing macOS AVFoundation runtime. The 39.43-second mobile clip was sampled at 9.35, 9.45, 9.55, 9.65, 9.75, 9.85, 9.95 and 10.05 seconds. Contact sheet: `/tmp/folveta-ref-transition-sheet.png`.

The sequence visibly changes the celebration banner first, then opens the character's eyes while separate sparkles move; text and illustration stay inside the same screen region. This supports **staggered internal parts**, not an inference that every Duolingo icon is animated. The desktop 91.11-second clip additionally shows the map, profile, matching exercise and settings layouts. These are user-recorded evidence, not claims that we personally operated each of those screens.

## Source code studied and applied

No dependency was installed, and no Duolingo artwork was copied.

1. **CZI edu-design-system**, commit `283147d1908b708bfe339f01e8122070462df187`, [`src/components/Button/Button.tsx`](https://github.com/chanzuckerberg/edu-design-system/blob/283147d1908b708bfe339f01e8122070462df187/src/components/Button/Button.tsx). Supporting [Button.module.css](https://github.com/chanzuckerberg/edu-design-system/blob/03aef30d290d08d69c22214880addde379e8d5be/src/components/Button/Button.module.css) at commit `03aef30d290d08d69c22214880addde379e8d5be`. Studied variant/size/disabled/loading separation and an overlaid loader that preserves button width. Independently implemented the mechanism in `components/ui/button.tsx` and `app/globals.css`. [MIT license](https://github.com/chanzuckerberg/edu-design-system/blob/283147d1908b708bfe339f01e8122070462df187/LICENSE); no source block was copied. Verified by TypeScript and real button interaction/geometry checks.
2. **Open edX Paragon**, commit `f5db0b26073a5a29096bf5e71b26c97170225a13`, [`tokens/src/core/global/transition.json`](https://github.com/openedx/paragon/blob/f5db0b26073a5a29096bf5e71b26c97170225a13/tokens/src/core/global/transition.json). Studied central duration/easing token ownership; implemented that organization in `app/globals.css`. Folveta's timings and curves are our own design, not asserted Duolingo values. [Apache-2.0 license](https://github.com/openedx/paragon/blob/f5db0b26073a5a29096bf5e71b26c97170225a13/LICENSE); no source block was copied. Verified across buttons, dialogs, selection and reduced-motion browser tests.

## Folveta decisions, not claims about Duolingo internals

- White surfaces, green actions, blue selection, coral warning/error accents and yellow study illustrations. Rounded filled 2D artwork; no paper texture, glass, neon or photorealistic 3D.
- Buttons use a moving face and a fixed hit rectangle. Press: 70ms, 2–4px depth. Release: 220ms overshoot curve. Interactive card selection is distinct from hover.
- Local SVG motion: book right page, upload arrow, source marker, paper corner, confirmation tick, warning mark. Only loading loops indefinitely. PNG assets remain flat artwork with optional finite whole-image motion.
- Homepage: max-width 1180px; one deliberate 768px column change. Study/Workspace: desktop sidebar at 1280px, accessible mobile navigation below. Auth: form-first below 1024px. Public editorial hero: two columns from 768px. Intermediate widths adjust spacing/wrapping, not content order.
- Study Loop cards never animate opacity. Only internal artwork/markers move; manual selection stops autoplay, reduced-motion changes stop the timer, hidden tabs do not advance.
- Existing content, API endpoints, authentication, scoring, billing and generation rules are retained. No gamification or invented success data was added.
