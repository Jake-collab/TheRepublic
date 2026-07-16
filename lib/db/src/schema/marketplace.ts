import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const MARKETPLACE_CATEGORIES = [
  "electronics",
  "clothing",
  "furniture",
  "vehicles",
  "collectibles",
  "sports",
  "home",
  "books",
  "other",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const marketplaceListingsTable = pgTable(
  "marketplace_listings",
  {
    id:           serial("id").primaryKey(),
    sellerId:     text("seller_id").notNull().references(() => usersTable.id),
    sellerName:   text("seller_name").notNull(),
    sellerAvatar: text("seller_avatar"),
    title:        text("title").notNull(),
    description:  text("description").notNull(),
    priceCents:   integer("price_cents").notNull(),
    category:     text("category").notNull(),
    /** Array of photo URLs. Populated once object-storage is wired. */
    photos:       text("photos").array().notNull().default([]),
    city:         text("city").notNull().default(""),
    stateCode:    text("state_code").notNull().default(""),
    /** "active" | "sold" | "removed" */
    status:       text("status").notNull().default("active"),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_marketplace_listings_seller").on(t.sellerId),
    index("idx_marketplace_listings_category").on(t.category),
    index("idx_marketplace_listings_status").on(t.status),
    index("idx_marketplace_listings_created").on(t.createdAt),
  ],
);

export const insertMarketplaceListingSchema = createInsertSchema(
  marketplaceListingsTable,
).omit({ id: true, createdAt: true });

export type InsertMarketplaceListing = z.infer<
  typeof insertMarketplaceListingSchema
>;
export type MarketplaceListing =
  typeof marketplaceListingsTable.$inferSelect;
