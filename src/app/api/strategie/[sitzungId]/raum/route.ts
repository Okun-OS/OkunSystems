import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { db } from "@/lib/db";
import { ensureAppointmentRoom } from "@/lib/daily";
import { istBeraterDa } from "@/lib/strategie/engine";

export const dynamic = "force-dynamic";

/**
 * Der Videoraum zum Strategiegespräch.
 *
 * Denselben Weg geht das Closing schon: Der Raum wird nicht bei der
 * Terminanlage erzeugt und dann gehofft, sondern unmittelbar vor dem Beitritt
 * sichergestellt. Ein Raum, der zwischen Buchung und Termin abgelaufen ist,
 * wird dabei neu angelegt — sonst stehen beide Seiten in einem endlosen
 * „wird verbunden".
 *
 * Anlegen darf nur, wer das Gespräch führt. Der Kunde bekommt die Adresse
 * erst, wenn sein Berater im Raum ist: Niemand soll allein in einem leeren
 * Videoraum sitzen, und die Freigabe entscheidet ohnehin, ob er überhaupt
 * etwas zu sehen bekommt.
 */

async function holeSitzung(sitzungId: string) {
  return db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: {
      id: true,
      companyId: true,
      appointmentId: true,
      freigegebenAm: true,
      status: true,
      beraterPresenceAt: true,
      appointment: { select: { meetingUrl: true } },
      company: { select: { name: true } },
    },
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sitzungId: string }> }
) {
  const { sitzungId } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!mayDoStrategy(actor.role, actor.canStrategy)) {
    return NextResponse.json({ error: "Nur der Berater öffnet den Raum." }, { status: 403 });
  }

  const sitzung = await holeSitzung(sitzungId);
  if (!sitzung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const ergebnis = await ensureAppointmentRoom(sitzung.appointmentId);
  if (!ergebnis.ok) {
    return NextResponse.json({ error: ergebnis.error }, { status: 502 });
  }

  return NextResponse.json(
    { raumUrl: ergebnis.url },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sitzungId: string }> }
) {
  const { sitzungId } = await params;
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const sitzung = await holeSitzung(sitzungId);
  if (!sitzung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const fuehrt = mayDoStrategy(actor.role, actor.canStrategy);
  const gehoert = actor.companyId === sitzung.companyId;
  if (!fuehrt && !gehoert) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  /*
    Der Kunde bekommt die Adresse nur, wenn jemand da ist, den er treffen
    kann — und nur, wenn die Sitzung für ihn freigegeben ist.
  */
  const offen = fuehrt || (Boolean(sitzung.freigegebenAm) && istBeraterDa(sitzung.beraterPresenceAt));

  return NextResponse.json(
    {
      raumUrl: offen ? sitzung.appointment?.meetingUrl ?? null : null,
      beraterDa: istBeraterDa(sitzung.beraterPresenceAt),
      firma: sitzung.company.name,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
