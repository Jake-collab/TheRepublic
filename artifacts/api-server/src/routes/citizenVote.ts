import { Router } from "express";
import { db } from "@workspace/db";
import { citizenVotePostsTable, citizenVoteUpvotesTable } from "@workspace/db";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { requireAuth, optionalAuth, ensureUser } from "../middlewares/requireAuth";

const router = Router();

const VOTE_CATEGORIES = ["Health", "Immigration", "Economy", "Education", "Climate", "Housing", "Crime", "Veterans", "Technology", "Infrastructure", "Other"];
const US_STATES = ["National", "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"];

router.get("/categories", async (req, res) => {
  res.json({ categories: VOTE_CATEGORIES, geoOptions: US_STATES });
});

router.get("/posts", optionalAuth, async (req, res) => {
  const userId = (req as any).userId as string | null;
  const { category, geo, sort = "newest", page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const conditions = [];
  if (category) conditions.push(eq(citizenVotePostsTable.category, category as string));
  if (geo && geo !== "National") {
    conditions.push(eq(citizenVotePostsTable.geo, geo as string));
  } else if (geo === "National") {
    conditions.push(eq(citizenVotePostsTable.isNational, true));
  }

  const orderBy = sort === "top" ? desc(citizenVotePostsTable.upvotes) : desc(citizenVotePostsTable.createdAt);

  const [posts, countResult] = await Promise.all([
    db.select().from(citizenVotePostsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderBy)
      .limit(Number(limit))
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(citizenVotePostsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  let upvotedIds = new Set<number>();
  if (userId) {
    const upvotes = await db.select({ postId: citizenVoteUpvotesTable.postId })
      .from(citizenVoteUpvotesTable)
      .where(eq(citizenVoteUpvotesTable.userId, userId));
    upvotedIds = new Set(upvotes.map(u => u.postId));
  }

  res.json({
    posts: posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), hasUpvoted: upvotedIds.has(p.id) })),
    total: Number(countResult[0]?.count ?? 0),
    page: Number(page),
    limit: Number(limit),
  });
});

router.post("/posts", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const { content, category, geo, isNational } = req.body;
  const post = await db.insert(citizenVotePostsTable)
    .values({ userId, content, category, geo: geo ?? null, isNational: isNational ?? false })
    .returning();
  res.status(201).json({ ...post[0], createdAt: post[0].createdAt.toISOString(), hasUpvoted: false });
});

router.post("/posts/:id/upvote", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const postId = Number(req.params.id);

  const existing = await db.select().from(citizenVoteUpvotesTable)
    .where(and(eq(citizenVoteUpvotesTable.postId, postId), eq(citizenVoteUpvotesTable.userId, userId)))
    .limit(1);

  if (existing[0]) {
    // Remove upvote
    await db.delete(citizenVoteUpvotesTable).where(eq(citizenVoteUpvotesTable.id, existing[0].id));
    await db.update(citizenVotePostsTable)
      .set({ upvotes: sql`${citizenVotePostsTable.upvotes} - 1` })
      .where(eq(citizenVotePostsTable.id, postId));
    const post = await db.select().from(citizenVotePostsTable).where(eq(citizenVotePostsTable.id, postId)).limit(1);
    res.json({ upvotes: post[0].upvotes, hasUpvoted: false });
  } else {
    await db.insert(citizenVoteUpvotesTable).values({ postId, userId }).onConflictDoNothing();
    await db.update(citizenVotePostsTable)
      .set({ upvotes: sql`${citizenVotePostsTable.upvotes} + 1` })
      .where(eq(citizenVotePostsTable.id, postId));
    const post = await db.select().from(citizenVotePostsTable).where(eq(citizenVotePostsTable.id, postId)).limit(1);
    res.json({ upvotes: post[0].upvotes, hasUpvoted: true });
  }
});

export default router;
