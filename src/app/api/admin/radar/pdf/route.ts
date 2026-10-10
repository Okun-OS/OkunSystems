import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { renderHtmlToPdf } from "@/lib/blueprint/pdf-generator";
import { PROFIL_FELDER } from "@/lib/radar/catalog";
import { ladeRadar } from "@/lib/radar/service";
import { kundenErgebnis } from "@/lib/radar/views";
import { renderRadarReportHtml } from "@/lib/radar/report-html";

export const dynamic = "force-dynamic";

/**
 * Der Ergebnisbericht als PDF.
 *
 * Anders als der interne Leitfaden ist dieses Papier für den Kunden bestimmt
 * — es enthält deshalb genau das, was auch auf seinem Bildschirm stand, und
 * nichts darüber hinaus: Es wird aus `kundenErgebnis` gerendert, derselben
 * Sicht wie die Bildschirmdarstellung. Belege je Achse, Stufenbegründung,
 * Widersprüche und interne Notizen können hier gar nicht landen.
 *
 * Zugang haben Admins sowie der Closer, dem das Gespräch gehört.
 */
export async function GET(request: NextRequest) {
  const radarSessionId = request.nextUrl.searchParams.get("radarSessionId");
  if (!radarSessionId) {
    return NextResponse.json({ error: "radarSessionId fehlt" }, { status: 400 });
  }

  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const datensatz = await ladeRadar(radarSessionId);
  if (!datensatz) return NextResponse.json({ error: "Analyse nicht gefunden" }, { status: 404 });

  // Ein Closer kommt nur an seine eigenen Gespräche.
  if (actor.role === "CLOSER") {
    const session = await db.closingSession.findUnique({
      where: { id: datensatz.closingSessionId },
      select: { closerId: true },
    });
    if (session?.closerId !== actor.id) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }
  }

  if (!datensatz.ergebnis) {
    return NextResponse.json({ error: "Es liegt noch keine Auswertung vor." }, { status: 409 });
  }

  const groesseFeld = PROFIL_FELDER.find((f) => f.key === "groesse");
  const groesseKey = datensatz.profil.groesse;
  const groesse =
    typeof groesseKey === "string"
      ? (groesseFeld?.optionen?.find((o) => o.key === groesseKey)?.label ?? null)
      : null;
  const branche = typeof datensatz.profil.branche === "string" ? datensatz.profil.branche : null;
  const firma =
    typeof datensatz.profil.firma === "string" && datensatz.profil.firma.trim()
      ? datensatz.profil.firma
      : datensatz.companyName;

  const html = renderRadarReportHtml({
    ergebnis: kundenErgebnis(datensatz.ergebnis, datensatz.ergebnisAm ?? datensatz.erstelltAm),
    companyName: firma,
    branche,
    groesse: groesse ? `${groesse} Mitarbeitende` : null,
    closerName: datensatz.closerName,
  });

  const pdf = await renderHtmlToPdf(html);
  const name = `OKUN-Radar_${firma.replace(/[^\w\-]+/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
