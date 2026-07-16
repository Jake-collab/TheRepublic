---
name: Section 6 fee model
description: 2-tier membership (web/pro), consumer/worker fee config, Stripe Connect Express for payouts
---

## Tiers
- **free** — 10 curated sites, 1% buyer fee, 5% worker fee
- **web** — $2.99/mo, full Web section unlocked
- **pro** — $4.99/mo, all 27+ sites + worker fee waived

## Fee rules
- Consumer (BuySell buyer): 1% of purchase, capped at $20 → `calcConsumerFee()`
- Worker (Gigs/Freelance payout): 5%, waived for pro → `calcWorkerFee()`
- Both configurable in `stripe_settings` table (workerFeePercent, consumerFeePercent, consumerFeeCapCents)

## DB columns added
- `memberships.tier` — "free"|"web"|"pro"
- `users.membership_tier` — kept in sync via webhook
- `users.stripe_account_id` — Stripe Connect Express account ID
- `stripe_settings`: webPriceId, webMonthlyCents(299), proMonthlyPriceId, proMonthlyCents(499), worker/consumer fee cols

## Connect Express
- POST /api/stripe/connect/onboard → creates account + returns onboarding URL
- GET  /api/stripe/connect/status → chargesEnabled / payoutsEnabled

## Why
Spec: web unlocks browsing, pro removes friction for workers. Connect Express is the only path for worker payouts per Stripe TOS for platform marketplaces.
