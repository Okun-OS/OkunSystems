import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signatur fehlt" }, { status: 400 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const companyId = session.metadata?.companyId;

    if (companyId && session.mode === "subscription") {
      await db.careSubscription.upsert({
        where: { companyId },
        update: {
          status: "active",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          startedAt: new Date(),
          cancelledAt: null,
        },
        create: {
          companyId,
          status: "active",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          startedAt: new Date(),
        },
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const companyId = subscription.metadata?.companyId;

    if (companyId) {
      await db.careSubscription.updateMany({
        where: { companyId },
        data: { status: "cancelled", cancelledAt: new Date() },
      });
    }
  }

  return NextResponse.json({ received: true });
}
