import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    consentActions?: Array<{ legalDocumentId: string; consentType: string }>;
    displayedPriceCents?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { token, consentActions, displayedPriceCents } = body;
  if (!token || !consentActions?.length) {
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

  for (const action of consentActions) {
    const legalDoc = await db.legalDocument.findUnique({
      where: { id: action.legalDocumentId },
      select: { isRequired: true },
    });
    if (!legalDoc) continue;

    const existing = await db.consentRecord.findFirst({
      where: { closingSessionId: closingSession.id, legalDocumentId: action.legalDocumentId },
    });
    if (existing) continue;

    await db.consentRecord.create({
      data: {
        consentType: action.consentType,
        isRequired: legalDoc.isRequired,
        displayedPriceCents: displayedPriceCents ?? 0,
        agreementAt: new Date(),
        result: "granted",
        sessionTokenHash: tokenHash,
        companyId: closingSession.companyId,
        closingSessionId: closingSession.id,
        offerId: closingSession.activeOfferId ?? null,
        legalDocumentId: action.legalDocumentId,
      },
    });
  }

  // Clear the pending action so the client modal closes
  await db.closingSession.update({
    where: { id: closingSession.id },
    data: { clientPendingAction: null },
  });

  return NextResponse.json({ ok: true });
}
