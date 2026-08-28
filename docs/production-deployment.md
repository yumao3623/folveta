# Folveta Production Deployment

Status: **Production pre-launch infrastructure live; AI reliability hardening in progress; not a public launch record**
Last updated: 2026-08-28
Canonical target: `https://folveta.com`

## Deployment identity

| Item | Configuration | Current state |
| --- | --- | --- |
| GitHub repository | `https://github.com/yumao3623/folveta` | Vercel GitHub App access confirmed |
| Production branch | `main` | GitHub-triggered Production deployment at `2dcc4d969baa03d4ef6e1deefb9d417c74b1eb1d` (`Ready`) |
| Vercel team/project | `creen ai` / `folveta` | Live and connected to `yumao3623/folveta` |
| Framework | Next.js 16.3.2 App Router | Vercel native Next.js preset |
| Root directory | `./` | Confirmed |
| Build/output/install | `npm run build`; Next.js default output; `npm install` | Vercel defaults, no override |
| Runtime compatibility | Next.js requires Node.js 20.9+; Vercel supported Node runtime | Production build verified |
| Production origin | `https://folveta.com` | Live with valid HTTPS |
| Preferred hostname | `folveta.com` | `www.folveta.com` redirects `308` to apex |

The pre-launch infrastructure and environment hotfix are on `main`. Later closeout changes still require an independent reviewed commit; do not perform a public indexing cutover from this task.

## Domain and DNS strategy

Both `folveta.com` and `www.folveta.com` are attached to the single Vercel project. The apex is the production primary domain; `www` redirects directly to it. The verified public DNS values are `A folveta.com -> 216.198.79.1` and `CNAME www.folveta.com -> 83541033d72053fa.vercel-dns-017.com`. No unrelated DNS record was removed.

DNS, certificate issuance, apex reachability, HTTP-to-HTTPS, and `www`-to-apex `308` behavior passed live verification on 2026-08-27. Do not submit a sitemap or request indexing during pre-launch.

## Environment contract

No secret value belongs in this document, source control, screenshots, or chat.

| Variable | Exposure | Production requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://folveta.com` |
| `PRELAUNCH` | Server-only | `true` until explicit launch approval |
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
| `RETENTION_JOB_SECRET` | Secret, server-only | Optional for app startup; required before scheduling retention cleanup |

Preview is always `noindex,nofollow` through `VERCEL_ENV`, regardless of `PRELAUNCH`. Production Supabase and OpenAI secret credentials are withheld from Preview until an isolated preview service plan exists.

## PRELAUNCH behavior

`PRELAUNCH` is fail-closed:

- Missing, invalid, or `true`: public discovery pages inherit `noindex,nofollow`; sitemap contains no URLs; robots does not advertise the sitemap.
- Any Vercel environment other than Production: always treated as pre-launch.
- Exact `false` in Vercel Production: public `/`, `/about`, `/privacy`, and `/terms` may become `index,follow` and enter the sitemap.
- Private, account, search, study, result, and future billing routes remain `noindex,nofollow` in every mode.

Changing `PRELAUNCH` to `false` is a public-launch action. It requires Payment, SEO v2, Production Readiness, live QA, and explicit launch-owner approval. It is not part of this task.

## AI reliability status

Production AI pipeline functional but reliability hardening in progress. A controlled run has completed, but real-user material has also produced `MODEL_EMPTY_OUTPUT` through the configured `portdan.com` OpenAI-compatible gateway. The deployed status must not be described as stable until the checkpoint migration and reliability code are deployed and repeated real-material generations complete with recorded, privacy-safe diagnostics.

## Supabase Auth and environment boundary

The current pre-launch reuses the existing Supabase project named `study-guide-maker`, which contains migrations through `202608260005`, the private Storage bucket, and the verified Product-3 schema. The source-format expansion migration `202608280002_source_format_expansion.sql` is present locally and must be applied and verified before its expanded schema/storage contract is treated as deployed. This is a pragmatic pre-launch choice, not a claim of full environment isolation:

- Supabase Site URL: `https://folveta.com`.
- Exact redirect URLs: `https://folveta.com/auth/callback` and `http://localhost:3000/auth/callback`.
- No broad wildcard redirect is configured.
- Vercel Supabase credentials are Production-only; Preview cannot access this backend.
- Localhost and Production temporarily share the Supabase project. Avoid destructive dev fixtures and revisit separate environments before public launch.

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
- Vercel Production is Ready from GitHub `main` commit `2dcc4d969baa03d4ef6e1deefb9d417c74b1eb1d`; an empty optional `RETENTION_JOB_SECRET` is normalized to absent without accepting a short non-empty secret. The latest Production deployment is `folveta-c3nxpgivn-creen-ai.vercel.app` (Vercel ID `JE5XqsKHvQi3ikqEigfwEeNtnmW6`).
- `folveta.com` returns `200` over HTTPS; HTTP and `www` redirect `308` to the preferred HTTPS apex.
- Public `/`, `/about`, `/privacy`, and `/terms` return `200`, self-canonicalize to the Production origin, and emit `noindex,nofollow` while `PRELAUNCH=true`.
- `robots.txt` returns `200` without advertising a sitemap; `sitemap.xml` returns `200` with an empty URL set.
- Favicon/app icon, fonts, CSS, desktop/mobile rendering, and public-page console checks passed.
- Anonymous session create/persist, signed Storage upload, PDF parse, AI Guide generation/grounding, anonymous-to-account claim, Guide reopen, My Guides, Library, Search, Profile, Quick Check, persisted Results, Auth refresh, sign-out isolation, and relogin passed against Production test data.
- The generated Production QA aggregate retained exactly one Guide and one Source after claim/relogin; the Quick Check result persisted at `5/5`.
- Vercel Runtime Logs showed the exercised Production Guide/workspace routes with expected `200` responses and the reopen route with its expected `307`; the inspected rows contained no runtime error message.

Open or not live-verified:

- Raw Supabase Auth `Set-Cookie` attribute inspection; functional refresh, sign-out, isolation, and relogin passed without recording token values.
- A reusable automated browser suite, full cross-browser/accessibility/performance audit, and comprehensive runtime-log/observability review.
- Deployment protection, retention scheduling, monitoring, production deletion, account deletion, rate limits, Payment, SEO v2, and indexing cutover.
- Preview remains intentionally unable to build against Production-only Supabase credentials; no Production secret should be added to Preview to clear that expected isolation failure.

## Rollback

If live metadata, Auth, domain, or core behavior is wrong, keep or restore `PRELAUNCH=true`, retain Preview isolation, and roll Vercel Production back to the last known-good deployment. DNS changes must be reversed only from recorded before/after values. Never use robots as a privacy or emergency access-control boundary.
