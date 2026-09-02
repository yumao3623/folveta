# Folveta Production Deployment

Status: **Production public launch and indexing cutover recorded**
Last updated: 2026-09-02
Canonical target: `https://folveta.com`

## Deployment identity

| Item | Configuration | Current state |
| --- | --- | --- |
| GitHub repository | `https://github.com/yumao3623/folveta` | Vercel GitHub App access confirmed |
| Production branch | `main` | GitHub-triggered Production deployment at `6107dac49cae2eec559c19056b9abefe88ca3312` (`READY`) |
| Vercel team/project | `creen ai` / `folveta` | Live and connected to `yumao3623/folveta` |
| Framework | Next.js 16.3.2 App Router | Vercel native Next.js preset |
| Root directory | `./` | Confirmed |
| Build/output/install | `npm run build`; Next.js default output; `npm install` | Vercel defaults, no override |
| Runtime compatibility | Next.js requires Node.js 20.9+; Vercel supported Node runtime | Production build verified |
| Production origin | `https://folveta.com` | Live with valid HTTPS |
| Preferred hostname | `folveta.com` | `www.folveta.com` redirects `308` to apex |

The pre-launch infrastructure and environment hotfix were followed by the independent public-launch cutover recorded in this document. The current production deployment is the launch baseline.

## Paddle Sandbox boundary

Paddle Billing v1 is deployed only to the separate `folveta-paddle-sandbox` Vercel project. Its Sandbox environment uses a Paddle Sandbox API key, client-side token, notification secret, Product/Price, and `PADDLE_ENV=sandbox`; secret values are not recorded here. The notification destination is active at the Sandbox webhook route and recent subscription and transaction deliveries succeeded.

The existing shared Supabase project is isolated at the billing-record level by the server-derived `billing_environment` (`sandbox` or `live`). All provider IDs, entitlement reads, usage/reservations, generation accounting, and webhook idempotency are scoped to that value; missing, unknown, or legacy environments fail closed. Therefore a Sandbox subscription cannot grant Pro on `folveta.com`.

Production `folveta.com` is configured for Paddle Live. Merchant/KYC, website approval, payout setup, Live Product/Price/Checkout/webhook, payment acceptance, cancellation, and the US$12 refund flow were completed in the inherited onboarding task. Secrets are intentionally not recorded here.

## Domain and DNS strategy

Both `folveta.com` and `www.folveta.com` are attached to the single Vercel project. The apex is the production primary domain; `www` redirects directly to it. The verified public DNS values are `A folveta.com -> 216.198.79.1` and `CNAME www.folveta.com -> 83541033d72053fa.vercel-dns-017.com`. No unrelated DNS record was removed.

DNS, certificate issuance, apex reachability, HTTP-to-HTTPS, and `www`-to-apex `308` behavior passed live verification on 2026-08-27. The pre-launch empty-sitemap behavior was superseded by the 2026-09-02 launch cutover; the production sitemap is now submitted in Search Console.

## Environment contract

No secret value belongs in this document, source control, screenshots, or chat.

| Variable | Exposure | Production requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://folveta.com` |
| `PRELAUNCH` | Server-only | Exact `false` in Vercel Production; fail-closed elsewhere |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Current Supabase project URL; Production scope only during this pre-launch |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client credential | Current project anon/publishable key; Production scope only |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Public | `course-materials` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret, server-only | Current project service-role/secret key; Production scope only |
| `SUPABASE_STORAGE_BUCKET` | Server-only | `course-materials` |
| `MODEL_PROVIDER` | Server-only | `openai` |
| `OPENAI_BASE_URL` | Server-only | Preserve the configured compatible endpoint; do not change it to address unrelated 502 responses |
| `OPENAI_API_KEY` | Secret, server-only | Production scope only |
| `MODEL_TOPIC_EXTRACT` | Server-only | Current configured model ID |
| `MODEL_TOPIC_MERGE` | Server-only | Current configured model ID |
| `MODEL_GUIDE` | Server-only | Current configured model ID |
| `MODEL_GROUNDING_VERIFY` | Server-only | Current configured model ID |
| `MODEL_QUICK_CHECK` | Server-only | Current configured model ID |
| `MODEL_QUESTION_VERIFY` | Server-only | Current configured model ID |
| `PROMPT_VERSION` | Server-only | `phase1-v1` |
| `GUIDE_SCHEMA_VERSION` | Server-only | `1.0` |
| `QUICK_CHECK_SCHEMA_VERSION` | Server-only | `1.0` |
| `SESSION_RETENTION_DAYS` | Server-only | `7` |
| `AI_GENERATION_WORKFLOW_ENABLED` | Server-only | `true`; legacy OFF fallback remains in code |
| `CRON_SECRET` | Secret, server-only | Configured for the protected reconciler; never exported or recorded |
| `RETENTION_JOB_SECRET` | Secret, server-only | Optional for app startup; required before scheduling retention cleanup |

Preview is always `noindex,nofollow` through `VERCEL_ENV`, regardless of `PRELAUNCH`. Production Supabase and OpenAI secret credentials are withheld from Preview until an isolated preview service plan exists.

## PRELAUNCH behavior

`PRELAUNCH` is fail-closed:

- Missing, invalid, or `true`: public discovery pages inherit `noindex,nofollow`; sitemap contains no URLs; robots does not advertise the sitemap.
- Any Vercel environment other than Production: always treated as pre-launch.
- Exact `false` in Vercel Production: public `/`, `/about`, `/privacy`, and `/terms` may become `index,follow` and enter the sitemap.
- Private, account, search, study, result, and future billing routes remain `noindex,nofollow` in every mode.

Changing `PRELAUNCH` to `false` was the explicit public-launch action for this task. Rollback is to restore the prior fail-closed value and re-verify live metadata, robots, and sitemap before resubmitting indexing.

## AI reliability status

The AI Workflow rollout gate passed on commit `613dbeb`. The Production provider boundary probe passed inside Vercel runtime and its temporary route was removed. A Workflow smoke, three fresh real-PDF generations, and two fresh legacy-PPT generations completed and rendered with no retry, deadline, or duplicate-settlement observation. Supabase Cron is the only reconciler scheduler and runs every minute. Detailed privacy-safe telemetry and remaining risks are in `docs/ai-generation-workflow-rollout.md`. The current five real-material samples do not establish p95.

## Supabase Auth and environment boundary

Production reuses the existing Supabase project named `study-guide-maker`, whose traceable remote migration history includes every repository migration through `20260830080742`, including source-format expansion and durable AI Workflow/Cron changes. This remains a documented environment-isolation constraint:

- Supabase Site URL: `https://folveta.com`.
- Exact redirect URLs: `https://folveta.com/auth/callback` and `http://localhost:3000/auth/callback`.
- No broad wildcard redirect is configured.
- Vercel Supabase credentials are Production-only; Preview cannot access this backend.
- Localhost and Production temporarily share the Supabase project. Avoid destructive dev fixtures and revisit separate environments before broader scale.

Email sign-up uses PKCE `emailRedirectTo` built from `NEXT_PUBLIC_SITE_URL`. Sign-in redirects only to validated same-origin paths. Sign-out clears the Supabase session and returns to `/`.

Production sign-up sent a real confirmation email and the account became confirmed; password sign-in, refresh, sign-out, and sign-in again passed. A fresh same-browser PKCE run produced `/signup 200`, `/verify 303`, `/token 200`, `/user 200`, returned to `https://folveta.com/profile`, and preserved the anonymous aggregate through claim. A separate cross-device attempt reached Folveta without a usable callback `code` and is retained as historical evidence only. The default Supabase email template uses `{{ .ConfirmationURL }}` and cannot be changed on the current default-mail setup without Custom SMTP.

## Cookies and HTTPS

The anonymous `sgm_session` cookie was live-verified as HttpOnly, SameSite=Lax, path `/`, host-only, and Secure. Its create request returned `201`, repeated owned status requests returned `200`, and no related browser console error occurred. The Supabase SSR client owns Auth cookie creation/refresh, while `proxy.ts` refreshes valid sessions and clears stale Auth cookies. Auth refresh, sign-out isolation, and relogin passed; raw Auth cookie values were not inspected or recorded.

## Brand icon assets

`app/favicon.ico` replaces the obsolete black/white default favicon. `app/icon.png` provides Next.js app icon metadata. Both derive from the approved green Folveta `F`; the source wordmark is retained at `public/brand/folveta-wordmark.png`. Existing page wordmark and Logo rendering are unchanged.

Browser favicon verification must use the rendered icon links and direct icon responses. If a browser shows a cached icon, use a private window, hard reload, or open `/favicon.ico?verify=<timestamp>`; do not infer failure from one cached tab alone.

## Verification ledger

Verified locally and in Production:

- Git branch was created from clean `main` at `28babfab2ed1cab72844e6c6675ab98800e86b24`.
- Next.js emits the new favicon and app-icon links.
- Homepage emits `noindex,nofollow` in the default pre-launch state.
- Automated index-mode tests cover fail-closed Production, Preview, robots, sitemap, and permanent private-route policy.
- Supabase Auth Site URL and exact production/localhost callbacks were configured in the dashboard.
- Vercel Production is `READY` from GitHub `main` commit `6107dac49cae2eec559c19056b9abefe88ca3312`. The latest deployment is linked to that commit (Vercel ID `dpl_8BeB3kMaagkXLT4WKJ13hiCfQqSy`).
- `folveta.com` returns `200` over HTTPS; HTTP and `www` redirect `308` to the preferred HTTPS apex.
- Public `/`, `/about`, `/privacy`, and `/terms` return `200`, self-canonicalize to the Production origin, and emit `index,follow` after the launch cutover.
- `robots.txt` returns `200` and advertises the production sitemap; `sitemap.xml` returns `200` with the seven approved public URLs.
- Favicon/app icon, fonts, CSS, desktop/mobile rendering, and public-page console checks passed.
- Anonymous session create/persist, signed Storage upload, PDF parse, AI Guide generation/grounding, anonymous-to-account claim, Guide reopen, My Guides, Library, Search, Profile, Quick Check, persisted Results, Auth refresh, sign-out isolation, and relogin passed against Production test data.
- AI Workflow smoke plus real PDF x3 and legacy PPT x2 passed from new Production sessions; reload/browser loss did not own or stop Workflow execution.
- `generation-reconcile` is active in Supabase Cron at `* * * * *`; recent runs succeeded, a direct authenticated call returned `200`, an unauthenticated call returned `401`, and no Vercel Cron remains.
- The generated Production QA aggregate retained exactly one Guide and one Source after claim/relogin; the Quick Check result persisted at `5/5`.
- Vercel Runtime Logs showed the exercised Production Guide/workspace routes with expected `200` responses and the reopen route with its expected `307`; the inspected rows contained no runtime error message.

Open or not live-verified:

- Raw Supabase Auth `Set-Cookie` attribute inspection; functional refresh, sign-out, isolation, and relogin passed without recording token values.
- A reusable automated browser suite, full cross-browser/accessibility/performance audit, and comprehensive runtime-log/observability review.
- Full cross-browser/accessibility/performance audit and post-launch monitoring remain separate operational work. Backup/PITR remains an accepted owner risk; account deletion, retention cleanup, distributed rate limiting, and monitoring are READY per the inherited Production Readiness closeout.
- Preview remains intentionally unable to build against Production-only Supabase credentials; no Production secret should be added to Preview to clear that expected isolation failure.

## Rollback

If live metadata, Auth, domain, billing, or core behavior is wrong, restore the prior fail-closed `PRELAUNCH` value and roll Vercel Production back to the last known-good deployment as appropriate. DNS changes must be reversed only from recorded before/after values. Never use robots as a privacy or emergency access-control boundary.
