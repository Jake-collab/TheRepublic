---
name: Comment upvoting pattern
description: How comment upvoting is implemented (DB, API, backend, mobile)
---

## DB
- Added `upvotes integer NOT NULL DEFAULT 0` to talk_comments
- Added talk_comment_votes table (commentId, userId, unique constraint)

## Pattern mirrors post voting
- Toggle: check existing row → delete+decrement or insert+increment
- Use GREATEST(upvotes - 1, 0) on decrement to prevent negative counts

## Mobile (React Query v5)
- useEffect seeds comments from server data — do NOT use onSuccess (removed in RQ v5)
- Pattern: `const [initialized, setInitialized] = useState(false)` + useEffect on commentsData
- New comments prepended (not appended) to match newest-first server ordering

**Why:** onSuccess was removed from useQuery options in React Query v5 — it only exists on useMutation. Use useEffect watching the query data instead.
