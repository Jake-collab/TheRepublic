---
name: Quick-fix tool patterns
description: Patterns for the 3 admin quick-fix tools added to the User sheet (resync-subscription, clear-session, force-refresh)
---

## Stripe resync
- Use `await import("stripe")` for lazy import; Stripe API version must match installed types — TypeScript will report the exact required string if you get it wrong.
- Route must gracefully handle: no secretKey (422), no stripeSubscriptionId AND no stripeCustomerId (422), subscription not found.
- isPro = status === "active" || status === "trialing"

## Session clear / force-refresh signals
- `sessionResetAt` and `forceRefreshAt` columns added to users table.
- These are signals for the mobile app (Expo) — the mobile app should check them on startup against a locally stored timestamp and invalidate cache if the server value is newer.
- No push notification infrastructure needed — in-app notification + DB flag is sufficient for current architecture.

## Stripe API version
- Installed Stripe package requires "2026-04-22.dahlia" (not "2024-12-18.acacia"). TypeScript will report the required literal string in the error if this is wrong.

**Why:** These DB timestamp flags are the lightest-weight way to signal the mobile app without requiring a separate push notification service or websocket connection.
**How to apply:** Any new "signal to mobile" mechanism should follow the same pattern — stamp a timestamp on the user row, mobile app polls it on startup.
