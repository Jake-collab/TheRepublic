import { Router } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable, websitesTable, usersTable, membershipsTable,
  supportTicketsTable, cannedResponsesTable, notificationsTable, webviewSettingsTable, auditLogsTable,
  citizenVotePostsTable, stripeSettingsTable, userWebsitePrefsTable,
  talkCategoriesTable, talkPostsTable, talkCommentsTable, talkVotesTable,
  contentFlagsTable, blockedWordsTable,
  notificationCampaignsTable, appSettingsTable,
  identityVerificationsTable,
  gigJobsTable, freelanceProjectsTable, marketplaceListingsTable,
} from "@workspace/db";
import { invalidateBlockedWordsCache } from "../utils/blockedWords";
import { getStripeConfig, invalidateStripeCache } from "../utils/stripeHelpers";
import { isEmailConfigured, sendTicketReplyEmail } from "../utils/email";
import { eq, desc, asc, and, sql, ilike, lte, inArray } from "drizzle-orm";
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
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      isActive: categoriesTable.isActive,
      sortOrder: categoriesTable.sortOrder,
      websiteCount: sql<number>`count(${websitesTable.id})::int`,
    })
    .from(categoriesTable)
    .leftJoin(websitesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(asc(categoriesTable.sortOrder));
  res.json(rows);
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

router.get("/websites/usage", async (req, res) => {
  const rows = await db
    .select({
      id: websitesTable.id,
      name: websitesTable.name,
      url: websitesTable.url,
      displayDomain: websitesTable.displayDomain,
      iconUrl: websitesTable.iconUrl,
      isFree: websitesTable.isFree,
      isActive: websitesTable.isActive,
      categoryId: websitesTable.categoryId,
      categoryName: categoriesTable.name,
      tabOrder: websitesTable.tabOrder,
      cardOrder: websitesTable.cardOrder,
      canBeTab: websitesTable.canBeTab,
      canPreload: websitesTable.canPreload,
      remembersUrl: websitesTable.remembersUrl,
      popupMitigationEnabled: websitesTable.popupMitigationEnabled,
      notes: websitesTable.notes,
      userCount: sql<number>`count(${userWebsitePrefsTable.id})::int`,
    })
    .from(websitesTable)
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .leftJoin(userWebsitePrefsTable, eq(websitesTable.id, userWebsitePrefsTable.websiteId))
    .groupBy(websitesTable.id, categoriesTable.name)
    .orderBy(asc(websitesTable.tabOrder));
  res.json(rows);
});

router.get("/websites/export", async (req, res) => {
  const rows = await db
    .select({ w: websitesTable, categoryName: categoriesTable.name })
    .from(websitesTable)
    .leftJoin(categoriesTable, eq(websitesTable.categoryId, categoriesTable.id))
    .orderBy(asc(websitesTable.tabOrder));

  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const header = "id,name,url,displayDomain,category,isFree,isActive,tabOrder,notes";
  const body = rows.map(r =>
    [r.w.id, esc(r.w.name), esc(r.w.url), esc(r.w.displayDomain), esc(r.categoryName), r.w.isFree, r.w.isActive, r.w.tabOrder, esc(r.w.notes)].join(",")
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="websites-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(`${header}\n${body}`);
});

router.post("/websites/bulk-update", async (req, res) => {
  const { ids, updates } = req.body as { ids: number[]; updates: { isActive?: boolean; isFree?: boolean } };
  if (!ids?.length) { res.status(400).json({ error: "ids required" }); return; }
  await db.update(websitesTable).set(updates).where(inArray(websitesTable.id, ids));
  await logAction((req as any).userId, "bulk_update_websites", `count=${ids.length}`);
  res.json({ ok: true });
});

router.post("/websites/reorder", async (req, res) => {
  const { ids } = req.body as { ids: number[] };
  if (!ids?.length) { res.status(400).json({ error: "ids required" }); return; }
  await Promise.all(ids.map((id, idx) => db.update(websitesTable).set({ tabOrder: idx }).where(eq(websitesTable.id, id))));
  await logAction((req as any).userId, "reorder_websites");
  res.json({ ok: true });
});

router.delete("/websites/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(userWebsitePrefsTable).where(eq(userWebsitePrefsTable.websiteId, id));
  await db.delete(websitesTable).where(eq(websitesTable.id, id));
  await logAction((req as any).userId, "delete_website", `id=${id}`);
  res.json({ ok: true });
});

router.delete("/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [cnt] = await db.select({ count: sql<number>`count(*)::int` }).from(websitesTable).where(eq(websitesTable.categoryId, id));
  if (Number(cnt.count) > 0) {
    res.status(409).json({ error: `Cannot delete: ${cnt.count} website(s) still use this category. Reassign them first.` }); return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  await logAction((req as any).userId, "delete_category", `id=${id}`);
  res.json({ ok: true });
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
      isBanned: r.user.isBanned,
      bannedAt: r.user.bannedAt?.toISOString() ?? null,
      banReason: r.user.banReason ?? null,
      membershipPlan: r.membership?.plan ?? "free",
      membershipStatus: r.membership?.status ?? "none",
      stripeCustomerId: r.membership?.stripeCustomerId ?? null,
      createdAt: r.user.createdAt.toISOString(),
    })),
    total: Number(total[0].count),
  });
});

router.get("/users/export", async (req, res) => {
  const rows = await db
    .select({ user: usersTable, membership: membershipsTable })
    .from(usersTable)
    .leftJoin(membershipsTable, eq(usersTable.id, membershipsTable.userId))
    .orderBy(desc(usersTable.createdAt));

  const header = "id,email,displayName,isPro,isBanned,plan,status,stripeCustomerId,joinedAt";
  const lines = rows.map(r =>
    [
      r.user.id,
      `"${r.user.email.replace(/"/g, '""')}"`,
      `"${r.user.displayName.replace(/"/g, '""')}"`,
      r.user.isPro,
      r.user.isBanned,
      r.membership?.plan ?? "free",
      r.membership?.status ?? "none",
      r.membership?.stripeCustomerId ?? "",
      r.user.createdAt.toISOString(),
    ].join(",")
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="republic-users-${Date.now()}.csv"`);
  res.send([header, ...lines].join("\n"));
});

router.post("/users/:userId/ban", async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  if (!reason?.trim()) {
    res.status(400).json({ error: "Ban reason is required" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: true, bannedAt: new Date(), banReason: reason.trim(), updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await logAction((req as any).userId, "ban_user", `userId=${userId},reason=${reason.trim()}`);
  const m = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.json({
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    isPro: updated.isPro,
    isBanned: updated.isBanned,
    bannedAt: updated.bannedAt?.toISOString() ?? null,
    banReason: updated.banReason ?? null,
    membershipPlan: m[0]?.plan ?? "free",
    membershipStatus: m[0]?.status ?? "none",
    createdAt: updated.createdAt.toISOString(),
  });
});

router.post("/users/:userId/unban", async (req, res) => {
  const { userId } = req.params;
  const [updated] = await db
    .update(usersTable)
    .set({ isBanned: false, bannedAt: null, banReason: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await logAction((req as any).userId, "unban_user", `userId=${userId}`);
  const m = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.json({
    id: updated.id,
    email: updated.email,
    displayName: updated.displayName,
    isPro: updated.isPro,
    isBanned: updated.isBanned,
    bannedAt: null,
    banReason: null,
    membershipPlan: m[0]?.plan ?? "free",
    membershipStatus: m[0]?.status ?? "none",
    createdAt: updated.createdAt.toISOString(),
  });
});

router.get("/users/:userId/activity", async (req, res) => {
  const { userId } = req.params;

  const [posts, tickets, membershipRows] = await Promise.all([
    db
      .select({
        id: talkPostsTable.id,
        title: talkPostsTable.title,
        upvotes: talkPostsTable.upvotes,
        createdAt: talkPostsTable.createdAt,
        commentCount: sql<number>`(select count(*) from ${talkCommentsTable} where ${talkCommentsTable.postId} = ${talkPostsTable.id})`,
      })
      .from(talkPostsTable)
      .where(eq(talkPostsTable.userId, userId))
      .orderBy(desc(talkPostsTable.createdAt))
      .limit(50),
    db
      .select({
        id: supportTicketsTable.id,
        type: supportTicketsTable.type,
        subject: supportTicketsTable.subject,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
      })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.userId, userId))
      .orderBy(desc(supportTicketsTable.createdAt)),
    db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, userId))
      .limit(1),
  ]);

  const m = membershipRows[0];
  res.json({
    posts: posts.map(p => ({
      id: p.id,
      title: p.title,
      upvotes: p.upvotes,
      commentCount: Number(p.commentCount),
      createdAt: p.createdAt.toISOString(),
    })),
    tickets: tickets.map(t => ({
      id: t.id,
      type: t.type,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
    })),
    subscription: {
      plan: m?.plan ?? "free",
      status: m?.status ?? "none",
      currentPeriodEnd: m?.currentPeriodEnd?.toISOString() ?? null,
      stripeCustomerId: m?.stripeCustomerId ?? null,
    },
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
  const { status, type, priority } = req.query;
  const conditions: any[] = [];
  if (status) conditions.push(eq(supportTicketsTable.status, status as string));
  if (type) conditions.push(eq(supportTicketsTable.type, type as string));
  if (priority) conditions.push(eq(supportTicketsTable.priority, priority as string));

  const rows = await db.select().from(supportTicketsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      sql`CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END`,
      desc(supportTicketsTable.createdAt)
    );

  res.json(rows.map(t => ({
    ...t,
    emailedAt: t.emailedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  })));
});

router.patch("/support/tickets/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status, adminReply, priority, assignedTo } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (status !== undefined) updates.status = status;
  if (adminReply !== undefined) updates.adminReply = adminReply;
  if (priority !== undefined) updates.priority = priority;
  if (assignedTo !== undefined) updates.assignedTo = assignedTo;

  const [row] = await db.update(supportTicketsTable).set(updates).where(eq(supportTicketsTable.id, id)).returning();
  await logAction((req as any).userId, "update_ticket", `id=${id},status=${status ?? row.status},priority=${priority ?? row.priority}`);
  res.json({ ...row, emailedAt: row.emailedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.post("/support/tickets/:id/send-email", async (req, res) => {
  const id = Number(req.params.id);
  const [ticket] = await db.select().from(supportTicketsTable).where(eq(supportTicketsTable.id, id));
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  if (!ticket.adminReply) { res.status(400).json({ error: "No admin reply to send yet" }); return; }
  if (!ticket.userEmail) { res.status(400).json({ sent: false, message: "No email address on this ticket" }); return; }

  const result = await sendTicketReplyEmail({
    to: ticket.userEmail,
    subject: ticket.subject,
    userMessage: ticket.message,
    adminReply: ticket.adminReply,
    ticketId: ticket.id,
  });

  if (result.sent) {
    await db.update(supportTicketsTable).set({ emailedAt: new Date() }).where(eq(supportTicketsTable.id, id));
    await logAction((req as any).userId, "email_ticket_reply", `id=${id},to=${ticket.userEmail}`);
  }

  res.json(result);
});

router.post("/support/auto-close", async (req, res) => {
  const { daysOld } = req.body;
  if (!daysOld || daysOld < 1) { res.status(400).json({ error: "daysOld must be >= 1" }); return; }
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const closed = await db
    .update(supportTicketsTable)
    .set({ status: "closed", updatedAt: new Date() })
    .where(and(eq(supportTicketsTable.status, "resolved"), lte(supportTicketsTable.updatedAt, cutoff)))
    .returning();
  await logAction((req as any).userId, "auto_close_tickets", `count=${closed.length},daysOld=${daysOld}`);
  res.json({ closed: closed.length });
});

// ── Canned Responses ──────────────────────────────────────────────────────────
router.get("/support/canned-responses", async (req, res) => {
  const rows = await db.select().from(cannedResponsesTable).orderBy(asc(cannedResponsesTable.category), asc(cannedResponsesTable.title));
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })));
});

router.post("/support/canned-responses", async (req, res) => {
  const { title, body, category = "general" } = req.body;
  if (!title?.trim() || !body?.trim()) { res.status(400).json({ error: "title and body are required" }); return; }
  const [row] = await db.insert(cannedResponsesTable).values({ title: title.trim(), body: body.trim(), category: category.trim() }).returning();
  await logAction((req as any).userId, "create_canned_response", `title=${title}`);
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.patch("/support/canned-responses/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { title, body, category } = req.body;
  const updates: any = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title.trim();
  if (body !== undefined) updates.body = body.trim();
  if (category !== undefined) updates.category = category.trim();
  const [row] = await db.update(cannedResponsesTable).set(updates).where(eq(cannedResponsesTable.id, id)).returning();
  await logAction((req as any).userId, "update_canned_response", `id=${id}`);
  res.json({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
});

router.delete("/support/canned-responses/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(cannedResponsesTable).where(eq(cannedResponsesTable.id, id));
  await logAction((req as any).userId, "delete_canned_response", `id=${id}`);
  res.status(204).send();
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

// ── Stripe Settings ───────────────────────────────────────────────────────────
router.get("/stripe-settings", async (req, res) => {
  const cfg = await getStripeConfig();
  res.json({
    secretKeyConfigured: !!cfg.secretKey,
    webhookSecretConfigured: !!cfg.webhookSecret,
    monthlyPriceId: cfg.monthlyPriceId,
    annualPriceId: cfg.annualPriceId,
    monthlyPriceCents: cfg.monthlyPriceCents,
    annualPriceCents: cfg.annualPriceCents,
    webPriceId: cfg.webPriceId,
    webMonthlyCents: cfg.webMonthlyCents,
    proMonthlyPriceId: cfg.proMonthlyPriceId,
    proMonthlyCents: cfg.proMonthlyCents,
    workerFeePercent: cfg.workerFeePercent,
    consumerFeePercent: cfg.consumerFeePercent,
    consumerFeeCapCents: cfg.consumerFeeCapCents,
    updatedAt: new Date().toISOString(),
  });
});

router.put("/stripe-settings", async (req, res) => {
  const {
    secretKey, webhookSecret,
    monthlyPriceId, annualPriceId, monthlyPriceCents, annualPriceCents,
    webPriceId, webMonthlyCents, proMonthlyPriceId, proMonthlyCents,
    workerFeePercent, consumerFeePercent, consumerFeeCapCents,
  } = req.body;

  const rows = await db.select().from(stripeSettingsTable).limit(1);
  const updates: Partial<typeof stripeSettingsTable.$inferInsert> = { updatedAt: new Date() };

  if (secretKey !== undefined && secretKey !== null && secretKey !== "") updates.secretKey = secretKey;
  if (webhookSecret !== undefined && webhookSecret !== null && webhookSecret !== "") updates.webhookSecret = webhookSecret;
  if (monthlyPriceId !== undefined) updates.monthlyPriceId = monthlyPriceId;
  if (annualPriceId !== undefined) updates.annualPriceId = annualPriceId;
  if (monthlyPriceCents !== undefined) updates.monthlyPriceCents = Number(monthlyPriceCents);
  if (annualPriceCents !== undefined) updates.annualPriceCents = Number(annualPriceCents);
  if (webPriceId !== undefined) updates.webPriceId = webPriceId;
  if (webMonthlyCents !== undefined) updates.webMonthlyCents = Number(webMonthlyCents);
  if (proMonthlyPriceId !== undefined) updates.proMonthlyPriceId = proMonthlyPriceId;
  if (proMonthlyCents !== undefined) updates.proMonthlyCents = Number(proMonthlyCents);
  if (workerFeePercent !== undefined) updates.workerFeePercent = Number(workerFeePercent);
  if (consumerFeePercent !== undefined) updates.consumerFeePercent = Number(consumerFeePercent);
  if (consumerFeeCapCents !== undefined) updates.consumerFeeCapCents = Number(consumerFeeCapCents);

  if (!rows[0]) {
    await db.insert(stripeSettingsTable).values({ ...updates });
  } else {
    await db.update(stripeSettingsTable).set(updates).where(eq(stripeSettingsTable.id, rows[0].id));
  }

  invalidateStripeCache();
  await logAction((req as any).userId, "update_stripe_settings");

  const cfg = await getStripeConfig();
  res.json({
    secretKeyConfigured: !!cfg.secretKey,
    webhookSecretConfigured: !!cfg.webhookSecret,
    monthlyPriceId: cfg.monthlyPriceId,
    annualPriceId: cfg.annualPriceId,
    monthlyPriceCents: cfg.monthlyPriceCents,
    annualPriceCents: cfg.annualPriceCents,
    webPriceId: cfg.webPriceId,
    webMonthlyCents: cfg.webMonthlyCents,
    proMonthlyPriceId: cfg.proMonthlyPriceId,
    proMonthlyCents: cfg.proMonthlyCents,
    updatedAt: new Date().toISOString(),
  });
});

// ── Talks: Categories ─────────────────────────────────────────────────────────
router.get("/talks/categories", async (req, res) => {
  const rows = await db
    .select({
      id: talkCategoriesTable.id,
      name: talkCategoriesTable.name,
      emoji: talkCategoriesTable.emoji,
      sortOrder: talkCategoriesTable.sortOrder,
      isActive: talkCategoriesTable.isActive,
      postCount: sql<number>`count(${talkPostsTable.id})`,
    })
    .from(talkCategoriesTable)
    .leftJoin(talkPostsTable, eq(talkPostsTable.categoryId, talkCategoriesTable.id))
    .groupBy(talkCategoriesTable.id)
    .orderBy(asc(talkCategoriesTable.sortOrder));
  res.json(rows.map(r => ({ ...r, postCount: Number(r.postCount) })));
});

router.post("/talks/categories", async (req, res) => {
  const { name, emoji } = req.body;
  const row = await db.insert(talkCategoriesTable).values({ name, emoji: emoji ?? "💬" }).returning();
  const r = row[0];
  await logAction((req as any).userId, "create_talk_category", `name=${name}`);
  res.status(201).json({ id: r.id, name: r.name, emoji: r.emoji, sortOrder: r.sortOrder, isActive: r.isActive, postCount: 0 });
});

router.patch("/talks/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, emoji, sortOrder, isActive } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (emoji !== undefined) updates.emoji = emoji;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (isActive !== undefined) updates.isActive = isActive;
  const row = await db.update(talkCategoriesTable).set(updates).where(eq(talkCategoriesTable.id, id)).returning();
  const [postCountRow] = await db.select({ count: sql<number>`count(*)` }).from(talkPostsTable).where(eq(talkPostsTable.categoryId, id));
  await logAction((req as any).userId, "update_talk_category", `id=${id}`);
  const r = row[0];
  res.json({ id: r.id, name: r.name, emoji: r.emoji, sortOrder: r.sortOrder, isActive: r.isActive, postCount: Number(postCountRow.count) });
});

router.delete("/talks/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(talkVotesTable).where(
    sql`${talkVotesTable.postId} IN (SELECT id FROM ${talkPostsTable} WHERE category_id = ${id})`
  );
  await db.delete(talkCommentsTable).where(
    sql`${talkCommentsTable.postId} IN (SELECT id FROM ${talkPostsTable} WHERE category_id = ${id})`
  );
  await db.delete(talkPostsTable).where(eq(talkPostsTable.categoryId, id));
  await db.delete(talkCategoriesTable).where(eq(talkCategoriesTable.id, id));
  await logAction((req as any).userId, "delete_talk_category", `id=${id}`);
  res.status(204).send();
});

// ── Talks: Posts ──────────────────────────────────────────────────────────────
router.get("/talks/posts", async (req, res) => {
  const { categoryId, search, cursor, limit: limitParam } = req.query;
  const limit = Math.min(Number(limitParam ?? 50), 100);
  const conditions: any[] = [];
  if (categoryId) conditions.push(eq(talkPostsTable.categoryId, Number(categoryId)));
  if (search) conditions.push(ilike(talkPostsTable.title, `%${search}%`));
  if (cursor) conditions.push(sql`${talkPostsTable.id} < ${Number(cursor)}`);

  const [rows, [{ count }]] = await Promise.all([
    db.select({ post: talkPostsTable, categoryName: talkCategoriesTable.name })
      .from(talkPostsTable)
      .leftJoin(talkCategoriesTable, eq(talkPostsTable.categoryId, talkCategoriesTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(talkPostsTable.createdAt))
      .limit(limit + 1),
    db.select({ count: sql<number>`count(*)` }).from(talkPostsTable)
      .where(conditions.length > 0 && !cursor ? and(...conditions.filter((_, i) => i < conditions.length - (cursor ? 1 : 0))) : undefined),
  ]);

  const items = rows.slice(0, limit).map(r => ({
    id: r.post.id,
    categoryId: r.post.categoryId,
    categoryName: r.post.categoryId ? (r.categoryName ?? "Unknown") : "Unknown",
    userId: r.post.userId,
    displayName: r.post.displayName,
    avatarUrl: r.post.avatarUrl,
    title: r.post.title,
    body: r.post.body,
    upvotes: r.post.upvotes,
    commentCount: r.post.commentCount,
    createdAt: r.post.createdAt.toISOString(),
  }));

  res.json({ items, total: Number(count), nextCursor: rows.length > limit ? items[items.length - 1]?.id : null });
});

router.delete("/talks/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(talkVotesTable).where(eq(talkVotesTable.postId, id));
  await db.delete(talkCommentsTable).where(eq(talkCommentsTable.postId, id));
  await db.delete(talkPostsTable).where(eq(talkPostsTable.id, id));
  await logAction((req as any).userId, "delete_talk_post", `id=${id}`);
  res.status(204).send();
});

router.get("/talks/posts/:id/comments", async (req, res) => {
  const id = Number(req.params.id);
  const rows = await db.select().from(talkCommentsTable)
    .where(eq(talkCommentsTable.postId, id))
    .orderBy(asc(talkCommentsTable.createdAt));
  res.json(rows.map(r => ({
    id: r.id,
    postId: r.postId,
    userId: r.userId,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.delete("/talks/comments/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(talkCommentsTable).where(eq(talkCommentsTable.id, id));
  await logAction((req as any).userId, "delete_talk_comment", `id=${id}`);
  res.status(204).send();
});

// ── Moderation: Flags ─────────────────────────────────────────────────────────
router.get("/moderation/flags", async (req, res) => {
  const { status, contentType } = req.query;
  const conditions = [];
  if (status && typeof status === "string") conditions.push(eq(contentFlagsTable.status, status));
  if (contentType && typeof contentType === "string") conditions.push(eq(contentFlagsTable.contentType, contentType));

  const rows = await db
    .select({
      flag: contentFlagsTable,
      reporterEmail: usersTable.email,
      reporterName: usersTable.displayName,
    })
    .from(contentFlagsTable)
    .leftJoin(usersTable, eq(contentFlagsTable.userId, usersTable.id))
    .where(conditions.length ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(desc(contentFlagsTable.createdAt))
    .limit(200);

  res.json(rows.map((r) => ({
    ...r.flag,
    reporterEmail: r.reporterEmail ?? null,
    reporterName: r.reporterName ?? null,
  })));
});

router.post("/moderation/flags/:id/dismiss", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(contentFlagsTable)
    .set({ status: "dismissed", reviewedAt: new Date() })
    .where(eq(contentFlagsTable.id, id));
  await logAction((req as any).userId, "dismiss_flag", `id=${id}`);
  res.json({ ok: true });
});

router.post("/moderation/flags/:id/remove-content", async (req, res) => {
  const id = Number(req.params.id);
  const [flag] = await db.select().from(contentFlagsTable).where(eq(contentFlagsTable.id, id));
  if (!flag) { res.status(404).json({ error: "Flag not found" }); return; }

  if (flag.contentType === "talk_post") {
    await db.delete(talkCommentsTable).where(eq(talkCommentsTable.postId, flag.contentId));
    await db.delete(talkVotesTable).where(eq(talkVotesTable.postId, flag.contentId));
    await db.delete(talkPostsTable).where(eq(talkPostsTable.id, flag.contentId));
  } else if (flag.contentType === "talk_comment") {
    await db.delete(talkCommentsTable).where(eq(talkCommentsTable.id, flag.contentId));
  } else if (flag.contentType === "citizen_vote") {
    await db.delete(citizenVotePostsTable).where(eq(citizenVotePostsTable.id, flag.contentId));
  }

  await db.update(contentFlagsTable)
    .set({ status: "reviewed", reviewedAt: new Date() })
    .where(eq(contentFlagsTable.id, id));

  await logAction((req as any).userId, "remove_flagged_content", `flagId=${id} type=${flag.contentType}`);
  res.json({ ok: true });
});

// ── Moderation: Blocked Words ─────────────────────────────────────────────────
router.get("/moderation/blocked-words", async (req, res) => {
  const words = await db.select().from(blockedWordsTable).orderBy(asc(blockedWordsTable.word));
  res.json(words);
});

router.post("/moderation/blocked-words", async (req, res) => {
  const { word } = req.body;
  if (!word?.trim()) { res.status(400).json({ error: "word is required" }); return; }
  const [created] = await db
    .insert(blockedWordsTable)
    .values({ word: word.trim().toLowerCase(), addedBy: (req as any).userId })
    .onConflictDoNothing()
    .returning();
  invalidateBlockedWordsCache();
  await logAction((req as any).userId, "add_blocked_word", `word=${word.trim()}`);
  res.status(201).json(created ?? { word: word.trim() });
});

router.delete("/moderation/blocked-words/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(blockedWordsTable).where(eq(blockedWordsTable.id, id));
  invalidateBlockedWordsCache();
  await logAction((req as any).userId, "remove_blocked_word", `id=${id}`);
  res.status(204).send();
});

// ── Talks: Pin / Unpin ────────────────────────────────────────────────────────
router.post("/talks/posts/:id/pin", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(talkPostsTable).set({ isPinned: true, pinnedAt: new Date() }).where(eq(talkPostsTable.id, id));
  await logAction((req as any).userId, "pin_talk_post", `id=${id}`);
  res.json({ ok: true });
});

router.post("/talks/posts/:id/unpin", async (req, res) => {
  const id = Number(req.params.id);
  await db.update(talkPostsTable).set({ isPinned: false, pinnedAt: null }).where(eq(talkPostsTable.id, id));
  await logAction((req as any).userId, "unpin_talk_post", `id=${id}`);
  res.json({ ok: true });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
function buildDateRange(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

router.get("/analytics/user-growth", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 90);
  const rows = await db
    .select({
      date: sql<string>`date_trunc('day', ${usersTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(usersTable)
    .where(sql`${usersTable.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const byDate = Object.fromEntries(rows.map((r) => [r.date, r.count]));
  res.json(buildDateRange(days).map((date) => ({ date, newUsers: Number(byDate[date] ?? 0) })));
});

router.get("/analytics/content", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 90);
  const [postsRows, votesRows, commentsRows] = await Promise.all([
    db.select({
      date: sql<string>`date_trunc('day', ${talkPostsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(talkPostsTable)
    .where(sql`${talkPostsTable.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
    .groupBy(sql`1`).orderBy(sql`1`),

    db.select({
      date: sql<string>`date_trunc('day', ${citizenVotePostsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(citizenVotePostsTable)
    .where(sql`${citizenVotePostsTable.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
    .groupBy(sql`1`).orderBy(sql`1`),

    db.select({
      date: sql<string>`date_trunc('day', ${talkCommentsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(talkCommentsTable)
    .where(sql`${talkCommentsTable.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
    .groupBy(sql`1`).orderBy(sql`1`),
  ]);

  const postsByDate = Object.fromEntries(postsRows.map((r) => [r.date, r.count]));
  const votesByDate = Object.fromEntries(votesRows.map((r) => [r.date, r.count]));
  const commentsByDate = Object.fromEntries(commentsRows.map((r) => [r.date, r.count]));

  res.json(buildDateRange(days).map((date) => ({
    date,
    talkPosts: Number(postsByDate[date] ?? 0),
    citizenVotes: Number(votesByDate[date] ?? 0),
    comments: Number(commentsByDate[date] ?? 0),
  })));
});

router.get("/analytics/tickets", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days ?? 30), 1), 90);
  const [createdRows, resolvedRows] = await Promise.all([
    db.select({
      date: sql<string>`date_trunc('day', ${supportTicketsTable.createdAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(supportTicketsTable)
    .where(sql`${supportTicketsTable.createdAt} >= now() - interval '${sql.raw(String(days))} days'`)
    .groupBy(sql`1`).orderBy(sql`1`),

    db.select({
      date: sql<string>`date_trunc('day', ${supportTicketsTable.updatedAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(supportTicketsTable)
    .where(and(
      sql`${supportTicketsTable.updatedAt} >= now() - interval '${sql.raw(String(days))} days'`,
      eq(supportTicketsTable.status, "resolved"),
    ))
    .groupBy(sql`1`).orderBy(sql`1`),
  ]);

  const createdByDate = Object.fromEntries(createdRows.map((r) => [r.date, r.count]));
  const resolvedByDate = Object.fromEntries(resolvedRows.map((r) => [r.date, r.count]));

  res.json(buildDateRange(days).map((date) => ({
    date,
    created: Number(createdByDate[date] ?? 0),
    resolved: Number(resolvedByDate[date] ?? 0),
  })));
});

router.get("/analytics/top-content", async (req, res) => {
  const [topTalkPosts, topCitizenVotes] = await Promise.all([
    db.select({
      id: talkPostsTable.id,
      title: talkPostsTable.title,
      upvotes: talkPostsTable.upvotes,
      commentCount: talkPostsTable.commentCount,
      displayName: talkPostsTable.displayName,
    }).from(talkPostsTable).orderBy(desc(talkPostsTable.upvotes)).limit(10),

    db.select({
      id: citizenVotePostsTable.id,
      content: citizenVotePostsTable.content,
      upvotes: citizenVotePostsTable.upvotes,
      category: citizenVotePostsTable.category,
      displayName: citizenVotePostsTable.displayName,
    }).from(citizenVotePostsTable).orderBy(desc(citizenVotePostsTable.upvotes)).limit(10),
  ]);

  res.json({ topTalkPosts, topCitizenVotes });
});

router.get("/analytics/membership", async (req, res) => {
  const [totalRow, proRow, monthRow, flagRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isPro, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(usersTable).where(sql`${usersTable.createdAt} >= date_trunc('month', now())`),
    db.select({ count: sql<number>`count(*)::int` }).from(contentFlagsTable).where(eq(contentFlagsTable.status, "pending")),
  ]);

  const total = Number(totalRow[0].count);
  const pro = Number(proRow[0].count);
  const free = total - pro;
  const conversionRate = total > 0 ? Math.round((pro / total) * 1000) / 10 : 0;

  res.json({
    total,
    pro,
    free,
    conversionRate,
    newThisMonth: Number(monthRow[0].count),
    pendingFlags: Number(flagRow[0].count),
  });
});

// ── Quick-Fix Tools ───────────────────────────────────────────────────────────
router.post("/users/:userId/resync-subscription", async (req, res) => {
  const { userId } = req.params;
  const cfg = await getStripeConfig();

  if (!cfg.secretKey) {
    res.status(422).json({ error: "Stripe secret key is not configured. Set it in Stripe & Billing settings." });
    return;
  }

  const [membership] = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);

  if (!membership?.stripeSubscriptionId && !membership?.stripeCustomerId) {
    res.status(422).json({ error: "No Stripe subscription or customer ID found for this user. They may never have started a subscription." });
    return;
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(cfg.secretKey, { apiVersion: "2026-04-22.dahlia" });

  let plan = "free";
  let status = "none";
  let isPro = false;

  if (membership.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(membership.stripeSubscriptionId);
    status = sub.status;
    isPro = sub.status === "active" || sub.status === "trialing";
    const priceId = sub.items.data[0]?.price?.id;
    if (priceId === cfg.annualPriceId) plan = "annual";
    else if (priceId === cfg.monthlyPriceId) plan = "monthly";
    else plan = "monthly";
  } else if (membership.stripeCustomerId) {
    const subs = await stripe.subscriptions.list({ customer: membership.stripeCustomerId, limit: 1, status: "all" });
    const sub = subs.data[0];
    if (sub) {
      status = sub.status;
      isPro = sub.status === "active" || sub.status === "trialing";
      const priceId = sub.items.data[0]?.price?.id;
      if (priceId === cfg.annualPriceId) plan = "annual";
      else plan = "monthly";
    }
  }

  const prevIsPro = membership.plan !== "free" && membership.status === "active";
  const changed = isPro !== prevIsPro || plan !== membership.plan || status !== membership.status;

  if (changed) {
    await db.update(membershipsTable).set({ plan: isPro ? plan : "free", status, updatedAt: new Date() }).where(eq(membershipsTable.userId, userId));
    await db.update(usersTable).set({ isPro, updatedAt: new Date() }).where(eq(usersTable.id, userId));
  }

  await logAction((req as any).userId, "resync_subscription", `userId=${userId},plan=${plan},status=${status},changed=${changed}`);
  res.json({ ok: true, changed, plan: isPro ? plan : "free", status, isPro, message: changed ? `Subscription synced: ${plan} (${status})` : "Already up to date — no changes needed." });
});

router.post("/users/:userId/clear-session", async (req, res) => {
  const { userId } = req.params;

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(userWebsitePrefsTable).where(eq(userWebsitePrefsTable.userId, userId));
  await db.delete(userWebsitePrefsTable).where(eq(userWebsitePrefsTable.userId, userId));
  await db.update(usersTable).set({ sessionResetAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, userId));

  await logAction((req as any).userId, "clear_user_session", `userId=${userId},prefsCleared=${count}`);
  res.json({ ok: true, prefsCleared: Number(count) });
});

router.post("/users/:userId/force-refresh", async (req, res) => {
  const { userId } = req.params;

  await db.update(usersTable).set({ forceRefreshAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, userId));
  await db.insert(notificationsTable).values({
    userId,
    title: "App update available",
    message: "Your website list has been refreshed by an admin. Please restart the app to load the latest changes.",
  });

  await logAction((req as any).userId, "force_refresh_websites", `userId=${userId}`);
  res.json({ ok: true });
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/notifications/campaigns", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 25);
  const offset = (page - 1) * limit;

  const [campaigns, [{ count }]] = await Promise.all([
    db.select().from(notificationCampaignsTable).orderBy(desc(notificationCampaignsTable.sentAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(notificationCampaignsTable),
  ]);

  res.json({
    campaigns: campaigns.map(c => ({ ...c, sentAt: c.sentAt.toISOString() })),
    total: Number(count),
  });
});

router.post("/notifications", async (req, res) => {
  const { userId, title, message, segment = "all" } = req.body;
  const adminId = (req as any).userId as string;

  let recipientCount = 0;

  if (userId) {
    await db.insert(notificationsTable).values({ userId, title, message });
    recipientCount = 1;
  } else {
    let query = db.select({ id: usersTable.id }).from(usersTable);
    let users: { id: string }[];
    if (segment === "pro") {
      users = await (query as any).where(eq(usersTable.isPro, true));
    } else if (segment === "free") {
      users = await (query as any).where(eq(usersTable.isPro, false));
    } else {
      users = await query;
    }
    recipientCount = users.length;
    if (users.length > 0) {
      await Promise.all(users.map(u => db.insert(notificationsTable).values({ userId: u.id, title, message })));
    }
  }

  await db.insert(notificationCampaignsTable).values({
    adminId,
    title,
    message,
    segment: userId ? "individual" : segment,
    recipientCount,
  });

  await logAction(adminId, "send_notification", `title=${title},segment=${userId ? "individual" : segment},count=${recipientCount}`);
  res.status(201).json({ ok: true, recipientCount });
});

// ── App Config ─────────────────────────────────────────────────────────────────
router.get("/app-config", async (req, res) => {
  const rows = await db.select().from(appSettingsTable).limit(1);
  if (rows.length === 0) {
    const [created] = await db.insert(appSettingsTable).values({}).returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    return;
  }
  res.json({ ...rows[0], updatedAt: rows[0].updatedAt.toISOString() });
});

router.put("/app-config", async (req, res) => {
  const {
    maintenanceMode, maintenanceBanner, announcementBanner,
    announcementActive, minAppVersion, citizenVoteEnabled, discussionsEnabled,
    supabaseUrl, supabaseServiceRoleKey,
  } = req.body;

  const rows = await db.select().from(appSettingsTable).limit(1);
  const updates: Partial<typeof appSettingsTable.$inferInsert> = { updatedAt: new Date() };

  if (maintenanceMode !== undefined) updates.maintenanceMode = maintenanceMode;
  if (maintenanceBanner !== undefined) updates.maintenanceBanner = maintenanceBanner || null;
  if (announcementBanner !== undefined) updates.announcementBanner = announcementBanner || null;
  if (announcementActive !== undefined) updates.announcementActive = announcementActive;
  if (minAppVersion !== undefined) updates.minAppVersion = minAppVersion;
  if (citizenVoteEnabled !== undefined) updates.citizenVoteEnabled = citizenVoteEnabled;
  if (discussionsEnabled !== undefined) updates.discussionsEnabled = discussionsEnabled;
  if (supabaseUrl !== undefined) updates.supabaseUrl = supabaseUrl || null;
  if (supabaseServiceRoleKey !== undefined) updates.supabaseServiceRoleKey = supabaseServiceRoleKey || null;

  let result;
  if (rows.length === 0) {
    [result] = await db.insert(appSettingsTable).values(updates as typeof appSettingsTable.$inferInsert).returning();
  } else {
    [result] = await db.update(appSettingsTable).set(updates).where(eq(appSettingsTable.id, rows[0].id)).returning();
  }

  await logAction((req as any).userId, "update_app_config");
  res.json({ ...result, updatedAt: result.updatedAt.toISOString() });
});

// ── Identity Verifications ─────────────────────────────────────────────────────
router.get("/identity-verifications", async (_req, res) => {
  const rows = await db
    .select({
      id: identityVerificationsTable.id,
      userId: identityVerificationsTable.userId,
      status: identityVerificationsTable.status,
      fullName: identityVerificationsTable.fullName,
      dob: identityVerificationsTable.dob,
      addressLine1: identityVerificationsTable.addressLine1,
      city: identityVerificationsTable.city,
      state: identityVerificationsTable.state,
      zip: identityVerificationsTable.zip,
      rejectionReason: identityVerificationsTable.rejectionReason,
      reviewedBy: identityVerificationsTable.reviewedBy,
      reviewedAt: identityVerificationsTable.reviewedAt,
      createdAt: identityVerificationsTable.createdAt,
      updatedAt: identityVerificationsTable.updatedAt,
      email: usersTable.email,
      displayName: usersTable.displayName,
    })
    .from(identityVerificationsTable)
    .leftJoin(usersTable, eq(usersTable.id, identityVerificationsTable.userId))
    .orderBy(desc(identityVerificationsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
});

router.get("/identity-verifications/:id/photo/:side", async (req, res) => {
  const id = Number(req.params.id);
  const side = req.params.side;

  const rows = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.id, id));

  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const path = side === "front" ? rows[0].idFrontPath : rows[0].idBackPath;
  if (!path) {
    res.status(404).json({ error: "Photo not uploaded" });
    return;
  }

  const { ObjectStorageService } = await import("../lib/objectStorage");
  const storageSvc = new ObjectStorageService();
  const file = await storageSvc.getObjectEntityFile(path);
  const response = await storageSvc.downloadObject(file);
  const buf = Buffer.from(await response.arrayBuffer());
  res.set("Content-Type", response.headers.get("Content-Type") ?? "image/jpeg");
  res.set("Cache-Control", "private, max-age=3600");
  res.send(buf);
});

router.patch("/identity-verifications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const adminId = (req as any).userId as string;
  const { action, reason } = req.body as { action?: string; reason?: string };

  if (action !== "approve" && action !== "reject") {
    res.status(400).json({ error: "action must be 'approve' or 'reject'" });
    return;
  }
  if (action === "reject" && !reason?.trim()) {
    res.status(400).json({ error: "reason is required when rejecting" });
    return;
  }

  const rows = await db
    .select()
    .from(identityVerificationsTable)
    .where(eq(identityVerificationsTable.id, id));

  if (!rows[0]) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const newStatus = action === "approve" ? "verified" : "rejected";
  await db
    .update(identityVerificationsTable)
    .set({
      status: newStatus,
      rejectionReason: action === "reject" ? reason!.trim() : null,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(identityVerificationsTable.id, id));

  const notifTitle =
    action === "approve" ? "Identity Verified ✓" : "Identity Verification Rejected";
  const notifMessage =
    action === "approve"
      ? "Your identity has been verified. You can now access Work mode in Gigs and Freelance."
      : `Your identity verification was not approved. Reason: ${reason}`;

  await db.insert(notificationsTable).values({
    userId: rows[0].userId,
    title: notifTitle,
    message: notifMessage,
  });

  await logAction(adminId, `identity_${action}`, `id=${id},userId=${rows[0].userId}`);
  res.json({ ok: true, status: newStatus });
});

// ── Gig Management ────────────────────────────────────────────────────────────
router.get("/gigs", async (req, res) => {
  const { status, q, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(gigJobsTable.status, status));
  if (q) conditions.push(ilike(gigJobsTable.title, `%${q}%`));
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(gigJobsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(gigJobsTable.createdAt))
      .limit(Number(limit)).offset(Number(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(gigJobsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  res.json({ items: rows, total: Number(count) });
});

router.patch("/gigs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: string };
  const adminId = (req as any).auth?.userId ?? "system";
  const [updated] = await db.update(gigJobsTable).set({ status }).where(eq(gigJobsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logAction(adminId, "update_gig", `id=${id},status=${status}`);
  res.json(updated);
});

router.delete("/gigs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const adminId = (req as any).auth?.userId ?? "system";
  await db.delete(gigJobsTable).where(eq(gigJobsTable.id, id));
  await logAction(adminId, "delete_gig", `id=${id}`);
  res.json({ ok: true });
});

// ── Freelance Management ───────────────────────────────────────────────────────
router.get("/freelance", async (req, res) => {
  const { status, q, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(freelanceProjectsTable.status, status));
  if (q) conditions.push(ilike(freelanceProjectsTable.title, `%${q}%`));
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(freelanceProjectsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(freelanceProjectsTable.createdAt))
      .limit(Number(limit)).offset(Number(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(freelanceProjectsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  res.json({ items: rows, total: Number(count) });
});

router.patch("/freelance/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: string };
  const adminId = (req as any).auth?.userId ?? "system";
  const [updated] = await db.update(freelanceProjectsTable).set({ status }).where(eq(freelanceProjectsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logAction(adminId, "update_freelance_project", `id=${id},status=${status}`);
  res.json(updated);
});

router.delete("/freelance/:id", async (req, res) => {
  const id = Number(req.params.id);
  const adminId = (req as any).auth?.userId ?? "system";
  await db.delete(freelanceProjectsTable).where(eq(freelanceProjectsTable.id, id));
  await logAction(adminId, "delete_freelance_project", `id=${id}`);
  res.json({ ok: true });
});

// ── Marketplace Moderation ─────────────────────────────────────────────────────
router.get("/marketplace", async (req, res) => {
  const { status, q, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (status) conditions.push(eq(marketplaceListingsTable.status, status));
  if (q) conditions.push(ilike(marketplaceListingsTable.title, `%${q}%`));
  const [rows, [{ count }]] = await Promise.all([
    db.select().from(marketplaceListingsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(marketplaceListingsTable.createdAt))
      .limit(Number(limit)).offset(Number(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(marketplaceListingsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  res.json({ items: rows, total: Number(count) });
});

router.patch("/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body as { status: string };
  const adminId = (req as any).auth?.userId ?? "system";
  const [updated] = await db.update(marketplaceListingsTable).set({ status }).where(eq(marketplaceListingsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  await logAction(adminId, "update_marketplace_listing", `id=${id},status=${status}`);
  res.json(updated);
});

router.delete("/marketplace/:id", async (req, res) => {
  const id = Number(req.params.id);
  const adminId = (req as any).auth?.userId ?? "system";
  await db.delete(marketplaceListingsTable).where(eq(marketplaceListingsTable.id, id));
  await logAction(adminId, "delete_marketplace_listing", `id=${id}`);
  res.json({ ok: true });
});

// ── Memberships (full list) ────────────────────────────────────────────────────
router.get("/memberships/list", async (req, res) => {
  const { tier, status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const conditions: ReturnType<typeof eq>[] = [];
  if (tier && tier !== "all") conditions.push(eq(membershipsTable.tier, tier));
  if (status && status !== "all") conditions.push(eq(membershipsTable.status, status));
  const [rows, [{ count }]] = await Promise.all([
    db.select({
      userId: membershipsTable.userId,
      plan: membershipsTable.plan,
      tier: membershipsTable.tier,
      status: membershipsTable.status,
      stripeCustomerId: membershipsTable.stripeCustomerId,
      stripeSubscriptionId: membershipsTable.stripeSubscriptionId,
      createdAt: membershipsTable.createdAt,
      updatedAt: membershipsTable.updatedAt,
      userEmail: usersTable.email,
      userDisplayName: usersTable.displayName,
    }).from(membershipsTable)
      .leftJoin(usersTable, eq(membershipsTable.userId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(membershipsTable.updatedAt))
      .limit(Number(limit)).offset(Number(offset)),
    db.select({ count: sql<number>`count(*)::int` }).from(membershipsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);
  res.json({ items: rows, total: Number(count) });
});

// ── Transaction & Fee Audit ────────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  const { limit = "30", offset = "0" } = req.query as Record<string, string>;
  const [gigStats, freelanceStats, marketplaceStats, recentActivity] = await Promise.all([
    db.select({
      count: sql<number>`count(*)::int`,
      totalVolumeCents: sql<number>`coalesce(sum(pay_amount_cents),0)::int`,
    }).from(gigJobsTable).where(eq(gigJobsTable.status, "completed")),
    db.select({
      count: sql<number>`count(*)::int`,
      totalVolumeCents: sql<number>`coalesce(sum(budget_max_cents),0)::int`,
    }).from(freelanceProjectsTable).where(eq(freelanceProjectsTable.status, "completed")),
    db.select({
      count: sql<number>`count(*)::int`,
      totalVolumeCents: sql<number>`coalesce(sum(price_cents),0)::int`,
    }).from(marketplaceListingsTable).where(eq(marketplaceListingsTable.status, "sold")),
    db.select().from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(Number(limit)).offset(Number(offset)),
  ]);
  const GIG_FEE = 0.10;
  const FL_FEE = 0.08;
  const MKT_FEE = 0.01;
  const gigVol = Number(gigStats[0].totalVolumeCents);
  const flVol = Number(freelanceStats[0].totalVolumeCents);
  const mktVol = Number(marketplaceStats[0].totalVolumeCents);
  const mktCount = Number(marketplaceStats[0].count);
  res.json({
    summary: {
      gigs: {
        completedCount: Number(gigStats[0].count),
        totalVolumeCents: gigVol,
        platformFeeCents: Math.round(gigVol * GIG_FEE),
      },
      freelance: {
        completedCount: Number(freelanceStats[0].count),
        totalVolumeCents: flVol,
        platformFeeCents: Math.round(flVol * FL_FEE),
      },
      marketplace: {
        completedCount: mktCount,
        totalVolumeCents: mktVol,
        platformFeeCents: Math.min(Math.round(mktVol * MKT_FEE), 2000 * mktCount),
      },
    },
    recentActivity,
  });
});

// ── Platform Diagnostics ──────────────────────────────────────────────────────
router.get("/diagnostics", async (req, res) => {
  const start = Date.now();
  try {
    const dbStart = Date.now();
    const [dbCheck] = await db.select({ count: sql<number>`count(*)::int` }).from(usersTable);
    const dbLatencyMs = Date.now() - dbStart;
    const [acts24h, acts7d, gigStats, flStats, mktStats, memberStats] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(sql`created_at > now() - interval '24 hours'`),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogsTable).where(sql`created_at > now() - interval '7 days'`),
      db.select({
        open: sql<number>`coalesce(sum(case when status='open' then 1 else 0 end),0)::int`,
        inProgress: sql<number>`coalesce(sum(case when status='in_progress' then 1 else 0 end),0)::int`,
        completed: sql<number>`coalesce(sum(case when status='completed' then 1 else 0 end),0)::int`,
      }).from(gigJobsTable),
      db.select({
        open: sql<number>`coalesce(sum(case when status='open' then 1 else 0 end),0)::int`,
        completed: sql<number>`coalesce(sum(case when status='completed' then 1 else 0 end),0)::int`,
      }).from(freelanceProjectsTable),
      db.select({
        active: sql<number>`coalesce(sum(case when status='active' then 1 else 0 end),0)::int`,
        sold: sql<number>`coalesce(sum(case when status='sold' then 1 else 0 end),0)::int`,
      }).from(marketplaceListingsTable),
      db.select({
        free: sql<number>`coalesce(sum(case when tier='free' then 1 else 0 end),0)::int`,
        pro: sql<number>`coalesce(sum(case when tier='pro' then 1 else 0 end),0)::int`,
        web: sql<number>`coalesce(sum(case when tier='web' then 1 else 0 end),0)::int`,
      }).from(membershipsTable),
    ]);
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      latency: { dbMs: dbLatencyMs, totalMs: Date.now() - start },
      database: { status: "connected", userCount: Number(dbCheck?.count ?? 0) },
      activity: { actionsLast24h: Number(acts24h[0].count), actionsLast7d: Number(acts7d[0].count) },
      gigs: gigStats[0],
      freelance: flStats[0],
      marketplace: mktStats[0],
      memberships: memberStats[0],
      webviewPool: { poolSize: 3, note: "LRU pool — max 3 simultaneous WebView instances per session" },
    });
  } catch (err) {
    req.log.error({ err }, "Diagnostics check failed");
    res.status(503).json({ status: "unhealthy", error: "DB unreachable" });
  }
});

export default router;
