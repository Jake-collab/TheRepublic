import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stripeSettingsTable = pgTable("stripe_settings", {
  id: serial("id").primaryKey(),
  secretKey: text("secret_key"),
  webhookSecret: text("webhook_secret"),
  monthlyPriceId: text("monthly_price_id"),
  annualPriceId: text("annual_price_id"),
  monthlyPriceCents: integer("monthly_price_cents").notNull().default(299),
  annualPriceCents: integer("annual_price_cents").notNull().default(2000),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertStripeSettingsSchema = createInsertSchema(stripeSettingsTable).omit({ id: true, updatedAt: true });
export type InsertStripeSettings = z.infer<typeof insertStripeSettingsSchema>;
export type StripeSettings = typeof stripeSettingsTable.$inferSelect;
