import { pgTable, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const webviewSettingsTable = pgTable("webview_settings", {
  id: serial("id").primaryKey(),
  maxPreloadedWebviews: integer("max_preloaded_webviews").notNull().default(3),
  preloadEnabled: boolean("preload_enabled").notNull().default(true),
  sessionMemoryEnabled: boolean("session_memory_enabled").notNull().default(true),
  homepageLimit: integer("homepage_limit").notNull().default(40),
  freeWebsiteLimit: integer("free_website_limit").notNull().default(10),
  proWebsiteLimit: integer("pro_website_limit").notNull().default(50),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebviewSettingsSchema = createInsertSchema(webviewSettingsTable).omit({ id: true, updatedAt: true });
export type InsertWebviewSettings = z.infer<typeof insertWebviewSettingsSchema>;
export type WebviewSettings = typeof webviewSettingsTable.$inferSelect;
