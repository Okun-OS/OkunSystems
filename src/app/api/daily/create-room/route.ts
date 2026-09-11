import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSales, AuthorizationError } from "@/lib/auth-guards";
import { buildRoomName, ensureDailyRoom, isDailyConfigured } from "@/lib/daily";

export const dynamic = "force-dynamic";

/**
 * Legt den Videoraum zu einem Termin an — oder verwendet einen bereits
 * vorhandenen weiter. Fehlermeldungen von Daily.co werden durchgereicht, damit
 * im Admin erkennbar ist, woran es liegt.
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

  const appointment = await db.appointment.findUnique({
    where: { id: body.appointmentId },
    select: { id: true, endTime: true, meetingUrl: true, type: true },
  });
  if (!appointment) {
    return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
  }

  const prefix = appointment.type === "CLOSING_CALL" ? "closing" : "strategiegespraech";
  const result = await ensureDailyRoom({
    name: buildRoomName(prefix, appointment.id),
    endsAt: appointment.endTime,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: { meetingUrl: result.url },
  });

  return NextResponse.json({
    meetingUrl: result.url,
    reused: result.reused,
    extended: result.extended,
  });
}
