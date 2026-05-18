import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { websitesTable } from "./websites";

export const userWebsitePrefsTable = pgTable("user_website_prefs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  websiteId: integer("website_id").notNull().references(() => websitesTable.id),
  tabColor: text("tab_color"),
  tabOrder: integer("tab_order").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  lastVisitedUrl: text("last_visited_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [unique().on(t.userId, t.websiteId)]);

export const insertUserWebsitePrefSchema = createInsertSchema(userWebsitePrefsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserWebsitePref = z.infer<typeof insertUserWebsitePrefSchema>;
export type UserWebsitePref = typeof userWebsitePrefsTable.$inferSelect;
