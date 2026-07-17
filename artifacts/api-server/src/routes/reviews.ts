import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

// ── GET /reviews?userId=<id> ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    res.status(400).json({ error: "userId is required" }); return;
  }
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.revieweeId, userId))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// ── POST /reviews ─────────────────────────────────────────────────────────────
router.post("/", requireAuth, ensureUser, async (req, res) => {
  const reviewerId = (req as any).userId as string;

  const reviewerRow = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, reviewerId))
    .limit(1);

  const { revieweeId, contextType, contextId, rating, description = "" } = req.body as {
    revieweeId?: string;
    contextType?: string;
    contextId?: number;
    rating?: number;
    description?: string;
  };

  if (!revieweeId || !contextType || !contextId || !rating) {
    res.status(400).json({ error: "revieweeId, contextType, contextId, rating required" }); return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1-5" }); return;
  }
  if (revieweeId === reviewerId) {
    res.status(400).json({ error: "Cannot review yourself" }); return;
  }

  // Prevent duplicate review for same context
  const existing = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(and(
      eq(reviewsTable.reviewerId, reviewerId),
      eq(reviewsTable.revieweeId, revieweeId),
      eq(reviewsTable.contextType, contextType),
      eq(reviewsTable.contextId, Number(contextId)),
    ))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Already reviewed this user for this job" }); return;
  }

  const [review] = await db.insert(reviewsTable).values({
    reviewerId,
    reviewerName: reviewerRow[0]?.displayName || "Anonymous",
    revieweeId,
    contextType,
    contextId:   Number(contextId),
    rating:      Number(rating),
    description: String(description).trim(),
  }).returning();

  // Update reviewer's avg rating on the reviewee's user record
  const allReviews = await db
    .select({ rating: reviewsTable.rating })
    .from(reviewsTable)
    .where(eq(reviewsTable.revieweeId, revieweeId));
  const count  = allReviews.length;
  const avgX10 = count > 0
    ? Math.round(allReviews.reduce((s, r) => s + r.rating, 0) / count * 10)
    : 0;
  await db.update(usersTable)
    .set({ avgRatingX10: avgX10, ratingCount: count })
    .where(eq(usersTable.id, revieweeId));

  res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
});

export default router;
