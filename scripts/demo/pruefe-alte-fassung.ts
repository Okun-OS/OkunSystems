import { leseGuide } from "@/lib/strategy-guide/normalisieren";
import { renderGuideHtml } from "@/lib/strategy-guide/html";

// Genau die Form, in der Fassung 1 und 2 abgelegt wurden: ohne die beiden
// neuen Abschnitte.
const alt = JSON.stringify({
  befund: "Nordlicht steht bei 15 von 100.",
  gespraechseinstieg: "Herr Harms, Sie haben uns zwei Dinge klar genannt.",
  kernbefunde: [{ titel: "Doppelt geschrieben", beleg: "32,5 h/Monat", wirkung: "Groesster Posten." }],
  expertise: "Es ist derselbe Moment.",
  empfehlung: "Zuerst der Servicebericht.",
  customVorschlaege: [{ titel: "Servicebericht vor Ort", aufhaenger: "32,5 h/Monat", idee: "App", nutzen: "spart", groessenordnung: "Keine Zahl", geprueftInRunde: 1 }],
  einwaende: [{ einwand: "Zu teuer", antwort: "32,5 h sind auch ein Preis." }],
  abschluss: "Ein Termin.",
});

let fehler = 0;
const pruefe = (was: string, ok: boolean, zusatz = "") => {
  console.log(`${ok ? "  ok  " : "FEHLT "} ${was}${zusatz ? ` — ${zusatz}` : ""}`);
  if (!ok) fehler++;
};

const doc = leseGuide(alt);
pruefe("alte Fassung laesst sich lesen", doc !== null);
pruefe("neue Felder sind gefuellt, nicht undefined",
  Array.isArray(doc?.umsetzung) && typeof doc?.workforceUrteil === "string");
pruefe("alter Inhalt bleibt erhalten", doc?.kernbefunde.length === 1 && doc?.customVorschlaege.length === 1);

try {
  const html = renderGuideHtml({
    doc: doc!, protokoll: [], companyName: "Nordlicht (Demo)", packageType: "operations",
    version: 2, erstelltAm: new Date(), blueprintAbgeschlossen: new Date(),
  });
  pruefe("alte Fassung rendert ohne Absturz", html.length > 1000, `${html.length} Zeichen`);
  pruefe("leerer Abschnitt 7 wird erklaert", html.includes("nicht hinterlegt"));
} catch (e) {
  pruefe("alte Fassung rendert ohne Absturz", false, String(e));
}

pruefe("Unsinn ergibt null statt Absturz", leseGuide("kein json") === null);
pruefe("leeres Objekt ergibt leeres Dokument", leseGuide("{}")?.befund === "");

console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
