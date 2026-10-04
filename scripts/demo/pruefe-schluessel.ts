/**
 * Prueft den Schluessel der Umsetzungsanleitung: Er muss denselben Posten
 * wiederfinden, auch wenn der Leitfaden neu geschrieben wurde, und
 * verschiedene Posten auseinanderhalten.
 */
import { anleitungsSchluessel } from "@/lib/strategy-guide/schluessel";

let fehler = 0;
const pruefe = (was: string, ok: boolean, zusatz = "") => {
  console.log(`${ok ? "  ok  " : "FEHLT "} ${was}${zusatz ? ` — ${zusatz}` : ""}`);
  if (!ok) fehler++;
};

const a = anleitungsSchluessel("Digitale Grundlagen", "Zentrale Ablage für Berichte");
const b = anleitungsSchluessel("Digitale Grundlagen", "Zentrale Ablage für Berichte");
const c = anleitungsSchluessel("Digitale Grundlagen", "Aufgabenverwaltung");
const d = anleitungsSchluessel("OKUN Workforce", "Zentrale Ablage für Berichte");

pruefe("gleicher Posten, gleicher Schluessel", a === b, a);
pruefe("anderer Titel, anderer Schluessel", a !== c);
pruefe("anderer Block, anderer Schluessel", a !== d);
pruefe("keine Umlaute", !/[äöüß]/.test(a));
pruefe("nur was in eine Adresse passt", /^[a-z0-9|-]+$/.test(a));
pruefe("Laenge begrenzt",
  anleitungsSchluessel("A".repeat(200), "B".repeat(200)).length <= 180);
pruefe("leere Eingabe ergibt leeren Schluessel", anleitungsSchluessel("", "") === "");

console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
