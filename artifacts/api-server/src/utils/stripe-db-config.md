---
name: Stripe DB-backed config
description: How Stripe credentials and pricing are stored and accessed across the project.
---

## Rule
Stripe configuration (secret key, webhook secret, price IDs, pricing in cents) lives in the `stripe_settings` DB table (single row), not in environment variables. The `getStripeConfig()` helper in `artifacts/api-server/src/utils/stripeHelpers.ts` reads from the DB with 60-second in-memory cache and seeds the row from env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`) on first access if the row doesn't exist.

**Why:** Admin panel needs to be able to update credentials and pricing at runtime without a redeploy. Env vars are just a convenient initial seed.

**How to apply:**
- Always call `getStripeConfig()` (never read `process.env.STRIPE_*` directly) in route handlers.
- Call `invalidateStripeCache()` after any DB update to `stripe_settings`.
- The admin panel (`/stripe-settings`) uses `useAdminGetStripeSettings` and `useAdminUpdateStripeSettings` generated hooks.
- Public pricing endpoint: `GET /api/membership/pricing` — mounted in `routes/index.ts` after all router.use() calls (no auth required).
- Sensitive fields (secretKey, webhookSecret) are NEVER returned in API responses — only `secretKeyConfigured: boolean` and `webhookSecretConfigured: boolean` are exposed.
