/**
 * Tests des Strategiegesprächs.
 * Ausführen mit: npx tsx tests/strategie.ts
 *
 * Geprüft wird vor allem die Grenze: Das Paket enthält höchstens drei
 * Automatisierungen. Wer im Gespräch eine vierte zusagt, verkauft eine
 * Nachforderung — und das darf nicht an einer Oberfläche hängen, die sich
 * umgehen lässt.
 */
import assert from "node:assert/strict";
import {
  alsStunden,
  aufwandHeute,
  darfWaehlen,
  fasseZusammen,
  freigabeHindernisse,
  pruefeAuswahl,
  type ErhobeneAufgabe,
  type PostenStand,
} from "../src/lib/strategie/engine";
import {
  ANSICHTEN,
  GRENZE_AUTOMATISIERUNGEN,
  ansichtenFuer,
  artAusBlock,
  kundeDarfSehen,
} from "../src/lib/strategie/katalog";
import { entwurfAusLeitfaden, entwurfsHinweise } from "../src/lib/strategie/vorbereitung";
import { MAX_AUTOMATISIERUNGEN } from "../src/lib/packages/umfang";
import type { GuideDocument } from "../src/lib/strategy-guide/types";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    console.error(`FEHLT  ${name}`);
    console.error(`       ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}

const aufgaben: ErhobeneAufgabe[] = [
  { catalogKey: "t29", label: "Daten von System zu System übertragen", minutesPerMonth: 2600 },
  { catalogKey: "t12", label: "Rechnungen schreiben", minutesPerMonth: 520 },
  { catalogKey: "t17", label: "Einsatzpläne erstellen", minutesPerMonth: 390 },
];

function posten(
  id: string,
  art: PostenStand["art"],
  zustand: PostenStand["zustand"] = "kandidat",
  kundeSieht = true
): PostenStand {
  return { id, art, zustand, titel: `Posten ${id}`, kundeSieht };
}

// ─── Aufwand ─────────────────────────────────────────────────────────────────

test("der Aufwand summiert nur, was der Betrieb erhoben hat", () => {
  const e = aufwandHeute(["t29", "t12"], aufgaben);
  assert.equal(e.minuten, 3120);
  assert.equal(e.belege.length, 2);
  assert.deepEqual(e.unbekannt, []);
});

test("eine erfundene Aufgabe zählt nicht mit, sondern wird gemeldet", () => {
  // Der Entwurf kann sich eine Aufgabe ausdenken. In die Zahl darf das nie
  // geraten — sonst steht auf dem Kundenbildschirm eine Zeit, die niemand
  // erhoben hat.
  const e = aufwandHeute(["t29", "t99"], aufgaben);
  assert.equal(e.minuten, 2600);
  assert.deepEqual(e.unbekannt, ["t99"]);
});

test("eine doppelt zugeordnete Aufgabe zählt einmal", () => {
  assert.equal(aufwandHeute(["t12", "t12"], aufgaben).minuten, 520);
});

test("ohne Zuordnung steht die Zahl auf null", () => {
  assert.equal(aufwandHeute([], aufgaben).minuten, 0);
});

test("Stunden werden gesprochen, nicht gerechnet", () => {
  assert.equal(alsStunden(2600), "43 Stunden");
  assert.equal(alsStunden(90), "1,5 Stunden");
});

// ─── Die Grenze ──────────────────────────────────────────────────────────────

test("die Grenze stammt aus dem Leistungsumfang, nicht aus dem Gespräch", () => {
  assert.equal(GRENZE_AUTOMATISIERUNGEN, MAX_AUTOMATISIERUNGEN);
  assert.equal(GRENZE_AUTOMATISIERUNGEN, 3);
});

test("drei Automatisierungen gehen, die vierte nicht", () => {
  const alle = [
    posten("a", "automatisierung", "gewaehlt"),
    posten("b", "automatisierung", "gewaehlt"),
    posten("c", "automatisierung", "gewaehlt"),
    posten("d", "automatisierung"),
  ];
  assert.equal(pruefeAuswahl(alle).ok, true);
  assert.equal(pruefeAuswahl(alle).frei, 0);
  const urteil = darfWaehlen(alle[3], alle);
  assert.equal(urteil.erlaubt, false);
  assert.match(urteil.grund ?? "", /drei|3/i);
});

test("zwei sind erlaubt — weniger als drei ist kein Fehler", () => {
  const alle = [
    posten("a", "automatisierung", "gewaehlt"),
    posten("b", "automatisierung", "gewaehlt"),
  ];
  const p = pruefeAuswahl(alle);
  assert.equal(p.ok, true);
  assert.equal(p.gewaehlt, 2);
  assert.equal(p.frei, 1);
});

test("Grundlagen und Workforce zählen nicht gegen die drei", () => {
  const alle = [
    posten("g1", "grundlage", "gewaehlt"),
    posten("g2", "grundlage", "gewaehlt"),
    posten("w", "workforce", "gewaehlt"),
    posten("a", "automatisierung", "gewaehlt"),
    posten("b", "automatisierung"),
  ];
  assert.equal(pruefeAuswahl(alle).gewaehlt, 1);
  assert.equal(darfWaehlen(alle[4], alle).erlaubt, true);
});

test("eine individuelle Entwicklung belegt keinen der drei Plätze", () => {
  const alle = [
    posten("c", "custom", "gewaehlt"),
    posten("a", "automatisierung", "gewaehlt"),
    posten("b", "automatisierung"),
  ];
  assert.equal(pruefeAuswahl(alle).gewaehlt, 1);
  assert.equal(fasseZusammen(alle.map((p) => ({ ...p, aufwandHeuteMinuten: 0 }))).ueberDemPaket, 1);
});

test("ein nicht eingeordneter Posten lässt sich nicht wählen", () => {
  const alle = [posten("x", "offen")];
  assert.equal(darfWaehlen(alle[0], alle).erlaubt, false);
});

test("ein gewählter Posten ohne Art fällt in der Prüfung auf", () => {
  const alle = [posten("x", "offen", "gewaehlt")];
  const p = pruefeAuswahl(alle);
  assert.equal(p.ok, false);
  assert.match(p.fehler.join(" "), /eingeordnet/i);
});

test("gewählt, aber für den Kunden ausgeblendet — das fällt auf", () => {
  const alle = [posten("a", "automatisierung", "gewaehlt", false)];
  const p = pruefeAuswahl(alle);
  assert.equal(p.ok, false);
  assert.match(p.fehler.join(" "), /zur Wahl/i);
});

test("eine vierte Automatisierung wird nicht stillschweigend hingenommen", () => {
  const alle = [
    posten("a", "automatisierung", "gewaehlt"),
    posten("b", "automatisierung", "gewaehlt"),
    posten("c", "automatisierung", "gewaehlt"),
    posten("d", "automatisierung", "gewaehlt"),
  ];
  const p = pruefeAuswahl(alle);
  assert.equal(p.ok, false);
  assert.match(p.fehler.join(" "), /Nachforderung/i);
});

// ─── Zusammenfassung ─────────────────────────────────────────────────────────

test("die Zusammenfassung zählt nur die gewählten Stunden", () => {
  const z = fasseZusammen([
    { ...posten("a", "automatisierung", "gewaehlt"), aufwandHeuteMinuten: 2600 },
    { ...posten("b", "automatisierung", "spaeter"), aufwandHeuteMinuten: 520 },
    { ...posten("g", "grundlage", "gewaehlt"), aufwandHeuteMinuten: 0 },
  ]);
  assert.equal(z.aufwandGewaehltMinuten, 2600);
  assert.equal(z.gewaehlt, 2);
  assert.equal(z.spaeter, 1);
});

// ─── Freigabe ────────────────────────────────────────────────────────────────

test("ohne Freigabe sieht der Kunde nichts", () => {
  assert.equal(kundeDarfSehen("freigegeben", null), false);
  assert.equal(kundeDarfSehen("vorbereitet", new Date()), false);
  assert.equal(kundeDarfSehen("freigegeben", new Date()), true);
  assert.equal(kundeDarfSehen("laeuft", new Date()), true);
  assert.equal(kundeDarfSehen("abgeschlossen", new Date()), true);
});

test("ein nicht eingeordneter Posten hält die Freigabe auf", () => {
  const h = freigabeHindernisse([
    { ...posten("x", "offen"), aufwandHeuteMinuten: 0 },
    { ...posten("a", "automatisierung"), aufwandHeuteMinuten: 100 },
    { ...posten("b", "automatisierung"), aufwandHeuteMinuten: 100 },
  ]);
  assert.equal(h.length, 1);
  assert.match(h[0], /eingeordnet/i);
});

test("zur Auswahl gehört eine Wahl — ein einziger Kandidat reicht nicht", () => {
  const h = freigabeHindernisse([
    { ...posten("a", "automatisierung"), aufwandHeuteMinuten: 100 },
  ]);
  assert.match(h.join(" "), /mehr Kandidaten als Plätze|Wahl/i);
});

test("eine saubere Vorbereitung hat keine Hindernisse", () => {
  const h = freigabeHindernisse([
    { ...posten("g", "grundlage"), aufwandHeuteMinuten: 0 },
    { ...posten("a", "automatisierung"), aufwandHeuteMinuten: 2600 },
    { ...posten("b", "automatisierung"), aufwandHeuteMinuten: 520 },
    { ...posten("c", "automatisierung"), aufwandHeuteMinuten: 390 },
  ]);
  assert.deepEqual(h, []);
});

// ─── Einordnung aus dem Leitfaden ────────────────────────────────────────────

test("die Blöcke des Leistungsumfangs werden erkannt", () => {
  assert.equal(artAusBlock("Digitale Grundlagen"), "grundlage");
  assert.equal(artAusBlock("Bewährte Automatisierungslösungen"), "automatisierung");
  assert.equal(artAusBlock("OKUN Workforce"), "workforce");
  assert.equal(artAusBlock("Individuelle Entwicklung"), "custom");
});

test("was sich nicht sicher einordnen lässt, bleibt offen", () => {
  // Lieber ein Posten, der auf einen Menschen wartet, als einer, der sich
  // selbst in den falschen Block einsortiert.
  assert.equal(artAusBlock("Klarer Fokus"), "offen");
  assert.equal(artAusBlock(""), "offen");
  assert.equal(artAusBlock(null), "offen");
});

const leitfaden = {
  befund: "",
  gespraechseinstieg: "",
  kernbefunde: [],
  expertise: "",
  empfehlung: "",
  customVorschlaege: [
    {
      titel: "Prüffristen-Modul",
      aufhaenger: "Zwei gerissene Fristen im letzten Jahr.",
      idee: "Ein Modul, das Fristen je Anlage führt.",
      nutzen: "Keine gerissene Frist mehr.",
      groessenordnung: "Grobe Schätzung: mehrere Wochen.",
      geprueftInRunde: 1,
    },
  ],
  umsetzung: [
    {
      block: "Digitale Grundlagen",
      titel: "Zentrale Dateiablage einrichten",
      befund: "Kein Programm für „Dokumente ablegen und finden“.",
      womit: "Google Workspace",
      warum: "Weil der Betrieb schon Gmail nutzt.",
      wieWirEsMachen: "Einrichten, Struktur anlegen, einweisen.",
      einordnung: "Im Paket enthalten.",
    },
    {
      block: "Bewährte Automatisierungslösungen",
      titel: "Serviceberichte ohne Abtippen",
      befund: "43 Stunden im Monat fürs Abtippen.",
      womit: "Formular mit Anbindung an die Branchensoftware",
      warum: "Größter einzelner Zeitfresser.",
      wieWirEsMachen: "Formular bauen, Schnittstelle prüfen, anbinden.",
      einordnung: "Im Paket enthalten.",
    },
  ],
  nichtUmgesetzt: [],
  workforceUrteil: "",
  unsereLeistung: "",
  einwaende: [],
  abschluss: "",
} as unknown as GuideDocument;

test("aus dem Leitfaden werden Posten mit Art und Schlüssel", () => {
  const e = entwurfAusLeitfaden(leitfaden);
  assert.equal(e.length, 3);
  assert.equal(e[0].art, "grundlage");
  assert.equal(e[1].art, "automatisierung");
  assert.equal(e[2].art, "custom");
  assert.ok(e[0].schluessel.length > 0);
  // Der Schlüssel ist derselbe wie bei der Umsetzungsanleitung, damit beides
  // zusammenfindet.
  assert.match(e[0].schluessel, /digitale-grundlagen\|/);
});

test("der Custom-Vorschlag trägt seinen Aufhänger als Befund", () => {
  const e = entwurfAusLeitfaden(leitfaden);
  const custom = e.find((p) => p.art === "custom")!;
  assert.match(custom.befund ?? "", /gerissene Fristen/);
  assert.match(custom.einordnung ?? "", /über das gebuchte Paket hinaus/i);
});

test("die Umsetzung kommt vor den Custom-Vorschlägen", () => {
  // Wer mit dem Zusatzgeschäft anfängt, verkauft; wer mit dem Gekauften
  // anfängt, liefert.
  const e = entwurfAusLeitfaden(leitfaden);
  assert.ok(e.findIndex((p) => p.art === "custom") > e.findIndex((p) => p.art === "grundlage"));
});

test("zwei gleichnamige Posten bekommen verschiedene Schlüssel", () => {
  const doppelt = {
    ...leitfaden,
    umsetzung: [leitfaden.umsetzung[0], leitfaden.umsetzung[0]],
  } as GuideDocument;
  const e = entwurfAusLeitfaden(doppelt);
  assert.equal(e.length, 3);
  assert.notEqual(e[0].schluessel, e[1].schluessel);
});

test("ein Leitfaden ohne Automatisierung wird gemeldet", () => {
  const ohne = { ...leitfaden, umsetzung: [leitfaden.umsetzung[0]] } as GuideDocument;
  const hinweise = entwurfsHinweise(entwurfAusLeitfaden(ohne));
  assert.match(hinweise.join(" "), /keine Automatisierung/i);
});

// ─── Ansichten ───────────────────────────────────────────────────────────────

test("Foundation bekommt keine Workforce-Ansicht", () => {
  const keys = ansichtenFuer("foundation").map((a) => a.key);
  assert.ok(!keys.includes("workforce"));
  assert.ok(keys.includes("auswahl"));
});

test("Operations und Custom bekommen sie", () => {
  assert.ok(ansichtenFuer("operations").some((a) => a.key === "workforce"));
  assert.ok(ansichtenFuer("custom").some((a) => a.key === "workforce"));
});

test("die Auswahl ist Teil des Gesprächs, nicht ein Anhang", () => {
  // Im Angebot steht wörtlich „Ergebnispräsentation, Roadmap und Auswahl der
  // Lösungen". Alle drei müssen vorkommen.
  const keys = ANSICHTEN.map((a) => a.key);
  assert.ok(keys.includes("betrieb"));
  assert.ok(keys.includes("auswahl"));
  assert.ok(keys.includes("plan"));
});

console.log(`\n${passed} Tests bestanden.\n`);
