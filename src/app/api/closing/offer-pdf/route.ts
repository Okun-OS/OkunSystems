import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { getPresignedReadUrl } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Token fehlt" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const closingSession = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    select: { activeOfferId: true, tokenExpiresAt: true },
  });
  if (!closingSession || new Date() > closingSession.tokenExpiresAt) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });
  }
  if (!closingSession.activeOfferId) {
    return NextResponse.json({ error: "Kein aktives Angebot" }, { status: 404 });
  }

  const offer = await db.offer.findUnique({
    where: { id: closingSession.activeOfferId },
    select: { template: { select: { r2Key: true } } },
  });
  if (!offer?.template?.r2Key) {
    return NextResponse.json({ error: "PDF nicht verfügbar" }, { status: 404 });
  }

  const url = await getPresignedReadUrl(offer.template.r2Key, 300);
  return NextResponse.redirect(url);
}
