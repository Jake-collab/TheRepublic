import { pgTable, serial, boolean, text, timestamp } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  maintenanceBanner: text("maintenance_banner"),
  announcementBanner: text("announcement_banner"),
  announcementActive: boolean("announcement_active").notNull().default(false),
  minAppVersion: text("min_app_version").notNull().default("1.0.0"),
  citizenVoteEnabled: boolean("citizen_vote_enabled").notNull().default(true),
  discussionsEnabled: boolean("discussions_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppSettings = typeof appSettingsTable.$inferSelect;
