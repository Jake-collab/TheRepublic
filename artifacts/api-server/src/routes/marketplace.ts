import { Router } from "express";
import { db } from "@workspace/db";
import { marketplaceListingsTable, usersTable } from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, and, ilike, or, lt } from "drizzle-orm";

const router = Router();

// ── GET /marketplace/listings ────────────────────────────────────────────────
router.get("/listings", async (req, res) => {
  const { category, search, cursor, limit = "24" } = req.query;
  const take = Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [
    eq(marketplaceListingsTable.status, "active"),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(marketplaceListingsTable.category, category));
  }
  if (cursor) {
    conditions.push(
      lt(marketplaceListingsTable.id, Number(cursor)) as ReturnType<typeof eq>,
    );
  }

  let searchClause: ReturnType<typeof or> | undefined;
  if (search && typeof search === "string" && search.trim()) {
    const q = `%${search.trim()}%`;
    searchClause = or(
      ilike(marketplaceListingsTable.title, q),
      ilike(marketplaceListingsTable.description, q),
    );
  }

  const where = and(
    ...conditions,
    ...(searchClause ? [searchClause] : []),
  );

  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(where)
    .orderBy(desc(marketplaceListingsTable.createdAt))
    .limit(take);

  const hasMore = rows.length === take;
  const items = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.json({ items, nextCursor });
});

// ── POST /marketplace/listings ───────────────────────────────────────────────
router.post("/listings", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;

  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!users[0]) { res.status(401).json({ error: "User not found" }); return; }
  const user = users[0];

  const { title, description, priceCents, category, photos = [], city = "", stateCode = "" } = req.body as {
    title?: string;
    description?: string;
    priceCents?: number;
    category?: string;
    photos?: string[];
    city?: string;
    stateCode?: string;
  };

  if (!title?.trim() || !description?.trim() || !priceCents || !category) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }

  const [listing] = await db
    .insert(marketplaceListingsTable)
    .values({
      sellerId:     userId,
      sellerName:   user.displayName || "Anonymous",
      sellerAvatar: user.avatarUrl ?? null,
      title:        title.trim(),
      description:  description.trim(),
      priceCents:   Number(priceCents),
      category:     String(category),
      photos:       Array.isArray(photos) ? photos : [],
      city:         String(city).trim(),
      stateCode:    String(stateCode).trim().toUpperCase().slice(0, 2),
      status:       "active",
    })
    .returning();

  res.status(201).json(listing);
});

// ── GET /marketplace/listings/:id ────────────────────────────────────────────
router.get("/listings/:id", async (req, res) => {
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, Number(req.params.id)))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  res.json(rows[0]);
});

// ── PATCH /marketplace/listings/:id ─────────────────────────────────────────
router.patch("/listings/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);

  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].sellerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { title, description, priceCents, category, photos, city, stateCode, status } =
    req.body as {
      title?: string;
      description?: string;
      priceCents?: number;
      category?: string;
      photos?: string[];
      city?: string;
      stateCode?: string;
      status?: string;
    };

  const updates: Record<string, unknown> = {};
  if (title !== undefined)       updates.title       = String(title).trim();
  if (description !== undefined) updates.description = String(description).trim();
  if (priceCents !== undefined)  updates.priceCents  = Number(priceCents);
  if (category !== undefined)    updates.category    = String(category);
  if (photos !== undefined)      updates.photos      = Array.isArray(photos) ? photos : [];
  if (city !== undefined)        updates.city        = String(city).trim();
  if (stateCode !== undefined)   updates.stateCode   = String(stateCode).trim().toUpperCase().slice(0, 2);
  if (status !== undefined && ["active", "sold", "removed"].includes(status)) {
    updates.status = status;
  }

  const [updated] = await db
    .update(marketplaceListingsTable)
    .set(updates)
    .where(eq(marketplaceListingsTable.id, id))
    .returning();

  res.json(updated);
});

// ── DELETE /marketplace/listings/:id ─────────────────────────────────────────
router.delete("/listings/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = Number(req.params.id);

  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id))
    .limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (rows[0].sellerId !== userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db
    .delete(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, id));
  res.status(204).send();
});

export default router;
