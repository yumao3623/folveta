# Paddle Live Onboarding

Status: **Historical Paddle Live onboarding and closeout snapshot; completed 2026-09-02. Current billing rules live in `docs/architecture/payment-billing-architecture.md`.**
Last updated: 2026-09-02

Scope: Paddle Live merchant, KYC, website review, payout, catalog/runtime configuration, payment acceptance, and closeout evidence.

## Checkpoints

| Stage | Status | Evidence / next condition |
| --- | --- | --- |
| Account eligibility | Complete | Paddle Live onboarding selected China and the existing `individual` path. |
| Business / individual details | Complete | Product description, trading name, business start date, and owner-entered business details are saved in Paddle. |
| Identity verification | Complete | Paddle Live individual identity/KYC review passed. |
| Website review | Complete | `https://folveta.com/pricing`, `/terms`, `/privacy`, and `/refunds` were approved after production URL checks. |
| Product / compliance review | Complete | Paddle's required final legal declarations and merchant review passed. |
| Payout setup | Complete | Saved in Paddle: China, Individual / Sole Proprietorship, Wire transfer, USD, and USD 100 minimum threshold. No payout history exists yet. |
| Merchant approval | Complete | Paddle Live merchant approval is complete. |

## Live production closeout

The Live Product, Price, client token, Checkout, webhook destination, and runtime environment were configured and validated. Production payment acceptance passed; the resulting subscription was canceled and the US$12 charge was submitted for a full refund. Sandbox and Live billing records remain isolated by the server-derived environment boundary. No secrets are recorded in this document.

## Confirmed Commercial Offer

The owner confirmed the proposed Live public offer on 2026-09-01:

- Free: 2 successful Study Guide generations per month.
- Folveta Pro: 10 successful Study Guide generations per month at USD 12 per month.
- Quick Check is included in the Study Guide quota.

The offer is active in the approved Live production configuration.

## Confirmed Refund And Cancellation Policy

The owner confirmed the recommended policy on 2026-09-01:

- Customers may cancel at any time; Pro access remains through the current paid billing period.
- Cancellation does not receive a prorated refund.
- Duplicate or accidental charges and material service failures are reviewed case by case for a refund.

The policy is published at `https://folveta.com/refunds` and was included in the completed website review.

## Payout Details Confirmed In Dashboard

- Available method selected: Wire transfer. The China Individual form also offered Payoneer.
- Payout currency: USD.
- Minimum payout threshold: USD 100.
- Schedule: Paddle processes payouts monthly. Its current help guidance states balances above the threshold enter payout processing on the first day of the month and are sent by the fifteenth; the Dashboard states arrival can take up to five working days after a payout is sent.
- Fees: Paddle states that a USD 15 SWIFT fee can apply in certain countries. Receiving, intermediary, conversion, and other bank-provider fees may also apply. The current Dashboard does not state whether the SWIFT fee or a conversion fee applies to this China payout route.

## Public Review Content

- Pricing: `https://folveta.com/pricing` reflects the confirmed Free and Pro offer.
- Refund policy: `https://folveta.com/refunds` reflects the confirmed cancellation and refund policy.
- Support: `https://folveta.com/contact` and the public footer link to `yumao3623@gmail.com`.

The URLs returned production HTTP 200 and were entered into Paddle's website-verification form.
