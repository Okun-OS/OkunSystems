import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { renderGuideHtml } from "@/lib/strategy-guide/html";
import { renderHtmlToPdf } from "@/lib/blueprint/pdf-generator";
import type { ProtokollEintrag } from "@/lib/strategy-guide/types";
import { leseGuide } from "@/lib/strategy-guide/normalisieren";

// Puppeteer läuft nicht in der Edge-Laufzeit.
export const runtime = "nodejs";
export const maxDuration = 120;

/** Dateiname ohne Umlaute und Sonderzeichen, für den ASCII-Teil des Headers. */
function asciiName(s: string): string {
  return (
    s
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
      .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
      .replace(/ß/g, "ss")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "Leitfaden"
  );
}

/**
 * GET /api/admin/strategy-guide/pdf?sessionId=…&version=…
 *
 * Liefert eine Fassung des Leitfadens als PDF zum Herunterladen.
 *
 * Bewusst kein Upload nach R2 und kein Document-Eintrag, anders als beim
 * Kundenbericht: Der Leitfaden ist eine interne Unterlage. Eine öffentlich
 * abrufbare Adresse dafür wäre ein Weg, auf dem er beim Kunden landen kann —
 * weitergeleitet, in eine Mail kopiert, aus der Dokumentenliste geteilt. Die
 * Datei entsteht deshalb bei jedem Abruf neu und kommt nur durch diese
 * Schnittstelle, hinter derselben Rechteprüfung wie die Seite selbst.
 *
 * Ohne version wird die neueste Fassung genommen.
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

  const versionParam = req.nextUrl.searchParams.get("version");
  const gewuenschteVersion = versionParam ? Number(versionParam) : null;
  if (versionParam && !Number.isInteger(gewuenschteVersion)) {
    return NextResponse.json({ error: "version ist keine Zahl" }, { status: 400 });
  }

  const guide = await db.strategyGuide.findUnique({
    where: { sessionId },
    include: {
      versions: {
        where: gewuenschteVersion !== null ? { version: gewuenschteVersion } : undefined,
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  const fassung = guide?.versions[0];
  if (!fassung) {
    return NextResponse.json(
      { error: "Für diese Sitzung gibt es noch keinen Leitfaden." },
      { status: 404 }
    );
  }

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: {
      packageType: true,
      completedAt: true,
      company: { select: { name: true } },
    },
  });
  if (!analysisSession) {
    return NextResponse.json({ error: "Sitzung nicht gefunden" }, { status: 404 });
  }

  const doc = leseGuide(fassung.content);
  if (!doc) {
    return NextResponse.json(
      { error: "Die gespeicherte Fassung ist beschädigt." },
      { status: 500 }
    );
  }

  // Ein beschädigtes Protokoll ist kein Grund, das PDF zu verweigern — der
  // Leitfaden selbst ist der Zweck, die Tabelle fällt dann eben weg.
  let protokoll: ProtokollEintrag[] = [];
  try {
    const roh = JSON.parse(fassung.reviewLog);
    if (Array.isArray(roh)) protokoll = roh as ProtokollEintrag[];
  } catch {
    protokoll = [];
  }

  const companyName = analysisSession.company?.name ?? "Unbekanntes Unternehmen";

  try {
    const html = renderGuideHtml({
      doc,
      protokoll,
      companyName,
      packageType: analysisSession.packageType,
      version: fassung.version,
      erstelltAm: fassung.createdAt,
      blueprintAbgeschlossen: analysisSession.completedAt,
    });
    const pdf = await renderHtmlToPdf(html);

    const name = `Leitfaden-${asciiName(companyName)}-Fassung-${fassung.version}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.length),
        "Content-Disposition": `attachment; filename="${name}"`,
        // Interne Unterlage: nichts davon soll in einem Zwischenspeicher liegen.
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    console.error("[strategy-guide/pdf]", err);
    return NextResponse.json(
      { error: "Das PDF konnte nicht erzeugt werden." },
      { status: 500 }
    );
  }
}
