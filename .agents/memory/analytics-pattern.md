---
name: Analytics time-series pattern
description: How daily aggregates are built and how Recharts is styled for the dark admin theme
---

## Date gap-filling
Backend helper `buildDateRange(days)` generates every calendar day as "YYYY-MM-DD" strings. SQL GROUP BY date_trunc result is merged into this array with a default of 0 — so every day is always present, even if no rows exist.

SQL pattern (Drizzle):
```ts
db.select({
  date: sql<string>`date_trunc('day', ${table.createdAt})::date::text`,
  count: sql<number>`count(*)::int`,
})
.from(table)
.where(sql`${table.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
.groupBy(sql`1`).orderBy(sql`1`)
```

**Why:** `sql.raw(String(days))` is safe because `days` is validated as `Math.min(Math.max(Number(...), 1), 90)` before use.

## Recharts dark theme config (admin)
- `CartesianGrid` stroke: `#1e293b`
- Axis `tick` fill: `#64748b`, fontSize 11, tickLine false, axisLine false
- `Tooltip` contentStyle: `{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 }`
- Use `<linearGradient>` defs for area fills with low opacity (0.3 → 0 top-to-bottom)
- Chart colors: users `#7c3aed`, talkPosts `#3b82f6`, citizenVotes `#10b981`, comments `#f59e0b`, created-tickets `#ef4444`, resolved `#10b981`

## Analytics page pattern
- Uses direct `useQuery` + `fetchJson` (no generated hooks) — consistent with moderation.tsx
- Period selector state (`days`) is local, passed as query param; all 5 queries re-fetch when it changes
- `membership` and `top-content` queries don't accept a `days` param (all-time)
