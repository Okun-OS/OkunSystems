import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClosingToken } from "@/lib/closing/token";
import { getPresignedReadUrl } from "@/lib/storage";
import { renderOfferPdf } from "@/lib/closing/offer-document";

export const dynamic = "force-dynamic";

/**
 * Angebot als PDF für die Kundenseite.
 *
 * Reihenfolge:
 *   1. Hat der Admin für das Paket ein Angebots-PDF hinterlegt, wird dieses
 *      über eine kurzlebige Signed URL ausgeliefert.
 *   2. Sonst wird das Angebot aus dem eingefrorenen Vertragsstand über die
 *      Dokumentvorlage „Angebot" gerendert.
 *
 * Der Zugang läuft ausschließlich über das Closing-Token; widerrufene und
 * abgelaufene Token werden abgewiesen.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const validation = await verifyClosingToken(token);
  if (!validation.ok) {
    return NextResponse.json({ error: "Zugang ungültig" }, { status: 401 });
  }

  const session = await db.closingSession.findUnique({
    where: { id: validation.closingSessionId },
    select: { activeOfferId: true },
  });
  if (!session?.activeOfferId) {
    return NextResponse.json({ error: "Kein aktives Angebot" }, { status: 404 });
  }

  const offer = await db.offer.findUnique({
    where: { id: session.activeOfferId },
    select: { template: { select: { r2Key: true } } },
  });

  if (offer?.template?.r2Key) {
    const url = await getPresignedReadUrl(offer.template.r2Key, 300);
    return NextResponse.redirect(url);
  }

  try {
    const rendered = await renderOfferPdf(validation.closingSessionId);
    if (!rendered) {
      return NextResponse.json({ error: "Kein Angebot hinterlegt" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(rendered.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${rendered.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[closing] Angebots-PDF konnte nicht erzeugt werden:", error);
    return NextResponse.json(
      { error: "Das Angebot konnte gerade nicht erzeugt werden." },
      { status: 500 }
    );
  }
}
