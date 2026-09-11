import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionAccess } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

/**
 * Anwesenheit des Beraters im Videoraum.
 *
 * Der Berater-Arbeitsplatz meldet sich beim Beitreten und danach alle 30
 * Sekunden; beim Verlassen wird die Anwesenheit gelöscht. Der Kunde sieht
 * daran, ob er noch wartet oder das Gespräch bereits läuft.
 *
 * Beim Schließen des Tabs kommt die Abmeldung über `navigator.sendBeacon` —
 * deshalb wird auch ein Body ohne JSON-Content-Type akzeptiert.
 */
export async function POST(request: NextRequest) {
  let payload: { closingSessionId?: string; present?: boolean };
  try {
    payload = JSON.parse(await request.text()) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const closingSessionId = payload.closingSessionId;
  if (!closingSessionId) {
    return NextResponse.json({ error: "closingSessionId fehlt" }, { status: 400 });
  }

  try {
    await requireSessionAccess(closingSessionId);
  } catch {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  await db.closingSession.update({
    where: { id: closingSessionId },
    data: { advisorPresenceAt: payload.present === false ? null : new Date() },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
