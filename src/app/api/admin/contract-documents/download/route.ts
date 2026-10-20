import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSales, AuthorizationError } from "@/lib/auth-guards";
import { getPresignedReadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Zugriff auf eine Vertragsdokumentversion für Admin/Closer.
 * Private R2-Objekte werden ausschließlich über kurzlebige Signed URLs
 * ausgeliefert, niemals über öffentliche Bucket-URLs.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSales();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  const versionId = request.nextUrl.searchParams.get("versionId");
  if (!versionId) {
    return NextResponse.json({ error: "versionId fehlt" }, { status: 400 });
  }

  const version = await db.legalDocument.findUnique({
    where: { id: versionId },
    select: { r2Key: true, content: true, title: true, version: true, mimeType: true },
  });
  if (!version) {
    return NextResponse.json({ error: "Version nicht gefunden" }, { status: 404 });
  }

  if (version.r2Key) {
    const url = await getPresignedReadUrl(version.r2Key, 300);
    return NextResponse.redirect(url);
  }
  if (version.content) {
    return new NextResponse(version.content, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({ error: "Kein Inhalt hinterlegt" }, { status: 404 });
}
