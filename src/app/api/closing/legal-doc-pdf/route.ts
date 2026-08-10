import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";
import { getPresignedReadUrl } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const docId = req.nextUrl.searchParams.get("id");
  if (!token || !docId) {
    return NextResponse.json({ error: "Token oder Dokument-ID fehlt" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const closingSession = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    select: { id: true, tokenExpiresAt: true },
  });
  if (!closingSession || new Date() > closingSession.tokenExpiresAt) {
    return NextResponse.json({ error: "Ungültiger oder abgelaufener Token" }, { status: 401 });
  }

  const doc = await db.legalDocument.findUnique({
    where: { id: docId, isActive: true },
    select: { r2Key: true },
  });
  if (!doc?.r2Key) {
    return NextResponse.json({ error: "Dokument nicht verfügbar" }, { status: 404 });
  }

  const url = await getPresignedReadUrl(doc.r2Key, 300);
  return NextResponse.redirect(url);
}
