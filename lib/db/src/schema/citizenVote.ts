import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const citizenVotePostsTable = pgTable("citizen_vote_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => usersTable.id),
  displayName: text("display_name").notNull().default("Anonymous"),
  content: text("content").notNull(),
  category: text("category").notNull(),
  geo: text("geo"),
  isNational: boolean("is_national").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const citizenVoteUpvotesTable = pgTable("citizen_vote_upvotes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => citizenVotePostsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.postId, t.userId)]);

export const insertCitizenVotePostSchema = createInsertSchema(citizenVotePostsTable).omit({ id: true, upvotes: true, createdAt: true });
export type InsertCitizenVotePost = z.infer<typeof insertCitizenVotePostSchema>;
export type CitizenVotePost = typeof citizenVotePostsTable.$inferSelect;
