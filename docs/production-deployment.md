# Folveta Production Deployment

Status: **Production pre-launch setup in progress; not a public launch record**  
Last updated: 2026-08-26  
Canonical target: `https://folveta.com`

## Deployment identity

| Item | Configuration | Current state |
| --- | --- | --- |
| GitHub repository | `https://github.com/yumao3623/folveta` | Vercel GitHub App access confirmed |
| Production branch | `main` | Import target; feature branch is not merged or pushed yet |
| Vercel team/project | `creen ai` / `folveta` | Import configuration staged; project is created by the first Deploy |
| Framework | Next.js 16.3.2 App Router | Vercel native Next.js preset |
| Root directory | `./` | Confirmed |
| Build/output/install | `npm run build`; Next.js default output; `npm install` | Vercel defaults, no override |
| Runtime compatibility | Next.js requires Node.js 20.9+; Vercel supported Node runtime | Live build still required |
| Production origin | `https://folveta.com` | Environment value staged; DNS/TLS not verified |
| Preferred hostname | `folveta.com` | `www.folveta.com` must redirect directly to apex |

Do not run the first Vercel Deploy from the old `main`. The pre-launch code must be reviewed, committed, and explicitly approved for merge/push first.

## Domain and DNS strategy

Add both `folveta.com` and `www.folveta.com` to the single Vercel project. Make the apex the production primary domain and configure `www` to redirect to it. Use only the DNS records Vercel reports for the actual domain after it is attached. Inspect existing registrar records before changing anything, and never delete an uncertain mail, verification, or service record. Vercel handles HTTP to HTTPS after DNS validation and certificate issuance.

DNS, SSL, apex reachability, the `www` redirect, and redirect-chain status are not yet verified. Do not submit a sitemap or request indexing during pre-launch.

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

## Supabase Auth and environment boundary

The current pre-launch reuses the existing Supabase project named `study-guide-maker`, which already contains migrations through `202608260005`, the private Storage bucket, and the verified Product-3 schema. This is a pragmatic pre-launch choice, not a claim of full environment isolation:

- Supabase Site URL: `https://folveta.com`.
- Exact redirect URLs: `https://folveta.com/auth/callback` and `http://localhost:3000/auth/callback`.
- No broad wildcard redirect is configured.
- Vercel Supabase credentials are Production-only; Preview cannot access this backend.
- Localhost and Production temporarily share the Supabase project. Avoid destructive dev fixtures and revisit separate environments before public launch.

Email sign-up uses PKCE `emailRedirectTo` built from `NEXT_PUBLIC_SITE_URL`. Sign-in redirects only to validated same-origin paths. Sign-out clears the Supabase session and returns to `/`.

## Cookies and HTTPS

The anonymous `sgm_session` cookie is HttpOnly, SameSite=Lax, path `/`, host-only, and Secure when `NODE_ENV=production`. The Supabase SSR client owns Auth cookie creation/refresh, while `proxy.ts` refreshes valid sessions and clears stale Auth cookies. Live HTTPS QA must inspect the actual Set-Cookie attributes, login/logout, email confirmation, and anonymous-to-account claim behavior.

## Brand icon assets

`app/favicon.ico` replaces the obsolete black/white default favicon. `app/icon.png` provides Next.js app icon metadata. Both derive from the approved green Folveta `F`; the source wordmark is retained at `public/brand/folveta-wordmark.png`. Existing page wordmark and Logo rendering are unchanged.

Browser favicon verification must use the rendered icon links and direct icon responses. If a browser shows a cached icon, use a private window, hard reload, or open `/favicon.ico?verify=<timestamp>`; do not infer failure from one cached tab alone.

## Verification ledger

Verified locally:

- Git branch was created from clean `main` at `28babfab2ed1cab72844e6c6675ab98800e86b24`.
- Next.js emits the new favicon and app-icon links.
- Homepage emits `noindex,nofollow` in the default pre-launch state.
- Automated index-mode tests cover fail-closed Production, Preview, robots, sitemap, and permanent private-route policy.
- Supabase Auth Site URL and exact production/localhost callbacks were configured in the dashboard.

Staged but not live-verified:

- Vercel project creation and GitHub production deployment.
- Production environment persistence after project creation.
- Domain attachment, registrar DNS, certificate issuance, HTTP to HTTPS, and `www` to apex redirect.
- Production canonical, OG, JSON-LD, robots, sitemap, favicon, fonts, CSS, console, and network behavior.
- Auth sign-up/sign-in/sign-out, PKCE callback, anonymous claim, My Guides, Library, Search, Profile, mobile behavior, and cookie attributes on HTTPS.
- Deployment protection, retention scheduling, monitoring, production deletion, account deletion, rate limits, Payment, SEO v2, and indexing cutover.

## Rollback

If live metadata, Auth, domain, or core behavior is wrong, keep or restore `PRELAUNCH=true`, retain Preview isolation, and roll Vercel Production back to the last known-good deployment. DNS changes must be reversed only from recorded before/after values. Never use robots as a privacy or emergency access-control boundary.
