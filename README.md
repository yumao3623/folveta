# Folveta

Status: **Current repository overview; production-specific claims defer to dated deployment records.**
Last updated: 2026-09-07

Folveta is a Study Guide Maker that turns supported course materials into a structured, source-grounded Study Guide with an optional five-question Quick Check.

Current implemented loop:

`Upload PDF/Word/Excel/PowerPoint/image -> parse -> generate Study Guide -> optional Quick Check -> return to relevant Guide sections`

The repository is now governed by the v5 documents. Start with [docs/README.md](docs/README.md), then read:

- [Product decisions](docs/decisions.md)
- [Current product context](docs/product-context.md)
- [v5 master roadmap](docs/v5-master-roadmap.md)
- [Current technical architecture](docs/technical-architecture.md)
- [Folveta SEO architecture](docs/seo-architecture.md)

## Current status

Implemented:

- Landing/upload, private multi-format parsing, source-grounded Guide generation, Study Guide workspace, Quick Check, and Results/Learning Loop.
- Durable Generation v1 plus a controlled Generation v2 path with artifact persistence, partial-delivery support, dual reads, billing admission, and allowlist routing.
- Anonymous seven-day session access plus Supabase email/password Auth, anonymous claim, password recovery, persistent My Guides, Library, Search, Profile, and account deletion.
- Paddle Live Checkout, signed/idempotent webhooks, Customer Portal, Free/Pro entitlements, and server-side usage enforcement.
- Daily retention cleanup, distributed rate limiting, private-route `noindex`, and eight approved public sitemap routes including the PDF-focused landing page.
- Supabase Postgres/private Storage, an OpenAI-compatible structured model pipeline, and automated parser, schema, workflow, billing, ownership, UI, and SEO coverage.

Open work:

- Complete controlled Generation v2 Production acceptance, representative quality/latency measurement, default-routing review, and eventual Generation v1 retirement.
- Expand reusable browser E2E, visual regression, cross-browser, accessibility, and performance coverage.
- Complete the post-launch 24-hour/7-day monitoring review; backup/PITR remains an accepted operator risk.
- Google indexing and field Core Web Vitals remain external, asynchronous signals rather than repository-complete work.

## Run locally

Requirements: Node.js 22+ and a Supabase project for real upload/generation. The fixture Guide at `/study/demo` works without Supabase/model credentials.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Apply every ordered migration under `supabase/migrations/` through the latest filename with the official Supabase CLI. Do not execute repository migrations ad hoc through the service-role client or dashboard SQL editor.

## Environment

See `.env.example` for:

- canonical site origin;
- Supabase public/server credentials and private Storage bucket;
- OpenAI-compatible endpoint/key and task model aliases;
- prompt/schema versions and anonymous session retention;
- Workflow and Generation v2 rollout controls;
- Paddle environment, catalog, webhook, and entitlement settings;
- production indexing, retention, reconciliation, and internal-job controls.

Model names remain configuration, not business-logic literals. Do not expose the Supabase service-role key or model API key to the browser.

## Current input limits

Limits are split between `lib/config.ts` and `lib/billing/config.ts`:

- 25 MB per file;
- Free: 3 files, 75 combined source units, and 150,000 normalized extracted characters per Guide;
- Folveta Pro server policy: 10 files, 300 combined source units, and 600,000 normalized extracted characters per Guide; the current upload UI still caps a Guide at 5 files, so the effective file limit through that UI is currently 5;
- PDF, DOCX, XLSX, PPTX, legacy Office, and common image inputs; `.ppt` uses local slide-text extraction, while legacy `.doc/.xls` use controlled file-input extraction when local structural parsing is unavailable.

Common image files are accepted through constrained visual-text extraction. Scanned PDF pages, handwriting, and visual-only charts/diagrams may remain visible gaps when reliable text cannot be extracted. Audio/video/URL input, pasted text, and open-web research are not currently supported.

## Verification

```bash
npm run check
```

`npm run check` runs lint, typecheck, ordinary tests, Workflow tests, and the production build in sequence.

Read `AGENTS.md` and the relevant Next.js 16 documentation under `node_modules/next/dist/docs/` before changing application code.
