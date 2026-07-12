import { db, stripeSettingsTable } from "@workspace/db";

export interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
}

let cache: { config: StripeConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getStripeConfig(): Promise<StripeConfig> {
  if (cache && cache.expiresAt > Date.now()) return cache.config;

  let rows = await db.select().from(stripeSettingsTable).limit(1);

  if (!rows[0]) {
    const inserted = await db.insert(stripeSettingsTable).values({
      secretKey: process.env.STRIPE_SECRET_KEY ?? null,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? null,
      monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID ?? null,
      annualPriceId: process.env.STRIPE_ANNUAL_PRICE_ID ?? null,
      monthlyPriceCents: 299,
      annualPriceCents: 2000,
    }).returning();
    rows = inserted;
  }

  const row = rows[0];
  const config: StripeConfig = {
    secretKey: row.secretKey ?? null,
    webhookSecret: row.webhookSecret ?? null,
    monthlyPriceId: row.monthlyPriceId ?? null,
    annualPriceId: row.annualPriceId ?? null,
    monthlyPriceCents: row.monthlyPriceCents,
    annualPriceCents: row.annualPriceCents,
  };

  cache = { config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

export function invalidateStripeCache() {
  cache = null;
}

export function getAppBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS ?? process.env.REPLIT_DEV_DOMAIN;
  if (domains) {
    const first = domains.split(",")[0].trim();
    return `https://${first}`;
  }
  return "https://example.com";
}
