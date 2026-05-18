import { Router } from "express";
import { db } from "@workspace/db";
import { websitesTable, categoriesTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const { categoryId, isFree } = req.query;
  const conditions = [eq(websitesTable.isActive, true)];
  if (categoryId) conditions.push(eq(websitesTable.categoryId, Number(categoryId)));
  if (isFree !== undefined) conditions.push(eq(websitesTable.isFree, isFree === "true"));

  const rows = await db
    .select({
      website: websitesTable,
      categoryName: categoriesTable.name,
    })
    .from(websitesTable)
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .where(and(...conditions))
    .orderBy(asc(websitesTable.cardOrder));

  res.json(rows.map(r => ({
    ...r.website,
    categoryName: r.categoryName ?? null,
  })));
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db
    .select({ website: websitesTable, categoryName: categoriesTable.name })
    .from(websitesTable)
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .where(eq(websitesTable.id, id))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...rows[0].website, categoryName: rows[0].categoryName ?? null });
});

export default router;
