import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { hinweise } from "@/lib/termine/beistand";
import { schreibeProtokoll } from "@/lib/termine/protokoll";
import { gegenueber } from "@/lib/termine/gegenueber";

/**
 * Was während der Besprechung passiert.
 *
 * Eine Route für drei Dinge, weil sie alle im selben Takt laufen: Das
 * Mitgehörte kommt herein, die Mitschrift wird gesichert, Hinweise gehen
 * zurück. Drei Routen hießen drei Anfragen alle paar Sekunden.
 */

async function zugang(terminId: string) {
  const actor = await getActor();
  if (!actor) return { fehler: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) };

  const termin = await db.appointment.findUnique({
    where: { id: terminId },
    select: {
      id: true,
      title: true,
      startTime: true,
      companyId: true,
      gastName: true,
      company: { select: { id: true, name: true } },
      besprechung: { select: { id: true } },
    },
  });
  if (!termin) {
    return { fehler: NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 }) };
  }

  /*
    Der Kunde darf dem Gespräch beitreten, aber nicht an seinem Beistand
    mitschreiben. Hinweise und Mitschrift sind intern — sie stehen voller
    Dinge, die im Gespräch bewusst nicht gesagt werden.
  */
  if (actor.role === "CLIENT") {
    return { fehler: NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 }) };
  }

  return { actor, termin };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ terminId: string }> }
) {
  const { terminId } = await params;
  const geprueft = await zugang(terminId);
  if ("fehler" in geprueft) return geprueft.fehler;

  const body = (await req.json().catch(() => ({}))) as {
    /** Neu Mitgehörtes seit dem letzten Mal. */
    gesagt?: string;
    /** Die Mitschrift im Ganzen — sie ist kurz genug dafür. */
    mitschrift?: string;
    /** Soll ein Hinweis angefragt werden? */
    hinweisBitte?: boolean;
    bereitsGesagt?: string[];
    bisherigeLage?: string[];
    /** Soll das Protokoll auf den neuesten Stand gebracht werden? */
    protokollBitte?: boolean;
  };

  const besprechung = await db.besprechung.upsert({
    where: { appointmentId: terminId },
    create: { appointmentId: terminId },
    update: {},
    select: {
      id: true, ziel: true, vorbereitung: true, transkript: true,
      mitschrift: true, freigegebenAm: true,
    },
  });

  const neu = (body.gesagt ?? "").trim();
  if (neu || typeof body.mitschrift === "string") {
    await db.besprechung.update({
      where: { id: besprechung.id },
      data: {
        ...(neu
          ? {
              // Anhängen, nicht ersetzen: Der Browser schickt nur das Neue.
              transkript: `${besprechung.transkript}${besprechung.transkript ? "\n" : ""}${neu}`,
            }
          : {}),
        ...(typeof body.mitschrift === "string" ? { mitschrift: body.mitschrift } : {}),
      },
    });
  }

  if (!body.hinweisBitte && !body.protokollBitte) {
    return NextResponse.json({ ok: true, hinweise: [] });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, hinweise: [], ohneModell: true });
  }

  const mitschrift =
    typeof body.mitschrift === "string" ? body.mitschrift : besprechung.mitschrift;
  const transkript = `${besprechung.transkript}${besprechung.transkript && neu ? "\n" : ""}${neu}`;

  /*
    Beistand und Protokoll laufen nebeneinander.

    Beides braucht das Modell, und beides darf das andere nicht aufhalten:
    Das Protokoll ist der langsamere Teil, der Hinweis der dringendere.
  */
  const [beistand, protokoll] = await Promise.all([
    body.hinweisBitte
      ? hinweise({
          ziel: besprechung.ziel,
          vorbereitung: besprechung.vorbereitung,
          letztes: neu,
          bereitsGesagt: (body.bereitsGesagt ?? []).slice(-6),
          bisherigeLage: (body.bisherigeLage ?? []).slice(-4),
        }).catch((fehler) => {
          // Mitten im Gespräch ist ein Fehler die schlechteste aller Antworten.
          console.error("[besprechung] Hinweis fehlgeschlagen:", fehler);
          return { lage: null, hinweise: [] };
        })
      : Promise.resolve({ lage: null, hinweise: [] }),
    body.protokollBitte && (transkript.trim() || mitschrift.trim())
      ? schreibeProtokoll({
          titel: geprueft.termin.title,
          beginn: geprueft.termin.startTime,
          firma: gegenueber(geprueft.termin).name,
          teilnehmer: [],
          ziel: besprechung.ziel,
          transkript,
          notizen: mitschrift,
        }).catch((fehler) => {
          console.error("[besprechung] Zwischenstand fehlgeschlagen:", fehler);
          return null;
        })
      : Promise.resolve(null),
  ]);

  /*
    Der Zwischenstand überschreibt nichts Freigegebenes.

    Was der Kunde schon lesen darf, ist durchgesehen worden. Ein Entwurf,
    der sich im Hintergrund darüberschreibt, nimmt dieser Durchsicht ihren
    Sinn.
  */
  if (protokoll && !besprechung.freigegebenAm) {
    await db.besprechung.update({
      where: { id: besprechung.id },
      data: { protokoll, protokollAm: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    lage: beistand.lage,
    hinweise: beistand.hinweise,
    protokoll: protokoll ?? undefined,
  });
}
