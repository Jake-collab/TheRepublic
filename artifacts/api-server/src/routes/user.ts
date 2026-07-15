import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, membershipsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import { getStripeConfig, getAppBaseUrl } from "../utils/stripeHelpers";

const router = Router();

router.use(requireAuth, ensureUser);

router.get("/profile", async (req, res) => {
  const userId = (req as any).userId as string;
  const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "Not found" }); return; }
  const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
  res.json({
    id: user[0].id,
    email: user[0].email,
    displayName: user[0].displayName,
    avatarUrl: user[0].avatarUrl ?? null,
    isPro: user[0].isPro,
    acceptedTermsAt: user[0].acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: user[0].acceptedPrivacyAt?.toISOString() ?? null,
    createdAt: user[0].createdAt.toISOString(),
    theme: user[0].theme,
    membershipPlan: membership[0]?.plan ?? "free",
    membershipStatus: membership[0]?.status ?? "none",
  });
});

router.patch("/profile", async (req, res) => {
  const userId = (req as any).userId as string;
  const { displayName, avatarUrl, theme, acceptedTermsAt, acceptedPrivacyAt } = req.body;

  // Username uniqueness check — case-insensitive, skip for empty/clearing
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
  if (displayName !== undefined) updates.displayName = displayName.trim();
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (theme !== undefined) updates.theme = theme;
  if (acceptedTermsAt !== undefined) updates.acceptedTermsAt = acceptedTermsAt ? new Date(acceptedTermsAt) : null;
  if (acceptedPrivacyAt !== undefined) updates.acceptedPrivacyAt = acceptedPrivacyAt ? new Date(acceptedPrivacyAt) : null;
  updates.updatedAt = new Date();

  const updated = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
  const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  res.json({
    id: updated[0].id,
    email: updated[0].email,
    displayName: updated[0].displayName,
    avatarUrl: updated[0].avatarUrl ?? null,
    isPro: updated[0].isPro,
    acceptedTermsAt: updated[0].acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: updated[0].acceptedPrivacyAt?.toISOString() ?? null,
    createdAt: updated[0].createdAt.toISOString(),
    theme: updated[0].theme,
    membershipPlan: membership[0]?.plan ?? "free",
    membershipStatus: membership[0]?.status ?? "none",
  });
});

router.get("/membership", async (req, res) => {
  const userId = (req as any).userId as string;
  const rows = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);
  const m = rows[0];
  res.set("Cache-Control", "private, max-age=120, stale-while-revalidate=300");
  res.json({
    userId,
    plan: m?.plan ?? "free",
    status: m?.status ?? "none",
    stripeCustomerId: m?.stripeCustomerId ?? null,
    stripeSubscriptionId: m?.stripeSubscriptionId ?? null,
    currentPeriodEnd: m?.currentPeriodEnd?.toISOString() ?? null,
  });
});

router.post("/membership/checkout", async (req, res) => {
  const userId = (req as any).userId as string;
  const { plan } = req.body;

  const cfg = await getStripeConfig();
  if (!cfg.secretKey) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(cfg.secretKey);
    const priceId = plan === "annual" ? cfg.annualPriceId : cfg.monthlyPriceId;

    if (!priceId) {
      res.status(503).json({ error: "Price ID not configured for this plan" });
      return;
    }

    const user = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);

    let customerId = membership[0]?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user[0]?.email ?? undefined, metadata: { userId } });
      customerId = customer.id;
    }

    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout-cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/membership/portal", async (req, res) => {
  const userId = (req as any).userId as string;

  const cfg = await getStripeConfig();
  if (!cfg.secretKey) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(cfg.secretKey);
    const membership = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId)).limit(1);

    if (!membership[0]?.stripeCustomerId) {
      res.status(400).json({ error: "No Stripe customer found" });
      return;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: membership[0].stripeCustomerId,
      return_url: getAppBaseUrl(),
    });

    res.json({ url: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe portal error");
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
