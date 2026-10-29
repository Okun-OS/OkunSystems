import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { seedNordlicht, entferneNordlicht, DEMO_FIRMA } from "@/lib/demo/nordlicht";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/admin/demo
 *
 * Legt den Demo-Betrieb an oder entfernt ihn wieder.
 *
 * Nur für Administratoren, geprüft gegen die Datenbank. Closer und Leute mit
 * Strategie-Recht haben hier nichts zu suchen — das hier schreibt und löscht
 * Unternehmensdaten.
 *
 * Body: { aktion: "anlegen" | "entfernen" }
 */
export async function POST(req: NextRequest) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { aktion?: string };

  try {
    if (body.aktion === "anlegen") {
      const r = await seedNordlicht();
      return NextResponse.json({
        meldung: `${DEMO_FIRMA} angelegt — ${r.beantwortet} Fragen beantwortet.`,
        companyId: r.companyId,
        sessionId: r.sessionId,
      });
    }

    if (body.aktion === "entfernen") {
      const anzahl = await entferneNordlicht();
      return NextResponse.json({
        meldung:
          anzahl === 0
            ? "Es waren keine Demo-Daten vorhanden."
            : `${anzahl === 1 ? "Der Demo-Betrieb wurde" : `${anzahl} Demo-Betriebe wurden`} entfernt.`,
      });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  } catch (err) {
    console.error("[admin/demo]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fehlgeschlagen" },
      { status: 500 }
    );
  }
}
