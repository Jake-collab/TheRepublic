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

export const FREELANCE_CATEGORIES = [
  "design",
  "dev",
  "writing",
  "video",
  "marketing",
  "music",
  "photo",
  "consulting",
] as const;

export type FreelanceCategory = (typeof FREELANCE_CATEGORIES)[number];

// ── freelance_projects ────────────────────────────────────────────────────────

export const freelanceProjectsTable = pgTable(
  "freelance_projects",
  {
    id:             serial("id").primaryKey(),
    hirerId:        text("hirer_id").notNull().references(() => usersTable.id),
    hirerName:      text("hirer_name").notNull(),
    hirerAvatar:    text("hirer_avatar"),
    title:          text("title").notNull(),
    description:    text("description").notNull(),
    category:       text("category").notNull(),
    /** Comma-separated skill tags */
    skillTags:      text("skill_tags").notNull().default(""),
    /** "fixed" | "hourly" */
    budgetType:     text("budget_type").notNull().default("fixed"),
    budgetMinCents: integer("budget_min_cents").notNull(),
    budgetMaxCents: integer("budget_max_cents").notNull(),
    /** "open" | "in_progress" | "completed" | "cancelled" */
    status:         text("status").notNull().default("open"),
    workerId:       text("worker_id").references(() => usersTable.id),
    workerName:     text("worker_name"),
    /** Denormalised — incremented on each new bid */
    bidCount:       integer("bid_count").notNull().default(0),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_fl_projects_hirer").on(t.hirerId),
    index("idx_fl_projects_category").on(t.category),
    index("idx_fl_projects_status").on(t.status),
    index("idx_fl_projects_worker").on(t.workerId),
  ],
);

// ── freelance_bids ────────────────────────────────────────────────────────────

export const freelanceBidsTable = pgTable(
  "freelance_bids",
  {
    id:            serial("id").primaryKey(),
    projectId:     integer("project_id").notNull().references(() => freelanceProjectsTable.id),
    workerId:      text("worker_id").notNull().references(() => usersTable.id),
    workerName:    text("worker_name").notNull(),
    workerAvatar:  text("worker_avatar"),
    proposedCents: integer("proposed_cents").notNull(),
    deliveryDays:  integer("delivery_days").notNull().default(7),
    coverLetter:   text("cover_letter").notNull().default(""),
    /** "pending" | "accepted" | "rejected" | "withdrawn" */
    status:        text("status").notNull().default("pending"),
    createdAt:     timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_fl_bids_project").on(t.projectId),
    index("idx_fl_bids_worker").on(t.workerId),
  ],
);

// ── freelance_milestones ──────────────────────────────────────────────────────

export const freelanceMilestonesTable = pgTable(
  "freelance_milestones",
  {
    id:          serial("id").primaryKey(),
    projectId:   integer("project_id").notNull().references(() => freelanceProjectsTable.id),
    title:       text("title").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull().default(0),
    /** "pending" | "in_progress" | "submitted" | "approved" */
    status:      text("status").notNull().default("pending"),
    dueDate:     text("due_date"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_fl_milestones_project").on(t.projectId)],
);

// ── freelance_messages ────────────────────────────────────────────────────────

export const freelanceMessagesTable = pgTable(
  "freelance_messages",
  {
    id:          serial("id").primaryKey(),
    projectId:   integer("project_id").notNull().references(() => freelanceProjectsTable.id),
    senderId:    text("sender_id").notNull().references(() => usersTable.id),
    senderName:  text("sender_name").notNull(),
    body:        text("body").notNull(),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_fl_messages_project").on(t.projectId)],
);

// ── Zod schemas + TS types ────────────────────────────────────────────────────

export const insertFreelanceProjectSchema = createInsertSchema(freelanceProjectsTable).omit({
  id: true, createdAt: true, workerId: true, workerName: true, bidCount: true,
});
export type InsertFreelanceProject  = z.infer<typeof insertFreelanceProjectSchema>;
export type FreelanceProject        = typeof freelanceProjectsTable.$inferSelect;

export const insertFreelanceBidSchema = createInsertSchema(freelanceBidsTable).omit({
  id: true, createdAt: true,
});
export type InsertFreelanceBid = z.infer<typeof insertFreelanceBidSchema>;
export type FreelanceBid       = typeof freelanceBidsTable.$inferSelect;

export const insertFreelanceMilestoneSchema = createInsertSchema(freelanceMilestonesTable).omit({
  id: true, createdAt: true,
});
export type InsertFreelanceMilestone = z.infer<typeof insertFreelanceMilestoneSchema>;
export type FreelanceMilestone       = typeof freelanceMilestonesTable.$inferSelect;

export const insertFreelanceMessageSchema = createInsertSchema(freelanceMessagesTable).omit({
  id: true, createdAt: true,
});
export type InsertFreelanceMessage = z.infer<typeof insertFreelanceMessageSchema>;
export type FreelanceMessage       = typeof freelanceMessagesTable.$inferSelect;
