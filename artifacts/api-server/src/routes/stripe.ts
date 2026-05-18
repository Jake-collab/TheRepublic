import { Router } from "express";
import { db } from "@workspace/db";
import { membershipsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/webhook", async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.json({ received: true });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const sig = req.headers["stripe-signature"] as string;
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
        const planInterval = sub.items?.data?.[0]?.price?.recurring?.interval;
        const plan = planInterval === "year" ? "annual" : "monthly";
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);

        const existing = await db.select().from(membershipsTable).where(eq(membershipsTable.stripeCustomerId, customerId)).limit(1);
        if (existing[0]) {
          await db.update(membershipsTable).set({ plan, status, stripeSubscriptionId: sub.id, currentPeriodEnd, updatedAt: new Date() })
            .where(eq(membershipsTable.stripeCustomerId, customerId));
          await db.update(usersTable).set({ isPro: status === "active" }).where(eq(usersTable.id, existing[0].userId));
        } else {
          // Try to find by metadata
          const customer = await stripe.customers.retrieve(customerId) as any;
          const userId = customer.metadata?.userId;
          if (userId) {
            await db.insert(membershipsTable).values({ userId, plan, status, stripeCustomerId: customerId, stripeSubscriptionId: sub.id, currentPeriodEnd })
              .onConflictDoNothing();
            await db.update(usersTable).set({ isPro: status === "active" }).where(eq(usersTable.id, userId));
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer as string;
        await db.update(membershipsTable).set({ plan: "free", status: "canceled", updatedAt: new Date() })
          .where(eq(membershipsTable.stripeCustomerId, customerId));
        const m = await db.select().from(membershipsTable).where(eq(membershipsTable.stripeCustomerId, customerId)).limit(1);
        if (m[0]) await db.update(usersTable).set({ isPro: false }).where(eq(usersTable.id, m[0].userId));
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    req.log?.error({ err }, "Stripe webhook error");
    res.status(400).json({ error: "Webhook error" });
  }
});

export default router;
