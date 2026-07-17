import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ── Unified conversation thread ────────────────────────────────────────────────
// One row per pair of participants within a given context (listing/gig/project/job).
// contextType: 'marketplace' | 'gig' | 'freelance' | 'job'

export const conversationsTable = pgTable(
  "conversations",
  {
    id:                serial("id").primaryKey(),
    contextType:       text("context_type").notNull(),
    contextId:         integer("context_id").notNull(),
    contextTitle:      text("context_title").notNull().default(""),
    participant1Id:    text("participant1_id").notNull().references(() => usersTable.id),
    participant2Id:    text("participant2_id").notNull().references(() => usersTable.id),
    lastMessageAt:     timestamp("last_message_at").notNull().defaultNow(),
    lastMessageText:   text("last_message_text").notNull().default(""),
    lastMessageSenderId: text("last_message_sender_id"),
    createdAt:         timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_conv_p1").on(t.participant1Id),
    index("idx_conv_p2").on(t.participant2Id),
    index("idx_conv_ctx").on(t.contextType, t.contextId),
  ],
);

// ── Individual messages within a conversation ──────────────────────────────────

export const conversationMessagesTable = pgTable(
  "conversation_messages",
  {
    id:             serial("id").primaryKey(),
    conversationId: integer("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId:       text("sender_id").notNull().references(() => usersTable.id),
    senderName:     text("sender_name").notNull(),
    body:           text("body").notNull().default(""),
    fileUrl:        text("file_url"),
    fileName:       text("file_name"),
    isRead:         boolean("is_read").notNull().default(false),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_cmsg_conv").on(t.conversationId),
    index("idx_cmsg_sender").on(t.senderId),
  ],
);

export type Conversation = typeof conversationsTable.$inferSelect;
export type ConversationMessage = typeof conversationMessagesTable.$inferSelect;
