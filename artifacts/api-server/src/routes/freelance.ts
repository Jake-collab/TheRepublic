import { Router } from "express";
import { db } from "@workspace/db";
import {
  freelanceProjectsTable,
  freelanceBidsTable,
  freelanceMilestonesTable,
  freelanceMessagesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and, asc, lt, sql, ne } from "drizzle-orm";

const router = Router();

// ── GET /freelance/projects ───────────────────────────────────────────────────
router.get("/projects", async (req, res) => {
  const { category, cursor, limit = "20" } = req.query;
  const take = Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [
    eq(freelanceProjectsTable.status, "open"),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(freelanceProjectsTable.category, category));
  }
  if (cursor) {
    conditions.push(
      lt(freelanceProjectsTable.id, Number(cursor)) as ReturnType<typeof eq>,
    );
  }

  const rows = await db
    .select()
    .from(freelanceProjectsTable)
    .where(and(...conditions))
    .orderBy(desc(freelanceProjectsTable.createdAt))
    .limit(take);

  const hasMore = rows.length === take;
  const items   = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.json({ items, nextCursor });
});

// ── POST /freelance/projects ──────────────────────────────────────────────────
router.post("/projects", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const {
    title, description, category, skillTags = "",
    budgetType, budgetMinCents, budgetMaxCents,
  } = req.body as {
    title?: string; description?: string; category?: string;
    skillTags?: string; budgetType?: string;
    budgetMinCents?: number; budgetMaxCents?: number;
  };

  if (!title?.trim() || !description?.trim() || !category || !budgetMinCents || !budgetMaxCents) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [project] = await db.insert(freelanceProjectsTable).values({
    hirerId:        userId,
    hirerName:      user.displayName || "Anonymous",
    hirerAvatar:    user.avatarUrl ?? null,
    title:          title.trim(),
    description:    description.trim(),
    category:       String(category),
    skillTags:      String(skillTags).trim(),
    budgetType:     budgetType === "hourly" ? "hourly" : "fixed",
    budgetMinCents: Number(budgetMinCents),
    budgetMaxCents: Number(budgetMaxCents),
    status:         "open",
  }).returning();

  res.status(201).json(project);
});

// ── GET /freelance/projects/:id ───────────────────────────────────────────────
router.get("/projects/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, id)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }

  const [bids, milestones] = await Promise.all([
    db.select().from(freelanceBidsTable).where(eq(freelanceBidsTable.projectId, id)).orderBy(asc(freelanceBidsTable.createdAt)),
    db.select().from(freelanceMilestonesTable).where(eq(freelanceMilestonesTable.projectId, id)).orderBy(asc(freelanceMilestonesTable.createdAt)),
  ]);

  res.json({ ...rows[0], bids, milestones });
});

// ── POST /freelance/projects/:id/bid ─────────────────────────────────────────
router.post("/projects/:id/bid", requireAuth, ensureUser, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Project not found" }); return; }
  if (projects[0].status !== "open") { res.status(400).json({ error: "Project is not open for bids" }); return; }
  if (projects[0].hirerId === userId) { res.status(400).json({ error: "Cannot bid on your own project" }); return; }

  const existing = await db.select().from(freelanceBidsTable)
    .where(and(eq(freelanceBidsTable.projectId, projectId), eq(freelanceBidsTable.workerId, userId)))
    .limit(1);
  if (existing[0]) { res.status(409).json({ error: "Already submitted a bid", bid: existing[0] }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const { proposedCents, deliveryDays = 7, coverLetter = "" } = req.body as {
    proposedCents?: number; deliveryDays?: number; coverLetter?: string;
  };
  if (!proposedCents || proposedCents <= 0) { res.status(400).json({ error: "Invalid bid amount" }); return; }

  const [bid] = await db.insert(freelanceBidsTable).values({
    projectId,
    workerId:      userId,
    workerName:    user.displayName || "Anonymous",
    workerAvatar:  user.avatarUrl ?? null,
    proposedCents: Number(proposedCents),
    deliveryDays:  Number(deliveryDays),
    coverLetter:   String(coverLetter).trim(),
    status:        "pending",
  }).returning();

  await db.update(freelanceProjectsTable)
    .set({ bidCount: sql`${freelanceProjectsTable.bidCount} + 1` })
    .where(eq(freelanceProjectsTable.id, projectId));

  res.status(201).json(bid);
});

// ── POST /freelance/projects/:id/bid/withdraw ─────────────────────────────────
// Worker withdraws their own pending bid.
router.post("/projects/:id/bid/withdraw", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const existing = await db.select().from(freelanceBidsTable)
    .where(and(eq(freelanceBidsTable.projectId, projectId), eq(freelanceBidsTable.workerId, userId)))
    .limit(1);
  if (!existing[0]) { res.status(404).json({ error: "Bid not found" }); return; }
  if (existing[0].status !== "pending") { res.status(400).json({ error: "Only pending bids can be withdrawn" }); return; }

  await db.update(freelanceBidsTable)
    .set({ status: "withdrawn" })
    .where(eq(freelanceBidsTable.id, existing[0].id));

  await db.update(freelanceProjectsTable)
    .set({ bidCount: sql`GREATEST(0, ${freelanceProjectsTable.bidCount} - 1)` })
    .where(eq(freelanceProjectsTable.id, projectId));

  res.json({ success: true });
});

// ── POST /freelance/projects/:id/cancel ───────────────────────────────────────
// Hirer cancels their own project (open or in_progress).
router.post("/projects/:id/cancel", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Project not found" }); return; }
  if (projects[0].hirerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (projects[0].status === "completed" || projects[0].status === "cancelled") {
    res.status(400).json({ error: "Project cannot be cancelled" }); return;
  }

  await db.update(freelanceProjectsTable)
    .set({ status: "cancelled" })
    .where(eq(freelanceProjectsTable.id, projectId));

  res.json({ success: true });
});

// ── POST /freelance/projects/:id/accept/:bidId ────────────────────────────────
router.post("/projects/:id/accept/:bidId", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);
  const bidId     = Number(req.params.bidId);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Project not found" }); return; }
  if (projects[0].hirerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (projects[0].status !== "open") { res.status(400).json({ error: "Project is not open" }); return; }

  const bids = await db.select().from(freelanceBidsTable).where(eq(freelanceBidsTable.id, bidId)).limit(1);
  if (!bids[0] || bids[0].projectId !== projectId) { res.status(404).json({ error: "Bid not found" }); return; }

  await db.update(freelanceBidsTable).set({ status: "accepted" }).where(eq(freelanceBidsTable.id, bidId));
  await db.update(freelanceBidsTable).set({ status: "rejected" })
    .where(and(eq(freelanceBidsTable.projectId, projectId), ne(freelanceBidsTable.id, bidId)));

  await db.update(freelanceProjectsTable)
    .set({ status: "in_progress", workerId: bids[0].workerId, workerName: bids[0].workerName })
    .where(eq(freelanceProjectsTable.id, projectId));

  res.json({ success: true });
});

// ── POST /freelance/projects/:id/milestones ───────────────────────────────────
router.post("/projects/:id/milestones", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Not found" }); return; }
  const isHirer  = projects[0].hirerId  === userId;
  const isWorker = projects[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description = "", amountCents = 0, dueDate } = req.body as {
    title?: string; description?: string; amountCents?: number; dueDate?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }

  const [milestone] = await db.insert(freelanceMilestonesTable).values({
    projectId,
    title: title.trim(),
    description: String(description).trim(),
    amountCents: Number(amountCents),
    status: "pending",
    dueDate: dueDate ?? null,
  }).returning();

  res.status(201).json(milestone);
});

// ── PATCH /freelance/projects/:id/milestones/:milestoneId ─────────────────────
router.patch("/projects/:id/milestones/:milestoneId", requireAuth, async (req, res) => {
  const userId      = (req as any).userId as string;
  const projectId   = Number(req.params.id);
  const milestoneId = Number(req.params.milestoneId);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Not found" }); return; }
  const isHirer  = projects[0].hirerId  === userId;
  const isWorker = projects[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const milestones = await db.select().from(freelanceMilestonesTable).where(eq(freelanceMilestonesTable.id, milestoneId)).limit(1);
  if (!milestones[0] || milestones[0].projectId !== projectId) { res.status(404).json({ error: "Milestone not found" }); return; }

  const current = milestones[0].status;
  const { status } = req.body as { status?: string };

  // Validate allowed transitions
  const allowed =
    (isHirer  && current === "pending"     && status === "in_progress") ||
    (isWorker && current === "in_progress" && status === "submitted")   ||
    (isHirer  && current === "submitted"   && status === "approved");

  if (!allowed) { res.status(400).json({ error: "Invalid status transition" }); return; }

  // If hirer approves last milestone, auto-complete project
  const [updated] = await db.update(freelanceMilestonesTable)
    .set({ status })
    .where(eq(freelanceMilestonesTable.id, milestoneId))
    .returning();

  if (status === "approved") {
    const remaining = await db.select().from(freelanceMilestonesTable)
      .where(and(eq(freelanceMilestonesTable.projectId, projectId), ne(freelanceMilestonesTable.status, "approved")));
    if (remaining.length === 0) {
      await db.update(freelanceProjectsTable)
        .set({ status: "completed" })
        .where(eq(freelanceProjectsTable.id, projectId));
    }
  }

  res.json(updated);
});

// ── GET /freelance/projects/:id/messages ──────────────────────────────────────
router.get("/projects/:id/messages", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Not found" }); return; }
  const isHirer  = projects[0].hirerId  === userId;
  const isWorker = projects[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await db.select().from(freelanceMessagesTable)
    .where(eq(freelanceMessagesTable.projectId, projectId))
    .orderBy(asc(freelanceMessagesTable.createdAt));

  res.json(messages);
});

// ── POST /freelance/projects/:id/messages ────────────────────────────────────
router.post("/projects/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const userId    = (req as any).userId as string;
  const projectId = Number(req.params.id);

  const projects = await db.select().from(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, projectId)).limit(1);
  if (!projects[0]) { res.status(404).json({ error: "Not found" }); return; }
  const isHirer  = projects[0].hirerId  === userId;
  const isWorker = projects[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }

  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(400).json({ error: "Body required" }); return; }

  const [msg] = await db.insert(freelanceMessagesTable).values({
    projectId,
    senderId:   userId,
    senderName: users[0].displayName || "Anonymous",
    body:       body.trim(),
  }).returning();

  res.status(201).json(msg);
});

// ── GET /freelance/my-projects ────────────────────────────────────────────────
router.get("/my-projects", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db.select().from(freelanceProjectsTable)
    .where(eq(freelanceProjectsTable.hirerId, userId))
    .orderBy(desc(freelanceProjectsTable.createdAt));
  res.json(rows);
});

// ── GET /freelance/my-bids ────────────────────────────────────────────────────
router.get("/my-bids", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db.select({
    bid:     freelanceBidsTable,
    project: freelanceProjectsTable,
  })
    .from(freelanceBidsTable)
    .innerJoin(freelanceProjectsTable, eq(freelanceBidsTable.projectId, freelanceProjectsTable.id))
    .where(eq(freelanceBidsTable.workerId, userId))
    .orderBy(desc(freelanceBidsTable.createdAt));

  res.json(rows.map((r) => ({ ...r.bid, project: r.project })));
});

export default router;
