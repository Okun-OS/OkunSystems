import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClosingToken } from "@/lib/closing/token";
import { getObjectStream } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Eine Folie der laufenden Präsentation.
 *
 * Ausgeliefert wird ausschließlich eine Folie, die
 *   • zu einer freigegebenen Präsentation gehört und
 *   • vom Berater für genau diesen Abschluss gestartet wurde.
 *
 * Die Datei liegt privat in R2 und wird nur über eine kurzlebige Signed URL
 * zugänglich gemacht; der R2-Schlüssel verlässt den Server nicht.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const slideId = request.nextUrl.searchParams.get("slideId");
  if (!token || !slideId) {
    return NextResponse.json({ error: "Token oder Folie fehlt" }, { status: 400 });
  }

  const validation = await verifyClosingToken(token);
  if (!validation.ok) {
    return NextResponse.json({ error: "Zugang ungültig" }, { status: 401 });
  }

  const session = await db.closingSession.findUnique({
    where: { id: validation.closingSessionId },
    select: { livePresentationId: true },
  });
  if (!session?.livePresentationId) {
    return NextResponse.json({ error: "Es läuft keine Präsentation." }, { status: 404 });
  }

  const slide = await db.closingPresentationSlide.findUnique({
    where: { id: slideId },
    select: {
      r2Key: true,
      mimeType: true,
      presentationId: true,
      presentation: { select: { status: true } },
    },
  });
  if (
    !slide ||
    slide.presentationId !== session.livePresentationId ||
    slide.presentation.status !== "approved"
  ) {
    return NextResponse.json(
      { error: "Diese Folie gehört nicht zu Ihrem Gespräch." },
      { status: 403 }
    );
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

