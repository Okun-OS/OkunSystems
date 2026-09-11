import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSales, AuthorizationError } from "@/lib/auth-guards";
import { getPresignedReadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Archiviertes Rechnungs-PDF über eine kurzlebige Signed URL ausliefern. */
export async function GET(request: NextRequest) {
  try {
    await requireSales();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId fehlt" }, { status: 400 });

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { pdfR2Key: true },
  });
  if (!invoice?.pdfR2Key) {
    return NextResponse.json({ error: "Kein archiviertes PDF vorhanden" }, { status: 404 });
  }

  const url = await getPresignedReadUrl(invoice.pdfR2Key, 300);
  return NextResponse.redirect(url);
}
