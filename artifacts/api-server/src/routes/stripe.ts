import { Router } from "express";
import { db } from "@workspace/db";
import { membershipsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, ensureUser } from "../middlewares/requireAuth";
import {
  getStripeConfig,
  getAppBaseUrl,
  tierFromPriceId,
} from "../utils/stripeHelpers";

const router = Router();

// ── Stripe Webhook ────────────────────────────────────────────────────────────

router.post("/webhook", async (req, res) => {
  const cfg = await getStripeConfig();
  if (!cfg.secretKey || !cfg.webhookSecret) {
    res.json({ received: true });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(cfg.secretKey);
    const sig   = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(req.body, sig, cfg.webhookSecret);

    switch (event.type) {
      // ── Subscriptions ──────────────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;
        const subStatus  = sub.status === "active" ? "active"
                         : sub.status === "past_due" ? "past_due"
                         : "canceled";
        const priceId    = sub.items?.data?.[0]?.price?.id as string | undefined;
        const t          = priceId ? tierFromPriceId(priceId, cfg) : "unknown";
        const resolvedTier: "web" | "pro" = t === "pro" ? "pro" : "web";
        const interval   = sub.items?.data?.[0]?.price?.recurring?.interval;
        const plan       = interval === "year" ? "annual" : "monthly";
        const periodEnd  = new Date(sub.current_period_end * 1000);

        const existing = await db.select().from(membershipsTable)
          .where(eq(membershipsTable.stripeCustomerId, customerId)).limit(1);

        if (existing[0]) {
          await db.update(membershipsTable).set({
            plan,
            tier:                 subStatus === "active" ? resolvedTier : "free",
            status:               subStatus,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd:     periodEnd,
            updatedAt:            new Date(),
          }).where(eq(membershipsTable.stripeCustomerId, customerId));
          await db.update(usersTable).set({
            isPro:          subStatus === "active" && resolvedTier === "pro",
            membershipTier: subStatus === "active" ? resolvedTier : "free",
          }).where(eq(usersTable.id, existing[0].userId));
        } else {
          const customer = await stripe.customers.retrieve(customerId) as any;
          const userId   = customer.metadata?.userId as string | undefined;
          if (userId) {
            await db.insert(membershipsTable).values({
              userId,
              plan,
              tier:                 subStatus === "active" ? resolvedTier : "free",
              status:               subStatus,
              stripeCustomerId:     customerId,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd:     periodEnd,
            }).onConflictDoNothing();
            await db.update(usersTable).set({
              isPro:          subStatus === "active" && resolvedTier === "pro",
              membershipTier: subStatus === "active" ? resolvedTier : "free",
            }).where(eq(usersTable.id, userId));
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub        = event.data.object as any;
        const customerId = sub.customer as string;
        await db.update(membershipsTable)
          .set({ tier: "free", plan: "free", status: "canceled", updatedAt: new Date() })
          .where(eq(membershipsTable.stripeCustomerId, customerId));
        const m = await db.select().from(membershipsTable)
          .where(eq(membershipsTable.stripeCustomerId, customerId)).limit(1);
        if (m[0]) {
          await db.update(usersTable)
            .set({ isPro: false, membershipTier: "free" })
            .where(eq(usersTable.id, m[0].userId));
        }
        break;
      }

      // ── Stripe Connect ─────────────────────────────────────────────────────
      case "account.updated": {
        const acct = event.data.object as any;
        if (acct.metadata?.userId) {
          await db.update(usersTable)
            .set({ stripeAccountId: acct.id })
            .where(eq(usersTable.id, acct.metadata.userId));
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    req.log?.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook error" });
  }
});

// ── Stripe Connect: onboard ───────────────────────────────────────────────────

router.post("/connect/onboard", requireAuth, ensureUser, async (req, res) => {
  const userId = (req as any).userId as string;
  const cfg    = await getStripeConfig();

  if (!cfg.secretKey) { res.status(503).json({ error: "Stripe not configured" }); return; }

  try {
    const Stripe  = (await import("stripe")).default;
    const stripe  = new Stripe(cfg.secretKey);
    const users   = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!users[0]) { res.status(404).json({ error: "User not found" }); return; }

    let accountId = users[0].stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:         "express",
        email:        users[0].email || undefined,
        metadata:     { userId },
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      await db.update(usersTable).set({ stripeAccountId: accountId }).where(eq(usersTable.id, userId));
    }

    const baseUrl = getAppBaseUrl();
    const link    = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${baseUrl}/connect-refresh`,
      return_url:  `${baseUrl}/connect-return`,
      type:        "account_onboarding",
    });

    res.json({ url: link.url });
  } catch (err) {
    req.log?.error({ err }, "Stripe Connect onboard error");
    res.status(500).json({ error: "Failed to start Connect onboarding" });
  }
});

// ── Stripe Connect: status ────────────────────────────────────────────────────

router.get("/connect/status", requireAuth, async (req, res) => {
  const userId    = (req as any).userId as string;
  const cfg       = await getStripeConfig();
  const users     = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!users[0])  { res.status(404).json({ error: "Not found" }); return; }

  const accountId = users[0].stripeAccountId;
  if (!accountId || !cfg.secretKey) {
    res.json({ connected: false, accountId: null, chargesEnabled: false, payoutsEnabled: false });
    return;
  }

  try {
    const Stripe  = (await import("stripe")).default;
    const stripe  = new Stripe(cfg.secretKey);
    const account = await stripe.accounts.retrieve(accountId);
    res.json({
      connected:      true,
      accountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch {
    res.json({ connected: false, accountId, chargesEnabled: false, payoutsEnabled: false });
  }
});

export default router;
