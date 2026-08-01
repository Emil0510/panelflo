import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { planForPriceId, stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const payload = await req.text();
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (err) {
    console.error("[stripe] webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const workspaceId = session.metadata?.workspaceId;
      if (!workspaceId) break;

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      let plan: "STARTER" | "GROWTH" | "PRO" | null = null;
      if (subscriptionId) {
        const sub = await stripe().subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        if (priceId) plan = planForPriceId(priceId);
      }

      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subscriptionId ?? undefined,
          subscriptionActive: true,
          ...(plan ? { plan } : {}),
        },
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const priceId = sub.items.data[0]?.price.id;
      const plan = priceId ? planForPriceId(priceId) : null;

      await db.workspace.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionActive: sub.status === "active" || sub.status === "trialing",
          ...(plan ? { plan } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await db.workspace.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          subscriptionActive: false,
          stripeSubscriptionId: null,
          trialEndsAt: new Date(),
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
