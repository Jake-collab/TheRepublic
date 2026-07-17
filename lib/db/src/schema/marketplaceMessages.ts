import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { marketplaceListingsTable } from "./marketplace";

export const marketplaceMessagesTable = pgTable(
  "marketplace_messages",
  {
    id:          serial("id").primaryKey(),
    listingId:   integer("listing_id").notNull().references(() => marketplaceListingsTable.id),
    senderId:    text("sender_id").notNull().references(() => usersTable.id),
    senderName:  text("sender_name").notNull(),
    receiverId:  text("receiver_id").notNull().references(() => usersTable.id),
    body:        text("body").notNull(),
    isRead:      boolean("is_read").notNull().default(false),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_marketplace_msg_listing").on(t.listingId),
    index("idx_marketplace_msg_sender").on(t.senderId),
    index("idx_marketplace_msg_receiver").on(t.receiverId),
  ],
);

export const insertMarketplaceMessageSchema = createInsertSchema(
  marketplaceMessagesTable,
).omit({ id: true, createdAt: true, isRead: true });
export type InsertMarketplaceMessage = z.infer<typeof insertMarketplaceMessageSchema>;
export type MarketplaceMessage = typeof marketplaceMessagesTable.$inferSelect;
