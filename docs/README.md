# Folveta Documentation Index

Status: **Active governance index**  
Last updated: 2026-09-07

## Authority order

When documents disagree, use this order:

1. `docs/product/decisions.md` — approved product decisions and preserved decision history.
2. `docs/product/product-context.md` — concise current product facts, implemented baseline, and present constraints.
3. `docs/product/v5-master-roadmap.md` — active phase order, dependencies, scope, tests, and exit criteria.
4. `docs/architecture/technical-architecture.md` — actual technical architecture and target boundaries.
5. `docs/architecture/seo-architecture.md` — Folveta-specific SEO ownership, route index policy, and launch cutover.
6. Current code, migrations, tests, and environment contracts — authority for what is actually implemented.
7. Historical plans, research, audits, and implementation reports — context only.

If current code contradicts a document's claim that something is implemented, the code wins and the active documents must be corrected in the same task.

## Product documents

| Document | Role |
| --- | --- |
| `product/decisions.md` | Highest product decision source of truth; never erase historical decisions |
| `product/product-context.md` | Current product, market, UI, commercial, SEO, and implementation context |
| `product/v5-master-roadmap.md` | Current master delivery roadmap |

## Architecture documents

| Document | Role |
| --- | --- |
| `architecture/technical-architecture.md` | Current code/data/API/security architecture and approved target boundaries |
| `architecture/payment-billing-architecture.md` | Current Payment/Billing architecture and completed Sandbox/Live implementation record |
| `architecture/auth-and-persistence.md` | Product-3A identity, anonymous claim, RLS, persistence, and retention architecture |
| `architecture/guide-management.md` | Product-3B My Guides, Recent Guides, management API, lifecycle, pagination, and privacy architecture |
| `architecture/library-search-profile.md` | Product-3C Library, PostgreSQL search, Profile, navigation, authorization, migration, and verification architecture |
| `architecture/ui-design-system.md` | Current Folveta UI Foundation v2 tokens, primitives, states, icon policy, and asset policy |
| `architecture/generation-v2-design.md` | Current Generation v2 architecture, implementation record, rollout gates, and rollback contract |
| `architecture/seo-architecture.md` | Folveta-specific SEO v2 architecture and index policy |
| `architecture/SEO_GUIDE.md` | Reusable SEO standard, not Folveta page ownership by itself |

## Operations documents

| Document | Role |
| --- | --- |
| `operations/seo-growth-v1.md` | Current post-launch SEO growth operating record and query/page ownership |
| `operations/seo-growth-backlink-tracker.md` | Active backlink and mention research tracker; external communication requires owner approval |
| `operations/production-seo-checklist.md` | Operational pre-launch/launch/post-launch checklist |
| `operations/production-deployment.md` | Current deployment runbook; verification evidence is dated |

## Supabase migration workflow

Dev schema changes are applied only through the official Supabase CLI and the ordered files in `supabase/migrations/`. The current dev project is linked in local ignored CLI state; a new workstation must run `npx --yes supabase@latest login` and `npx --yes supabase@latest link --project-ref <dev-project-ref>` locally without sharing credentials in chat. Review with `npx --yes supabase@latest db push --dry-run`, apply with `npx --yes supabase@latest db push`, and confirm local/remote parity with `npx --yes supabase@latest migration list`.

Never execute repository migrations ad hoc through the service-role client or dashboard SQL editor. If history or schema drifts, inspect both first and repair the repository/official migration history rather than creating untracked remote state.

## Historical snapshots

These files preserve dated decisions or verification evidence and must not be used as the current repository status.

| Document | Status |
| --- | --- |
| `research/current-state-audit.md` | Historical snapshot of the repository from 2026-08-25 with cleanup execution recorded on 2026-08-26 |
| `research/folveta-root-redesign-audit.md` | Historical snapshot of Generation v2 research and decisions from 2026-09-03 |
| `research/ai-generation-p0-remediation-design.md` | Historical snapshot of the Generation v1 remediation design from 2026-08-28 |
| `operations/ai-generation-workflow-rollout.md` | Historical snapshot of the Generation v1 production rollout verified on 2026-08-31 |
| `operations/paddle-live-onboarding.md` | Historical snapshot of Paddle Live onboarding and closeout from 2026-09-02 |

## Archived historical documents

| Document | Status |
| --- | --- |
| `archive/mvp-ux-spec.md` | Superseded v3 UX plan; historical baseline only |
| `archive/mvp-technical-plan.md` | Superseded proposed MVP architecture; useful for original intent, not current status |
| `archive/seo-audit.md` | Historical pre-implementation SEO snapshot |
| `archive/seo-implementation-report.md` | Historical SEO implementation snapshot |
| `archive/assessment-validity-plan.md` | Historical v2 Mock Exam validation plan |

## Research references

These documents remain evidence and context. They are not a Current Decision Source and their recommendations defer to the active v5 documents above.

| Document | Status |
| --- | --- |
| `research/user-pain-validation.md` | Research evidence; product recommendations defer to current decisions |
| `research/study-guide-maker-competitor-analysis.md` | Research snapshot; recommendations defer to current decisions |

## Update rules

Every material product decision task must update, in the same change:

1. `product/decisions.md` with the new decision while preserving history.
2. `product/product-context.md` with the changed current facts.
3. `product/v5-master-roadmap.md` if phase scope, order, dependency, or exit criteria changed.
4. `architecture/technical-architecture.md` for data, API, security, provider, deployment, or runtime changes.
5. `architecture/seo-architecture.md` for brand, domain, page ownership, route, index, schema, pricing-page, or launch-index changes.
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
