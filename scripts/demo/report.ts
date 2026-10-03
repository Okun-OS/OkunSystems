import "./guard";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { buildDossier } from "@/lib/strategy-guide/dossier";
import { formatHours } from "@/lib/blueprint/pillar3-engine";
import { db } from "@/lib/db";

async function main() {
  const s = await db.analysisSession.findFirst({
    where: { company: { name: { contains: "Nordlicht" } } },
    select: { id: true },
  });
  const d = await assembleBlueprintReport(s!.id);

  console.log("═══ AUSWERTUNG ═══\n");
  console.log(`Unternehmen:  ${d.company.name}`);
  console.log(`Branche:      ${d.company.industry}`);
  console.log(`Paket:        ${d.packageType}`);
  console.log(`Beantwortet:  ${d.totalAnswered} von ${d.totalActive}`);
  console.log(`\nGESAMTWERT:   ${d.totalScore} / 100\n`);

  console.log("Module:");
  for (const m of d.moduleScores) {
    const balken = "█".repeat(Math.round(m.score / 4)).padEnd(25, "·");
    console.log(`  ${m.label.padEnd(22)} ${balken} ${String(m.score).padStart(3)}  (Gewicht ${Math.round(m.weight*100)}%, Beitrag ${m.contribution.toFixed(1)})`);
  }
  if (d.skippedGroups.length) console.log(`\n  Nicht bewertet (betrifft den Betrieb nicht): ${d.skippedGroups.join(", ")}`);

  console.log(`\nSignale:  Workforce ${d.signals.WORKFORCE} · Bewährte Lösungen ${d.signals.BEWAEHRTE_LOESUNG} · Individualentwicklung ${d.signals.CUSTOM_DEVELOPMENT}`);

  const p3 = d.pillar3!;
  console.log(`\n═══ SÄULE 3 ═══\n`);
  console.log(`Systeme: ${p3.systems.systemCount}   Reifegrad der Abläufe: ${p3.flowMaturity}/100`);
  console.log(`\nAufgaben — zusammen ${formatHours(p3.tasks.totalHoursPerMonth)} Stunden im Monat:`);
  for (const t of p3.tasks.entries.sort((a,b)=>b.hoursPerMonth-a.hoursPerMonth)) {
    console.log(`  ${formatHours(t.hoursPerMonth).padStart(6)} h   ${t.task.label}${t.isHandoffCandidate ? "   [Übergabe von Hand]" : ""}`);
  }
  if (p3.systems.mediaBreaks.length) {
    console.log(`\nMedienbrüche:`);
    for (const m of p3.systems.mediaBreaks) console.log(`  ${m.purposeLabel}: ${m.systemNames.join(" + ")}`);
  }
  if (p3.systems.gaps.length) console.log(`\nLücken (kein System): ${p3.systems.gaps.map(g=>g.purposeLabel).join(", ")}`);
  if (p3.systems.overloaded.length) console.log(`Überladen: ${p3.systems.overloaded.map(o=>`${o.name} (${o.purposeCount})`).join(", ")}`);
  for (const f of p3.flows.findings) {
    console.log(`\nAblauf „${f.flow.title}“: ${f.manualStations}/${f.relevantStations} Stationen von Hand (${f.manualShare} %), ${f.systemSwitches} Programmwechsel`);
    if (f.carrier) console.log(`  getragen von: ${f.carrier.role} (${f.carrier.stations} Stationen)`);
  }

  console.log(`\n═══ EMPFEHLUNGEN ═══\n`);
  for (const r of d.recommendations) {
    console.log(`  ${r.beyondPackage ? "[über Paket] " : "             "}${r.name}  (${r.category}, Treffer ${r.signalScore})`);
  }
  console.log(`\nRoadmap:`);
  for (const ph of d.roadmap) {
    console.log(`  ${ph.phaseLabel}${ph.beyondPackage ? "  ←  AUFPREIS" : ""}`);
    for (const sol of ph.solutions) console.log(`      · ${sol.name}`);
  }

  const dossier = buildDossier(d, null);
  console.log(`\n═══ FAKTENGRUNDLAGE FÜR DEN LEITFADEN ═══`);
  console.log(`${dossier.length} Zeichen, ${d.answers.length} Antworten im Wortlaut, ${d.answers.filter(a=>a.freeText).length} davon mit Freitext`);
  process.exit(0);
}
main();
