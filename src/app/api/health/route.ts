import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Anmeldefreier Health-Endpunkt für die Plattform-Überwachung.
 *
 * Antwortet bewusst ohne Datenbank- oder Drittsystemzugriff: geprüft wird
 * ausschließlich, ob der Node-Prozess Anfragen beantwortet. Damit eignet er
 * sich als `healthcheckPath`, ohne bei einer langsamen Datenbank fälschlich
 * einen Deploy scheitern zu lassen.
 *
 * Für den inhaltlichen Status der angebundenen Dienste gibt es die
 * angemeldete Ansicht unter /admin/einstellungen/integrationen.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
