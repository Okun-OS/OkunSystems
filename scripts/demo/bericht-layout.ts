/**
 * Rendert den Kundenbericht mit Platzhaltertexten.
 *
 * Prueft den Weg Daten -> HTML -> PDF, ohne das Modell zu bemuehen. Die Texte
 * sind erfunden; beurteilt werden kann damit nur der Satz, nicht der Inhalt.
 */
import "./guard";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import type { ReportTexts } from "@/lib/blueprint/report-text-engine";
import { renderReportHtml } from "@/lib/blueprint/report-html";
import { renderHtmlToPdf, closePdfBrowser } from "@/lib/blueprint/pdf-generator";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

const fuell = (n: number, s: string) => Array.from({ length: n }, () => s).join(" ");

async function main() {
  const s = await db.analysisSession.findFirst({
    where: { company: { name: { contains: "Nordlicht" } }, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  if (!s) throw new Error("Keine Sitzung gefunden.");

  const daten = await assembleBlueprintReport(s.id);

  const module: Record<number, string> = {};
  const detail: Record<number, string> = {};
  for (const m of daten.moduleScores) {
    module[m.moduleNumber] = fuell(4, `PLATZHALTER Einschaetzung zu ${m.label}.`);
    detail[m.moduleNumber] = fuell(14, `PLATZHALTER Ausfuehrung zu ${m.label}.`);
  }

  const texte: ReportTexts = {
    einleitungText: fuell(18, "PLATZHALTER Einleitung."),
    executiveSummary: fuell(14, "PLATZHALTER Zusammenfassung."),
    contextPageText: fuell(16, "PLATZHALTER Unternehmenskontext."),
    scoreAnalysis: fuell(20, "PLATZHALTER Deutung des Gesamtwerts."),
    moduleInsights: module,
    moduleDetailedAnalysis: detail,
    conclusionText: fuell(18, "PLATZHALTER Schluss."),
    orientationText: fuell(12, "PLATZHALTER Einordnung."),
  };

  let logo = "";
  try {
    logo = `data:image/png;base64,${fs
      .readFileSync(path.join(process.cwd(), "public", "okun-logo.png"))
      .toString("base64")}`;
  } catch {
    // ohne Logo weiter
  }

  const pdf = await renderHtmlToPdf(renderReportHtml(daten, texte, logo));
  const ziel = process.argv[2] ?? "/tmp/bericht-layout.pdf";
  fs.writeFileSync(ziel, pdf);
  console.log(`Module: ${daten.moduleScores.length} · Empfehlungen: ${daten.recommendations.length}`);
  console.log(`PDF: ${ziel} — ${pdf.length} Bytes`);
  await closePdfBrowser();
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await closePdfBrowser().catch(() => {});
  process.exit(1);
});
