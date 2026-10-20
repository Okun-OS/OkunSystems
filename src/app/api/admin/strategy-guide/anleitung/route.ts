import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { findePosten, speichereAnleitung } from "@/lib/strategy-guide/anleitung";
import { lebenszeichen } from "@/lib/strom";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * POST /api/admin/strategy-guide/anleitung
 *
 * Erzeugt die Umsetzungsanleitung zu einem Posten und legt sie ab.
 *
 * Bewusst einzeln und auf Abruf: Die meisten Posten werden nie gebaut, und
 * eine Anleitung für jeden im Voraus zu schreiben, kostet jedes Mal das
 * Vielfache eines Leitfadens.
 *
 * Body: { sessionId: string, schluessel: string }
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
    schluessel?: string;
  };
  if (!body.sessionId || !body.schluessel) {
    return NextResponse.json(
      { error: "sessionId oder schluessel fehlt" },
      { status: 400 }
    );
  }

  const posten = await findePosten(body.sessionId, body.schluessel);
  if (!posten) {
    return NextResponse.json(
      { error: "Diesen Posten gibt es in der neuesten Fassung des Leitfadens nicht." },
      { status: 404 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY ist nicht gesetzt." },
      { status: 503 }
    );
  }

  // Als Strom, aus demselben Grund wie beim Leitfaden: Eine Anfrage, über die
  // minutenlang nichts fließt, wird unterwegs für tot gehalten.
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
        const anleitung = await speichereAnleitung({
          sessionId: body.sessionId!,
          posten,
          userId: actor.id,
        });
        schreibe({ status: "fertig", anleitung });
      } catch (err) {
        console.error("[anleitung]", err);
        schreibe({
          status: "fehler",
          error:
            err instanceof Error
              ? err.message
              : "Die Anleitung konnte nicht erzeugt werden.",
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
      "X-Accel-Buffering": "no",
    },
  });
}


/**
 * GET /api/admin/strategy-guide/anleitung?sessionId=…&schluessel=…
 *
 * Sagt, ob zu diesem Posten bereits eine Anleitung abgelegt ist und wann.
 *
 * Fürs Nachsehen nach einem Verbindungsabbruch: Der Server arbeitet weiter
 * und legt ab, nur die Antwort kommt nicht mehr an.
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
  const schluessel = req.nextUrl.searchParams.get("schluessel");
  if (!sessionId || !schluessel) {
    return NextResponse.json(
      { error: "sessionId oder schluessel fehlt" },
      { status: 400 }
    );
  }

  const abgelegt = await db.umsetzungsAnleitung.findUnique({
    where: { sessionId_schluessel: { sessionId, schluessel } },
    select: { updatedAt: true },
  });

  return NextResponse.json({ stand: abgelegt?.updatedAt.toISOString() ?? null });
}
