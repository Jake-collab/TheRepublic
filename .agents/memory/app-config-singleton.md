---
name: App config singleton pattern
description: How singleton settings tables (app_settings, stripe_settings) are read and written in the Express routes
---

## Pattern
Both `app_settings` and `stripe_settings` are singleton tables (always 0 or 1 row). The GET route auto-creates the row with defaults if it doesn't exist yet. The PUT/update route does an INSERT if no rows exist, otherwise an UPDATE on id=rows[0].id.

```ts
const rows = await db.select().from(appSettingsTable).limit(1);
if (rows.length === 0) {
  const [created] = await db.insert(appSettingsTable).values({}).returning();
  // return created
}
// return rows[0]
```

**Why:** Avoids requiring a separate seed/migration to initialize the row. Any admin visit to the settings page auto-initialises the config with schema defaults.

**How to apply:** Any new singleton settings table should follow this pattern — never assume the row exists, always guard with a length check on the first SELECT.
