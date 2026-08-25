# Folveta UI Design System v2

Status: **Current design-system foundation**  
Established: 2026-08-26  
Decision authority: `docs/decisions.md`  
Delivery roadmap: `docs/v5-master-roadmap.md`

## 1. Scope and visual acceptance brief

Folveta UI Foundation v2 is the shared visual and interaction language for the implemented Landing/Upload, Study Guide, Quick Check, Results, and future Product-3 surfaces. It improves the existing Academic Editorial direction without changing product structure or business logic.

The accepted direction is bright white and near-neutral backgrounds, fresh brand green, mint support surfaces, yellow study highlights, source-blue evidence, restrained borders, compact 8px product radii, light elevation, useful icon containers, and fast feedback. It should feel youthful, clean, energetic, polished, and student-friendly without becoming childish, luxurious, neon, or enterprise-backend-like.

Large areas must not be uniformly gray-green. Whitespace and unframed bands should carry page structure; cards are reserved for individual tools, repeated records, stateful choices, and genuinely framed content.

## 2. Current UI Foundation Audit

Classification: **A Keep**, **B Polish**, **C Replace**, **D Missing**.

| Area | Before v2 | Classification | Foundation decision |
| --- | --- | --- | --- |
| Color tokens | Useful green/source/warning concepts, but green dominated large surfaces and names mixed role with appearance | B | Replace with semantic roles and retain compatibility aliases during page migration |
| Typography | Bricolage + Geist loaded through `next/font`; hierarchy relied on many one-off sizes/weights | A/B | Keep both variable fonts; formalize display, heading, body, label, and metadata roles |
| Radius | 4px to 24px and pills used inconsistently | B | 8px default; 4/6px compact; 12px only for large non-card interaction zones; pills only for badges |
| Borders | Numerous hard or color-specific borders | B | Neutral soft/default/strong roles; functional color only for state/evidence |
| Shadow | Many one-off rgba shadows | B | Four restrained roles: xs, sm, md, primary action |
| Buttons | Repeated Tailwind strings; inconsistent pills, disabled colors, and loading labels | C | One six-variant, six-size shared API with complete interaction states |
| Inputs | Upload title had good basic behavior but no reusable API or success/error contract | B | Shared Input/Textarea, label, message, and semantic state classes |
| Cards/surfaces | Similar white/green rectangles with inconsistent depth | B | Base, subtle, elevated, interactive, callout, info, warning, and source surfaces |
| Badges/chips | Ad hoc rounded spans and hard-coded status colors | C | Shared tone vocabulary: neutral, primary, source, success, warning, destructive |
| Icons | Lucide was consistent but often appeared as bare outline geometry | B | Keep Lucide; add size, stroke, container, active, and tone rules |
| Navigation states | Desktop sidebars were clear; headers included fake Product-3 controls | C | Keep real links, remove placeholder Search/My Guides/Library/Profile, add honest active states |
| Loading states | Spinner, pulse, and copy existed but differed by screen | B | Shared Button loading and accessible determinate/indeterminate Progress |
| Error states | Functional `role=alert`, inconsistent surfaces | B | Shared destructive Alert and field error state |
| Success states | Present in upload/result screens but not systematic | B | Shared success Alert, Badge, IconFrame, and field state |
| Empty states | No reusable pattern | D | Shared EmptyState composition for future real empty collections and tools |
| Hover | Common but inconsistent elevation and movement | B | Fast color/border/shadow response; at most 1px lift |
| Active | Often a 1px downward shift, sometimes absent | B | Primary darkens and returns to rest; selected items use filled soft/active treatment |
| Focus | Visible green outline existed but some local controls overrode it | A/B | One 3px focus ring with 3px offset; fields use inset-compatible ring |
| Disabled | Opacity and hard-coded pale green varied | C | Shared 48% opacity, no shadow, no pointer events for shared controls |
| Motion | Hover, spinner, pulse, target fade; no global reduced-motion policy | B/D | 140/200/320ms timing tokens and comprehensive `prefers-reduced-motion` fallback |
| Responsive behavior | No horizontal overflow observed, but mobile topic navigation was missing | B/D | Add scrollable mobile topic navigation and preserve stable control dimensions |

## 3. Tokens

Tokens live in `app/globals.css`. New code uses semantic names; legacy aliases exist only to keep page-level migration incremental.

### Color

| Role | Value | Use |
| --- | --- | --- |
| `--background` | `#f7faf7` | Page background |
| `--foreground` | `#172019` | Highest-emphasis text |
| `--surface` / `--surface-elevated` | `#ffffff` | Base and elevated tools |
| `--surface-subtle` / `--surface-muted` | `#f1f6f2` / `#e9f0eb` | Quiet grouping and disabled surfaces |
| `--primary` / hover / active | `#08783e` / `#066333` / `#054f2a` | Brand action hierarchy |
| `--primary-soft` | `#dff4e7` | Selected and supportive green treatment |
| `--secondary` | `#edf3ef` | Neutral secondary controls |
| `--muted` / `--faint` | `#526158` / `#6d7971` | Secondary and metadata text |
| `--accent-mint` | `#c9f0d8` | Selection and positive decorative accent |
| `--highlight-yellow` | `#fff0a6` | Study emphasis, not warning |
| `--source-blue` / strong | `#e7f2ff` / `#2b628d` | Evidence and source references |
| `--warning` / soft | `#825400` / `#fff3d2` | Recoverable cautions and material gaps |
| `--success` / soft | `#08783e` / `#e2f5e8` | Completed and ready states |
| `--destructive` / soft | `#ad3535` / `#fdebea` | Errors and destructive actions |
| `--border` / soft / strong | `#cbd6ce` / `#dfe7e1` / `#aebdb2` | Default surface separation |

### Type

- Display and headings: Bricolage Grotesque variable font, generally weight 650-700.
- Body, controls, labels, and metadata: Geist variable font, generally weight 400-650.
- Display: 48px desktop / 38px mobile, 1.06 line height.
- H1: 40px, 1.1 line height. H2: 32px, 1.2. H3: 20px, 1.35.
- Body large: 17px; body: 15px; small/label: 13px; metadata: 12px.
- Letter spacing is zero. Uppercase is not a default label treatment; use sentence case unless a content convention requires otherwise.
- `next/font` self-hosts both fonts, preloads the Latin subset, uses swap display, and supplies metric-adjusted fallbacks. Geist Mono was removed because no product role used it.

### Spacing, radius, elevation, and motion

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px.
- Radius scale: 4px compact, 6px small, 8px standard, 12px large interaction zones, pill only for badges.
- Shadows: `--shadow-xs`, `--shadow-sm`, `--shadow-md`, and `--shadow-primary`.
- Motion: 140ms fast, 200ms standard, 320ms emphasized. Movement is limited to 1px lift/press, progress, disclosure rotation, and purposeful state transitions.
- Focus: `#3c9563`, 3px outline, 3px offset.

## 4. Icon system

Lucide remains the only icon library. It is ISC licensed, already shipped, tree-shakeable, and visually consistent. A second outline library would add bundle and maintenance cost without solving the real issue, which was treatment rather than glyph availability.

Use 1.8-1.9 stroke width. Sidebar/navigation icons use 16-18px glyphs in 28-32px neutral or active containers. Feature icons use 20-24px glyphs in 40-48px soft containers. Inline icons use 14-16px without a container when they behave like punctuation. Source icons always use source blue. Status icons use semantic success/warning/destructive tones. CTA icons are 16-18px and inherit button color. Icon buttons use 36/44/48px square hit areas and require an accessible name.

Do not use Unicode symbols or manually drawn SVG for UI icons. Filled product character comes from soft containers, active fills, functional tones, hover surfaces, and badge integration.

## 5. Component policies

### Buttons

Variants are Primary, Secondary, Ghost, Soft, Destructive, and square Icon Button. Heights are 36, 44, or 48px. Radius is 8px; weight is 650; icon gap is 8px. All variants cover hover, active, focus-visible, disabled, and loading. Loading keeps dimensions stable, sets `aria-busy`, disables re-entry, and uses a Lucide spinner.

### Surfaces and cards

Use base for ordinary content, subtle for quiet grouping, elevated for framed tools, interactive only for clickable/selected records, callout for study emphasis, information/source for evidence, and warning for recoverable gaps. Avoid nested cards and decorative cards around page sections.

### Forms

Input and Textarea share 48px minimum height, 8px radius, readable 16px mobile input text, neutral hover, primary focus, filled surface feedback, muted disabled state, and explicit error/success borders and messages. Dropzones use the same border/focus vocabulary with a 12px interaction-zone radius. Radio-like Quick Check options use an 8px interactive surface and visible selected rail/ring.

### Feedback and empty states

Alerts use info, success, warning, or destructive tone plus a Lucide status icon. Progress exposes an accessible label and supports determinate or indeterminate state. EmptyState is available for real empty tools and collections; it must never conceal loading or permission errors.

## 6. Navigation and responsive behavior

Only implemented destinations appear as working navigation. Product-3 Search, My Guides, Library, and Profile controls remain absent until their real routes and behavior exist. Desktop keeps the existing sidebar model. Mobile and tablet receive a horizontally scrollable topic navigation directly below the fixed header so Guide and Quick Check topics remain reachable.

Controls use stable heights and icon dimensions. Long topic names truncate in sidebars and remain intrinsic-width items in the mobile scroller. Page-level mobile upload placement and deeper per-screen composition belong to `ui-polish-v2-pages`.

## 7. External references and dependency policy

- ZippyStarter's shadcn theme generator informed semantic token relationships, compact 8px radii, quiet borders, dense component previews, state adjacency, and icon-button sizing. No theme code or generated asset was copied.
- The user's `yumao3623/shadcn-landing-page` fork was inspected first. Its MIT-licensed source informed variant-based Button/Input/Card/Badge APIs and responsive navigation composition. Its Next 14, React 18, Tailwind 3, Radix, CVA, and other dependencies were not copied into this Next 16/React 19/Tailwind 4 repository.
- Folveta is shadcn-compatible at the semantic-token and component-variant level, but it does not currently have `components.json`, Radix, CVA, `clsx`, or `tailwind-merge`. Add an accessible third-party primitive only when native HTML cannot cleanly provide the needed behavior.
- No illustration, animation, or icon dependency is approved by this foundation. Future bitmap/illustration assets must have a documented commercial license, attribution rule, source, alt-text decision, dimensions, and size budget. Prefer real Folveta output/screenshots over generic learning decoration.

## 8. Implementation map

- Tokens and state classes: `app/globals.css`
- Font loading: `app/layout.tsx`
- Shared APIs: `components/ui/`
- Foundation contract tests: `tests/ui-foundation.test.ts`
- First consumers: Landing navigation/actions, Upload, parsing/generation feedback, Guide and Assessment shells, source references, Quick Check controls, and Results cards.

## 9. Page-level composition rules

- Landing uses an unframed first-viewport composition: literal Study Guide Maker positioning, primary upload action, and representative Folveta output. On mobile, the actual Upload Workspace precedes the taller product transformation preview.
- Product transformation evidence must use readable source names, representative course snippets, actual Guide hierarchy, and source badges. Anonymous gray skeleton lines are not sufficient product proof.
- Upload is one framed tool with title, dropzone, queue, progress, status, and a stable continuation action. Parsing and generation remain separate real states; presentation must not imply that upload alone has generated the Guide.
- Study Guide page hierarchy is context header -> Study First -> key concepts -> real priority Study Path -> topic content -> evidence. The right rail is one quiet context surface, not a stack of decorative note cards.
- Process visuals may only represent structure present in the Guide schema. Grounded claim lists remain prose/list surfaces; topic priority order may be shown as a Study Path.
- Quick Check uses the question as the dominant visual element. Mobile has a fixed, safe-area-aware Previous/Next or Submit control region; results are never disclosed before submission.
- Results use sampled-performance language. Score, Learning Loop, needs-review topics, performed-well sampled items, answer correction, and evidence remain visually distinct without implying longitudinal mastery.
- Core page compositions must be checked at 390px and 1440px at minimum. Tablet and wide desktop checks remain part of the cross-page pass.

## 10. Phase 1 implementation record

Foundation and page-level polish are complete on their dedicated feature branches. Landing/Upload, Study Guide, Quick Check, Results, parsing/generation states, shared navigation, semantic headings, mobile actions, source/warning treatments, hover/focus/selected/loading/error/success/progress states, reduced-motion fallback, and responsive overflow checks now use this system.

No additional icon, illustration, animation, or component dependency was added. The Landing transformation preview uses existing Lucide icons and representative synthetic Folveta content. Product-3, billing, full SEO v2, and product logic remain out of scope.
