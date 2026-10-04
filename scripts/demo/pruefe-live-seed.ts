/**
 * Prueft die Bibliothek hinter dem Demo-Knopf: anlegen, nachzaehlen,
 * entfernen, nachsehen dass nichts uebrig bleibt.
 */
import "./guard";
import { db } from "@/lib/db";
import { seedNordlicht, entferneNordlicht, DEMO_FIRMA } from "@/lib/demo/nordlicht";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";

let fehler = 0;
function pruefe(was: string, bedingung: boolean, zusatz = "") {
  console.log(`${bedingung ? "  ok  " : "FEHLT "} ${was}${zusatz ? ` — ${zusatz}` : ""}`);
  if (!bedingung) fehler++;
}

async function main() {
  console.log("── Anlegen ──");
  const r = await seedNordlicht();
  pruefe("Unternehmen angelegt", !!r.companyId);
  pruefe("Sitzung angelegt", !!r.sessionId);
  pruefe("Fragen beantwortet", r.beantwortet > 50, `${r.beantwortet}`);

  const firma = await db.company.findUnique({ where: { id: r.companyId } });
  pruefe("Name traegt den Demo-Zusatz", firma?.name === DEMO_FIRMA, firma?.name ?? "—");

  const konten = await db.user.count({ where: { companyId: r.companyId } });
  pruefe("keine Benutzerkonten angelegt", konten === 0, `${konten}`);

  const daten = await assembleBlueprintReport(r.sessionId);
  pruefe("Auswertung rechnet durch", daten.totalScore > 0, `Gesamtwert ${daten.totalScore}`);
  const p3 = daten.pillar3;
  pruefe("dritte Saeule hat Daten", p3?.hasData === true);
  pruefe("sechs Aufgaben erfasst", (p3?.tasks.entries.length ?? 0) === 6,
    `${p3?.tasks.entries.length ?? 0}`);
  pruefe("Stunden gerechnet", (p3?.tasks.totalHoursPerMonth ?? 0) > 50,
    `${p3?.tasks.totalHoursPerMonth ?? 0} h/Monat`);
  pruefe("Ablaufreife gerechnet", (p3?.flowMaturity ?? -1) >= 0,
    `${p3?.flowMaturity ?? "—"} von 100`);
  pruefe("Systeme erfasst", (p3?.systems.systemCount ?? 0) >= 8, `${p3?.systems.systemCount ?? 0}`);
  pruefe("Luecke bei der Kundenverwaltung sichtbar",
    (p3?.systems.gaps.length ?? 0) > 0, `${p3?.systems.gaps.length ?? 0} Luecken`);
  pruefe("Medienbrueche erkannt", (p3?.systems.mediaBreaks.length ?? 0) > 0,
    `${p3?.systems.mediaBreaks.length ?? 0}`);
  pruefe("Empfehlungen erzeugt", daten.recommendations.length > 0,
    `${daten.recommendations.length}`);
  pruefe("Paket haengt an der Sitzung", daten.packageType === "operations",
    daten.packageType ?? "—");

  console.log("\n── Zweimal anlegen erzeugt keine zweite Firma ──");
  await seedNordlicht();
  const anzahl = await db.company.count({ where: { name: { contains: "Nordlicht" } } });
  pruefe("genau eine Demo-Firma", anzahl === 1, `${anzahl}`);

  console.log("\n── Entfernen ──");
  const weg = await entferneNordlicht();
  pruefe("Entfernen meldet Erfolg", weg === 1, `${weg}`);
  pruefe("keine Firma mehr da",
    (await db.company.count({ where: { name: { contains: "Nordlicht" } } })) === 0);
  pruefe("keine Sitzung mehr da",
    (await db.analysisSession.count({ where: { company: { name: { contains: "Nordlicht" } } } })) === 0);

  console.log("\n── Entfernen ohne Daten ──");
  pruefe("meldet null statt zu scheitern", (await entferneNordlicht()) === 0);

  console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
  await db.$disconnect();
  process.exit(fehler === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); process.exit(1); });
