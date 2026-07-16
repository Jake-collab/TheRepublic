import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const JOB_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "remote",
  "internship",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_CATEGORIES = [
  "tech",
  "retail",
  "food",
  "healthcare",
  "education",
  "trades",
  "admin",
  "transport",
  "creative",
  "sales",
  "other",
] as const;
export type JobCategory = (typeof JOB_CATEGORIES)[number];

// ── job_listings ──────────────────────────────────────────────────────────────

export const jobListingsTable = pgTable(
  "job_listings",
  {
    id:               serial("id").primaryKey(),
    posterId:         text("poster_id").notNull().references(() => usersTable.id),
    posterName:       text("poster_name").notNull(),
    company:          text("company").notNull(),
    title:            text("title").notNull(),
    description:      text("description").notNull(),
    jobType:          text("job_type").notNull().default("full_time"),
    category:         text("category").notNull(),
    payMinCents:      integer("pay_min_cents"),
    payMaxCents:      integer("pay_max_cents"),
    city:             text("city").notNull().default(""),
    stateCode:        text("state_code").notNull().default(""),
    isRemote:         boolean("is_remote").notNull().default(false),
    applicationUrl:   text("application_url"),
    status:           text("status").notNull().default("open"),
    applicationCount: integer("application_count").notNull().default(0),
    createdAt:        timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_job_listings_poster").on(t.posterId),
    index("idx_job_listings_category").on(t.category),
    index("idx_job_listings_status").on(t.status),
    index("idx_job_listings_job_type").on(t.jobType),
  ],
);

// ── job_applications ──────────────────────────────────────────────────────────

export const jobApplicationsTable = pgTable(
  "job_applications",
  {
    id:             serial("id").primaryKey(),
    listingId:      integer("listing_id").notNull().references(() => jobListingsTable.id, { onDelete: "cascade" }),
    applicantId:    text("applicant_id").notNull().references(() => usersTable.id),
    applicantName:  text("applicant_name").notNull(),
    applicantAvatar: text("applicant_avatar"),
    coverLetter:    text("cover_letter").notNull().default(""),
    resumeUrl:      text("resume_url"),
    /** "pending" | "reviewed" | "accepted" | "rejected" */
    status:         text("status").notNull().default("pending"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_job_apps_listing").on(t.listingId),
    index("idx_job_apps_applicant").on(t.applicantId),
  ],
);

// ── job_messages ──────────────────────────────────────────────────────────────

export const jobMessagesTable = pgTable(
  "job_messages",
  {
    id:          serial("id").primaryKey(),
    listingId:   integer("listing_id").notNull().references(() => jobListingsTable.id, { onDelete: "cascade" }),
    senderId:    text("sender_id").notNull().references(() => usersTable.id),
    senderName:  text("sender_name").notNull(),
    body:        text("body").notNull(),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_job_messages_listing").on(t.listingId)],
);

// ── Zod schemas + TS types ────────────────────────────────────────────────────

export const insertJobListingSchema = createInsertSchema(jobListingsTable).omit({
  id: true,
  createdAt: true,
  applicationCount: true,
});
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type JobListing       = typeof jobListingsTable.$inferSelect;

export const insertJobApplicationSchema = createInsertSchema(jobApplicationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication       = typeof jobApplicationsTable.$inferSelect;

export const insertJobMessageSchema = createInsertSchema(jobMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertJobMessage = z.infer<typeof insertJobMessageSchema>;
export type JobMessage       = typeof jobMessagesTable.$inferSelect;
