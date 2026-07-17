import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobListingsTable,
  jobApplicationsTable,
  jobMessagesTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and, lt, ilike, or, sql } from "drizzle-orm";

const router = Router();

// ── GET /jobs/listings ────────────────────────────────────────────────────────
// Public. Returns open job listings with optional filters and cursor pagination.
router.get("/listings", async (req, res) => {
  const { category, search, cursor, limit = "20" } = req.query;
  const take = Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [
    eq(jobListingsTable.status, "open"),
  ];

  if (category && typeof category === "string") {
    conditions.push(eq(jobListingsTable.category, category));
  }

  if (search && typeof search === "string") {
    const term = `%${search}%`;
    conditions.push(
      or(
        ilike(jobListingsTable.title, term),
        ilike(jobListingsTable.company, term),
        ilike(jobListingsTable.description, term),
      ) as ReturnType<typeof eq>,
    );
  }

  if (cursor) {
    conditions.push(
      lt(jobListingsTable.id, Number(cursor)) as ReturnType<typeof eq>,
    );
  }

  const rows = await db
    .select()
    .from(jobListingsTable)
    .where(and(...conditions))
    .orderBy(desc(jobListingsTable.createdAt))
    .limit(take);

  const hasMore = rows.length === take;
  const items   = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.status(200).json({ items, nextCursor });
  return;
});

// ── GET /jobs/listings/my ─────────────────────────────────────────────────────
// Auth. Returns the authenticated user's posted listings.
router.get("/listings/my", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;

  const rows = await db
    .select()
    .from(jobListingsTable)
    .where(eq(jobListingsTable.posterId, userId))
    .orderBy(desc(jobListingsTable.createdAt));

  res.status(200).json(rows);
  return;
});

// ── POST /jobs/listings ───────────────────────────────────────────────────────
// Auth. Creates a new job listing.
router.post("/listings", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const {
    company,
    title,
    description,
    jobType = "full_time",
    category,
    payMinCents,
    payMaxCents,
    city = "",
    stateCode = "",
    isRemote = false,
    applicationUrl,
  } = req.body as {
    company?: string;
    title?: string;
    description?: string;
    jobType?: string;
    category?: string;
    payMinCents?: number | null;
    payMaxCents?: number | null;
    city?: string;
    stateCode?: string;
    isRemote?: boolean;
    applicationUrl?: string | null;
  };

  if (!company?.trim() || !title?.trim() || !description?.trim() || !category) {
    res.status(400).json({ error: "company, title, description, and category are required" });
    return;
  }

  const [row] = await db
    .insert(jobListingsTable)
    .values({
      posterId:   userId,
      posterName: user.displayName ?? user.email ?? "Unknown",
      company:    company.trim(),
      title:      title.trim(),
      description: description.trim(),
      jobType,
      category,
      payMinCents:  payMinCents ?? null,
      payMaxCents:  payMaxCents ?? null,
      city:         city.trim(),
      stateCode:    stateCode.trim(),
      isRemote:     Boolean(isRemote),
      applicationUrl: applicationUrl ?? null,
      status:       "open",
    })
    .returning();

  res.status(201).json(row);
  return;
});

// ── GET /jobs/listings/:id ────────────────────────────────────────────────────
// Public. Returns a single job listing with its details.
router.get("/listings/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db
    .select()
    .from(jobListingsTable)
    .where(eq(jobListingsTable.id, id))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.status(200).json(rows[0]);
  return;
});

// ── POST /jobs/listings/:id/apply ─────────────────────────────────────────────
// Auth. Submit an application for a job listing.
router.post("/listings/:id/apply", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const listingId = Number(req.params.id);
  if (!listingId) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const listing = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, listingId)).limit(1);
  if (!listing[0]) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing[0].status !== "open") { res.status(400).json({ error: "This job is no longer accepting applications" }); return; }

  const { coverLetter = "", resumeUrl } = req.body as { coverLetter?: string; resumeUrl?: string };

  const [app] = await db
    .insert(jobApplicationsTable)
    .values({
      listingId,
      applicantId:    userId,
      applicantName:  user.displayName ?? user.email ?? "Unknown",
      applicantAvatar: user.avatarUrl ?? null,
      coverLetter:    coverLetter.trim(),
      resumeUrl:      resumeUrl ?? null,
      status:         "pending",
    })
    .returning();

  // Increment application count
  await db
    .update(jobListingsTable)
    .set({ applicationCount: sql`${jobListingsTable.applicationCount} + 1` })
    .where(eq(jobListingsTable.id, listingId));

  res.status(201).json(app);
  return;
});

// ── GET /jobs/listings/:id/applications ───────────────────────────────────────
// Auth. Returns applications for a listing (poster only).
router.get("/listings/:id/applications", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const listingId = Number(req.params.id);
  if (!listingId) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const listing = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, listingId)).limit(1);
  if (!listing[0]) { res.status(404).json({ error: "Listing not found" }); return; }
  if (listing[0].posterId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const apps = await db
    .select()
    .from(jobApplicationsTable)
    .where(eq(jobApplicationsTable.listingId, listingId))
    .orderBy(desc(jobApplicationsTable.createdAt));

  res.status(200).json(apps);
  return;
});

// ── GET /jobs/applications/my ─────────────────────────────────────────────────
// Auth. Returns the current user's job applications, joined with listing data.
router.get("/applications/my", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;

  const rows = await db
    .select({
      app:     jobApplicationsTable,
      listing: jobListingsTable,
    })
    .from(jobApplicationsTable)
    .innerJoin(jobListingsTable, eq(jobApplicationsTable.listingId, jobListingsTable.id))
    .where(eq(jobApplicationsTable.applicantId, userId))
    .orderBy(desc(jobApplicationsTable.createdAt));

  res.status(200).json(rows.map((r) => ({ ...r.app, listing: r.listing })));
  return;
});

// ── PATCH /jobs/applications/:id ──────────────────────────────────────────────
// Auth. Poster accepts or rejects an application.
router.patch("/applications/:id", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const appId = Number(req.params.id);
  if (!appId) { res.status(400).json({ error: "Invalid application id" }); return; }

  const { status } = req.body as { status?: string };
  if (!status || !["accepted", "rejected", "pending"].includes(status)) {
    res.status(400).json({ error: "status must be accepted, rejected, or pending" });
    return;
  }

  // Load the application + listing to verify ownership
  const rows = await db
    .select({ app: jobApplicationsTable, listing: jobListingsTable })
    .from(jobApplicationsTable)
    .innerJoin(jobListingsTable, eq(jobApplicationsTable.listingId, jobListingsTable.id))
    .where(eq(jobApplicationsTable.id, appId))
    .limit(1);

  if (!rows[0]) { res.status(404).json({ error: "Application not found" }); return; }
  if (rows[0].listing.posterId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db
    .update(jobApplicationsTable)
    .set({ status })
    .where(eq(jobApplicationsTable.id, appId))
    .returning();

  res.status(200).json(updated);
  return;
});

// ── GET /jobs/listings/:id/messages ───────────────────────────────────────────
// Auth. Returns messages for a job listing (poster or applicant).
router.get("/listings/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const listingId = Number(req.params.id);
  if (!listingId) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const messages = await db
    .select()
    .from(jobMessagesTable)
    .where(eq(jobMessagesTable.listingId, listingId))
    .orderBy(desc(jobMessagesTable.createdAt));

  res.status(200).json(messages);
  return;
});

// ── POST /jobs/listings/:id/messages ─────────────────────────────────────────
// Auth. Posts a message to a job listing thread.
router.post("/listings/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const listingId = Number(req.params.id);
  if (!listingId) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const { body } = req.body as { body?: string };
  if (!body?.trim()) { res.status(400).json({ error: "Message body is required" }); return; }

  const [msg] = await db
    .insert(jobMessagesTable)
    .values({
      listingId,
      senderId:   userId,
      senderName: user.displayName ?? user.email ?? "Unknown",
      body:       body.trim(),
    })
    .returning();

  res.status(201).json(msg);
  return;
});

// ── DELETE /jobs/listings/:id ─────────────────────────────────────────────────
// Auth. Poster can delete their own listing.
router.delete("/listings/:id", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const rows = await db.select().from(jobListingsTable).where(eq(jobListingsTable.id, id)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].posterId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(jobListingsTable).where(eq(jobListingsTable.id, id));
  res.status(204).end();
  return;
});

export default router;
