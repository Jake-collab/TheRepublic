import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id).unique(),
  plan: text("plan").notNull().default("free"), // free | monthly | annual
  status: text("status").notNull().default("none"), // active | canceled | past_due | none
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMembership = z.infer<typeof insertMembershipSchema>;
export type Membership = typeof membershipsTable.$inferSelect;
