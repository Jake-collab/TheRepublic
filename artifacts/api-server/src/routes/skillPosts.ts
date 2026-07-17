import { Router } from "express";
import { db } from "@workspace/db";
import { skillPostsTable, usersTable } from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// ── GET /skill-posts ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { category } = req.query;
  const conditions: ReturnType<typeof eq>[] = [
    eq(skillPostsTable.status, "active"),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(skillPostsTable.category, category));
  }
  const rows = await db
    .select()
    .from(skillPostsTable)
    .where(and(...conditions))
    .orderBy(desc(skillPostsTable.createdAt));
  res.json(rows);
});

// ── GET /skill-posts/my ───────────────────────────────────────────────────────
router.get("/my", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(skillPostsTable)
    .where(eq(skillPostsTable.userId, userId))
    .orderBy(desc(skillPostsTable.createdAt));
  res.json(rows);
});

// ── POST /skill-posts ─────────────────────────────────────────────────────────
router.post("/", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const userRow = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!userRow[0]) { res.status(401).json({ error: "User not found" }); return; }

  const { category, title, description, skills = "", hourlyRateCents } = req.body as {
    category?: string;
    title?: string;
    description?: string;
    skills?: string;
    hourlyRateCents?: number;
  };
  if (!category || !title?.trim() || !description?.trim()) {
    res.status(400).json({ error: "category, title, and description required" }); return;
  }

  const [post] = await db.insert(skillPostsTable).values({
    userId,
    userName:        userRow[0].displayName || "Anonymous",
    userAvatar:      userRow[0].avatarUrl ?? null,
    category:        String(category),
    title:           title.trim(),
    description:     description.trim(),
    skills:          String(skills).trim(),
    hourlyRateCents: hourlyRateCents ? Number(hourlyRateCents) : null,
    status:          "active",
  }).returning();

  res.status(201).json(post);
});

// ── PATCH /skill-posts/:id ────────────────────────────────────────────────────
router.patch("/:id", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  const rows = await db
    .select()
    .from(skillPostsTable)
    .where(eq(skillPostsTable.id, id))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description, skills, hourlyRateCents, status } = req.body as {
    title?: string;
    description?: string;
    skills?: string;
    hourlyRateCents?: number;
    status?: string;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined)           updates.title           = String(title).trim();
  if (description !== undefined)     updates.description     = String(description).trim();
  if (skills !== undefined)          updates.skills          = String(skills).trim();
  if (hourlyRateCents !== undefined) updates.hourlyRateCents = Number(hourlyRateCents);
  if (status !== undefined && ["active", "paused", "removed"].includes(status)) {
    updates.status = status;
  }

  const [updated] = await db
    .update(skillPostsTable)
    .set(updates)
    .where(eq(skillPostsTable.id, id))
    .returning();
  res.json(updated);
});

// ── DELETE /skill-posts/:id ───────────────────────────────────────────────────
router.delete("/:id", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);
  const rows = await db
    .select()
    .from(skillPostsTable)
    .where(eq(skillPostsTable.id, id))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].userId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(skillPostsTable).where(eq(skillPostsTable.id, id));
  res.status(204).send();
});

export default router;
