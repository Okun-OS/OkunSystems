/**
 * Prueft den Druckbogen des Leitfadens: rendert eine erfundene Fassung nach
 * PDF und schaut nach, ob die Warnzeile auf jeder Seite steht.
 */
import { renderGuideHtml } from "@/lib/strategy-guide/html";
import { renderHtmlToPdf, closePdfBrowser } from "@/lib/blueprint/pdf-generator";
import type { GuideDocument, ProtokollEintrag } from "@/lib/strategy-guide/types";
import fs from "fs";

const lang = (n: number, s: string) => Array.from({ length: n }, () => s).join(" ");

const doc: GuideDocument = {
  befund:
    "Nordlicht arbeitet sauber, aber doppelt. " +
    lang(12, "Jede Serviceleistung wird einmal auf Papier und einmal im Buero erfasst."),
  gespraechseinstieg:
    "Ich fange mit einer Zahl an, die mir aufgefallen ist.\n\n" +
    lang(10, "Ihre Monteure schreiben Berichte, die jemand im Buero noch einmal abtippt."),
  kernbefunde: [
    { titel: "Serviceberichte werden zweimal erfasst", beleg: "32,5 Stunden im Monat", wirkung: lang(8, "Das ist eine Dreiviertelstelle, die nur abtippt.") },
    { titel: "Vier Medienbrueche in der Auftragskette", beleg: "4 Bruchstellen zwischen 5 Systemen", wirkung: lang(8, "An jeder Stelle kann etwas liegenbleiben.") },
    { titel: "Sieben von acht Stationen laufen von Hand", beleg: "Ablaufreife 12 von 100", wirkung: lang(8, "Der Ablauf haengt an Zuruf statt an einem System.") },
  ],
  expertise: lang(25, "Der Engpass sitzt nicht im Buero, sondern an der Schnittstelle zum Fahrzeug."),
  empfehlung: lang(30, "Zuerst die Erfassung am Einsatzort, dann die Rechnungsstellung, zuletzt die Auswertung."),
  customVorschlaege: [
    { titel: "Serviceerfassung auf dem Telefon", aufhaenger: "32,5 Stunden Abtippen im Monat", idee: lang(14, "Der Monteur erfasst direkt vor Ort."), nutzen: lang(10, "Die Daten sind abends im System."), groessenordnung: "mittleres Custom-Projekt", geprueftInRunde: 1 },
    { titel: "Rechnungslauf aus den Berichten", aufhaenger: "4 Medienbrueche bis zur Rechnung", idee: lang(14, "Aus dem Bericht entsteht der Rechnungsentwurf."), nutzen: lang(10, "Die Rechnung geht Tage frueher raus."), groessenordnung: "groesseres Custom-Projekt", geprueftInRunde: 2 },
  ],
  einwaende: [
    { einwand: "Meine Leute koennen das nicht.", antwort: lang(12, "Wer ein Telefon bedienen kann, kann das auch.") },
    { einwand: "Das ist zu teuer.", antwort: lang(12, "32,5 Stunden im Monat sind auch ein Preis.") },
    { einwand: "Wir haben dafuer keine Zeit.", antwort: lang(12, "Die Einfuehrung kostet weniger Zeit als ein Monat Abtippen.") },
  ],
  abschluss: lang(20, "Am Ende steht ein Termin fuer den Zuschnitt des ersten Bausteins."),
};

const protokoll: ProtokollEintrag[] = [
  { runde: 1, titel: "Serviceerfassung auf dem Telefon", bestanden: true, begruendung: lang(8, "Stuetzt sich auf die erhobene Stundenzahl.") },
  { runde: 1, titel: "Lagerprognose", bestanden: false, begruendung: lang(8, "Zu Lagerbestaenden liegen keine Daten vor.") },
  { runde: 2, titel: "Rechnungslauf aus den Berichten", bestanden: true, begruendung: lang(8, "Die Medienbrueche sind belegt.") },
];

async function main() {
  const html = renderGuideHtml({
    doc,
    protokoll,
    companyName: "Nordlicht Gebäudetechnik GmbH",
    packageType: "operations",
    version: 2,
    erstelltAm: new Date("2026-10-03T09:00:00Z"),
    blueprintAbgeschlossen: new Date("2026-09-28T12:00:00Z"),
  });
  const pdf = await renderHtmlToPdf(html);
  const ziel = process.argv[2] ?? "/tmp/leitfaden.pdf";
  fs.writeFileSync(ziel, pdf);
  console.log(`PDF: ${ziel} — ${pdf.length} Bytes`);
  await closePdfBrowser();
}

main().catch((e) => { console.error(e); process.exit(1); });
