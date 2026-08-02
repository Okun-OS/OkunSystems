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

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: "Stripe nicht konfiguriert" }, { status: 503 });
    }

    const priceId = process.env.STRIPE_CARE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "Stripe-Preis nicht konfiguriert" }, { status: 503 });
    }

    const userId = (session.user as any).id as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { company: { select: { id: true, name: true, careSubscription: true } } },
    });

    if (!user?.company) {
      return NextResponse.json({ error: "Kein Unternehmen gefunden" }, { status: 404 });
    }

    if (user.company.careSubscription?.status === "active") {
      return NextResponse.json({ error: "OKUN Care bereits aktiv" }, { status: 400 });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });

    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email ?? undefined,
      metadata: {
        companyId: user.company.id,
        userId,
      },
      subscription_data: {
        metadata: {
          companyId: user.company.id,
          userId,
        },
      },
      success_url: `${origin}/okun-care?success=1`,
      cancel_url: `${origin}/okun-care`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("stripe checkout error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
