import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const notificationCampaignsTable = pgTable("notification_campaigns", {
  id: serial("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  segment: text("segment").notNull().default("all"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

export type NotificationCampaign = typeof notificationCampaignsTable.$inferSelect;
