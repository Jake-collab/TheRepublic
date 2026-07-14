import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const talkCategoriesTable = pgTable("talk_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("💬"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const talkPostsTable = pgTable("talk_posts", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => talkCategoriesTable.id),
  userId: text("user_id").references(() => usersTable.id),
  displayName: text("display_name").notNull().default("Anonymous"),
  avatarUrl: text("avatar_url"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  pinnedAt: timestamp("pinned_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const talkVotesTable = pgTable("talk_votes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => talkPostsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.postId, t.userId)]);

export const talkCommentsTable = pgTable("talk_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => talkPostsTable.id),
  userId: text("user_id").references(() => usersTable.id),
  displayName: text("display_name").notNull().default("Anonymous"),
  avatarUrl: text("avatar_url"),
  body: text("body").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const talkCommentVotesTable = pgTable("talk_comment_votes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => talkCommentsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.commentId, t.userId)]);

export const insertTalkPostSchema = createInsertSchema(talkPostsTable).omit({ id: true, upvotes: true, commentCount: true, createdAt: true });
export type InsertTalkPost = z.infer<typeof insertTalkPostSchema>;
export type TalkPost = typeof talkPostsTable.$inferSelect;

export const insertTalkCommentSchema = createInsertSchema(talkCommentsTable).omit({ id: true, createdAt: true });
export type InsertTalkComment = z.infer<typeof insertTalkCommentSchema>;
export type TalkComment = typeof talkCommentsTable.$inferSelect;

export type TalkCategory = typeof talkCategoriesTable.$inferSelect;
