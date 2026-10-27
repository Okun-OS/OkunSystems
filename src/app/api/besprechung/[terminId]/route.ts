import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { hinweise } from "@/lib/termine/beistand";

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
    select: { id: true, companyId: true, besprechung: { select: { id: true } } },
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
  };

  const besprechung = await db.besprechung.upsert({
    where: { appointmentId: terminId },
    create: { appointmentId: terminId },
    update: {},
    select: { id: true, ziel: true, vorbereitung: true, transkript: true },
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

  if (!body.hinweisBitte) return NextResponse.json({ ok: true, hinweise: [] });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, hinweise: [], ohneModell: true });
  }

  try {
    const gefunden = await hinweise({
      ziel: besprechung.ziel,
      vorbereitung: besprechung.vorbereitung,
      letztes: neu,
      bereitsGesagt: (body.bereitsGesagt ?? []).slice(-6),
    });
    return NextResponse.json({ ok: true, hinweise: gefunden });
  } catch (fehler) {
    // Mitten im Gespräch ist ein Fehler die schlechteste aller Antworten.
    console.error("[besprechung] Hinweis fehlgeschlagen:", fehler);
    return NextResponse.json({ ok: true, hinweise: [] });
  }
}
