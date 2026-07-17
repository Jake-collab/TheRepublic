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

export const skillPostsTable = pgTable(
  "skill_posts",
  {
    id:             serial("id").primaryKey(),
    userId:         text("user_id").notNull().references(() => usersTable.id),
    userName:       text("user_name").notNull(),
    userAvatar:     text("user_avatar"),
    category:       text("category").notNull(),
    title:          text("title").notNull(),
    description:    text("description").notNull(),
    /** Comma-separated skills/tags */
    skills:         text("skills").notNull().default(""),
    /** Hourly rate in cents */
    hourlyRateCents: integer("hourly_rate_cents"),
    /** "active" | "paused" | "removed" */
    status:         text("status").notNull().default("active"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
    updatedAt:      timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_skill_posts_user").on(t.userId),
    index("idx_skill_posts_category").on(t.category),
    index("idx_skill_posts_status").on(t.status),
  ],
);

export const insertSkillPostSchema = createInsertSchema(skillPostsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSkillPost = z.infer<typeof insertSkillPostSchema>;
export type SkillPost = typeof skillPostsTable.$inferSelect;
