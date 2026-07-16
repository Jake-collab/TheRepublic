import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stripeSettingsTable = pgTable("stripe_settings", {
  id:                  serial("id").primaryKey(),
  secretKey:           text("secret_key"),
  webhookSecret:       text("webhook_secret"),
  /** Legacy — kept for backward compat */
  monthlyPriceId:      text("monthly_price_id"),
  annualPriceId:       text("annual_price_id"),
  monthlyPriceCents:   integer("monthly_price_cents").notNull().default(299),
  annualPriceCents:    integer("annual_price_cents").notNull().default(2000),
  /** Web tier ($2.99/mo) — unlocks Web section */
  webPriceId:          text("web_price_id"),
  webMonthlyCents:     integer("web_monthly_cents").notNull().default(299),
  /** Pro tier ($4.99/mo) — waives 5% worker fee + web access */
  proMonthlyPriceId:   text("pro_monthly_price_id"),
  proMonthlyCents:     integer("pro_monthly_cents").notNull().default(499),
  /** Stripe Connect app fee percent for worker payouts (default 5) */
  workerFeePercent:    integer("worker_fee_percent").notNull().default(5),
  /** Consumer transaction fee percent (default 1, capped) */
  consumerFeePercent:  integer("consumer_fee_percent").notNull().default(1),
  /** Consumer fee cap in cents (default 2000 = $20) */
  consumerFeeCapCents: integer("consumer_fee_cap_cents").notNull().default(2000),
  updatedAt:           timestamp("updated_at").notNull().defaultNow(),
});

export const insertStripeSettingsSchema = createInsertSchema(stripeSettingsTable).omit({ id: true, updatedAt: true });
export type InsertStripeSettings = z.infer<typeof insertStripeSettingsSchema>;
export type StripeSettings = typeof stripeSettingsTable.$inferSelect;
