/**
 * Der echte Durchlauf: Bericht und Leitfaden gegen das Modell erzeugen.
 *
 * Geht an R2 und am Mailversand vorbei und ruft die Bibliotheken direkt auf —
 * es soll nichts nach draussen gehen, nur zwei PDFs ins Verzeichnis.
 *
 * Braucht ANTHROPIC_API_KEY und DATABASE_URL.
 */
import "./guard";
import { db } from "@/lib/db";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { generateReportTexts } from "@/lib/blueprint/report-text-engine";
import { renderReportHtml } from "@/lib/blueprint/report-html";
import { renderHtmlToPdf, closePdfBrowser } from "@/lib/blueprint/pdf-generator";
import { speichereNeueFassung } from "@/lib/strategy-guide/service";
import { renderGuideHtml } from "@/lib/strategy-guide/html";
import fs from "fs";
import path from "path";

const ZIEL = process.argv[2] ?? "/tmp";
const NUR_LEITFADEN = process.argv.includes("--nur-leitfaden");

function uhr() {
  return new Date().toLocaleTimeString("de-DE");
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY fehlt — ohne Schluessel kein Durchlauf.");
  }

  const sitzung = await db.analysisSession.findFirst({
    where: { company: { name: { contains: "Nordlicht" } }, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true, companyId: true, packageType: true, completedAt: true, reportTexts: true },
  });
  if (!sitzung) throw new Error("Keine abgeschlossene Nordlicht-Sitzung gefunden.");

  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  if (!admin) throw new Error("Kein Administrator in der Datenbank.");

  const firma = await db.company.findUnique({
    where: { id: sitzung.companyId },
    select: { name: true },
  });

  // ── 1. Kundenbericht ───────────────────────────────────────────────────
  if (!NUR_LEITFADEN) {
    console.log(`[${uhr()}] Bericht: Daten zusammenstellen…`);
    const daten = await assembleBlueprintReport(sitzung.id);

    console.log(`[${uhr()}] Bericht: Texte erzeugen (dauert einige Minuten)…`);
    const texte = await generateReportTexts(daten);

    await db.analysisSession.update({
      where: { id: sitzung.id },
      data: { reportTexts: JSON.stringify(texte), reportTextsAt: new Date() },
    });
    console.log(`[${uhr()}] Bericht: Texte gespeichert.`);

    let logo = "";
    try {
      const p = path.join(process.cwd(), "public", "okun-logo.png");
      logo = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    } catch {
      // ohne Logo weiter
    }

    const pdf = await renderHtmlToPdf(renderReportHtml(daten, texte, logo));
    const datei = path.join(ZIEL, "bericht.pdf");
    fs.writeFileSync(datei, pdf);
    console.log(`[${uhr()}] Bericht fertig: ${datei} (${pdf.length} Bytes)`);
  } else {
    console.log(`[${uhr()}] Bericht uebersprungen.`);
  }

  // ── 2. Leitfaden ───────────────────────────────────────────────────────
  console.log(`[${uhr()}] Leitfaden: erzeugen und pruefen lassen…`);
  const { version, ergebnis } = await speichereNeueFassung({
    sessionId: sitzung.id,
    companyId: sitzung.companyId,
    userId: admin.id,
    anweisung: null,
  });

  console.log(`[${uhr()}] Leitfaden: Fassung ${version} nach ${ergebnis.runden} Runde(n).`);
  for (const e of ergebnis.protokoll) {
    console.log(`   R${e.runde} ${e.bestanden ? "bestanden " : "verworfen "} ${e.titel}`);
    console.log(`        ${e.begruendung}`);
  }

  const guideHtml = renderGuideHtml({
    doc: ergebnis.document,
    protokoll: ergebnis.protokoll,
    companyName: firma?.name ?? "Unbekannt",
    packageType: sitzung.packageType,
    version,
    erstelltAm: new Date(),
    blueprintAbgeschlossen: sitzung.completedAt,
  });
  const guidePdf = await renderHtmlToPdf(guideHtml);
  const guideDatei = path.join(ZIEL, "leitfaden-echt.pdf");
  fs.writeFileSync(guideDatei, guidePdf);
  console.log(`[${uhr()}] Leitfaden fertig: ${guideDatei} (${guidePdf.length} Bytes)`);

  fs.writeFileSync(
    path.join(ZIEL, "leitfaden-echt.json"),
    JSON.stringify({ version, ...ergebnis }, null, 2)
  );

  await closePdfBrowser();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await closePdfBrowser().catch(() => {});
  process.exit(1);
});
