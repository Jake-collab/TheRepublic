# The Republic

A curated WebView browser aggregator with tab-first browsing, Citizen Vote feed, free/pro membership (Stripe), and a React/Vite admin dashboard. Auth via Clerk (email OTP). Backend: Express + PostgreSQL + Drizzle ORM.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/db run seed` — seed categories and websites
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080 in dev)
- DB: PostgreSQL + Drizzle ORM
- Auth: Clerk (email OTP) — `@clerk/express` on server, `@clerk/expo` on mobile, `@clerk/react` on admin
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle ORM schema (source of truth for all DB tables)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/the-republic/` — Expo mobile app
- `artifacts/admin/` — React/Vite admin dashboard
- `lib/db/src/seed.ts` — DB seed script

## Architecture decisions

- Contract-first API: OpenAPI spec → codegen → typed hooks used in both admin and mobile app
- Clerk Proxy: all Clerk traffic routed through `/api/__clerk` to avoid CORS issues
- WebView: `react-native-webview` for native (requires dev build), iframe fallback for web preview
- Membership tiers: free (10 curated sites) / pro (27+ sites, $9.99/mo via Stripe)
- Citizen Vote: built-in tab in the mobile browser, full CRUD feed with upvoting

## Product

- **Mobile app (The Republic)**: tab-first WebView browser aggregating curated websites. First tab is always "Citizen Vote" feed. Users can scroll through website tabs, and Pro users unlock all 27+ sites. Fullscreen mode hides chrome.
- **Admin dashboard**: manage categories, websites, users, support tickets, notifications, webview settings, and audit logs. Protected by Clerk auth.

## Seeded Websites

- **Free (10)**: Instacart, Uber Eats, TaskRabbit, Freelancer, ZipRecruiter, OfferUp, Vrbo, YouTube, SeatGeek, Walmart
- **Pro (17)**: DoorDash, Grubhub, Fiverr, Upwork, Indeed, LinkedIn, Amazon, eBay, Airbnb, Expedia, Netflix, Ticketmaster, StubHub, Robinhood, Coinbase, Reddit, X (Twitter)

## Gotchas

- `react-native-webview` is NOT Expo Go compatible — web preview shows iframes, native requires a dev/prod build
- Clerk uses two different versions: `@clerk/shared@3.x` (expo) and `@clerk/shared@4.x` (api-server). Metro watchman exclusions in metro.config.js prevent crash from temp directories
- The `websites` table has `display_domain` NOT NULL — always provide it when inserting
- Categories table has NO `slug` column — match by name
- Stripe routes exist but are no-ops until `STRIPE_SECRET_KEY` is set

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
