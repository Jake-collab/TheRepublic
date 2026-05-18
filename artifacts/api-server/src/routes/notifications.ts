import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth, ensureUser);

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId));
  res.json(rows.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })));
});

router.post("/:id/read", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ ok: true });
});

router.post("/read-all", async (req, res) => {
  const userId = (req as any).userId as string;
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, userId));
  res.json({ ok: true });
});

export default router;
