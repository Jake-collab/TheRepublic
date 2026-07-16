import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const identityVerificationsTable = pgTable("identity_verifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id)
    .unique(),
  status: verificationStatusEnum("status").notNull().default("pending"),
  idFrontPath: text("id_front_path"),
  idBackPath:  text("id_back_path"),
  fullName:    text("full_name"),
  dob:         text("dob"),
  addressLine1: text("address_line1"),
  city:        text("city"),
  state:       text("state"),
  zip:         text("zip"),
  rejectionReason: text("rejection_reason"),
  reviewedBy:  text("reviewed_by"),
  reviewedAt:  timestamp("reviewed_at"),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});
