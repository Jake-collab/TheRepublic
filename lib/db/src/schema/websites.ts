import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { categoriesTable } from "./categories";

export const websitesTable = pgTable("websites", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  displayDomain: text("display_domain").notNull(),
  iconUrl: text("icon_url"),
  isFree: boolean("is_free").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  tabOrder: integer("tab_order").notNull().default(0),
  cardOrder: integer("card_order").notNull().default(0),
  canBeTab: boolean("can_be_tab").notNull().default(true),
  canPreload: boolean("can_preload").notNull().default(false),
  remembersUrl: boolean("remembers_url").notNull().default(true),
  customUserAgent: text("custom_user_agent"),
  injectedCss: text("injected_css"),
  injectedJs: text("injected_js"),
  appBannerHideSelectors: text("app_banner_hide_selectors"),
  popupMitigationEnabled: boolean("popup_mitigation_enabled").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWebsiteSchema = createInsertSchema(websitesTable).omit({ id: true, createdAt: true });
export type InsertWebsite = z.infer<typeof insertWebsiteSchema>;
export type Website = typeof websitesTable.$inferSelect;
