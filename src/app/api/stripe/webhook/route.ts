import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { handleStripePaymentSucceeded } from "@/lib/closing/payments";

export const dynamic = "force-dynamic";

/**
 * Stripe-Webhook.
 *
 * Zahlungen gelten ausschließlich dann als bestätigt, wenn sie hier mit
 * gültiger Signatur eintreffen — ein Browser-Redirect setzt niemals `paid`.
 * Die Verarbeitung ist idempotent: jede Stripe-Event-ID wird nur einmal
 * ausgeführt (Unique-Constraint auf StripeWebhookEvent.id).
 */
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
    console.error("[stripe] Signaturprüfung fehlgeschlagen:", err);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  // Idempotenz: ein doppelt zugestellter Webhook darf nichts erneut auslösen.
  try {
    await db.stripeWebhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    throw err;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = session.metadata?.companyId;
      const type = session.metadata?.type;

      if (type === "sales_payment" && companyId && session.mode === "payment") {
        await handleStripePaymentSucceeded({
          companyId,
          closingSessionId: session.metadata?.closingSessionId ?? null,
          offerId: session.metadata?.offerId ?? null,
          invoiceId: session.metadata?.invoiceId ?? null,
          stripeSessionId: session.id,
          amountTotal: session.amount_total,
        });
      } else if (companyId && session.mode === "subscription") {
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
  } catch (err) {
    // Der Idempotenz-Eintrag wird zurückgenommen, damit Stripe erneut zustellen
    // und die Verarbeitung nachholen kann.
    await db.stripeWebhookEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    console.error("[stripe] Verarbeitung fehlgeschlagen:", err);
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
