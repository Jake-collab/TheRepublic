import { Router } from "express";
import { db } from "@workspace/db";
import {
  gigTrackingTable,
  gigDailyAcceptanceTable,
  gigJobsTable,
  gigApplicationsTable,
  notificationsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, and, gte, desc, sql } from "drizzle-orm";

const router = Router();

// ── GET /gig-tracking/:jobId ──────────────────────────────────────────────────
router.get("/:jobId", requireAuth, async (req, res) => {
  const jobId = Number(req.params.jobId);
  const rows = await db
    .select()
    .from(gigTrackingTable)
    .where(eq(gigTrackingTable.jobId, jobId))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "No tracking record" }); return; }
  res.json(rows[0]);
});

// ── POST /gig-tracking/check-limit ───────────────────────────────────────────
// Check if worker can accept more jobs (max 4 per 24 hours)
router.post("/check-limit", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const since  = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows   = await db
    .select()
    .from(gigDailyAcceptanceTable)
    .where(and(
      eq(gigDailyAcceptanceTable.workerId, userId),
      gte(gigDailyAcceptanceTable.acceptedAt, since),
    ));
  const count     = rows.length;
  const canAccept = count < 4;
  res.json({ count, canAccept, remaining: Math.max(0, 4 - count) });
});

// ── POST /gig-tracking/accept ─────────────────────────────────────────────────
// Worker accepts gig job — enforces 24hr limit and removes job from public feed
router.post("/accept", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const { jobId } = req.body as { jobId?: number };
  if (!jobId) { res.status(400).json({ error: "jobId required" }); return; }

  // Enforce 24-hour acceptance limit (max 4)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAcceptances = await db
    .select()
    .from(gigDailyAcceptanceTable)
    .where(and(
      eq(gigDailyAcceptanceTable.workerId, userId),
      gte(gigDailyAcceptanceTable.acceptedAt, since),
    ));
  if (recentAcceptances.length >= 4) {
    res.status(429).json({ error: "You can only accept 4 gig jobs per 24 hours" }); return;
  }

  // Verify job exists and is open
  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, Number(jobId))).limit(1);
  if (!jobRows[0] || jobRows[0].status !== "open") {
    res.status(409).json({ error: "Job not available" }); return;
  }

  const userRow = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  // Create acceptance tracking record
  await db.insert(gigDailyAcceptanceTable).values({ workerId: userId, jobId: Number(jobId) });

  // Create tracking row — starts as on_way
  const [tracking] = await db.insert(gigTrackingTable).values({
    jobId:   Number(jobId),
    workerId: userId,
    hirerId: jobRows[0].hirerId,
    status:  "on_way",
  }).returning();

  // Mark job as having a pending worker (still "open" until hirer confirms on-scene)
  // We don't change job status here — job becomes "in_progress" after scene confirmed

  // Notify hirer
  await db.insert(notificationsTable).values({
    userId:  jobRows[0].hirerId,
    title:   "Worker Accepted Your Gig",
    message: `${userRow[0]?.displayName || "A worker"} accepted your gig "${jobRows[0].title}" and is on the way!`,
  });

  res.status(201).json(tracking);
});

// ── POST /gig-tracking/:jobId/on-scene ───────────────────────────────────────
// Worker marks themselves as on scene
router.post("/:jobId/on-scene", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.jobId);

  const trackingRows = await db
    .select()
    .from(gigTrackingTable)
    .where(and(eq(gigTrackingTable.jobId, jobId), eq(gigTrackingTable.workerId, userId)))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!trackingRows[0]) { res.status(404).json({ error: "No tracking record" }); return; }

  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  const userRow = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const [updated] = await db
    .update(gigTrackingTable)
    .set({ status: "on_scene", updatedAt: new Date() })
    .where(eq(gigTrackingTable.id, trackingRows[0].id))
    .returning();

  // Notify hirer to confirm on-scene
  if (jobRows[0]) {
    await db.insert(notificationsTable).values({
      userId:  jobRows[0].hirerId,
      title:   "Worker Is On Scene",
      message: `${userRow[0]?.displayName || "Worker"} says they're on scene for "${jobRows[0].title}". Please confirm!`,
    });
  }

  res.json(updated);
});

// ── POST /gig-tracking/:jobId/confirm-scene ──────────────────────────────────
// Hirer confirms worker is on scene
router.post("/:jobId/confirm-scene", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.jobId);

  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobRows[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobRows[0].hirerId !== userId) { res.status(403).json({ error: "Not the hirer" }); return; }

  const trackingRows = await db
    .select()
    .from(gigTrackingTable)
    .where(eq(gigTrackingTable.jobId, jobId))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!trackingRows[0]) { res.status(404).json({ error: "No tracking record" }); return; }

  const [updated] = await db
    .update(gigTrackingTable)
    .set({ status: "scene_confirmed", sceneConfirmed: true, updatedAt: new Date() })
    .where(eq(gigTrackingTable.id, trackingRows[0].id))
    .returning();

  // Update job to in_progress
  await db.update(gigJobsTable)
    .set({ status: "in_progress", startedAt: new Date(), workerId: trackingRows[0].workerId })
    .where(eq(gigJobsTable.id, jobId));

  // Notify worker
  await db.insert(notificationsTable).values({
    userId:  trackingRows[0].workerId,
    title:   "Scene Confirmed!",
    message: `The hirer confirmed you're on scene for "${jobRows[0].title}". Get to work!`,
  });

  res.json(updated);
});

// ── POST /gig-tracking/:jobId/complete ───────────────────────────────────────
// Worker marks job as complete (hirer must then confirm)
router.post("/:jobId/complete", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.jobId);

  const trackingRows = await db
    .select()
    .from(gigTrackingTable)
    .where(and(eq(gigTrackingTable.jobId, jobId), eq(gigTrackingTable.workerId, userId)))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!trackingRows[0]) { res.status(404).json({ error: "No tracking record" }); return; }

  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  const userRow = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const [updated] = await db
    .update(gigTrackingTable)
    .set({ status: "completed", workerMarkedCompleteAt: new Date(), updatedAt: new Date() })
    .where(eq(gigTrackingTable.id, trackingRows[0].id))
    .returning();

  // Notify hirer to confirm completion
  if (jobRows[0]) {
    await db.insert(notificationsTable).values({
      userId:  jobRows[0].hirerId,
      title:   "Worker Marked Job Complete",
      message: `${userRow[0]?.displayName || "Worker"} says the job is done for "${jobRows[0].title}". Please confirm to release payment!`,
    });
  }

  res.json(updated);
});

// ── POST /gig-tracking/:jobId/confirm-complete ───────────────────────────────
// Hirer confirms job completion
router.post("/:jobId/confirm-complete", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.jobId);

  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobRows[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobRows[0].hirerId !== userId) { res.status(403).json({ error: "Not the hirer" }); return; }

  const trackingRows = await db
    .select()
    .from(gigTrackingTable)
    .where(eq(gigTrackingTable.jobId, jobId))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!trackingRows[0]) { res.status(404).json({ error: "No tracking record" }); return; }

  const now = new Date();
  const [updated] = await db
    .update(gigTrackingTable)
    .set({ completionConfirmed: true, hirerConfirmedCompleteAt: now, updatedAt: now })
    .where(eq(gigTrackingTable.id, trackingRows[0].id))
    .returning();

  // Mark job as completed
  const startedAt = jobRows[0].startedAt;
  const durationMinutes = startedAt
    ? Math.round((now.getTime() - startedAt.getTime()) / 60000)
    : null;

  await db.update(gigJobsTable)
    .set({ status: "completed", completedAt: now, durationMinutes })
    .where(eq(gigJobsTable.id, jobId));

  // Notify worker
  await db.insert(notificationsTable).values({
    userId:  trackingRows[0].workerId,
    title:   "Job Complete! 🎉",
    message: `"${jobRows[0].title}" is confirmed complete. Great work! Payment will be processed shortly.`,
  });

  res.json(updated);
});

// ── POST /gig-tracking/:jobId/deny-request ───────────────────────────────────
// Hirer denies worker's acceptance within 24 hours → job goes back on list
router.post("/:jobId/deny-request", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const jobId  = Number(req.params.jobId);

  const jobRows = await db.select().from(gigJobsTable).where(eq(gigJobsTable.id, jobId)).limit(1);
  if (!jobRows[0]) { res.status(404).json({ error: "Job not found" }); return; }
  if (jobRows[0].hirerId !== userId) { res.status(403).json({ error: "Not the hirer" }); return; }

  const trackingRows = await db
    .select()
    .from(gigTrackingTable)
    .where(eq(gigTrackingTable.jobId, jobId))
    .orderBy(desc(gigTrackingTable.createdAt))
    .limit(1);
  if (!trackingRows[0]) { res.status(404).json({ error: "No tracking record" }); return; }

  // Remove daily acceptance record so worker can take another job
  await db.delete(gigDailyAcceptanceTable).where(
    and(
      eq(gigDailyAcceptanceTable.workerId, trackingRows[0].workerId),
      eq(gigDailyAcceptanceTable.jobId, jobId),
    ),
  );

  // Mark tracking as disputed/denied
  await db
    .update(gigTrackingTable)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(gigTrackingTable.id, trackingRows[0].id));

  // Notify worker that request was denied
  await db.insert(notificationsTable).values({
    userId:  trackingRows[0].workerId,
    title:   "Gig Request Denied",
    message: `Your request for "${jobRows[0].title}" was denied. The job is back on the list.`,
  });

  res.json({ ok: true });
});

export default router;
