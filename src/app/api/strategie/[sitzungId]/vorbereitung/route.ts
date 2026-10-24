import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { ladeKontext } from "@/lib/vorbereitung/laden";
import { fuehreZug, ladeVerlauf } from "@/lib/vorbereitung/gespraech";

/**
 * Ein Zug im Vorbereitungsgespräch.
 *
 * Bewusst keine Streaming-Antwort: Ein Zug besteht hier meist aus mehreren
 * Runden mit Werkzeugen dazwischen, und was den Berater interessiert, ist das
 * Ergebnis samt der Liste dessen, was sich geändert hat. Ein Zeichenstrom
 * würde das Warten hübscher machen und die Seite deutlich komplizierter.
 *
 * Dauern darf es: Recherche und mehrere Werkzeugrunden brauchen Zeit.
 */
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sitzungId: string }> }
) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!mayDoStrategy(actor.role, actor.canStrategy)) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { sitzungId } = await params;
  const { frage } = (await req.json().catch(() => ({}))) as { frage?: string };
  const text = frage?.trim();
  if (!text) return NextResponse.json({ error: "Keine Frage" }, { status: 400 });

  const kontext = await ladeKontext(sitzungId, actor.name ?? "der Berater");
  if (!kontext) return NextResponse.json({ error: "Sitzung nicht gefunden" }, { status: 404 });

  const verlauf = await ladeVerlauf(sitzungId);

  // Die Frage wird vor dem Aufruf gespeichert: Bricht der Zug ab, steht sie
  // trotzdem im Verlauf, statt verloren zu sein.
  await db.vorbereitungsNachricht.create({
    data: { sitzungId, rolle: "user", inhalt: text },
  });

  try {
    const zug = await fuehreZug(
      sitzungId,
      kontext,
      verlauf.map((n) => ({ rolle: n.rolle, inhalt: n.inhalt })),
      text
    );

    await db.vorbereitungsNachricht.create({
      data: {
        sitzungId,
        rolle: "assistant",
        inhalt: zug.text,
        werkzeuge: JSON.stringify(zug.werkzeuge),
      },
    });

    return NextResponse.json({ text: zug.text, werkzeuge: zug.werkzeuge });
  } catch (fehler) {
    console.error("[vorbereitung] Zug fehlgeschlagen:", fehler);
    const hinweis =
      "Der Zug ist fehlgeschlagen. Die Frage steht im Verlauf — bitte erneut versuchen.";
    await db.vorbereitungsNachricht.create({
      data: { sitzungId, rolle: "assistant", inhalt: hinweis },
    });
    return NextResponse.json({ text: hinweis, werkzeuge: [] }, { status: 200 });
  }
}
