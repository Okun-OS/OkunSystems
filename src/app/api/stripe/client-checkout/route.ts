import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
    }

    const { token } = (await req.json()) as { token: string };
    if (!token) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const closingSession = await db.closingSession.findUnique({
      where: { clientTokenHash: tokenHash },
      include: {
        company: { select: { id: true, name: true } },
        appointment: { select: { bookedByEmail: true } },
      },
    });

    if (!closingSession) return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    if (new Date() > closingSession.tokenExpiresAt) {
      return NextResponse.json({ error: "Link abgelaufen" }, { status: 410 });
    }
    if (closingSession.status !== "contract_closed") {
      return NextResponse.json({ error: "Zahlung noch nicht freigegeben" }, { status: 409 });
    }
    if (!closingSession.activeOfferId) {
      return NextResponse.json({ error: "Kein aktives Angebot" }, { status: 404 });
    }

    const offer = await db.offer.findUnique({ where: { id: closingSession.activeOfferId } });
    if (!offer) return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
    const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const unitAmount = Math.round(offer.priceNet * 1.19);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "sepa_debit"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: offer.currency.toLowerCase(),
            unit_amount: unitAmount,
            product_data: {
              name: `OKUN Systems — ${closingSession.company.name}`,
              description: "Einmalzahlung inkl. 19% MwSt.",
            },
          },
        },
      ],
      customer_email: closingSession.appointment?.bookedByEmail ?? undefined,
      metadata: {
        closingSessionId: closingSession.id,
        offerId: offer.id,
        companyId: closingSession.company.id,
        type: "sales_payment",
      },
      success_url: `${origin}/closing/${token}?payment=success`,
      cancel_url: `${origin}/closing/${token}?payment=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("client checkout error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
