import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { speichereNeueFassung } from "@/lib/strategy-guide/service";
import { lebenszeichen } from "@/lib/strom";

export const runtime = "nodejs";
/**
 * Erzeugen, Prüfen und eventuelle Korrekturrunden dauern zusammen mehrere
 * Minuten. Derselbe Rahmen wie bei der Berichtserstellung.
 */
export const maxDuration = 600;

/**
 * POST /api/admin/strategy-guide
 *
 * Erzeugt eine neue Fassung des Leitfadens für das Strategiegespräch.
 *
 * Zugang hat, wer Strategiegespräche führen darf. Geprüft wird gegen die
 * Datenbank, nicht gegen das JWT — wer die Seite nicht sehen darf, soll auch
 * die Schnittstelle dahinter nicht erreichen, und ein gerade entzogenes Recht
 * soll nicht bis zur nächsten Anmeldung fortwirken.
 *
 * Body: { sessionId: string, anweisung?: string }
 */
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  if (!mayDoStrategy(actor.role, actor.canStrategy)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    anweisung?: string;
  };
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId fehlt" }, { status: 400 });
  }

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: body.sessionId },
    select: { id: true, companyId: true, status: true, blueprintVersion: true },
  });
  if (!analysisSession) {
    return NextResponse.json({ error: "Sitzung nicht gefunden" }, { status: 404 });
  }
  if (analysisSession.blueprintVersion !== "2.0") {
    return NextResponse.json(
      { error: "Der Leitfaden setzt eine Blueprint-2.0-Sitzung voraus." },
      { status: 400 }
    );
  }
  if (analysisSession.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Der Blueprint ist noch nicht abgeschlossen." },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ist nicht gesetzt." },
      { status: 503 }
    );
  }

  // Die Antwort kommt als Strom, nicht am Stück.
  //
  // Die Erzeugung dauert Minuten. Wartet der Browser die ganze Zeit auf eine
  // Antwort, über die kein einziges Byte fließt, hält irgendwer unterwegs die
  // Verbindung für tot und schneidet sie ab — der Kollege sah "Failed to
  // fetch", obwohl der Server weiterarbeitete. Ein Lebenszeichen alle zehn
  // Sekunden verhindert das, und nebenbei sieht man, dass noch etwas läuft.
  const encoder = new TextEncoder();
  const strom = new ReadableStream({
    async start(controller) {
      let offen = true;
      const schreibe = (o: unknown) => {
        if (!offen) return;
        controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      };

      schreibe({ status: "gestartet" });
      const puls = setInterval(() => {
        // Nicht über schreibe(), weil das Lebenszeichen seine Füllung braucht,
        // um durch den Komprimierer zu kommen.
        if (offen) controller.enqueue(encoder.encode(lebenszeichen()));
      }, 10_000);

      try {
        const { version, ergebnis } = await speichereNeueFassung({
          sessionId: analysisSession.id,
          companyId: analysisSession.companyId,
          userId: actor.id,
          anweisung: body.anweisung?.trim() || null,
        });
        schreibe({
          status: "fertig",
          version,
          document: ergebnis.document,
          protokoll: ergebnis.protokoll,
          runden: ergebnis.runden,
        });
      } catch (err) {
        console.error("[strategy-guide]", err);
        schreibe({
          status: "fehler",
          error:
            err instanceof Error
              ? err.message
              : "Der Leitfaden konnte nicht erzeugt werden.",
        });
      } finally {
        clearInterval(puls);
        offen = false;
        controller.close();
      }
    },
  });

  return new Response(strom, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // Bittet Vermittler, nichts zu puffern — sonst kommt das Lebenszeichen
      // erst mit der fertigen Antwort an und hilft nicht.
      "X-Accel-Buffering": "no",
    },
  });
}


/**
 * GET /api/admin/strategy-guide?sessionId=…
 *
 * Sagt, welche Fassung zuletzt abgelegt wurde.
 *
 * Gedacht fürs Nachsehen, wenn die Verbindung während der Erzeugung
 * abgerissen ist: Der Server arbeitet weiter und legt die Fassung ab, nur
 * die Antwort kommt nicht mehr an. Statt dem Kollegen einen Fehler zu
 * zeigen, der keiner ist, fragt die Seite hier nach.
 */
export async function GET(req: NextRequest) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  if (!mayDoStrategy(actor.role, actor.canStrategy)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId fehlt" }, { status: 400 });
  }

  const guide = await db.strategyGuide.findUnique({
    where: { sessionId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });

  return NextResponse.json({ version: guide?.versions[0]?.version ?? 0 });
}
