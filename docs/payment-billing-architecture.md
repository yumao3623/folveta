# Folveta Payment / Billing v1 Architecture Decision

Status: **Current architecture and Live implementation record**
Decision date: 2026-09-02
Scope: architecture, product rules, and the completed Paddle Sandbox/Live implementation boundary.

This document began as a proposal based on `main@c894dab` and provider documentation checked on 2026-08-31. Sections describing the proposal and Sandbox closeout are retained as history; the superseding Production state is recorded in section 29 below. No secret values are recorded.

## 1. Current facts and cost audit

> Historical proposal sections below describe the design review before Live approval. The implemented Live offer and production verification supersede any earlier statement that Live billing, Checkout, or public launch remained unapproved.

The durable owner is already `auth.users.id`. Anonymous sessions may generate and later be atomically claimed by a verified account; a payment flow must require sign-in before checkout. The current AI Workflow remains the baseline and is not redesigned here.

The implemented Study Guide path has these model-cost actions:

| Action | Current implementation | Provider operations |
| --- | --- | ---: |
| Image parsing | `image_extract` for an image source | 1 per image |
| Legacy `.doc` / `.xls` parsing | `file_extract` fallback | 1 per legacy file |
| Topic planning | One `plan_topics` call when the source snapshot fits the safe budget | 1 |
| Batched topic extraction | `extract_topics` once per source batch, then `merge_topics` | N batches + 1 merge |
| Guide topic generation | `generate_guide` once per merged topic | T, where T <= 12 |
| Grounding verification | `grounding_verify` once per generated topic with claims | up to T |
| Finalization | Database operation; no model call | 0 |

Therefore a normal single-call plan costs `2 + 2T` provider operations (plan + guide + grounding), usually 10–26 for 4–12 topics. A batched plan costs `N + 1 + 2T`, where N is the extraction-batch count. The Production rollout samples recorded 10, 12, 16, and 18 logical operations for real materials. They used 9, 11, 15, and 17 provider attempts because no retry was used in those runs; the difference is operation accounting versus attempt accounting. A retry can create another provider attempt without creating another user-visible Guide usage unit.

Quick Check is not free in provider terms. For a requested five-question check, the current code makes exactly two model calls when no cached check exists: one `quick_check` call that generates up to ten candidates and one `question_verify` call. Submitting answers is deterministic and has no model cost. Cached checks for the same Guide checksum and question count do not call the provider again.

The current parser is deterministic for PDF, PPT/PPTX, DOCX, XLSX, and legacy PPT. Image parsing and legacy DOC/XLS fallback parsing can incur one additional model call per file before Guide generation. Provider retries are disabled in the gateway; Workflow retries are database-authorized and bounded. The internal cost metric is therefore provider attempts plus recorded token usage, not browser requests.

## 2. Recommended product model

### Recommendation

Use **Free + one Paid monthly subscription** for v1. Do not launch credit packs or multiple paid tiers until real usage data exists.

The paid product should make the existing core loop more useful, not remove the core learning value from Free. The public offer must be visible before a costly generation starts; there must be no surprise result-stage paywall.

### Free tier proposal [CONFIRM]

- Anonymous generation remains available.
- **1 successful Study Guide per rolling calendar month for an account; 1 successful Guide for an anonymous session.** Anonymous use stays claimable for seven days under the existing flow.
- Up to **3 files per Guide**, **75 source units** total, and **150,000 normalized extracted characters**.
- PDF, PPT/PPTX, DOC/DOCX, XLS/XLSX, and image formats remain available subject to parser support.
- One five-question Quick Check for each generated Guide, included in the Guide usage.
- Guide persistence, My Guides, Library, Search, and reopen remain available after account sign-in/claim. Anonymous persistence keeps the existing seven-day expiry.
- No artificial shortening of the Guide, no hidden topic paywall, and no paid-only grounding or Results screen.

The lower Free limits are a cost and abuse boundary, not a degradation of the product contract. They should be validated against real source sizes before implementation.

### Paid tier proposal [CONFIRM]

- One plan, monthly recurring, initially **USD 9–15/month; recommended launch anchor USD 12/month**.
- **10 successful Study Guides per billing period**.
- Up to **10 files per Guide**, **300 source units**, and **600,000 normalized extracted characters**.
- Quick Check included for every Guide, with the same five-question default and the existing ten-question maximum.
- The existing persistence, reopen, Library, Search, and account ownership behavior remains.
- The service may display a usage warning at 80% and a hard stop at 100%; it must never silently charge an overage in v1.

The range is a pricing hypothesis, not a market claim. Final price must be set only after provider fees, model cost, tax treatment, and a small real-user cost sample are known.

## 3. User metric versus internal cost metric

The user-facing unit should be **successful Study Guide generation**. It is understandable, maps to the primary artifact, and is easy to show as “7 of 10 Guides used this month.” It also makes retries and refunds intelligible.

Internally record:

- logical generation run ID and operation key;
- operation kind and provider attempt number;
- provider/model/request ID and safe status metadata;
- input/output token usage when supplied by the provider;
- source unit/page/file counts and extracted-character count;
- retry, failure, cancellation, and duplicate-dispatch events;
- estimated provider cost only if a versioned model price table is available.

Do not expose provider operation count or raw token count as the billing unit in v1. Pages, files, tokens, and credits are either too surprising, too easy to game, or too tightly coupled to changing implementation details. They remain enforcement and accounting dimensions.

### Quick Check accounting

Recommendation: **included in the Study Guide usage**. A Quick Check is a subordinate action on one Guide, and the user already understands it as part of the same learning loop. This avoids a second quota meter and prevents a paid-only result-stage experience.

The server should permit one cached Quick Check per Guide checksum and requested count without consuming another Guide unit. A newly generated Quick Check consumes no separate user quota, but its two provider operations remain in internal cost telemetry. If a future abuse pattern requires a cap, add a separate daily rate limit first; do not silently convert it into credits.

## 4. Subscription versus credits

| Option | Fit for Folveta v1 | Decision |
| --- | --- | --- |
| Monthly subscription | Predictable entitlement, simple UI, recurring revenue, easy monthly reset; risks churn during exam-season valleys | **Recommended** |
| One-time credit packs | Fits seasonal bursts and avoids recurring cancellation; introduces pack expiry/refund, balance, race, and partial-failure rules | Defer |
| Subscription + credits | Covers both patterns but multiplies pricing, support, ledger, and webhook cases | Reject for v1 |

The subscription should be cancellable at period end, with access retained until the paid period ends unless the provider reports an earlier termination. Failed-payment grace behavior must be explicit: keep a short provider-managed recovery window, then remove paid entitlements on a verified status event. No overage billing is planned.

## 5. Provider research and recommendation

### Official facts checked

- **Stripe**: official Checkout documentation supports hosted or embedded Checkout Sessions for one-time and subscription payments; Billing supports subscription lifecycle, retries, cancellation, customer portal, refunds, Tax, and webhook-driven status changes. Stripe's global availability is country/entity dependent. The official material does not establish that a Mainland China operator can open a direct Stripe Payments account and receive settlement. Treat this as **[CONFIRM]**, and assume an eligible overseas legal entity and bank account may be required.
- **Paddle Billing**: official docs provide a Next.js starter, hosted overlay/inline Checkout, subscriptions, customer portal links, refunds, cancellation, payment recovery, localized pricing, webhooks with `Paddle-Signature`, and Merchant of Record positioning with global tax/compliance handling. Seller onboarding and payout eligibility are subject to Paddle's current country and business review; Mainland China acceptance and settlement remain **[CONFIRM]**.
- **Lemon Squeezy**: official API docs provide hosted Checkout, subscriptions, customer portal, cancellation/refunds, usage records, and webhooks. Its pricing page currently states **5% + 50 cents per transaction** for ecommerce and Merchant of Record tax/compliance handling. The site also announces a 2026 Lemon Squeezy + Stripe Managed Payments update. Seller country, payout route, and Mainland China onboarding remain **[CONFIRM]**.

### Comparison

| Capability | Stripe | Paddle Billing | Lemon Squeezy |
| --- | --- | --- | --- |
| Merchant of Record | No for ordinary Stripe Payments; seller carries tax/compliance | Yes | Yes |
| Checkout / subscriptions | Mature, flexible, strong Next.js ecosystem | Hosted/overlay/inline, subscription-first | Hosted checkout, subscriptions |
| Customer portal | Stripe-hosted portal | Secure portal links | Customer portal API/features |
| Webhook verification | Signed events | `Paddle-Signature` / SHA-256 | Signed webhook requests |
| Refund/cancel/failure handling | Mature Billing lifecycle and recovery | Recovery/dunning and subscription APIs | Subscription/order refund and cancel APIs |
| Tax/VAT burden | Seller must configure Stripe Tax and legal process | MoR handles global sales tax/compliance | MoR handles global sales tax/compliance |
| Fees | Region/payment-method dependent; usually lower than MoR but more seller responsibility | All-in-one MoR price; exact quote/terms must be confirmed | Public page: 5% + 50c, subject to additional fees in some cases |
| Chinese operator risk | Highest: direct account/settlement eligibility is unconfirmed | Medium/high: onboarding and payout eligibility must be confirmed | Medium/high: onboarding and payout eligibility must be confirmed |

### Recommendation

1. **Primary: Paddle Billing**, conditional on written confirmation that the operator's legal entity, country, bank, currency, and digital SaaS product are accepted for live selling and payouts.
2. **Backup: Lemon Squeezy**, conditional on the same onboarding and payout confirmation; use it if Paddle rejects the entity or its commercial terms are unsuitable.
3. **Conditional alternative: Stripe**, only if the operator already has an eligible Stripe-supported entity and settlement bank account. Do not build around Stripe availability for a Mainland China entity without that proof.

The practical reason for preferring a MoR is not API convenience. Folveta is a small global SaaS with uncertain operator jurisdiction; tax/VAT, hosted payment handling, customer billing support, and fraud/recovery are material operational burdens. The trade-off is higher fees, platform review, payout dependency, and less control. Provider choice remains **unapproved until [CONFIRM]**.

Official references used for this comparison:

- [Stripe global availability](https://stripe.com/global), [Checkout](https://docs.stripe.com/payments/checkout), [Subscriptions](https://docs.stripe.com/billing/subscriptions/overview), [subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), and [cancellation](https://docs.stripe.com/billing/subscriptions/cancel).
- [Paddle developer index](https://developer.paddle.com/llms.txt), [Next.js starter](https://developer.paddle.com/get-started/starter-kits/nextjs-saas.md), [overlay Checkout](https://developer.paddle.com/build/checkout/build-overlay-checkout), and [Paddle pricing](https://www.paddle.com/pricing).
- [Paddle supported countries](https://developer.paddle.com/concepts/sell/supported-countries-locales.md), [supported currencies and payouts](https://developer.paddle.com/concepts/sell/supported-currencies.md), and [SaaS/Merchant of Record overview](https://developer.paddle.com/get-started/how-paddle-works/saas.md).
- [Lemon Squeezy Checkout API](https://docs.lemonsqueezy.com/api/checkouts), [subscriptions API](https://docs.lemonsqueezy.com/api/subscriptions), [webhooks API](https://docs.lemonsqueezy.com/api/webhooks), and [pricing](https://www.lemonsqueezy.com/pricing).
- [Lemon Squeezy getting paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid), [fees](https://docs.lemonsqueezy.com/help/getting-started/fees), [supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [identity verification](https://docs.lemonsqueezy.com/help/getting-started/verify-your-identity), and [currencies](https://docs.lemonsqueezy.com/help/payments/currencies).

## 6. Billing identity and entitlement model

The immutable billing owner is `auth.users.id`. The relationship is:

`auth.users.id -> billing customer -> subscription/plan -> entitlement -> usage period`

Anonymous users may use Free, but checkout requires an authenticated user. The checkout request carries a server-created opaque reference to the authenticated user; never trust an email, cookie, Guide ID, session ID, or browser-return parameter as billing ownership.

Product code owns plan codes, limits, entitlement evaluation, usage reservation, and access decisions. The provider owns payment methods, invoices, tax collection where MoR applies, and hosted customer-management surfaces.

Minimum entitlement states:

- `free_active`
- `paid_active`
- `paid_cancel_at_period_end`
- `past_due_grace`
- `paid_suspended`
- `billing_deleted`

Only a verified webhook or server reconciliation may move a user into or out of paid access. A successful redirect is informational and never grants access.

## 7. Usage accounting and concurrency

Use a small reservation-based counter, not a token ledger.

1. At the authenticated generation boundary, atomically create or reuse one `usage_event` keyed by `user_id + idempotency_key + logical_generation_run_id`.
2. Reserve one Guide unit only when the Workflow logical run is accepted. A duplicate Generate request reuses the active run and reservation.
3. Provider operations, Workflow replay, lease reclaim, and retries do not reserve additional user units.
4. On successful final Guide settlement, transition the reservation to `consumed`.
5. On fatal failure, cancellation before provider work, or a hard deadline with no Guide, transition it to `released`.
6. If a provider succeeds but the client disappears, the server-owned Workflow still settles one Guide and consumes one unit.
7. If a duplicate provider call occurs in the bounded at-least-once crash window, fencing prevents duplicate Guide persistence; internal attempts may still show two calls.

The quota check must happen before `claimLogicalGeneration` creates/accepts a new run, inside a database transaction or security-definer RPC that locks the user's current period row. The existing Workflow architecture remains unchanged; billing is an outer admission and settlement boundary.

Generation and Quick Check endpoints must also have server-side rate limits. A quota counter is not a request-rate limiter.

## 8. Minimum database schema

All changes must be forward-only Supabase migrations. No schema is applied in this architecture phase.

### Required tables

- `billing_customers`: one row per `auth.users.id`; provider name, provider customer ID (unique per provider), created/updated timestamps.
- `billing_subscriptions`: provider subscription ID (unique), user ID, provider customer ID, product/price references, plan code, status, current period start/end, cancel-at-period-end, canceled/ended timestamps, last provider event timestamp, raw provider payload excluded or minimized.
- `billing_entitlements`: effective server-readable plan and limits for a user; status, period boundaries, guide/file/unit/character limits, source event ID, updated timestamp. This is the read model used by API admission checks.
- `billing_usage_periods`: one row per user and period key; limit, reserved count, consumed count, released count, period start/end, timestamps. Unique `(user_id, period_start)`.
- `billing_usage_events`: idempotent reservation/settlement records with user ID, period ID, logical generation run ID, idempotency key, event type (`reserved`, `consumed`, `released`, `adjusted`), unit count, reason, and timestamps. Unique on the business idempotency key.
- `billing_webhook_events`: provider, external event ID (unique per provider), event type, provider event timestamp, received/processed timestamps, processing status, error code, and a small redacted metadata JSON. Never store card data or full raw payloads by default.
- `account_deletion_requests`: user ID, requested/confirmed/cancelled/completed timestamps, deletion state, provider-cancellation state, retry/error metadata, and an operator support ID. This is required before exposing Delete Account UI.

### Deliberately deferred

- `credit_balances` and credit ledger: unnecessary for subscription-only v1.
- A profile table: existing Product-3 decision correctly avoids one.
- A provider-specific product catalog table: provider price IDs can live in deployment configuration until multiple products/locales require a database catalog.
- Invoice/payment-method tables: the provider remains the system of record; store only references needed for support and reconciliation.

Every user-owned table has RLS keyed to `auth.uid()`. Provider IDs and webhook internals are server-only. The browser receives plan name, limits, usage remaining, billing status, and safe dates only.

## 9. Webhook architecture

`Provider -> same-origin server webhook route -> signature verification -> idempotency row -> ordered state transition -> entitlement read model`

Requirements:

- Route is server-only and accepts the provider's raw body for signature verification.
- Reject invalid signatures, stale/replayed timestamps where the provider supports them, and unknown provider/account identifiers.
- Insert `(provider, external_event_id)` before side effects. Duplicate delivery returns success without repeating effects.
- Process events order-tolerantly: compare provider event timestamps/version markers and reconcile the provider object when an older event arrives after a newer one.
- Handle checkout completion, subscription created/updated/canceled, payment succeeded/failed, refund/chargeback, and customer deletion events appropriate to the selected provider.
- A scheduled reconciliation job is required for subscriptions whose webhook delivery failed; it must be separate from the existing generation reconciler.
- Checkout success/cancel redirects update UI state only. They never write `paid_active`.

## 10. Anonymous to paid flow

1. Anonymous user uploads and may generate within Free limits.
2. User signs up/signs in through the existing Supabase Auth and claims the current anonymous aggregate.
3. Server resolves `auth.users.id`, reads the current entitlement, and creates or reuses `billing_customers`.
4. Server creates a hosted Checkout for the approved plan and attaches an opaque user reference in provider metadata/custom data.
5. Provider collects payment and sends signed events.
6. Webhook verifies, deduplicates, reconciles, and activates `billing_entitlements`.
7. User returns to Folveta; the page reloads server-derived billing status. Existing Guides/Sources/Quick Checks remain attached to the same claimed session.
8. Repeated Checkout clicks reuse an open checkout intent where possible and never create a second ownership mapping. A second active subscription is detected and handled as a support/reconciliation case, not silently merged.

## 11. Billing UX and routes

Minimum authenticated UX:

- `/pricing`: Free/Paid limits, real price, monthly frequency, cancellation language, and one CTA. During `PRELAUNCH=true`, it remains `noindex,nofollow`.
- Profile `Plan / Billing`: current plan, usage remaining, period end, cancellation-at-period-end, past-due/suspended notice, and `Manage billing`.
- Checkout launch, success, cancel, failed-payment, and portal-return states. All are private and noindex.
- Upgrade CTA at upload/generation admission when the server reports a limit, never as a hidden result-stage paywall.

Proposed routes (implementation detail, not yet created): `/pricing`, `/billing`, `/billing/success`, `/billing/cancel`, `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/status`, and `/api/billing/webhook/[provider]`. Account deletion routes remain blocked until the Storage-first orchestrator exists.

## 12. Account deletion and retention

Deletion is a prerequisite, not a later cleanup detail.

- A confirmed request stops new generation, Quick Check creation, uploads, Checkout creation, and billing mutations.
- The server cancels active subscriptions through the provider and waits for/records verified cancellation. It must prevent future charges before Auth deletion.
- Owned Guide aggregates are staged, private Storage objects are removed first, and database children (Sources, spans, generation executions, Guides, Quick Checks, attempts/results) are deleted through the existing parent cascade.
- Partial failures are retryable and observable. Auth deletion is last.
- Retain only billing/legal records required by the provider, tax, accounting, dispute, or legal policy; anonymize user linkage where permitted. Do not retain Study Guide content under a billing retention rule.
- User content follows the existing anonymous expiry and Guide soft-delete/purge model. Billing records have a separate retention policy and must not be purged with content by default.

No production retention scheduler or account deletion implementation is introduced by this document.

## 13. Rate limits and abuse

Minimum v1 controls:

- Anonymous: one active generation, one Guide reservation per session, short-window IP/session admission limit, and existing file/page/character limits.
- Authenticated Free/Paid: one active generation per session, per-user daily request limit, monthly Guide quota, and a small Quick Check request limit with cache reuse.
- Checkout: authenticated-only, same-origin, idempotency key, and a short creation rate limit.
- Webhook: provider signature, body-size limit, timestamp/replay check, idempotent event key, and provider-specific account check.
- Log only opaque support IDs and aggregate counters; never source text, prompts, card data, or raw payment payloads.

Do not build a complex anti-fraud system in v1. Provider fraud controls and manual support escalation are sufficient until abuse data justifies more.

## 14. Security and privacy

- Use provider-hosted Checkout/portal; Folveta never receives or stores raw card details.
- Keep API keys, webhook secrets, and provider server IDs server-only and environment-scoped.
- Keep client tokens/public price identifiers limited to what the selected provider documents as publishable.
- Billing ownership and all entitlement mutations use `auth.users.id`; email is display/contact data only.
- Apply RLS to billing read models and keep webhook/customer tables inaccessible to browser roles.
- Enforce same-origin/CSRF protections on Checkout, portal, cancellation, and deletion mutations.
- Redact provider payloads, customer addresses, tax IDs, and payment details from logs. Store only the minimum support/reconciliation metadata.
- Update Privacy and Terms only after the provider, legal entity, tax responsibility, refund policy, and retention policy are confirmed.

## 15. SEO and PRELAUNCH

- Preserve homepage SEO ownership as **Study Guide Maker**.
- `/pricing` may become a public commercial page after the real product is approved, but it is `noindex,nofollow` while `PRELAUNCH=true`.
- `/checkout`, `/billing`, `/profile`, `/account`, success/cancel/failure pages, portal returns, and all billing APIs are permanently private/noindex and excluded from the sitemap.
- No indexing, sitemap submission, or `PRELAUNCH=false` change is part of this task.

## 16. Required environment variables after provider approval

Use only the chosen provider's variables; do not add these yet.

Common:

`BILLING_PROVIDER`, `BILLING_PLAN_CODE`, `BILLING_MONTHLY_PRICE_DISPLAY`, `BILLING_WEBHOOK_TOLERANCE_SECONDS`

Paddle candidate:

`PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, `PADDLE_CLIENT_TOKEN`, `PADDLE_PRICE_ID`, `PADDLE_WEBHOOK_SECRET`

Lemon Squeezy candidate:

`LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_VARIANT_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`

Stripe candidate:

`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and any selected Stripe Tax configuration.

All provider secrets are Production-only and must not be exposed to Preview until isolated billing test infrastructure exists.

## 17. Required migrations, APIs, and tests after approval

### Migrations

1. Billing customer/subscription/entitlement tables and owner RLS.
2. Usage period/counter/event tables with reservation settlement RPCs and idempotency constraints.
3. Webhook event table and provider-state reconciliation markers.
4. Account deletion request/state table and write-blocking state checks.

### APIs/routes

Implement the proposed billing routes only after provider approval. Add server admission checks to Guide generation, Quick Check generation, file limits, and future paid-only actions. The Workflow internals remain unchanged; the generation admission wrapper calls the billing reservation RPC before dispatch.

### Tests

- Plan limits and period rollover.
- Anonymous Free, sign-in claim, and checkout ownership.
- Duplicate Generate, browser refresh, Workflow replay, retry, fatal failure release, and cancellation settlement.
- Concurrent quota reservations at the exact limit.
- Quick Check cache reuse and rate limit.
- Provider sandbox Checkout, subscription lifecycle, cancellation, failed payment, refund, and portal.
- Webhook signature failure, duplicate event, out-of-order event, stale event, unknown customer, and replay.
- RLS/IDOR tests for every billing table and API.
- Account deletion with active subscription, failed cancellation, Storage failure, database failure, retry, and Auth deletion last.
- Desktop/mobile UX, accessibility, noindex, and `PRELAUNCH=true` pricing behavior.

## 18. Production E2E and launch gate

Use a provider sandbox and isolated Supabase/Vercel environment first. The production-like E2E should cover:

1. Anonymous upload -> Free Guide -> sign-up/claim.
2. Upgrade -> hosted Checkout -> signed webhook -> paid entitlement.
3. Paid generation at quota boundary, duplicate requests, refresh/browser loss, and persisted Guide.
4. Quick Check inclusion and cache reuse.
5. Portal cancellation at period end and verified entitlement transition.
6. Failed payment/recovery/suspension and reactivation.
7. Refund/chargeback handling according to the provider contract.
8. Account deletion request -> subscription cancellation -> content cleanup -> billing retention -> Auth deletion last.
9. Cross-account ownership denial, direct API bypass attempts, webhook replay, and logs containing no sensitive content.

Production launch still requires the existing Payment, deletion, retention, rate-limit, monitoring, legal/privacy, SEO v2, and final launch gates. `PRELAUNCH=true` remains mandatory.

## 19. Implementation breakdown (after approval)

1. Confirm legal entity, country, payout bank, currency, tax responsibility, refund policy, and provider onboarding in writing.
2. Confirm Free/Paid limits, price, monthly period, grace window, and cancellation policy.
3. Add provider-neutral migration and entitlement/usage RPCs.
4. Add provider sandbox adapter, hosted Checkout, portal, and signed webhook processing.
5. Add server admission/reservation to generation, Quick Check, upload/file limits, and future paid actions.
6. Build Profile billing state, Pricing, and failure/cancellation UX using the current UI system.
7. Implement Storage-first account deletion and billing cancellation coordination.
8. Add unit, migration/RLS, sandbox, webhook, concurrency, and Playwright E2E coverage.
9. Run isolated production-like verification, then a protected Production smoke. Do not change indexing or `PRELAUNCH` in this phase.

## 20. Decision classification

### A. Must enter `docs/decisions.md` only after owner confirmation

- Free + one Paid monthly subscription.
- Final Free/Paid quotas and file/page/character limits.
- Final price and currency.
- Study Guide generation as the user-facing usage unit.
- Quick Check included in the Guide unit.
- Subscription over credits for v1.
- Provider selection and legal/onboarding acceptance.
- Grace, cancellation, refund, and deletion billing policies.

Until those are confirmed, this document is the working proposal and `docs/decisions.md` must continue to say that no provider or paid state is approved.

### B. Implementation detail

- Table names and indexes, reservation state machine, provider adapters, webhook route shape, event payload minimization, environment variable names, rate-limit windows, UI route names, and test case organization.
- These may change while preserving the approved product and provider decisions.

## 21. Owner confirmation checklist

Before implementation, confirm:

- [ ] The operator can legally open the selected provider account and receive settlement in the intended country/bank.
- [ ] Free/Paid limits and USD price are approved.
- [ ] Quick Check is included in one Guide usage unit.
- [ ] Monthly subscription is preferred over credits for v1.
- [ ] Refund, cancellation, failed-payment grace, and tax responsibility are approved.
- [ ] Account deletion and billing-record retention policy is approved.

## 22. Owner Confirmation Verification Addendum (2026-08-31)

This addendum records the final pre-confirmation checks requested by the owner. It does not change the Draft status and does not authorize implementation.

### Provider facts: Paddle Billing

#### A. Confirmed by official Paddle material

- Paddle Billing is positioned as a **Merchant of Record** for software/SaaS. Paddle states that it handles payment processing, sales-tax/VAT/GST and other digital-services tax compliance, subscription billing, customer portal workflows, refunds/credits/chargebacks, and payment recovery/dunning.
- Paddle's supported-country table explicitly includes `CN China` with `CNY`. This confirms that China is listed as a supported **transaction/customer market**. It does not by itself approve a China-based seller account.
- Paddle's supported-currencies page lists payment currencies including CNY and payout currencies including CNY. The same page says balances can be held in USD, EUR, GBP, AUD, and CAD, and a payout can be made in a different currency. This indicates that CNY payout conversion is supported at the product level; it does not confirm a particular Mainland China bank or banking rail.
- Paddle supports recurring subscriptions, renewals, upgrades/downgrades, pauses, cancellation, proration, trials, dunning, customer portal, and signed webhook lifecycle events.
- Paddle's go-live documentation requires a live-account verification flow, product/compliance answers and personal or business details for KYC/KYB, live-domain review, legal pages including privacy/terms/refund policy, and adding bank-account details for payouts. Paddle says review can take a day or several days and may request additional documentation.
- Paddle Checkout supports cards, Apple Pay, Google Pay, PayPal and regional methods subject to buyer country/payment-method eligibility. This is a **buyer payment method** statement, not a seller payout-method statement.
- Paddle's current public pricing page displays `5% + 50c per Checkout transaction` for pay-as-you-go and says custom pricing applies to larger businesses or certain low-price/invoicing cases. Exact effective pricing for a USD 12 subscription, international cards, FX, refunds, chargebacks, and payout conversion must be confirmed in the account quote/terms.

#### B. Must be confirmed by an actual Paddle application

- Whether a Mainland China operator can open a live Paddle seller account for Folveta's software/SaaS category.
- Whether an individual, Chinese sole proprietor/个体工商户, or Mainland China company is accepted, and exactly which identity, registration, beneficial-owner, address, tax, and bank documents are required for each form. The public developer docs say “personal or business details” but do not publish a definitive legal-form acceptance matrix.
- Whether the operator's specific Mainland China bank account can receive Paddle payouts, which intermediary/correspondent bank is used, payout settlement timing, fees, and whether CNY payout is available for that exact account rather than only as a currency-conversion capability.
- Whether seller payouts can use PayPal. The reviewed Paddle documentation confirms PayPal as a customer payment method, while the go-live instructions specifically say to set up bank-account details; it does not confirm PayPal seller payouts.
- Whether Folveta's domain, AI-generated study material category, refund policy, and current legal pages pass Paddle's website/compliance review.

### Provider facts: Lemon Squeezy

#### A. Confirmed by official Lemon Squeezy material

- Lemon Squeezy is a **Merchant of Record** and states that it handles sales tax/VAT collection and payment processing for digital products.
- Official APIs and product docs support one-time Checkout, recurring subscriptions, customer portal, cancellation, refunds, failed-payment recovery, and signed webhooks.
- New merchants must verify identity before selling: personal information and a photo of a government-issued ID are required; re-verification can pause payouts. The public docs do not publish a complete personal/sole-proprietor/company document matrix.
- Seller payouts can be sent to a bank account or a verified personal/business PayPal account. Bank payouts are converted to the selected local currency; PayPal payouts are always USD. Payouts are created twice monthly, net sales are held for 13 days, and the minimum payout threshold is USD 50.
- Lemon Squeezy's official supported-country page lists bank-payout countries and **does not list Mainland China**. It lists Hong Kong, Macao, Taiwan and many other countries separately. The same page says PayPal payouts are supported in 200+ countries/regions, but it does not state that a Mainland China PayPal account is eligible for Lemon Squeezy merchant payouts.
- Lemon Squeezy's official currency page says products can be displayed in 130 currencies, checkout processing is ultimately in USD, and payouts are always made in USD with bank-payout conversion to the selected currency.
- Current public fee documentation states a base platform fee of `5% + $0.50`, with possible additional `+1.5%` for international transactions, `+1.5%` for PayPal transactions, and `+0.5%` for subscription payments. Payout fees vary by method/region/settlement currency; the page lists separate bank/PayPal payout charges.

#### B. Must be confirmed by an actual Lemon Squeezy application

- Whether a Mainland China operator can activate a merchant store at all. The bank-payout country list excludes Mainland China, so a Chinese bank payout should be treated as unavailable unless Lemon confirms a specific exception.
- Whether a verified PayPal account registered in Mainland China can receive Lemon Squeezy merchant payouts. Lemon's “200+ countries” statement and PayPal's country directory do not prove commercial payout eligibility or compatibility with Lemon's payout processor.
- Whether an individual, 个体工商户, or company is accepted for this product category and which KYC/KYB documents are required beyond government ID.
- Store activation, prohibited-product/category review, domain/legal-page review, payout timing, reserve/hold policy, refund/chargeback handling, and the exact effective fee quote for a USD 12 subscription.

### Provider decision status

Paddle remains the **primary candidate**, but only conditionally: its official country/currency documentation is materially better for Folveta's target market than Lemon Squeezy's bank-payout list. Lemon Squeezy remains the **backup candidate**, but Mainland China settlement is a stronger unresolved risk. Neither provider is confirmed for this operator until a real application or written provider support response succeeds.

## 23. Current production cost evidence

### Provider/model configuration evidence

- The repository's local non-secret runtime configuration currently reads `MODEL_PROVIDER=openai`, `OPENAI_BASE_URL=https://portdan.com/v1`, and `gpt-5.6-sol` for topic extraction, topic merge, Guide, grounding, Quick Check, and question verification.
- Production rollout documentation confirms an OpenAI-compatible provider boundary and the deployed Workflow contract, but intentionally does not record secret values or a complete production model-value dump. Therefore the local values above are configuration evidence, not a claim that Production may differ only by endpoint/model alias.
- `AI_GENERATION_WORKFLOW_ENABLED=true` and `PRELAUNCH=true` are confirmed for Production. The AI Workflow architecture is unchanged.

### Real Production telemetry available without user content

The current rollout record contains six relevant runs:

| Run | Logical operations | Provider attempts | Retries | Provider duration |
| --- | ---: | ---: | ---: | ---: |
| Real PDF 1 | 18 | 17 | 0 | 451,865 ms |
| Real PDF 2 | 18 | 17 | 0 | 463,009 ms |
| Real PDF 3 | 16 | 15 | 0 | 474,707 ms |
| Legacy PPT 1 | 10 | 9 | 0 | 163,315 ms |
| Legacy PPT 2 | 12 | 11 | 0 | 227,358 ms |
| Workflow smoke | 4 | 3 | 0 | recorded, exact total not published |

The normal successful Guide range observed in Production is therefore **10–18 logical provider operations** for the sampled materials, with **16–18** for the more complex PDF samples and **10–12** for the sampled legacy PPTs. The logical operation count includes an operation that may be settled without a provider attempt in the recorded run; provider attempts are the closer approximation to billable model calls.

The operation composition is:

- Planning/extraction: `1` plan operation for a single safe-budget input, or `N` extraction operations for N batches plus `1` merge operation.
- Guide generation: one operation per merged topic, up to 12.
- Grounding: one operation per generated topic that has claims, up to 12.
- Finalization: database-only, no model call.

For a single-call plan with T topics, the model-call shape is approximately `1 planning + T guide + T grounding`, or `1 + 2T` provider attempts. For a batched plan it is approximately `N extraction + 1 merge + T guide + T grounding`. The database has a 40 provider-invocation limit per logical run; each operation allows up to three attempts and the run has four shared retry credits, subject to the existing Workflow settlement rules.

Retry impact is not a second user quota unit, but it is real provider cost: a retryable failure creates another provider attempt for the same operation. The sampled Production runs used zero retries, so they do not establish a retry-cost distribution.

Quick Check adds exactly **two model calls** on a cache miss: candidate generation and question verification. Submission/scoring is deterministic. A cached check for the same Guide checksum and requested count adds zero calls.

Image parsing adds one `image_extract` model call per image. Legacy `.doc`/`.xls` fallback parsing adds one `file_extract` call per legacy file. Local structural PDF/PPT/PPTX/DOCX/XLSX parsing and legacy `.ppt` extraction do not add a parser model call.

### Token and USD-cost boundary

The repository schema stores provider `usage` JSON for generation attempts, but the current production rollout document publishes operation counts and durations, not aggregate input/output token values. No reliable token total can be derived without reading a redacted production aggregate from `generation_runs.usage` / operation telemetry. No USD model price table for the exact deployed aliases and endpoint has been verified. Therefore this review intentionally does **not** estimate dollars.

To convert future telemetry to USD, we still need: the provider's input/output token prices for each deployed model alias, whether cached-input/audio/image tokens have separate pricing, image/file-input pricing rules, any gateway markup, currency/FX basis, and the treatment of failed/retried calls. Until those are known, operation and token evidence must remain the accounting basis.

## 24. Quota candidates based on observed operations

All options keep Quick Check included in the Study Guide unit, do not introduce credits, and consume quota only after final Guide success. Anonymous use remains limited by the existing seven-day session and abuse controls.

| Option | Free monthly successful Guides | Paid monthly successful Guides | Free file/source limits | Paid file/source limits | USD 12/month cost risk |
| --- | ---: | ---: | --- | --- | --- |
| A. Conservative | 1 | 5 | 3 files; 50 source units; 100k chars | 8 files; 200 units; 400k chars | Low relative exposure; strongest margin protection, but weaker student value and seasonal fit |
| B. Recommended | 2 | 10 | 3 files; 75 source units; 150k chars | 10 files; 300 units; 600k chars | Medium; matches the current proposal and observed 10–18 operation runs without promising unlimited use |
| C. Generous | 3 | 20 | 5 files; 150 source units; 300k chars | 10 files; 450 units; 900k chars | High; a heavy user can create roughly twice the Guide operations of Option B, plus Quick Checks and parser extras |

Option B remains the recommended hypothesis. It is simple to explain, preserves a useful Free product, and keeps the paid ceiling bounded. It is not a profitability guarantee because exact model prices, user mix, retries, and source-size distribution are still unknown.

## 25. Price hypothesis: USD 9 vs 12 vs 15

| Price | User understanding | AI cost space | Student SaaS positioning | Assessment |
| --- | --- | --- | --- | --- |
| USD 9/month | Lowest psychological barrier; easy to compare and explain | Narrowest margin for 5–20 Guide quotas and MoR fees | Accessible student tool; risks signaling a lightweight utility | Good validation price if conversion is the priority, but least room for retries/support/tax/fees |
| USD 12/month | Still a clear round number and below many productivity subscriptions | Balanced room for observed 10–18-operation Guides, Quick Check, and provider fees | Credible focused study utility without looking enterprise | **Recommended pricing hypothesis** |
| USD 15/month | Still understandable, but requires stronger perceived recurring value | Most room for provider fees, support, and seasonal usage | More premium student SaaS; higher price sensitivity and churn risk | Use only if retention and Guide quality support the premium |

These are positioning and cost-space comparisons, not USD margin calculations. Final price must wait for provider onboarding terms and token-price evidence.

## 26. Final Owner Confirmation Checklist

### Can be decided now

1. Keep the commercial shape as **Free + one Paid monthly subscription**.
2. Keep the user-facing unit as **one successful Study Guide generation**.
3. Keep Quick Check included in that unit.
4. Keep failed generation, Workflow retry/replay, duplicate request, and released reservations from consuming another unit.
5. Keep `USD 12/month` as the working pricing hypothesis rather than a live price.
6. Select a quota candidate for implementation planning: A, B, or C. Option B is the recommended default.

### Must wait for real provider account approval or written provider confirmation

1. Paddle actual live-account eligibility for this operator and Folveta's SaaS category.
2. Lemon Squeezy actual merchant-store eligibility for this operator and Folveta's SaaS category.
3. Final provider selection.
4. Exact accepted legal form: individual, 个体工商户/sole proprietor, or company; required KYC/KYB documents and beneficial-owner checks.
5. Payout route, Mainland China bank feasibility, PayPal feasibility, payout currency, FX, timing, threshold, reserve, and payout fees.
6. Final effective provider fee schedule for USD 12 monthly subscriptions, including international, PayPal, subscription, refund, dispute, and payout charges.
7. Tax/MoR responsibility wording, invoice/receipt behavior, and legal entity shown to customers.

### Still requires owner policy decision after provider facts are known

1. Final Free quota.
2. Final Paid quota.
3. Final monthly price: USD 9, 12, or 15.
4. Refund policy.
5. Cancellation and failed-payment grace policy.
6. Billing-record retention and anonymization period, separate from Study Guide content retention.

No item above authorizes SDK installation, Product/Price creation, Checkout, webhook implementation, Production billing configuration, SEO v2, indexing, or changing `PRELAUNCH=true`.

## 27. Sandbox / Live billing environment isolation (2026-08-31)

Folveta deliberately uses the existing shared Supabase project for its Paddle Sandbox deployment and its future formal deployment. This is safe only because Paddle provider state is now namespaced by a server-derived `billing_environment` value:

- Sandbox deployment: `PADDLE_ENV=sandbox` and `NEXT_PUBLIC_PADDLE_ENV=sandbox`.
- Future formal billing deployment: `PADDLE_ENV=live` and Paddle.js `NEXT_PUBLIC_PADDLE_ENV=production`.
- `billing_customers`, `billing_subscriptions`, `billing_usage_periods`, `billing_generation_reservations`, `billing_webhook_events`, and `generation_executions` carry this namespace. Provider customer IDs, subscription IDs, and webhook event IDs are unique within, not across, the namespace.
- Server-side entitlement, usage, generation reservation, and webhook queries require the exact configured environment. Missing, unknown, and legacy `NULL` environments fail closed for paid access. The deployed legacy generation path remains Free-only until the formal application is intentionally moved to `live`.

The formal migration is `20260831084257_billing_environment_isolation.sql`. It was applied to the shared project and verified without inspecting user content. The record audit found only 11 pre-isolation, `NULL`-environment webhook rows; no Sandbox or Live customer, subscription, usage, reservation, or entitlement records were present. Those legacy rows cannot create Pro entitlement.

This is a Sandbox isolation boundary, not a Live billing launch approval. It authorizes only Sandbox deployment and non-payment isolation testing. It does not authorize a formal Paddle configuration, payment collection, public indexing, SEO v2, or `PRELAUNCH=false`.

## 28. Paddle Sandbox Billing v1 closeout (2026-09-01)

The completed Sandbox implementation follows the approved draft boundary without changing the AI Workflow architecture:

- **Offer:** Free + Folveta Pro monthly. The Sandbox Product/Price is USD 12/month for testing only, not a final Live price.
- **Usage:** exactly one successfully completed Study Guide consumes one unit. Quick Check is included. Failed generations, Workflow retries/replays, and duplicate Generate requests do not consume additional units.
- **Limits:** Free is `2` successful Guides/month; Pro is `10`. File/source limits are centralized with the same plan configuration.
- **Ownership and isolation:** billing ownership is `auth.users.id`. Provider-specific data and every entitlement, usage, reservation, generation-accounting, and webhook query use the server-derived `billing_environment`. Sandbox and Live Paddle IDs may coexist; missing, unknown, and legacy environments fail closed.
- **Provider sync:** the webhook reads the raw request body, verifies the Paddle signature server-side, deduplicates events in the environment namespace, and applies order-tolerant subscription/customer updates. Checkout success redirects are never used as payment proof.
- **Management and cancellation:** the Paddle Customer Portal is the management surface. A subscription with `scheduled_change.action=cancel` remains active and Pro until its effective/current-period-end date, shows that date in Profile, retains its quota, and does not expose a duplicate cancel action.

Sandbox Checkout, transaction/subscription sync, entitlement persistence after refresh, Sandbox/Live isolation, quota display, Customer Portal access, cancel-at-period-end synchronization, scheduled-cancellation Profile UI, and duplicate/idempotency checks passed. The retained Sandbox notification destination is active and recent relevant deliveries are successful.

`PRELAUNCH=true` remains unchanged. Formal `folveta.com` has no Live Paddle configuration, no Live Product/Price, no Live webhook, and no authority to charge users. Live merchant/KYC/payout approval, final provider and commercial policy, refund/cancellation terms, tax/MoR terms, billing-record retention, legal review, and an explicit owner Live-rollout approval remain required.

## 29. Production Live implementation and launch cutover (2026-09-02)

The prior Sandbox closeout above is historical. The inherited `paddle-live-onboarding` task completed Paddle Live merchant/KYC, website approval, payout setup, Live Product/Price/Checkout/webhook configuration, payment acceptance, subscription cancellation, and the submitted US$12 full refund. Production `folveta.com` uses the Live provider boundary (`PADDLE_ENV=live`, Paddle.js production mode) with server-verified, environment-scoped entitlements and usage.

The public offer is Free with 2 successful Study Guides/month and Folveta Pro with 10 at US$12/month; Quick Check is included. Live billing remained functional after the public indexing cutover. Secrets and provider credentials are intentionally omitted.
