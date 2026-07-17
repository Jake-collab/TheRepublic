import { Router } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  conversationMessagesTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, or, and, desc, asc } from "drizzle-orm";

const router = Router();

// ── POST /messages/conversations/start ────────────────────────────────────────
// Find or create a conversation between current user and another user for a
// given context (marketplace listing, gig job, freelance project, job listing).
router.post("/conversations/start", requireAuth, ensureUser, async (req, res) => {
  const meId = (req as any).userId as string;
  const { contextType, contextId, contextTitle, otherUserId } = req.body as {
    contextType?: string;
    contextId?: number;
    contextTitle?: string;
    otherUserId?: string;
  };

  if (!contextType || !contextId || !otherUserId) {
    res.status(400).json({ error: "contextType, contextId, otherUserId required" });
    return;
  }
  if (otherUserId === meId) {
    res.status(400).json({ error: "Cannot message yourself" });
    return;
  }

  // Sort participant IDs so (A,B) and (B,A) map to the same row
  const [p1, p2] = [meId, otherUserId].sort();

  const existing = await db
    .select()
    .from(conversationsTable)
    .where(
      and(
        eq(conversationsTable.contextType, contextType),
        eq(conversationsTable.contextId, Number(contextId)),
        eq(conversationsTable.participant1Id, p1),
        eq(conversationsTable.participant2Id, p2),
      ),
    )
    .limit(1);

  if (existing[0]) {
    res.json(existing[0]);
    return;
  }

  const [conv] = await db.insert(conversationsTable).values({
    contextType,
    contextId: Number(contextId),
    contextTitle: contextTitle ?? "",
    participant1Id: p1,
    participant2Id: p2,
  }).returning();

  res.status(201).json(conv);
});

// ── GET /messages/conversations ───────────────────────────────────────────────
// All conversations for the current user, newest first.
router.get("/conversations", requireAuth, ensureUser, async (req, res) => {
  const meId = (req as any).userId as string;

  const rows = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.participant1Id, meId),
        eq(conversationsTable.participant2Id, meId),
      ),
    )
    .orderBy(desc(conversationsTable.lastMessageAt));

  // For each conversation, resolve the other participant's display name
  const withNames = await Promise.all(
    rows.map(async (conv) => {
      const otherId = conv.participant1Id === meId ? conv.participant2Id : conv.participant1Id;
      const other = await db
        .select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
        .from(usersTable)
        .where(eq(usersTable.id, otherId))
        .limit(1);
      return {
        ...conv,
        otherUserId: otherId,
        otherUserName: other[0]?.displayName ?? "Unknown",
        otherUserAvatar: other[0]?.avatarUrl ?? null,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        createdAt: conv.createdAt.toISOString(),
      };
    }),
  );

  res.json(withNames);
});

// ── GET /messages/conversations/:id ───────────────────────────────────────────
router.get("/conversations/:id", requireAuth, ensureUser, async (req, res) => {
  const meId  = (req as any).userId as string;
  const convId = Number(req.params.id);

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.participant1Id !== meId && conv.participant2Id !== meId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const messages = await db
    .select()
    .from(conversationMessagesTable)
    .where(eq(conversationMessagesTable.conversationId, convId))
    .orderBy(asc(conversationMessagesTable.createdAt));

  // Mark unread messages as read
  await db
    .update(conversationMessagesTable)
    .set({ isRead: true })
    .where(
      and(
        eq(conversationMessagesTable.conversationId, convId),
        eq(conversationMessagesTable.isRead, false),
      ),
    );

  res.json({
    ...conv,
    lastMessageAt: conv.lastMessageAt.toISOString(),
    createdAt: conv.createdAt.toISOString(),
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
});

// ── POST /messages/conversations/:id/messages ─────────────────────────────────
router.post("/conversations/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const meId  = (req as any).userId as string;
  const convId = Number(req.params.id);
  const { body, fileUrl, fileName } = req.body as {
    body?: string;
    fileUrl?: string;
    fileName?: string;
  };

  if (!body?.trim() && !fileUrl) {
    res.status(400).json({ error: "body or fileUrl required" }); return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, convId))
    .limit(1);

  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  if (conv.participant1Id !== meId && conv.participant2Id !== meId) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const senderRow = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, meId))
    .limit(1);
  const senderName = senderRow[0]?.displayName ?? "Unknown";

  const [msg] = await db.insert(conversationMessagesTable).values({
    conversationId: convId,
    senderId: meId,
    senderName,
    body: String(body ?? "").trim(),
    fileUrl: fileUrl ?? null,
    fileName: fileName ?? null,
  }).returning();

  // Update conversation preview
  const preview = fileUrl ? `📎 ${fileName ?? "File"}` : String(body ?? "").trim().slice(0, 100);
  await db
    .update(conversationsTable)
    .set({
      lastMessageAt: new Date(),
      lastMessageText: preview,
      lastMessageSenderId: meId,
    })
    .where(eq(conversationsTable.id, convId));

  // Notify the other participant
  const recipientId = conv.participant1Id === meId ? conv.participant2Id : conv.participant1Id;
  await db.insert(notificationsTable).values({
    userId: recipientId,
    title: `New message from ${senderName}`,
    message: preview,
  });

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

export default router;
