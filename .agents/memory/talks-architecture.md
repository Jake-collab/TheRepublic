---
name: Talks feature architecture
description: Schema, API, and UI architecture for the Talks discussion boards feature
---

## DB Tables
- `talk_categories` — 21 seeded categories with emoji + sortOrder
- `talk_posts` — posts with denormalized `displayName` + `avatarUrl` (snapshotted at creation, no joins needed for feed)
- `talk_votes` — user/post composite key; vote toggle is atomic via `GREATEST(upvotes - 1, 0)`
- `talk_comments` — flat comments; `commentCount` on post is incremented on insert

## Cursor pagination
- `sort=new`: `id < cursor ORDER BY id DESC`
- `sort=top`: `upvotes DESC, createdAt DESC, id < cursor`
- Returns `nextCursor: number | null`

## API routes
- `GET /api/talks/categories` — public, cached 5min
- `GET /api/talks/posts` — optional auth (optionalAuth middleware) for hasVoted field
- `POST /api/talks/posts` — requiresAuth
- `POST /api/talks/posts/:id/vote` — requiresAuth, toggle
- `GET /api/talks/posts/:id/comments` — public
- `POST /api/talks/posts/:id/comments` — requiresAuth

**Why:** Denormalizing displayName/avatarUrl avoids N+1 joins on feed render. Cursor pagination avoids COUNT(*) on large tables.
