import { Router } from "express";
import { db } from "@workspace/db";
import {
  talkCategoriesTable,
  talkPostsTable,
  talkVotesTable,
  talkCommentsTable,
  talkCommentVotesTable,
  usersTable,
  contentFlagsTable,
} from "@workspace/db";
import { containsBlockedWord } from "../utils/blockedWords";
import { eq, desc, asc, sql, and, lt, ilike, or, inArray } from "drizzle-orm";
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

router.get("/posts/:id/comments", optionalAuth, async (req, res) => {
  const userId = (req as any).userId as string | undefined;
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const comments = await db
    .select()
    .from(talkCommentsTable)
    .where(eq(talkCommentsTable.postId, postId))
    .orderBy(desc(talkCommentsTable.createdAt));

  let votedCommentIds = new Set<number>();
  if (userId && comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const votes = await db
      .select({ commentId: talkCommentVotesTable.commentId })
      .from(talkCommentVotesTable)
      .where(and(
        eq(talkCommentVotesTable.userId, userId),
        inArray(talkCommentVotesTable.commentId, commentIds),
      ));
    votedCommentIds = new Set(votes.map((v) => v.commentId));
  }

  res.json(comments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    hasVoted: votedCommentIds.has(c.id),
  })));
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

// ── Vote comment ──────────────────────────────────────────────────────────────
router.post("/comments/:id/vote", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const commentId = Number(req.params.id);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid comment id" }); return; }

  const existing = await db
    .select()
    .from(talkCommentVotesTable)
    .where(and(eq(talkCommentVotesTable.commentId, commentId), eq(talkCommentVotesTable.userId, userId)))
    .limit(1);

  let hasVoted: boolean;
  if (existing.length > 0) {
    await db.delete(talkCommentVotesTable)
      .where(and(eq(talkCommentVotesTable.commentId, commentId), eq(talkCommentVotesTable.userId, userId)));
    await db.update(talkCommentsTable)
      .set({ upvotes: sql`GREATEST(${talkCommentsTable.upvotes} - 1, 0)` })
      .where(eq(talkCommentsTable.id, commentId));
    hasVoted = false;
  } else {
    await db.insert(talkCommentVotesTable).values({ commentId, userId });
    await db.update(talkCommentsTable)
      .set({ upvotes: sql`${talkCommentsTable.upvotes} + 1` })
      .where(eq(talkCommentsTable.id, commentId));
    hasVoted = true;
  }

  const [updated] = await db
    .select({ upvotes: talkCommentsTable.upvotes })
    .from(talkCommentsTable)
    .where(eq(talkCommentsTable.id, commentId));

  res.json({ upvotes: updated?.upvotes ?? 0, hasVoted });
});

// ── Delete own post ───────────────────────────────────────────────────────────
router.delete("/posts/:id", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const postId = Number(req.params.id);
  if (isNaN(postId)) { res.status(400).json({ error: "Invalid post id" }); return; }

  const rows = await db
    .select({ userId: talkPostsTable.userId })
    .from(talkPostsTable)
    .where(eq(talkPostsTable.id, postId))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  // Delete comments first
  await db.delete(talkCommentsTable).where(eq(talkCommentsTable.postId, postId));
  await db.delete(talkVotesTable).where(eq(talkVotesTable.postId, postId));
  await db.delete(talkPostsTable).where(eq(talkPostsTable.id, postId));
  res.status(204).send();
});

// ── My posts (for Discussion Posts section in account) ────────────────────────
router.get("/posts/my", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const posts = await db
    .select()
    .from(talkPostsTable)
    .where(eq(talkPostsTable.userId, userId))
    .orderBy(desc(talkPostsTable.createdAt));
  res.json(posts.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    hasVoted:  false,
  })));
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
