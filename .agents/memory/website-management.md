---
name: Website/category management patterns
description: Patterns used in Section 5 for bulk operations, CSV export, and drag-and-drop reorder
---

## Bulk operations
Use `inArray(table.id, ids)` from drizzle-orm in the WHERE clause. Always validate `ids.length > 0` before the DB call or drizzle will error.

## CSV export
Set headers before send:
```ts
res.setHeader("Content-Type", "text/csv");
res.setHeader("Content-Disposition", `attachment; filename="websites-${date}.csv"`);
res.send(csvString);
```
Frontend triggers download with `document.createElement("a"); a.href = ...; a.click()`.

## HTML5 drag-and-drop for table rows (categories)
Pattern: `draggable` row → `onDragStart` stores id → `onDragOver` tracks overIdx → `onDrop` splices localCats optimistically, then calls reorder API. Key: `e.preventDefault()` in onDragOver is required for drop to fire.

## Route ordering caution
Static sub-paths (`/websites/usage`, `/websites/export`, `/websites/bulk-update`, `/websites/reorder`) must be registered BEFORE dynamic paths (`/websites/:id`) in Express to avoid the wildcard capturing them.

**Why:** Express matches routes in registration order. `/websites/usage` registered after `/websites/:id` would be swallowed by the `:id` param handler.
**How to apply:** Always add new static sub-routes (like `/export`, `/bulk-update`) before `/:id` patch/delete handlers in admin.ts.
