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
  // Ein Posten aus der Zeit vor der Umbenennung: Er kennt "wasWirTun", aber
  // weder womit noch warum noch wieWirEsMachen. Genau daran ist das PDF eines
  // echten Kunden gescheitert.
  umsetzung: [{ block: "Digitale Grundlagen", titel: "Zentrale Ablage", befund: "18 h/Monat", wasWirTun: "Wir richten sie ein.", einordnung: "im Paket" }],
  // Ein Abschnitt, den es nicht mehr gibt.
  standardLoesungen: [{ titel: "Entfallen", aufhaenger: "x", loesung: "y", nutzen: "z", einordnung: "im Paket" }],
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
  pruefe("alter Posten erscheint im Druck", html.includes("Zentrale Ablage"));
  pruefe("leeres Feld bleibt leer statt undefined", !html.includes("undefined"));
} catch (e) {
  pruefe("alte Fassung rendert ohne Absturz", false, String(e));
}

const posten = doc?.umsetzung[0];
pruefe("alter Posten bleibt erhalten", posten?.titel === "Zentrale Ablage");
pruefe("fehlende Felder sind leer, nicht undefined",
  typeof posten?.womit === "string" && typeof posten?.warum === "string");
pruefe("wasWirTun wird uebernommen statt verworfen",
  posten?.wieWirEsMachen === "Wir richten sie ein.", posten?.wieWirEsMachen);
pruefe("entfallener Abschnitt stuerzt nicht ab", doc !== null);

// Die alte Fassung kennt "nichtUmgesetzt" nicht. Sie muss trotzdem lesbar
// und druckbar bleiben, und die Liste muss leer sein statt undefined.
pruefe("fehlende Liste nichtUmgesetzt ist leer, nicht undefined",
  Array.isArray(doc?.nichtUmgesetzt) && doc?.nichtUmgesetzt.length === 0);

// Umgekehrt: eine neue Fassung mit halb gefuellten Eintraegen.
const neuDoc = leseGuide(JSON.stringify({
  befund: "x",
  nichtUmgesetzt: [{ titel: "CRM-System" }, "Unsinn", { warum: "ohne Titel" }],
}));
// Der Eintrag "Unsinn" ist kein Objekt und wird verworfen — gewollt. Es
// bleiben zwei, jeweils mit beiden Feldern als Zeichenkette.
pruefe("halbe Eintraege in nichtUmgesetzt werden normalisiert",
  neuDoc?.nichtUmgesetzt.length === 2 &&
  neuDoc.nichtUmgesetzt[0].titel === "CRM-System" &&
  neuDoc.nichtUmgesetzt[0].warum === "" &&
  neuDoc.nichtUmgesetzt[1].titel === "" &&
  neuDoc.nichtUmgesetzt[1].warum === "ohne Titel");

try {
  const html = renderGuideHtml({
    doc: neuDoc!, protokoll: [], companyName: "Nordlicht (Demo)", packageType: "operations",
    version: 3, erstelltAm: new Date(), blueprintAbgeschlossen: new Date(),
  });
  pruefe("nichtUmgesetzt erscheint im Druck", html.includes("CRM-System"));
  pruefe("Ueberschrift dazu steht im Druck", html.includes("Darauf gehen wir hier nicht ein"));
  pruefe("kein undefined in der neuen Liste", !html.includes("undefined"));
} catch (e) {
  pruefe("neue Fassung rendert ohne Absturz", false, String(e));
}

pruefe("Unsinn ergibt null statt Absturz", leseGuide("kein json") === null);
pruefe("leeres Objekt ergibt leeres Dokument", leseGuide("{}")?.befund === "");

console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
