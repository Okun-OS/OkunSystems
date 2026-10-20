import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClosingToken } from "@/lib/closing/token";
import { ensureAppointmentRoom, isDailyConfigured } from "@/lib/daily";

export const dynamic = "force-dynamic";

/**
 * Kundenseite: Gesprächsraum unmittelbar vor dem Beitritt sicherstellen.
 *
 * Die am Termin hinterlegte URL kann auf einen Raum zeigen, den Daily nach
 * Ablauf längst gelöscht hat. Der Beitritt scheitert dann lautlos. Deshalb
 * wird der Raum hier bei Bedarf neu angelegt und die geprüfte URL
 * zurückgegeben — erst danach betritt der Kunde das Gespräch.
 */
export async function POST(request: NextRequest) {
  let token: string | undefined;
  try {
    token = (JSON.parse(await request.text()) as { token?: string }).token;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const validation = await verifyClosingToken(token);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Zugang ungültig", reason: validation.reason },
      { status: 401 }
    );
  }

  const session = await db.closingSession.findUnique({
    where: { id: validation.closingSessionId },
    select: { appointmentId: true, appointment: { select: { meetingUrl: true } } },
  });
  if (!session?.appointmentId) {
    return NextResponse.json(
      { error: "Für dieses Closing ist noch kein Termin hinterlegt." },
      { status: 409 }
    );
  }

  if (!isDailyConfigured()) {
    // Ohne Zugangsdaten lässt sich nichts prüfen — eine vorhandene URL ist
    // dann immer noch die beste verfügbare Antwort.
    if (session.appointment?.meetingUrl) {
      return NextResponse.json({ meetingUrl: session.appointment.meetingUrl });
    }
    return NextResponse.json(
      { error: "Der Gesprächsraum ist noch nicht eingerichtet." },
      { status: 503 }
    );
  }

  const result = await ensureAppointmentRoom(session.appointmentId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(
    { meetingUrl: result.url },
    { headers: { "Cache-Control": "no-store" } }
  );
}
