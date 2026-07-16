import { db, stripeSettingsTable } from "@workspace/db";

export interface StripeConfig {
  secretKey: string | null;
  webhookSecret: string | null;
  /** Legacy kept for backward compat */
  monthlyPriceId: string | null;
  annualPriceId: string | null;
  monthlyPriceCents: number;
  annualPriceCents: number;
  /** Web tier — $2.99/mo, unlocks Web section */
  webPriceId: string | null;
  webMonthlyCents: number;
  /** Pro tier — $4.99/mo, waives worker fee + web access */
  proMonthlyPriceId: string | null;
  proMonthlyCents: number;
  /** Fee config */
  workerFeePercent: number;
  consumerFeePercent: number;
  consumerFeeCapCents: number;
}

let cache: { config: StripeConfig; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getStripeConfig(): Promise<StripeConfig> {
  if (cache && cache.expiresAt > Date.now()) return cache.config;

  let rows = await db.select().from(stripeSettingsTable).limit(1);

  if (!rows[0]) {
    const inserted = await db.insert(stripeSettingsTable).values({
      secretKey:           process.env.STRIPE_SECRET_KEY ?? null,
      webhookSecret:       process.env.STRIPE_WEBHOOK_SECRET ?? null,
      monthlyPriceId:      process.env.STRIPE_MONTHLY_PRICE_ID ?? null,
      annualPriceId:       process.env.STRIPE_ANNUAL_PRICE_ID ?? null,
      monthlyPriceCents:   299,
      annualPriceCents:    2000,
      webPriceId:          process.env.STRIPE_WEB_PRICE_ID ?? null,
      webMonthlyCents:     299,
      proMonthlyPriceId:   process.env.STRIPE_PRO_PRICE_ID ?? null,
      proMonthlyCents:     499,
      workerFeePercent:    5,
      consumerFeePercent:  1,
      consumerFeeCapCents: 2000,
    }).returning();
    rows = inserted;
  }

  const row = rows[0];
  const config: StripeConfig = {
    secretKey:           row.secretKey ?? null,
    webhookSecret:       row.webhookSecret ?? null,
    monthlyPriceId:      row.monthlyPriceId ?? null,
    annualPriceId:       row.annualPriceId ?? null,
    monthlyPriceCents:   row.monthlyPriceCents,
    annualPriceCents:    row.annualPriceCents,
    webPriceId:          row.webPriceId ?? null,
    webMonthlyCents:     row.webMonthlyCents,
    proMonthlyPriceId:   row.proMonthlyPriceId ?? null,
    proMonthlyCents:     row.proMonthlyCents,
    workerFeePercent:    row.workerFeePercent,
    consumerFeePercent:  row.consumerFeePercent,
    consumerFeeCapCents: row.consumerFeeCapCents,
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
    const first = domains.split(",")[0]!.trim();
    return `https://${first}`;
  }
  return "https://example.com";
}

// ── Fee utilities ─────────────────────────────────────────────────────────────

/**
 * Consumer transaction fee: configurable % (default 1%), capped at $20.
 * Applied to BuySell marketplace purchases.
 */
export function calcConsumerFee(
  amountCents: number,
  cfg?: Pick<StripeConfig, "consumerFeePercent" | "consumerFeeCapCents">,
): number {
  const pct = cfg?.consumerFeePercent  ?? 1;
  const cap = cfg?.consumerFeeCapCents ?? 2000;
  return Math.min(Math.round(amountCents * pct / 100), cap);
}

/**
 * Worker payout fee: configurable % (default 5%), waived for Pro-tier members.
 * Applied to Gigs and Freelance payouts.
 */
export function calcWorkerFee(
  amountCents: number,
  membershipTier: string,
  cfg?: Pick<StripeConfig, "workerFeePercent">,
): number {
  if (membershipTier === "pro") return 0;
  const pct = cfg?.workerFeePercent ?? 5;
  return Math.round(amountCents * pct / 100);
}

/**
 * Resolve which access tier a Stripe price ID maps to.
 * Falls back to "web" for legacy monthly price ID.
 */
export function tierFromPriceId(priceId: string, cfg: StripeConfig): "web" | "pro" | "unknown" {
  if (cfg.proMonthlyPriceId && priceId === cfg.proMonthlyPriceId) return "pro";
  if (cfg.webPriceId         && priceId === cfg.webPriceId)       return "web";
  if (cfg.monthlyPriceId     && priceId === cfg.monthlyPriceId)   return "web"; // legacy
  if (cfg.annualPriceId      && priceId === cfg.annualPriceId)    return "pro"; // legacy annual → pro
  return "unknown";
}
