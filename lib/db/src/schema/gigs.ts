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

export const GIG_CATEGORIES = [
  "moving",
  "cleaning",
  "handyman",
  "delivery",
  "assembly",
  "yard",
  "painting",
  "errands",
] as const;

export type GigCategory = (typeof GIG_CATEGORIES)[number];

// ── gig_jobs ──────────────────────────────────────────────────────────────────

export const gigJobsTable = pgTable(
  "gig_jobs",
  {
    id:               serial("id").primaryKey(),
    hirerId:          text("hirer_id").notNull().references(() => usersTable.id),
    hirerName:        text("hirer_name").notNull(),
    hirerAvatar:      text("hirer_avatar"),
    title:            text("title").notNull(),
    description:      text("description").notNull(),
    category:         text("category").notNull(),
    /** "fixed" | "hourly" */
    payType:          text("pay_type").notNull().default("fixed"),
    /** Cents (fixed total or hourly rate) */
    payAmountCents:   integer("pay_amount_cents").notNull(),
    city:             text("city").notNull().default(""),
    stateCode:        text("state_code").notNull().default(""),
    /** "open" | "in_progress" | "completed" | "cancelled" */
    status:           text("status").notNull().default("open"),
    workerId:         text("worker_id").references(() => usersTable.id),
    workerName:       text("worker_name"),
    /** Set when hirer confirms start */
    startedAt:        timestamp("started_at"),
    /** Set when hirer confirms completion */
    completedAt:      timestamp("completed_at"),
    /** Auto-calculated minutes between startedAt and completedAt */
    durationMinutes:  integer("duration_minutes"),
    /** Denormalised count updated on each new application */
    applicationCount: integer("application_count").notNull().default(0),
    createdAt:        timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_gig_jobs_hirer").on(t.hirerId),
    index("idx_gig_jobs_category").on(t.category),
    index("idx_gig_jobs_status").on(t.status),
    index("idx_gig_jobs_worker").on(t.workerId),
  ],
);

// ── gig_applications ──────────────────────────────────────────────────────────

export const gigApplicationsTable = pgTable(
  "gig_applications",
  {
    id:           serial("id").primaryKey(),
    jobId:        integer("job_id").notNull().references(() => gigJobsTable.id),
    workerId:     text("worker_id").notNull().references(() => usersTable.id),
    workerName:   text("worker_name").notNull(),
    workerAvatar: text("worker_avatar"),
    message:      text("message").notNull().default(""),
    /** "pending" | "accepted" | "rejected" */
    status:       text("status").notNull().default("pending"),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_gig_apps_job").on(t.jobId),
    index("idx_gig_apps_worker").on(t.workerId),
  ],
);

// ── gig_messages ──────────────────────────────────────────────────────────────

export const gigMessagesTable = pgTable(
  "gig_messages",
  {
    id:          serial("id").primaryKey(),
    jobId:       integer("job_id").notNull().references(() => gigJobsTable.id),
    senderId:    text("sender_id").notNull().references(() => usersTable.id),
    senderName:  text("sender_name").notNull(),
    body:        text("body").notNull(),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_gig_messages_job").on(t.jobId)],
);

// ── Zod schemas + TS types ────────────────────────────────────────────────────

export const insertGigJobSchema = createInsertSchema(gigJobsTable).omit({
  id: true,
  createdAt: true,
  workerId: true,
  workerName: true,
  startedAt: true,
  completedAt: true,
  durationMinutes: true,
  applicationCount: true,
});
export type InsertGigJob       = z.infer<typeof insertGigJobSchema>;
export type GigJob             = typeof gigJobsTable.$inferSelect;

export const insertGigApplicationSchema = createInsertSchema(gigApplicationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGigApplication = z.infer<typeof insertGigApplicationSchema>;
export type GigApplication       = typeof gigApplicationsTable.$inferSelect;

export const insertGigMessageSchema = createInsertSchema(gigMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGigMessage = z.infer<typeof insertGigMessageSchema>;
export type GigMessage       = typeof gigMessagesTable.$inferSelect;
