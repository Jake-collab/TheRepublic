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

export const REVIEW_CONTEXT_TYPES = [
  "gig",
  "freelance",
  "job",
  "marketplace",
] as const;
export type ReviewContextType = (typeof REVIEW_CONTEXT_TYPES)[number];

export const reviewsTable = pgTable(
  "reviews",
  {
    id:           serial("id").primaryKey(),
    reviewerId:   text("reviewer_id").notNull().references(() => usersTable.id),
    reviewerName: text("reviewer_name").notNull(),
    revieweeId:   text("reviewee_id").notNull().references(() => usersTable.id),
    /** gig | freelance | job | marketplace */
    contextType:  text("context_type").notNull(),
    contextId:    integer("context_id").notNull(),
    /** 1-5 stars */
    rating:       integer("rating").notNull(),
    description:  text("description").notNull().default(""),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_reviews_reviewee").on(t.revieweeId),
    index("idx_reviews_reviewer").on(t.reviewerId),
    index("idx_reviews_context").on(t.contextType, t.contextId),
  ],
);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
