import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, membershipsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { getStripeConfig, getAppBaseUrl } from "../utils/stripeHelpers";

const router = Router();

router.use(requireAuth, ensureUser);

// ── helpers ───────────────────────────────────────────────────────────────────

function profileShape(user: typeof usersTable.$inferSelect, m?: typeof membershipsTable.$inferSelect) {
  return {
    id:               user.id,
    email:            user.email,
    displayName:      user.displayName,
    avatarUrl:        user.avatarUrl ?? null,
    isPro:            user.isPro,
    membershipTier:   user.membershipTier,
    stripeAccountId:  user.stripeAccountId ?? null,
    acceptedTermsAt:  user.acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: user.acceptedPrivacyAt?.toISOString() ?? null,
    createdAt:        user.createdAt.toISOString(),
    theme:            user.theme,
    membershipPlan:   m?.plan   ?? "free",
    membershipStatus: m?.status ?? "none",
    membershipPeriodEnd: m?.currentPeriodEnd?.toISOString() ?? null,
  };
}

// ── GET /user/profile ─────────────────────────────────────────────────────────

router.get("/profile", async (req, res) => {
  const userId = (req as any).userId as string;
  const user   = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "Not found" }); return; }
  const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
  res.json(profileShape(user[0], membership[0]));
});

// ── PATCH /user/profile ───────────────────────────────────────────────────────

router.patch("/profile", async (req, res) => {
  const userId = (req as any).userId as string;
  const { displayName, avatarUrl, theme, acceptedTermsAt, acceptedPrivacyAt } = req.body;

  if (displayName !== undefined && displayName.trim() !== "") {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.displayName, displayName.trim()), ne(usersTable.id, userId)))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Username already taken. Please choose another." });
      return;
    }
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (displayName    !== undefined) updates.displayName    = displayName.trim();
  if (avatarUrl      !== undefined) updates.avatarUrl      = avatarUrl;
  if (theme          !== undefined) updates.theme          = theme;
  if (acceptedTermsAt    !== undefined) updates.acceptedTermsAt    = acceptedTermsAt    ? new Date(acceptedTermsAt)    : null;
  if (acceptedPrivacyAt  !== undefined) updates.acceptedPrivacyAt  = acceptedPrivacyAt  ? new Date(acceptedPrivacyAt)  : null;
  updates.updatedAt = new Date();

  const updated    = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.json(profileShape(updated[0], membership[0]));
});

// ── GET /user/membership ──────────────────────────────────────────────────────

router.get("/membership", async (req, res) => {
  const userId = (req as any).userId as string;
  const [users, rows] = await Promise.all([
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1),
    db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1),
  ]);
  const m = rows[0];
  res.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
  res.json({
    userId,
    tier:                 m?.tier                      ?? users[0]?.membershipTier ?? "free",
    plan:                 m?.plan                      ?? "free",
    status:               m?.status                    ?? "none",
    stripeCustomerId:     m?.stripeCustomerId           ?? null,
    stripeSubscriptionId: m?.stripeSubscriptionId       ?? null,
    currentPeriodEnd:     m?.currentPeriodEnd?.toISOString() ?? null,
    stripeAccountId:      users[0]?.stripeAccountId    ?? null,
  });
});

// ── POST /user/membership/checkout ────────────────────────────────────────────
// tier: "web" ($2.99/mo) | "pro" ($4.99/mo)
// legacy: plan: "monthly" | "annual" still accepted

router.post("/membership/checkout", async (req, res) => {
  const userId = (req as any).userId as string;
  const { tier, plan } = req.body as { tier?: string; plan?: string };

  const cfg = await getStripeConfig();
  if (!cfg.secretKey) { res.status(503).json({ error: "Stripe not configured" }); return; }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(cfg.secretKey);

    // Resolve price ID: tier takes priority over legacy plan param
    let priceId: string | null = null;
    if      (tier === "pro")    priceId = cfg.proMonthlyPriceId;
    else if (tier === "web")    priceId = cfg.webPriceId;
    else if (plan === "annual") priceId = cfg.annualPriceId;
    else                        priceId = cfg.monthlyPriceId ?? cfg.webPriceId;

    if (!priceId) { res.status(503).json({ error: "Price ID not configured" }); return; }

    const user       = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);

    let customerId = membership[0]?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user[0]?.email ?? undefined, metadata: { userId } });
      customerId = customer.id;
    }

    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 "subscription",
      payment_method_types: ["card"],
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${baseUrl}/checkout-cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ── POST /user/membership/portal ──────────────────────────────────────────────

router.post("/membership/portal", async (req, res) => {
  const userId = (req as any).userId as string;
  const cfg    = await getStripeConfig();
  if (!cfg.secretKey) { res.status(503).json({ error: "Stripe not configured" }); return; }

  try {
    const Stripe     = (await import("stripe")).default;
    const stripe     = new Stripe(cfg.secretKey);
    const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
    if (!membership[0]?.stripeCustomerId) { res.status(400).json({ error: "No Stripe customer found" }); return; }

    const session = await stripe.billingPortal.sessions.create({
      customer:   membership[0].stripeCustomerId,
      return_url: getAppBaseUrl(),
    });
    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe portal error");
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
