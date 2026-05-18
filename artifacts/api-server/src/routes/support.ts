import { Router } from "express";
import { db } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth, ensureUser);

router.get("/tickets", async (req, res) => {
  const userId = (req as any).userId as string;
  const tickets = await db.select().from(supportTicketsTable)
    .where(eq(supportTicketsTable.userId, userId))
    .orderBy();
  res.json(tickets.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })));
});

router.post("/tickets", async (req, res) => {
  const userId = (req as any).userId as string;
  const { type, subject, message } = req.body;
  const ticket = await db.insert(supportTicketsTable)
    .values({ userId, type, subject, message })
    .returning();
  res.status(201).json({ ...ticket[0], createdAt: ticket[0].createdAt.toISOString(), updatedAt: ticket[0].updatedAt.toISOString() });
});

export default router;
