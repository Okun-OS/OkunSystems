import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { speichereNeueFassung } from "@/lib/strategy-guide/service";

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

  try {
    const { version, ergebnis } = await speichereNeueFassung({
      sessionId: analysisSession.id,
      companyId: analysisSession.companyId,
      userId: actor.id,
      anweisung: body.anweisung?.trim() || null,
    });

    return NextResponse.json({
      version,
      document: ergebnis.document,
      protokoll: ergebnis.protokoll,
      runden: ergebnis.runden,
    });
  } catch (err) {
    console.error("[strategy-guide]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Der Leitfaden konnte nicht erzeugt werden.",
      },
      { status: 500 }
    );
  }
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
