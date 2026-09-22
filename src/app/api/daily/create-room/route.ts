import { NextRequest, NextResponse } from "next/server";
import { requireSales, AuthorizationError } from "@/lib/auth-guards";
import { ensureAppointmentRoom, isDailyConfigured } from "@/lib/daily";

export const dynamic = "force-dynamic";

/**
 * Legt den Videoraum zu einem Termin an — oder verwendet einen bereits
 * vorhandenen weiter. Fehlermeldungen von Daily.co werden durchgereicht, damit
 * im Admin erkennbar ist, woran es liegt.
 *
 * Der Berater-Arbeitsplatz ruft das auch unmittelbar vor jedem Beitritt auf:
 * ein abgelaufener Raum wird dabei neu angelegt.
 */
export async function POST(req: NextRequest) {
  try {
    await requireSales();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  let body: { appointmentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  if (!body.appointmentId) {
    return NextResponse.json({ error: "appointmentId fehlt" }, { status: 400 });
  }

  if (!isDailyConfigured()) {
    return NextResponse.json(
      { error: "Daily.co ist nicht konfiguriert (DAILY_API_KEY fehlt)." },
      { status: 503 }
    );
  }

  const result = await ensureAppointmentRoom(body.appointmentId);
  if (!result.ok) {
    const status = result.error === "Termin nicht gefunden." ? 404 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    meetingUrl: result.url,
    reused: result.reused,
    extended: result.extended,
  });
}
