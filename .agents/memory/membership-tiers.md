---
name: Membership tier web access
description: Which tiers unlock the curated Web browser section
---
**Rule:** `hasWebAccess = ["web","pro"].includes(tier ?? "free")` — both the $2.99 "web" tier and the $4.99 "pro" tier unlock the curated browser. Free users see WebMembershipGate.

**Why:** The original code used `isPro = tier === "pro"` which accidentally blocked $2.99 "web" subscribers from the web section they paid for. Fixed in Section 9.

**How to apply:** Any gate that should allow both web + pro tiers must use the array includes check, not `=== "pro"`. The variable is named `hasWebAccess` in index.tsx and passed as the `isPro` prop to WebsiteTabBar and DrawerNav (those components still use the `isPro` prop name internally).

Tiers in the DB:
- "free" → no web, no worker
- "web" → curated browser only ($2.99/mo)
- "pro" → browser + worker features ($4.99/mo)
