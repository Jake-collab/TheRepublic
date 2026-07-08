import { Router } from "express";
import { db } from "@workspace/db";
import { userWebsitePrefsTable, websitesTable, categoriesTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAuth, ensureUser);

router.get("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select({ pref: userWebsitePrefsTable, website: websitesTable, categoryName: categoriesTable.name })
    .from(userWebsitePrefsTable)
    .leftJoin(websitesTable, eq(userWebsitePrefsTable.websiteId, websitesTable.id))
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .where(eq(userWebsitePrefsTable.userId, userId))
    .orderBy(asc(userWebsitePrefsTable.tabOrder));

  res.json(rows.map(r => ({
    ...r.pref,
    website: r.website ? { ...r.website, categoryName: r.categoryName ?? null } : null,
  })));
});

router.post("/", async (req, res) => {
  const userId = (req as any).userId as string;
  const { websiteId, tabColor, tabOrder, isPinned, isVisible, lastVisitedUrl } = req.body;

  const existing = await db.select().from(userWebsitePrefsTable)
    .where(and(eq(userWebsitePrefsTable.userId, userId), eq(userWebsitePrefsTable.websiteId, websiteId)))
    .limit(1);

  const pref = existing[0]
    ? (await db.update(userWebsitePrefsTable)
        .set({ tabColor, tabOrder, isPinned, isVisible, lastVisitedUrl, updatedAt: new Date() })
        .where(eq(userWebsitePrefsTable.id, existing[0].id))
        .returning())[0]
    : (await db.insert(userWebsitePrefsTable)
        .values({ userId, websiteId, tabColor, tabOrder: tabOrder ?? 0, isPinned: isPinned ?? false, isVisible: isVisible ?? true, lastVisitedUrl })
        .onConflictDoNothing()
        .returning())[0] ?? existing[0];

  res.json(pref);
});

router.post("/reorder", async (req, res) => {
  const userId = (req as any).userId as string;
  const { websiteIds } = req.body as { websiteIds: number[] };

  await Promise.all(
    websiteIds.map((wid, idx) =>
      db.update(userWebsitePrefsTable)
        .set({ tabOrder: idx, updatedAt: new Date() })
        .where(and(eq(userWebsitePrefsTable.userId, userId), eq(userWebsitePrefsTable.websiteId, wid)))
    )
  );

  res.json({ ok: true });
});

export default router;
