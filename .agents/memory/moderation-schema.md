---
name: Moderation schema
description: Where content flags and blocked words live, and how the blocklist cache works
---

Tables are in `lib/db/src/schema/moderation.ts` (exported via schema/index.ts):
- `contentFlagsTable`: contentType (talk_post | talk_comment | citizen_vote), contentId, userId, reason, details, status (pending | reviewed | dismissed), reviewedAt
- `blockedWordsTable`: word (unique, lowercase), addedBy, createdAt

Blocked word cache: `artifacts/api-server/src/utils/blockedWords.ts` — module-level cache with 60s TTL. Call `invalidateBlockedWordsCache()` after any add/delete from admin routes.

**Why:** Post creation routes check against the blocklist on every insert. Caching prevents a DB query on every user post, with a 60s staleness window that's acceptable for moderation.

**How to apply:** Import `containsBlockedWord(text)` from the utility in any route that creates user content (talks posts/comments, citizen vote posts). If it returns a non-null string, reject the request with 400.
