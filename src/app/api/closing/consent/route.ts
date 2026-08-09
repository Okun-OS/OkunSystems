import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    legalDocumentId?: string;
    consentType?: string;
    displayedPriceCents?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { token, legalDocumentId, consentType, displayedPriceCents } = body;
  if (!token || !legalDocumentId || !consentType) {
    return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const closingSession = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    select: { id: true, companyId: true, activeOfferId: true, tokenExpiresAt: true },
  });
  if (!closingSession || new Date() > closingSession.tokenExpiresAt) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });
  }

  const legalDoc = await db.legalDocument.findUnique({
    where: { id: legalDocumentId },
    select: { isRequired: true },
  });
  if (!legalDoc) {
    return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });
  }

  const existing = await db.consentRecord.findFirst({
    where: { closingSessionId: closingSession.id, legalDocumentId },
  });
  if (existing) {
    return NextResponse.json({ ok: true });
  }

  await db.consentRecord.create({
    data: {
      consentType,
      isRequired: legalDoc.isRequired,
      displayedPriceCents: displayedPriceCents ?? 0,
      agreementAt: new Date(),
      result: "granted",
      sessionTokenHash: tokenHash,
      companyId: closingSession.companyId,
      closingSessionId: closingSession.id,
      offerId: closingSession.activeOfferId ?? null,
      legalDocumentId,
    },
  });

  return NextResponse.json({ ok: true });
}
