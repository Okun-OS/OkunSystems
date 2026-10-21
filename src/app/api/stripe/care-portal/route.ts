import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Stripe from "stripe";

/**
 * Der Weg zu Zahlungsdaten, Rechnungen und Kündigung.
 *
 * Stripe hat dafür ein eigenes Portal. Es nachzubauen hieße, Karten- und
 * Rechnungsdaten durch dieses Haus zu leiten, ohne dass jemand davon etwas
 * gewinnt. Hier entsteht deshalb nur die Sitzung dafür — den Rest macht
 * Stripe, und der Kunde kommt danach auf seine Care-Seite zurück.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        company: {
          select: { id: true, careSubscription: { select: { stripeCustomerId: true } } },
        },
      },
    });

    const kundenId = user?.company?.careSubscription?.stripeCustomerId;
    if (!kundenId) {
      /*
        Kein Stripe-Kunde heißt: Das Abo kam nicht über Stripe zustande —
        etwa von Hand eingetragen. Dann gibt es dort auch nichts zu
        verwalten, und ein leeres Portal zu öffnen wäre die schlechtere
        Antwort als dieser Satz.
      */
      return NextResponse.json(
        { error: "Für dieses Abonnement liegt keine Stripe-Zahlung vor." },
        { status: 409 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
    const origin =
      req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const portal = await stripe.billingPortal.sessions.create({
      customer: kundenId,
      return_url: `${origin}/okun-care`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (fehler) {
    console.error("stripe care-portal error:", fehler);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
