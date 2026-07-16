import { Router } from "express";
import { db } from "@workspace/db";
import {
  gigJobsTable,
  gigApplicationsTable,
  gigMessagesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and, asc, lt, sql, ne } from "drizzle-orm";

const router = Router();

// ── GET /gigs/jobs ────────────────────────────────────────────────────────────
// Public. Returns open jobs with optional category + cursor filters.
router.get("/jobs", async (req, res) => {
  const { category, cursor, limit = "20" } = req.query;
  const take = Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [
    eq(gigJobsTable.status, "open"),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(gigJobsTable.category, category));
  }
  if (cursor) {
    conditions.push(
      lt(gigJobsTable.id, Number(cursor)) as ReturnType<typeof eq>,
    );
  }

  const rows = await db
    .select()
    .from(gigJobsTable)
    .where(and(...conditions))
    .orderBy(desc(gigJobsTable.createdAt))
    .limit(take);

  const hasMore = rows.length === take;
  const items   = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.json({ items, nextCursor });
});

// ── POST /gigs/jobs ───────────────────────────────────────────────────────────
router.post("/jobs", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const { title, description, category, payType, payAmountCents, city = "", stateCode = "" } =
    req.body as {
      title?: string;
      description?: string;
      category?: string;
      payType?: string;
      payAmountCents?: number;
      city?: string;
      stateCode?: string;
    };

  if (!title?.trim() || !description?.trim() || !category || !payAmountCents) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [job] = await db.insert(gigJobsTable).values({
    hirerId:        userId,
    hirerName:      user.displayName || "Anonymous",
    hirerAvatar:    user.avatarUrl ?? null,
    title:          title.trim(),
    description:    description.trim(),
    category:       String(category),
    payType:        payType === "hourly" ? "hourly" : "fixed",
    payAmountCents: Number(payAmountCents),
    city:           String(city).trim(),
    stateCode:      String(stateCode).trim().toUpperCase().slice(0, 2),
    status:         "open",
  }).returning();

  res.status(201).json(job);
});

// ── GET /gigs/jobs/:id ────────────────────────────────────────────────────────
// Returns job + applications (visible to all; hirer can use to manage).
router.get("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, id)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }

  const applications = await db
    .select()
    .from(gigApplicationsTable)
    .where(eq(gigApplicationsTable.jobId, id))
    .orderBy(asc(gigApplicationsTable.createdAt));

  res.json({ ...rows[0], applications });
});

// ── POST /gigs/jobs/:id/apply ─────────────────────────────────────────────────
router.post("/jobs/:id/apply", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobs[0].status !== "open") { res.status(400).json({ error: "Job is no longer open" }); return; }
  if (jobs[0].hirerId === userId) { res.status(400).json({ error: "You cannot apply to your own job" }); return; }

  const existing = await db
    .select()
    .from(gigApplicationsTable)
    .where(and(eq(gigApplicationsTable.jobId, jobId), eq(gigApplicationsTable.workerId, userId)))
    .limit(1);
  if (existing[0]) { res.status(409).json({ error: "Already applied", application: existing[0] }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const { message = "" } = req.body as { message?: string };

  const [application] = await db.insert(gigApplicationsTable).values({
    jobId,
    workerId:     userId,
    workerName:   user.displayName || "Anonymous",
    workerAvatar: user.avatarUrl ?? null,
    message:      String(message).trim(),
    status:       "pending",
  }).returning();

  // Increment applicationCount
  await db
    .update(gigJobsTable)
    .set({ applicationCount: sql`${gigJobsTable.applicationCount} + 1` })
    .where(eq(gigJobsTable.id, jobId));

  res.status(201).json(application);
});

// ── POST /gigs/jobs/:id/accept/:appId ────────────────────────────────────────
router.post("/jobs/:id/accept/:appId", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);
  const appId  = Number(req.params.appId);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobs[0].hirerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (jobs[0].status !== "open") { res.status(400).json({ error: "Job is not open" }); return; }

  const apps = await db.select().from(gigApplicationsTable).where(eq(gigApplicationsTable.id, appId)).limit(1);
  if (!apps[0] || apps[0].jobId !== jobId) { res.status(404).json({ error: "Application not found" }); return; }

  // Accept this application and reject all others
  await db
    .update(gigApplicationsTable)
    .set({ status: "accepted" })
    .where(eq(gigApplicationsTable.id, appId));

  await db
    .update(gigApplicationsTable)
    .set({ status: "rejected" })
    .where(and(eq(gigApplicationsTable.jobId, jobId), ne(gigApplicationsTable.id, appId)));

  // Assign worker to job
  await db
    .update(gigJobsTable)
    .set({ workerId: apps[0].workerId, workerName: apps[0].workerName })
    .where(eq(gigJobsTable.id, jobId));

  res.json({ success: true });
});

// ── POST /gigs/jobs/:id/start ─────────────────────────────────────────────────
router.post("/jobs/:id/start", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobs[0].hirerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (!jobs[0].workerId) { res.status(400).json({ error: "No worker assigned yet" }); return; }
  if (jobs[0].status !== "open") { res.status(400).json({ error: "Job already started or completed" }); return; }

  const [updated] = await db
    .update(gigJobsTable)
    .set({ status: "in_progress", startedAt: new Date() })
    .where(eq(gigJobsTable.id, jobId))
    .returning();

  res.json(updated);
});

// ── POST /gigs/jobs/:id/complete ─────────────────────────────────────────────
router.post("/jobs/:id/complete", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobs[0].hirerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
  if (jobs[0].status !== "in_progress") { res.status(400).json({ error: "Job is not in progress" }); return; }

  const now = new Date();
  const startedAt = jobs[0].startedAt ?? now;
  const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60_000);

  const [updated] = await db
    .update(gigJobsTable)
    .set({ status: "completed", completedAt: now, durationMinutes })
    .where(eq(gigJobsTable.id, jobId))
    .returning();

  res.json(updated);
});

// ── GET /gigs/jobs/:id/messages ───────────────────────────────────────────────
router.get("/jobs/:id/messages", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Not found" }); return; }

  const isHirer  = jobs[0].hirerId  === userId;
  const isWorker = jobs[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const messages = await db
    .select()
    .from(gigMessagesTable)
    .where(eq(gigMessagesTable.jobId, jobId))
    .orderBy(asc(gigMessagesTable.createdAt));

  res.json(messages);
});

// ── POST /gigs/jobs/:id/messages ──────────────────────────────────────────────
router.post("/jobs/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.id);

  const jobs = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobs[0]) { res.status(404).json({ error: "Not found" }); return; }

  const isHirer  = jobs[0].hirerId  === userId;
  const isWorker = jobs[0].workerId === userId;
  if (!isHirer && !isWorker) { res.status(403).json({ error: "Forbidden" }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }

  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(400).json({ error: "Message body required" }); return; }

  const [msg] = await db.insert(gigMessagesTable).values({
    jobId,
    senderId:   userId,
    senderName: users[0].displayName || "Anonymous",
    body:       body.trim(),
  }).returning();

  res.status(201).json(msg);
});

// ── GET /gigs/my-jobs ─────────────────────────────────────────────────────────
// Returns jobs posted by the authenticated hirer, newest first.
router.get("/my-jobs", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const rows = await db
    .select()
    .from(gigJobsTable)
    .where(eq(gigJobsTable.hirerId, userId))
    .orderBy(desc(gigJobsTable.createdAt));

  res.json(rows);
});

// ── GET /gigs/my-applications ─────────────────────────────────────────────────
// Returns the current user's gig applications with the associated job data.
router.get("/my-applications", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const rows = await db
    .select({
      application: gigApplicationsTable,
      job: gigJobsTable,
    })
    .from(gigApplicationsTable)
    .innerJoin(gigJobsTable, eq(gigApplicationsTable.jobId, gigJobsTable.id))
    .where(eq(gigApplicationsTable.workerId, userId))
    .orderBy(desc(gigApplicationsTable.createdAt));

  res.json(rows.map((r) => ({ ...r.application, job: r.job })));
});

export default router;
