import { Router } from "express";
import { db } from "@workspace/db";
import {
  talkCategoriesTable,
  talkPostsTable,
  talkVotesTable,
  talkCommentsTable,
  usersTable,
  contentFlagsTable,
} from "@workspace/db";
import { containsBlockedWord } from "../utils/blockedWords";
import { eq, desc, asc, sql, and, lt, ilike, or } from "drizzle-orm";
import { requireAuth, optionalAuth, ensureUser } from "../middlewares/requireAuth";

const router = Router();

router.get("/categories", async (req, res) => {
  const cats = await db
    .select()
    .from(talkCategoriesTable)
    .where(eq(talkCategoriesTable.isActive, true))
    .orderBy(asc(talkCategoriesTable.sortOrder));
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json(cats);
});

router.get("/posts", optionalAuth, async (req, res) => {
  const userId = (req as any).userId as string | null;
  const { categoryId, sort = "new", search, cursor, limit = "20" } = req.query;
  const take = Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [];
  if (categoryId) conditions.push(eq(talkPostsTable.categoryId, Number(categoryId)));
  if (cursor) conditions.push(lt(talkPostsTable.id, Number(cursor)));

  let searchCondition: ReturnType<typeof or> | undefined;
  if (search && typeof search === "string" && search.trim()) {
    searchCondition = or(
      ilike(talkPostsTable.title, `%${search.trim()}%`),
      ilike(talkPostsTable.body, `%${search.trim()}%`),
    );
  }

  const where = conditions.length || searchCondition
    ? and(...(conditions as any[]), ...(searchCondition ? [searchCondition] : []))
    : undefined;

  const orderBy = sort === "top"
    ? [desc(talkPostsTable.upvotes), desc(talkPostsTable.createdAt)]
    : [desc(talkPostsTable.createdAt)];

  const posts = await db
    .select()
    .from(talkPostsTable)
    .where(where)
    .orderBy(...orderBy)
    .limit(take);

  const hasMore = posts.length === take;
  const items = hasMore ? posts.slice(0, -1) : posts;
  const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

  let votedIds = new Set<number>();
  if (userId && items.length) {
    const votes = await db
      .select({ postId: talkVotesTable.postId })
      .from(talkVotesTable)
      .where(eq(talkVotesTable.userId, userId));
    votedIds = new Set(votes.map((v) => v.postId));
  }

  res.json({
    items: items.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      hasVoted: votedIds.has(p.id),
    })),
    nextCursor,
  });
});

router.post("/posts", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const { categoryId, title, body } = req.body;

  if (!categoryId || !title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "categoryId, title, and body are required" });
    return;
  }

  const userRow = await db
    .select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const displayName = userRow[0]?.displayName || "Anonymous";
  const avatarUrl = userRow[0]?.avatarUrl ?? null;

  const [post] = await db
    .insert(talkPostsTable)
    .values({ categoryId: Number(categoryId), userId, displayName, avatarUrl, title: title.trim(), body: body.trim() })
    .returning();

  res.status(201).json({ ...post, createdAt: post.createdAt.toISOString(), hasVoted: false });
});

router.post("/posts/:id/vote", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const existing = await db
    .select()
    .from(talkVotesTable)
    .where(and(eq(talkVotesTable.postId, postId), eq(talkVotesTable.userId, userId)))
    .limit(1);

  let hasVoted: boolean;
  if (existing.length) {
    await db.delete(talkVotesTable).where(and(eq(talkVotesTable.postId, postId), eq(talkVotesTable.userId, userId)));
    await db.update(talkPostsTable)
      .set({ upvotes: sql`GREATEST(${talkPostsTable.upvotes} - 1, 0)` })
      .where(eq(talkPostsTable.id, postId));
    hasVoted = false;
  } else {
    await db.insert(talkVotesTable).values({ postId, userId });
    await db.update(talkPostsTable)
      .set({ upvotes: sql`${talkPostsTable.upvotes} + 1` })
      .where(eq(talkPostsTable.id, postId));
    hasVoted = true;
  }

  const [updated] = await db
    .select({ upvotes: talkPostsTable.upvotes })
    .from(talkPostsTable)
    .where(eq(talkPostsTable.id, postId));

  res.json({ upvotes: updated?.upvotes ?? 0, hasVoted });
});

router.get("/posts/:id/comments", async (req, res) => {
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const comments = await db
    .select()
    .from(talkCommentsTable)
    .where(eq(talkCommentsTable.postId, postId))
    .orderBy(asc(talkCommentsTable.createdAt));

  res.json(comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/posts/:id/comments", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const { body } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }

  const userRow = await db
    .select({ displayName: usersTable.displayName, avatarUrl: usersTable.avatarUrl })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const displayName = userRow[0]?.displayName || "Anonymous";
  const avatarUrl = userRow[0]?.avatarUrl ?? null;

  const [comment] = await db
    .insert(talkCommentsTable)
    .values({ postId, userId, displayName, avatarUrl, body: body.trim() })
    .returning();

  await db
    .update(talkPostsTable)
    .set({ commentCount: sql`${talkPostsTable.commentCount} + 1` })
    .where(eq(talkPostsTable.id, postId));

  res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString() });
});

// ── Flag post ─────────────────────────────────────────────────────────────────
router.post("/posts/:id/flag", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const contentId = Number(req.params.id);
  const { reason, details } = req.body;
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  await db.insert(contentFlagsTable).values({ contentType: "talk_post", contentId, userId, reason, details: details ?? null });
  res.status(201).json({ ok: true });
});

// ── Flag comment ──────────────────────────────────────────────────────────────
router.post("/comments/:id/flag", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const contentId = Number(req.params.id);
  const { reason, details } = req.body;
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
  await db.insert(contentFlagsTable).values({ contentType: "talk_comment", contentId, userId, reason, details: details ?? null });
  res.status(201).json({ ok: true });
});

export default router;
