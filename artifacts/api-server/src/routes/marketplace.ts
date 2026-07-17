import { Router } from "express";
import { db } from "@workspace/db";
import {
  marketplaceListingsTable,
  marketplaceMessagesTable,
  notificationsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { eq, desc, asc, and, ilike, or, lt, gte, lte } from "drizzle-orm";

/** Haversine distance in miles between two lat/lon points */
function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const router = Router();

// ── GET /marketplace/listings ────────────────────────────────────────────────
router.get("/listings", async (req, res) => {
  const {
    category, search, cursor, limit = "24",
    lat, lon, radius,
    minPrice, maxPrice,
    sort = "new",
  } = req.query;

  const useLocation = lat && lon && radius &&
    !isNaN(Number(lat)) && !isNaN(Number(lon)) && !isNaN(Number(radius));
  // When filtering by radius we fetch a larger set then apply Haversine post-fetch
  const take = useLocation ? 500 : Math.min(Number(limit), 50) + 1;

  const conditions: ReturnType<typeof eq>[] = [
    eq(marketplaceListingsTable.status, "active"),
  ];
  if (category && typeof category === "string") {
    conditions.push(eq(marketplaceListingsTable.category, category));
  }
  if (!useLocation && cursor) {
    conditions.push(lt(marketplaceListingsTable.id, Number(cursor)) as ReturnType<typeof eq>);
  }
  if (minPrice && !isNaN(Number(minPrice))) {
    conditions.push(gte(marketplaceListingsTable.priceCents, Number(minPrice)) as ReturnType<typeof eq>);
  }
  if (maxPrice && !isNaN(Number(maxPrice))) {
    conditions.push(lte(marketplaceListingsTable.priceCents, Number(maxPrice)) as ReturnType<typeof eq>);
  }

  let searchClause: ReturnType<typeof or> | undefined;
  if (search && typeof search === "string" && search.trim()) {
    const q = `%${search.trim()}%`;
    searchClause = or(
      ilike(marketplaceListingsTable.title, q),
      ilike(marketplaceListingsTable.description, q),
    );
  }

  const where = and(...conditions, ...(searchClause ? [searchClause] : []));

  const orderBy =
    sort === "price_asc"  ? [asc(marketplaceListingsTable.priceCents)]  :
    sort === "price_desc" ? [desc(marketplaceListingsTable.priceCents)] :
    [desc(marketplaceListingsTable.createdAt)];

  let rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(where)
    .orderBy(...orderBy)
    .limit(take);

  // ── Haversine filter ──────────────────────────────────────────────────────
  if (useLocation) {
    const buyerLat = Number(lat);
    const buyerLon = Number(lon);
    const maxMiles = Number(radius);
    rows = rows.filter((r) => {
      if (!r.latitude || !r.longitude) return false;
      const sLat = parseFloat(r.latitude);
      const sLon = parseFloat(r.longitude);
      if (isNaN(sLat) || isNaN(sLon)) return false;
      return haversineMiles(buyerLat, buyerLon, sLat, sLon) <= maxMiles;
    });
    // Re-apply pagination on the filtered set
    const pageSize = Math.min(Number(limit) || 24, 50);
    const cursorId = cursor ? Number(cursor) : null;
    let startIdx = 0;
    if (cursorId) {
      const idx = rows.findIndex((r) => r.id === cursorId);
      if (idx !== -1) startIdx = idx + 1;
    }
    const page = rows.slice(startIdx, startIdx + pageSize + 1);
    const hasMore = page.length === pageSize + 1;
    const items = hasMore ? page.slice(0, -1) : page;
    const nextCursor = hasMore ? items[items.length - 1]!.id : null;
    res.json({ items, nextCursor });
    return;
  }

  const hasMore = rows.length === take;
  const items = hasMore ? rows.slice(0, -1) : rows;
  const nextCursor = hasMore ? items[items.length - 1]!.id : null;

  res.json({ items, nextCursor });
});

// ── GET /marketplace/listings/my ─────────────────────────────────────────────
router.get("/listings/my", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db
    .select()
    .from(marketplaceListingsTable)
    .where(and(
      eq(marketplaceListingsTable.sellerId, userId),
    ))
    .orderBy(desc(marketplaceListingsTable.createdAt));
  res.json(rows);
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

  const {
    title,
    description,
    priceCents,
    category,
    photos = [],
    city = "",
    stateCode = "",
    locationText = "",
    latitude,
    longitude,
  } = req.body as {
    title?: string;
    description?: string;
    priceCents?: number;
    category?: string;
    photos?: string[];
    city?: string;
    stateCode?: string;
    locationText?: string;
    latitude?: string;
    longitude?: string;
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
      locationText: String(locationText).trim(),
      latitude:     latitude ? String(latitude) : null,
      longitude:    longitude ? String(longitude) : null,
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

  const { title, description, priceCents, category, photos, city, stateCode, status, locationText, latitude, longitude } =
    req.body as {
      title?: string;
      description?: string;
      priceCents?: number;
      category?: string;
      photos?: string[];
      city?: string;
      stateCode?: string;
      status?: string;
      locationText?: string;
      latitude?: string;
      longitude?: string;
    };

  const updates: Record<string, unknown> = {};
  if (title !== undefined)        updates.title        = String(title).trim();
  if (description !== undefined)  updates.description  = String(description).trim();
  if (priceCents !== undefined)   updates.priceCents   = Number(priceCents);
  if (category !== undefined)     updates.category     = String(category);
  if (photos !== undefined)       updates.photos       = Array.isArray(photos) ? photos : [];
  if (city !== undefined)         updates.city         = String(city).trim();
  if (stateCode !== undefined)    updates.stateCode    = String(stateCode).trim().toUpperCase().slice(0, 2);
  if (locationText !== undefined) updates.locationText = String(locationText).trim();
  if (latitude !== undefined)     updates.latitude     = latitude ? String(latitude) : null;
  if (longitude !== undefined)    updates.longitude    = longitude ? String(longitude) : null;
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

// ── GET /marketplace/listings/:id/messages ───────────────────────────────────
router.get("/listings/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const listingId = Number(req.params.id);

  const listing = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, listingId))
    .limit(1);
  if (!listing[0]) { res.status(404).json({ error: "Not found" }); return; }

  const msgs = await db
    .select()
    .from(marketplaceMessagesTable)
    .where(and(
      eq(marketplaceMessagesTable.listingId, listingId),
      or(
        eq(marketplaceMessagesTable.senderId, userId),
        eq(marketplaceMessagesTable.receiverId, userId),
      ),
    ))
    .orderBy(desc(marketplaceMessagesTable.createdAt));

  res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// ── POST /marketplace/listings/:id/messages ──────────────────────────────────
router.post("/listings/:id/messages", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const listingId = Number(req.params.id);

  const listing = await db
    .select()
    .from(marketplaceListingsTable)
    .where(eq(marketplaceListingsTable.id, listingId))
    .limit(1);
  if (!listing[0]) { res.status(404).json({ error: "Not found" }); return; }
  if (listing[0].sellerId === userId) { res.status(400).json({ error: "Cannot message your own listing" }); return; }

  const userRow = await db
    .select({ displayName: usersTable.displayName })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const { body } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }

  const [msg] = await db.insert(marketplaceMessagesTable).values({
    listingId,
    senderId:   userId,
    senderName: userRow[0]?.displayName || "Anonymous",
    receiverId: listing[0].sellerId,
    body:       body.trim(),
  }).returning();

  // Notify the seller
  await db.insert(notificationsTable).values({
    userId:  listing[0].sellerId,
    title:   "New Message",
    message: `${userRow[0]?.displayName || "Someone"} messaged you about "${listing[0].title}"`,
  });

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

export default router;
