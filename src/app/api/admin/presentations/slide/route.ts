import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionAccess, AuthorizationError } from "@/lib/auth-guards";
import { getObjectStream } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Folienvorschau für den Berater — nur für seine eigenen Abschlüsse. */
export async function GET(request: NextRequest) {
  const slideId = request.nextUrl.searchParams.get("slideId");
  if (!slideId) return NextResponse.json({ error: "slideId fehlt" }, { status: 400 });

  const slide = await db.closingPresentationSlide.findUnique({
    where: { id: slideId },
    select: {
      r2Key: true,
      mimeType: true,
      presentation: { select: { closingSessionId: true } },
    },
  });
  if (!slide?.presentation.closingSessionId) {
    return NextResponse.json({ error: "Folie nicht gefunden" }, { status: 404 });
  }

  try {
    await requireSessionAccess(slide.presentation.closingSessionId);
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  return streamObject(slide.r2Key, slide.mimeType);
}

/** Liefert das Objekt über den eigenen Endpunkt aus — gleiche Herkunft, kein CORS. */
async function streamObject(key: string, fallbackType: string): Promise<NextResponse> {
  const object = await getObjectStream(key);
  if (!object) {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 });
  }
  const headers = new Headers({
    "Content-Type": object.contentType ?? fallbackType,
    "Cache-Control": "private, no-store",
    "Content-Disposition": "inline",
  });
  if (object.contentLength !== null) {
    headers.set("Content-Length", String(object.contentLength));
  }
  return new NextResponse(object.body, { headers });
}

