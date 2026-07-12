import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const contentFlagsTable = pgTable("content_flags", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // "talk_post" | "talk_comment" | "citizen_vote"
  contentId: integer("content_id").notNull(),
  userId: text("user_id").references(() => usersTable.id),
  reason: text("reason").notNull(), // "spam" | "harassment" | "misinformation" | "hate_speech" | "other"
  details: text("details"),
  status: text("status").notNull().default("pending"), // "pending" | "reviewed" | "dismissed"
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const blockedWordsTable = pgTable("blocked_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull().unique(),
  addedBy: text("added_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ContentFlag = typeof contentFlagsTable.$inferSelect;
export type BlockedWord = typeof blockedWordsTable.$inferSelect;
