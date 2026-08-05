import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const userRecord = await db.user.findUnique({ where: { id: userId } });
    if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
    }

    const { closingSessionId, offerId } = await req.json() as {
      closingSessionId: string;
      offerId: string;
    };

    const closingSession = await db.closingSession.findUnique({
      where: { id: closingSessionId },
      include: {
        company: { select: { id: true, name: true } },
        appointment: { select: { bookedByEmail: true, bookedByName: true } },
      },
    });

    if (!closingSession) {
      return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    }
    if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const offer = await db.offer.findUnique({ where: { id: offerId } });
    if (!offer || offer.closingSessionId !== closingSessionId) {
      return NextResponse.json({ error: "Angebot nicht gefunden" }, { status: 404 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

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
              description: `Einmalzahlung inkl. 19% MwSt.`,
            },
          },
        },
      ],
      customer_email: closingSession.appointment?.bookedByEmail ?? undefined,
      metadata: {
        closingSessionId,
        offerId,
        companyId: closingSession.company.id,
        type: "sales_payment",
      },
      success_url: `${origin}/admin/sales/closing/${closingSessionId}?payment=success`,
      cancel_url: `${origin}/admin/sales/closing/${closingSessionId}?payment=cancelled`,
    });

    await db.closingSession.update({
      where: { id: closingSessionId },
      data: { status: "payment_pending" },
    });
    await db.company.update({
      where: { id: closingSession.company.id },
      data: { leadStatus: "payment_pending" },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("sales checkout error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
