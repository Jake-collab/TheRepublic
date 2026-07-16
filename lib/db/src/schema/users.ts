import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id:               text("id").primaryKey(), // Clerk user ID
  email:            text("email").notNull(),
  displayName:      text("display_name").notNull().default(""),
  avatarUrl:        text("avatar_url"),
  isPro:            boolean("is_pro").notNull().default(false),
  /** "free" | "web" | "pro" — kept in sync with membershipsTable.tier */
  membershipTier:   text("membership_tier").notNull().default("free"),
  /** Stripe Connect Express account ID for worker payouts */
  stripeAccountId:  text("stripe_account_id"),
  isAdmin:          boolean("is_admin").notNull().default(false),
  isBanned:         boolean("is_banned").notNull().default(false),
  bannedAt:         timestamp("banned_at"),
  banReason:        text("ban_reason"),
  theme:            text("theme").notNull().default("system"),
  acceptedTermsAt:  timestamp("accepted_terms_at"),
  acceptedPrivacyAt: timestamp("accepted_privacy_at"),
  sessionResetAt:   timestamp("session_reset_at"),
  forceRefreshAt:   timestamp("force_refresh_at"),
  createdAt:        timestamp("created_at").notNull().defaultNow(),
  updatedAt:        timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
