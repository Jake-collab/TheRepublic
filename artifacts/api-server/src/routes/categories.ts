import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const rows = await db.select().from(categoriesTable)
    .where(eq(categoriesTable.isActive, true))
    .orderBy(asc(categoriesTable.sortOrder));
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json(rows.map(r => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  })));
});

export default router;
