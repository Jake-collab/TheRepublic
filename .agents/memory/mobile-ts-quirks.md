---
name: Mobile TS quirks
description: Pre-existing TypeScript errors in the mobile Expo app that required fixes
---

Four pre-existing type errors fixed during Section 3:

1. `hooks/useColors.ts` — `colors as unknown as Record<string, ...>` needed double-cast because `colors` has a `radius: number` key that breaks the color-only Record type.

2. `app/notifications.tsx` — `markAll(undefined as any, ...)` — the generated hook for `markAllNotificationsRead` takes `void` params, not `{}`.

3. `app/sign-in.tsx` + `app/sign-up.tsx` — `errors.global.message` doesn't exist on ClerkError type. Use `(errors.global as any).longMessage ?? (errors.global as any).message ?? "An error occurred"`.

4. `app/support.tsx` — `SupportTicketInputType` is an Orval-generated const enum. `useState("support")` must be `useState<SupportTicketInputType>(SupportTicketInputType.support)` and TICKET_TYPES array must use enum values.

**Why:** These errors accumulated across sessions and weren't caught until the full mobile typecheck was run during Section 3.
