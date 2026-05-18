import { Router } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable, websitesTable, usersTable, membershipsTable,
  supportTicketsTable, notificationsTable, webviewSettingsTable, auditLogsTable,
  citizenVotePostsTable,
} from "@workspace/db";
import { eq, desc, asc, and, sql, ilike } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

const router = Router();
router.use(requireAdmin);

async function logAction(adminId: string, action: string, details?: string) {
  await db.insert(auditLogsTable).values({ adminId, action, details });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const [totalUsers, proUsers, totalWebsites, activeWebsites, totalCategories, openTickets, totalPosts, recentSignups] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.isPro, true)),
    db.select({ count: sql<number>`count(*)` }).from(websitesTable),
    db.select({ count: sql<number>`count(*)` }).from(websitesTable).where(eq(websitesTable.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(categoriesTable),
    db.select({ count: sql<number>`count(*)` }).from(supportTicketsTable).where(eq(supportTicketsTable.status, "open")),
    db.select({ count: sql<number>`count(*)` }).from(citizenVotePostsTable),
    db.select({ count: sql<number>`count(*)` }).from(usersTable).where(sql`created_at > now() - interval '7 days'`),
  ]);

  res.json({
    totalUsers: Number(totalUsers[0].count),
    proUsers: Number(proUsers[0].count),
    freeUsers: Number(totalUsers[0].count) - Number(proUsers[0].count),
    totalWebsites: Number(totalWebsites[0].count),
    activeWebsites: Number(activeWebsites[0].count),
    totalCategories: Number(totalCategories[0].count),
    openTickets: Number(openTickets[0].count),
    totalPosts: Number(totalPosts[0].count),
    recentSignups: Number(recentSignups[0].count),
  });
});

// ── Categories ────────────────────────────────────────────────────────────────
router.get("/categories", async (req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(asc(categoriesTable.sortOrder));
  res.json(rows.map(r => ({ id: r.id, name: r.name, isActive: r.isActive, sortOrder: r.sortOrder })));
});

router.post("/categories", async (req, res) => {
  const { name, sortOrder } = req.body;
  const row = await db.insert(categoriesTable).values({ name, sortOrder: sortOrder ?? 0 }).returning();
  await logAction((req as any).userId, "create_category", `name=${name}`);
  res.status(201).json({ id: row[0].id, name: row[0].name, isActive: row[0].isActive, sortOrder: row[0].sortOrder });
});

router.patch("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, isActive, sortOrder } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  const row = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  await logAction((req as any).userId, "update_category", `id=${id}`);
  res.json({ id: row[0].id, name: row[0].name, isActive: row[0].isActive, sortOrder: row[0].sortOrder });
});

router.post("/categories/reorder", async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  await Promise.all(ids.map((id, idx) => db.update(categoriesTable).set({ sortOrder: idx }).where(eq(categoriesTable.id, id))));
  await logAction((req as any).userId, "reorder_categories");
  res.json({ ok: true });
});

// ── Websites ──────────────────────────────────────────────────────────────────
router.get("/websites", async (req, res) => {
  const { categoryId } = req.query;
  const conditions: any[] = [];
  if (categoryId) conditions.push(eq(websitesTable.categoryId, Number(categoryId)));

  const rows = await db
    .select({ website: websitesTable, categoryName: categoriesTable.name })
    .from(websitesTable)
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(websitesTable.cardOrder));

  res.json(rows.map(r => ({ ...r.website, categoryName: r.categoryName ?? null })));
});

router.post("/websites", async (req, res) => {
  const row = await db.insert(websitesTable).values(req.body).returning();
  const cat = row[0].categoryId ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, row[0].categoryId)).limit(1) : [];
  await logAction((req as any).userId, "create_website", `name=${row[0].name}`);
  res.status(201).json({ ...row[0], categoryName: cat[0]?.name ?? null });
});

router.patch("/websites/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.update(websitesTable).set(req.body).where(eq(websitesTable.id, id)).returning();
  const cat = row[0].categoryId ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, row[0].categoryId)).limit(1) : [];
  await logAction((req as any).userId, "update_website", `id=${id}`);
  res.json({ ...row[0], categoryName: cat[0]?.name ?? null });
});

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.select({ user: usersTable, membership: membershipsTable })
      .from(usersTable)
      .leftJoin(membershipsTable, eq(usersTable.id, membershipsTable.userId))
      .orderBy(desc(usersTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
  ]);

  res.json({
    users: users.map(r => ({
      id: r.user.id,
      email: r.user.email,
      displayName: r.user.displayName,
      isPro: r.user.isPro,
      membershipPlan: r.membership?.plan ?? "free",
      membershipStatus: r.membership?.status ?? "none",
      createdAt: r.user.createdAt.toISOString(),
    })),
    total: Number(total[0].count),
  });
});

router.patch("/users/:userId/membership", async (req, res) => {
  const { userId } = req.params;
  const { plan, status } = req.body;

  const existing = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  let membership;
  if (existing[0]) {
    membership = await db.update(membershipsTable).set({ plan, status, updatedAt: new Date() }).where(eq(membershipsTable.userId, userId)).returning();
  } else {
    membership = await db.insert(membershipsTable).values({ userId, plan, status }).returning();
  }

  const isPro = status === "active" && plan !== "free";
  await db.update(usersTable).set({ isPro }).where(eq(usersTable.id, userId));
  await logAction((req as any).userId, "update_user_membership", `userId=${userId},plan=${plan},status=${status}`);

  res.json({
    userId,
    plan: membership[0].plan,
    status: membership[0].status,
    stripeCustomerId: membership[0].stripeCustomerId ?? null,
    stripeSubscriptionId: membership[0].stripeSubscriptionId ?? null,
    currentPeriodEnd: membership[0].currentPeriodEnd?.toISOString() ?? null,
  });
});

// ── Support ───────────────────────────────────────────────────────────────────
router.get("/support/tickets", async (req, res) => {
  const { status, type } = req.query;
  const conditions: any[] = [];
  if (status) conditions.push(eq(supportTicketsTable.status, status as string));
  if (type) conditions.push(eq(supportTicketsTable.type, type as string));

  const rows = await db.select().from(supportTicketsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(supportTicketsTable.createdAt));

  res.json(rows.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString() })));
});

router.patch("/support/tickets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, adminReply } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (adminReply !== undefined) updates.adminReply = adminReply;

  const row = await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id)).returning();
  await logAction((req as any).userId, "update_ticket", `id=${id},status=${status}`);
  res.json({ ...row[0], createdAt: row[0].createdAt.toISOString(), updatedAt: row[0].updatedAt.toISOString() });
});

// ── WebView Settings ──────────────────────────────────────────────────────────
router.get("/webview-settings", async (req, res) => {
  const rows = await db.select().from(webviewSettingsTable).limit(1);
  if (!rows[0]) {
    const created = await db.insert(webviewSettingsTable).values({}).returning();
    res.json(created[0]);
    return;
  }
  res.json(rows[0]);
});

router.patch("/webview-settings", async (req, res) => {
  const rows = await db.select().from(webviewSettingsTable).limit(1);
  let updated;
  if (!rows[0]) {
    updated = await db.insert(webviewSettingsTable).values(req.body).returning();
  } else {
    updated = await db.update(webviewSettingsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(webviewSettingsTable.id, rows[0].id)).returning();
  }
  await logAction((req as any).userId, "update_webview_settings");
  res.json(updated[0]);
});

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get("/audit-logs", async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const offset = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(auditLogsTable),
  ]);

  res.json({
    logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total: Number(total[0].count),
  });
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.post("/notifications", async (req, res) => {
  const { userId, title, message } = req.body;
  if (userId) {
    await db.insert(notificationsTable).values({ userId, title, message });
  } else {
    const users = await db.select({ id: usersTable.id }).from(usersTable);
    await Promise.all(users.map(u => db.insert(notificationsTable).values({ userId: u.id, title, message })));
  }
  await logAction((req as any).userId, "send_notification", `title=${title}`);
  res.status(201).json({ ok: true });
});

export default router;
