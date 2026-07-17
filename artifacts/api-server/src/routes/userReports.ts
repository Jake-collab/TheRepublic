import { Router } from "express";
import { db } from "@workspace/db";
import { contentFlagsTable, usersTable } from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq } from "drizzle-orm";

const router = Router();

// ── POST /user-reports ────────────────────────────────────────────────────────
router.post("/", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const { reportedUserId, reason, details } = req.body as {
    reportedUserId?: string;
    reason?: string;
    details?: string;
  };

  if (!reportedUserId || !reason?.trim()) {
    res.status(400).json({ error: "reportedUserId and reason are required" }); return;
  }
  if (reportedUserId === userId) {
    res.status(400).json({ error: "Cannot report yourself" }); return;
  }

  const reportedUser = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, reportedUserId))
    .limit(1);
  if (!reportedUser[0]) { res.status(404).json({ error: "User not found" }); return; }

  const [flag] = await db.insert(contentFlagsTable).values({
    contentType: "user",
    contentId:   0,
    userId,
    reason:      `[reported:${reportedUserId}] ${reason.trim()}`,
    details:     details?.trim() ?? "",
    status:      "pending",
  }).returning();

  res.status(201).json({ ok: true, flagId: flag.id });
});

export default router;
