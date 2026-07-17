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
import { gigJobsTable } from "./gigs";

export const GIG_TRACKING_STATUSES = [
  "on_way",
  "on_scene",
  "scene_confirmed",
  "completed",
  "disputed",
] as const;
export type GigTrackingStatus = (typeof GIG_TRACKING_STATUSES)[number];

export const gigTrackingTable = pgTable(
  "gig_tracking",
  {
    id:           serial("id").primaryKey(),
    jobId:        integer("job_id").notNull().references(() => gigJobsTable.id),
    workerId:     text("worker_id").notNull().references(() => usersTable.id),
    hirerId:      text("hirer_id").notNull().references(() => usersTable.id),
    /** on_way | on_scene | scene_confirmed | completed | disputed */
    status:       text("status").notNull().default("on_way"),
    /** Whether hirer confirmed the worker is on scene */
    sceneConfirmed: boolean("scene_confirmed").notNull().default(false),
    /** Whether hirer confirmed completion (worker triggered completion first) */
    completionConfirmed: boolean("completion_confirmed").notNull().default(false),
    workerMarkedCompleteAt: timestamp("worker_marked_complete_at"),
    hirerConfirmedCompleteAt: timestamp("hirer_confirmed_complete_at"),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
    updatedAt:    timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_gig_tracking_job").on(t.jobId),
    index("idx_gig_tracking_worker").on(t.workerId),
    index("idx_gig_tracking_hirer").on(t.hirerId),
  ],
);

export const insertGigTrackingSchema = createInsertSchema(gigTrackingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGigTracking = z.infer<typeof insertGigTrackingSchema>;
export type GigTracking = typeof gigTrackingTable.$inferSelect;

// ── gig_work_accepted_24h ─────────────────────────────────────────────────────
// Tracks how many gig jobs a worker accepted in the last 24 hours (max 4)

export const gigDailyAcceptanceTable = pgTable(
  "gig_daily_acceptance",
  {
    id:        serial("id").primaryKey(),
    workerId:  text("worker_id").notNull().references(() => usersTable.id),
    jobId:     integer("job_id").notNull().references(() => gigJobsTable.id),
    acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_gig_daily_worker").on(t.workerId),
  ],
);
