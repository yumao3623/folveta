# Folveta

Folveta is a Study Guide Maker that turns supported course materials into a structured, source-grounded Study Guide with an optional five-question Quick Check.

Current implemented loop:

`Upload PDF/PPTX -> parse -> generate Study Guide -> optional Quick Check -> return to relevant Guide sections`

The repository is now governed by the v5 documents. Start with [docs/README.md](docs/README.md), then read:

- [Product decisions](docs/decisions.md)
- [Current product context](docs/product-context.md)
- [v5 master roadmap](docs/v5-master-roadmap.md)
- [Current technical architecture](docs/technical-architecture.md)
- [Folveta SEO architecture](docs/seo-architecture.md)
- [Current-state and cleanup audit](docs/current-state-audit.md)

## Current status

Implemented:

- Landing/upload, private PDF/PPTX parsing, structured Guide generation, source grounding, Study Guide workspace, Quick Check, and Results/Learning Loop.
- Anonymous high-entropy session access with seven-day expiry.
- Supabase Postgres/private Storage, OpenAI-compatible structured model pipeline, and focused parser/schema/Quick Check/SEO tests.
- Public trust pages and the first SEO technical foundation.

Not implemented:

- Persistent Auth, My Guides, Recent Guides, Library, knowledge search, Profile, and multi-guide management.
- Payment/Billing and entitlement enforcement.
- Scheduled data deletion, full E2E/integration coverage, controlled pre-launch indexing, production monitoring, and public launch.

The visible workspace Search/My Guides/Library/Profile controls are not real Product-3 features yet. Do not describe them as implemented.

## Run locally

Requirements: Node.js 22+ and a Supabase project for real upload/generation. The fixture Guide at `/study/demo` works without Supabase/model credentials.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Apply migrations in order:

1. `supabase/migrations/202608240001_phase1.sql`
2. `supabase/migrations/202608240002_phase2_quick_check.sql`

## Environment

See `.env.example` for:

- canonical site origin;
- Supabase public/server credentials and private Storage bucket;
- OpenAI-compatible endpoint/key and task model aliases;
- prompt/schema versions and anonymous session retention.

Model names remain configuration, not business-logic literals. Do not expose the Supabase service-role key or model API key to the browser.

## Current input limits

Limits are centralized in `lib/config.ts`:

- 5 files per session;
- 25 MB per file;
- 150 combined PDF pages/PPTX slides;
- 300,000 normalized extracted characters;
- text-based PDF and PPTX only.

OCR, handwriting, image/chart/diagram understanding, audio/video/URL input, pasted text, and open-web research are not currently supported.

## Verification

```bash
npm run fixtures:generate
npm test
npm run typecheck
npm run lint
npm run build
```

Read `AGENTS.md` and the relevant Next.js 16 documentation under `node_modules/next/dist/docs/` before changing application code.
