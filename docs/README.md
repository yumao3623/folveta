# Folveta Documentation Index

Status: **Active governance index**  
Last updated: 2026-08-25

## Authority order

When documents disagree, use this order:

1. `docs/decisions.md` — approved product decisions and preserved decision history.
2. `docs/product-context.md` — concise current product facts, implemented baseline, and present constraints.
3. `docs/v5-master-roadmap.md` — active phase order, dependencies, scope, tests, and exit criteria.
4. `docs/technical-architecture.md` — actual technical architecture and target boundaries.
5. `docs/seo-architecture.md` — Folveta-specific SEO ownership, route index policy, and launch cutover.
6. Current code, migrations, tests, and environment contracts — authority for what is actually implemented.
7. Historical plans, research, audits, and implementation reports — context only.

If current code contradicts a document's claim that something is implemented, the code wins and the active documents must be corrected in the same task.

## Active documents

| Document | Role |
| --- | --- |
| `decisions.md` | Highest product decision source of truth; never erase historical decisions |
| `product-context.md` | Current product, market, UI, commercial, SEO, and implementation context |
| `v5-master-roadmap.md` | Current master delivery roadmap |
| `technical-architecture.md` | Current code/data/API/security architecture and approved target boundaries |
| `seo-architecture.md` | Folveta-specific SEO v2 architecture and index policy |
| `SEO_GUIDE.md` | Reusable SEO standard, not Folveta page ownership by itself |
| `current-state-audit.md` | Dated audit, hygiene classification, and proposed cleanup list |
| `production-seo-checklist.md` | Operational pre-launch/launch/post-launch checklist |

## Historical and research documents

| Document | Status |
| --- | --- |
| `mvp-ux-spec.md` | Superseded v3 UX plan; historical baseline only |
| `mvp-technical-plan.md` | Superseded proposed MVP architecture; useful for original intent, not current status |
| `seo-audit.md` | Historical pre-implementation SEO snapshot |
| `seo-implementation-report.md` | Historical SEO implementation snapshot |
| `assessment-validity-plan.md` | Historical v2 Mock Exam validation plan |
| `user-pain-validation.md` | Research evidence; product recommendations defer to current decisions |
| `study-guide-maker-competitor-analysis.md` | Research snapshot; recommendations defer to current decisions |

## Update rules

Every material product decision task must update, in the same change:

1. `decisions.md` with the new decision while preserving history.
2. `product-context.md` with the changed current facts.
3. `v5-master-roadmap.md` if phase scope, order, dependency, or exit criteria changed.
4. `technical-architecture.md` for data, API, security, provider, deployment, or runtime changes.
5. `seo-architecture.md` for brand, domain, page ownership, route, index, schema, pricing-page, or launch-index changes.
6. Public Privacy/Terms/About copy when the real product or data handling changed.
7. Tests and `.env.example` when runtime contracts changed.

Implementation reports are dated snapshots. They must not be silently edited to look current; add a newer report or update the active architecture/context instead.

## Status labels

Every planning or audit document must declare one of:

- `Current` — authoritative within its stated role.
- `Active operational checklist` — used for an upcoming gate.
- `Research reference` — evidence, not a product decision.
- `Historical snapshot` — accurate only at its recorded date.
- `Superseded` — replaced; retained for history.
- `Archive candidate` — proposed move after approval.

No document may say `current`, `proposed`, or `awaiting approval` after its implementation state has materially changed without being updated or marked superseded.
