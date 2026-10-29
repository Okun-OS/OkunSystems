import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { db } from "@/lib/db";
import { ladeStand, meldeDa, setzeAnsicht, setzeStufe } from "@/lib/strategie/fuehrung";

export const dynamic = "force-dynamic";

/**
 * Der gemeinsame Stand eines Strategiegesprächs.
 *
 * Lesen darf, wer zum Betrieb gehört; schalten darf nur, wer das Gespräch
 * führt. Die Sitzungs-ID allein öffnet nichts — zu welcher Firma sie gehört,
 * wird hier geprüft und nicht aus der Anfrage übernommen.
 *
 * Bewusst klein gehalten: ein Ort, eine Stufe, eine Revision. Alles andere
 * steht schon auf der Seite, die der Kunde beim Laden bekommen hat; durch
 * diesen Draht geht nur, was sich im Gespräch ändert.
 */

async function pruefe(sitzungId: string) {
  const actor = await getActor();
  if (!actor) return { fehler: "Nicht angemeldet", status: 401 as const };

  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { companyId: true },
  });
  if (!sitzung) return { fehler: "Nicht gefunden", status: 404 as const };

  const fuehrt = mayDoStrategy(actor.role, actor.canStrategy);
  const gehoert = actor.companyId === sitzung.companyId;
  if (!fuehrt && !gehoert) return { fehler: "Kein Zugriff", status: 403 as const };

  return { actor, fuehrt };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sitzungId: string }> }
) {
  const { sitzungId } = await params;
  const erlaubt = await pruefe(sitzungId);
  if ("fehler" in erlaubt) {
    return NextResponse.json({ error: erlaubt.fehler }, { status: erlaubt.status });
  }

  const stand = await ladeStand(sitzungId);
  // Keine Freigabe heißt: Es gibt für den Kunden nichts zu sehen. Das ist
  // kein Fehler, sondern der Normalfall vor dem Termin.
  return NextResponse.json({ stand }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sitzungId: string }> }
) {
  const { sitzungId } = await params;
  const erlaubt = await pruefe(sitzungId);
  if ("fehler" in erlaubt) {
    return NextResponse.json({ error: erlaubt.fehler }, { status: erlaubt.status });
  }
  if (!erlaubt.fuehrt) {
    return NextResponse.json({ error: "Nur der Berater führt." }, { status: 403 });
  }

  let body: { ansicht?: string; stufe?: number; da?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (typeof body.ansicht === "string") {
    const ergebnis = await setzeAnsicht(sitzungId, body.ansicht);
    if ("error" in ergebnis) return NextResponse.json(ergebnis, { status: 409 });
  } else if (typeof body.stufe === "number") {
    const ergebnis = await setzeStufe(sitzungId, body.stufe);
    if ("error" in ergebnis) return NextResponse.json(ergebnis, { status: 409 });
  } else if (body.da) {
    await meldeDa(sitzungId);
  } else {
    return NextResponse.json({ error: "Nichts zu tun" }, { status: 400 });
  }

  return NextResponse.json(
    { stand: await ladeStand(sitzungId) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
