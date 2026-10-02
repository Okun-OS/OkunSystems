import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
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
 * Nur für Admin. Der Leitfaden sagt, wie man dem Kunden etwas verkauft, und
 * darf ihn nie erreichen. Ein CLOSER käme an die Seite ohnehin nicht heran —
 * seine äußere Schranke endet bei `/admin/sales` —, und eine Rolle, die die
 * Seite nicht sehen darf, soll auch die Schnittstelle dahinter nicht
 * erreichen.
 *
 * Body: { sessionId: string, anweisung?: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const user = session.user as { id?: string; role?: string };
  if (user.role !== "ADMIN") {
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
      userId: user.id!,
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
