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
  fuehrungFuer,
  istBeraterDa,
  PRESENCE_MS,
  type ErhobeneAufgabe,
  type PostenStand,
} from "../src/lib/strategie/engine";
import {
  ANSICHTEN,
  alsAnsicht,
  GRENZE_AUTOMATISIERUNGEN,
  ansichtenFuer,
  artAusBlock,
  kundeDarfSehen,
} from "../src/lib/strategie/katalog";
import { entwurfAusLeitfaden, entwurfsHinweise } from "../src/lib/strategie/vorbereitung";
import { MAX_AUTOMATISIERUNGEN, umfangFuer } from "../src/lib/packages/umfang";
import {
  baueAblaufRaum,
  bauePlan,
  baueRaeume,
  baueRegal,
  baueWorkforce,
  entfaellt,
  fahrzeugFuer,
  hallensatz,
  schildName,
  stockwerkeFuer,
  wirdAutomatisch,
} from "../src/lib/strategie/haus";
import type { GuideDocument } from "../src/lib/strategy-guide/types";
import {
  boden,
  decke,
  massstab,
  plaetze,
  raum,
  rueckwand,
  tiefe,
  wand,
  RAUM,
} from "../src/lib/studio/perspektive";
import { umbrechen, kuerzen } from "../src/lib/studio/text";

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
  assert.ok(keys.includes("automationen"));
});

test("Operations und Custom bekommen sie", () => {
  assert.ok(ansichtenFuer("operations").some((a) => a.key === "workforce"));
  assert.ok(ansichtenFuer("custom").some((a) => a.key === "workforce"));
});

test("die Auswahl ist Teil des Gesprächs, nicht ein Anhang", () => {
  // Im Angebot steht wörtlich „Ergebnispräsentation, Roadmap und Auswahl der
  // Lösungen". Alle drei müssen vorkommen.
  const keys = ANSICHTEN.map((a) => a.key);
  assert.ok(keys.includes("ablaeufe"), "Ergebnispräsentation");
  assert.ok(keys.includes("automationen"), "Auswahl");
  assert.ok(keys.includes("plan"), "Roadmap");
});

test("die Ansichten heißen wie die Räume des Hauses", () => {
  // Beide Seiten stehen am selben Ort. Gäbe es zwei Vokabulare, müsste
  // irgendwo eine Übersetzungstabelle stehen — und die wäre eines Tages falsch.
  const raeume = baueRaeume({
    paket: "operations", ablaeufe: 1, stundenProMonat: 600, luecken: 2,
    felder: 12, plaetze: 3, vergeben: 1, workforceGewaehlt: false,
  });
  const ansichten = new Set(ANSICHTEN.map((a) => a.key as string));
  for (const r of raeume) {
    assert.ok(ansichten.has(r.key), `${r.key} fehlt in den Ansichten`);
  }
});

test("ein unbekannter Ort führt vor das Haus, nicht ins Leere", () => {
  assert.equal(alsAnsicht("betrieb"), "aussen", "alte Sitzungen vor dem Rundgang");
  assert.equal(alsAnsicht(null), "aussen");
  assert.equal(alsAnsicht("halle"), "halle");
});

// ─── Das Haus ────────────────────────────────────────────────────────────────

test("das Schild trägt den Namen, nicht die Rechtsform", () => {
  assert.equal(schildName("Nordlicht Gebäudetechnik GmbH"), "NORDLICHT GEBÄUDETECHNIK");
  assert.equal(schildName("Meyer UG (haftungsbeschränkt)"), "MEYER");
  assert.equal(schildName("Schulz & Partner GmbH & Co. KG"), "SCHULZ");
});

test("ein leerer Name bleibt lesbar statt leer", () => {
  assert.equal(schildName("GmbH"), "GMBH");
});

test("das Fahrzeug kommt aus der Branche", () => {
  assert.equal(fahrzeugFuer("M1.1-OPT-2"), "transporter"); // Handwerk
  assert.equal(fahrzeugFuer("M1.1-OPT-1"), "kleinwagen"); // Pflege
  assert.equal(fahrzeugFuer("M1.1-OPT-6"), "lkw"); // Logistik
  assert.equal(fahrzeugFuer("M1.1-OPT-7"), "kein"); // Dienstleistung
  assert.equal(fahrzeugFuer(null), "kein");
});

test("das Haus wächst mit dem Betrieb", () => {
  assert.equal(stockwerkeFuer(8), 2);
  assert.equal(stockwerkeFuer(48), 3);
  assert.equal(stockwerkeFuer(120), 4);
  assert.equal(stockwerkeFuer(null), 3);
});

test("der Hallensatz nennt nur, was erhoben wurde", () => {
  assert.equal(hallensatz({ mitarbeitende: 48, fahrzeuge: 14 }), "48 Menschen, 14 Fahrzeuge, ein Haus");
  assert.equal(hallensatz({ branche: "Gebäudetechnik", ort: "Hamburg" }), "Gebäudetechnik in Hamburg");
  assert.equal(hallensatz({}), "Ihr Betrieb");
});

test("nur das Übertragen entfällt — der Rest läuft weiter, ohne Menschen", () => {
  // Der Unterschied, an dem sich entscheidet, ob wir im Projekt einlösen
  // können, was im Gespräch zu sehen war.
  assert.equal(entfaellt("st_transfer", "manual"), true);
  assert.equal(wirdAutomatisch("st_transfer", "manual"), false);
  assert.equal(entfaellt("st_archive", "manual"), false);
  assert.equal(wirdAutomatisch("st_archive", "manual"), true);
});

test("was schon automatisch läuft, wird nicht noch einmal übernommen", () => {
  assert.equal(entfaellt("st_transfer", "automatic"), false);
  assert.equal(wirdAutomatisch("st_archive", "automatic"), false);
});

test("die Entscheidung bleibt beim Menschen", () => {
  // st_route und st_reply stehen bewusst nicht in STATIONS_OKUN_TAKES.
  assert.equal(wirdAutomatisch("st_route", "manual"), false);
  assert.equal(wirdAutomatisch("st_reply", "manual"), false);
});

test("der Ablaufraum rechnet die Bilanz aus den Stationen", () => {
  const raum = baueAblaufRaum({
    catalogKey: "flow_order",
    title: "Ein Auftrag",
    stations: [
      { stationKey: "st_receive", position: 0, role: "Büro", systemLabel: "E-Mail", mode: "manual" },
      { stationKey: "st_route", position: 1, role: "Büro", systemLabel: null, mode: "manual" },
      { stationKey: "st_transfer", position: 2, role: "Büro", systemLabel: "Software", mode: "manual" },
      { stationKey: "st_create", position: 3, role: "Büro", systemLabel: "Software", mode: "partial" },
      { stationKey: "st_reply", position: 4, role: "Büro", systemLabel: null, mode: "none" },
    ],
  });
  assert.equal(raum.stationen.length, 4, "„entfällt bei uns“ zählt nicht mit");
  assert.equal(raum.handStationen, 3);
  assert.equal(raum.entfallen, 1);
  assert.equal(raum.uebernommen, 1);
  assert.equal(raum.handDanach, 1, "das Einordnen bleibt");
});

test("das Regal hat immer zwölf Fächer, egal wie groß der Betrieb ist", () => {
  const leer = baueRegal([]);
  assert.equal(leer.length, 12);
  assert.ok(leer.every((f) => f.luecke));

  const voll = baueRegal([
    { name: "Branchensoftware", purposes: ["pur_customers", "pur_offers"] },
    { name: "DATEV", purposes: ["pur_invoices"] },
    { name: "Outlook", purposes: ["pur_invoices"] },
  ]);
  assert.equal(voll.length, 12);
  assert.equal(voll.find((f) => f.zweckKey === "pur_invoices")?.doppelt, true);
  assert.equal(voll.find((f) => f.zweckKey === "pur_customers")?.luecke, false);
  assert.equal(voll.find((f) => f.zweckKey === "pur_reports")?.luecke, true);
});

test("die Workforce-Tür ist bei Foundation sichtbar und verschlossen", () => {
  const basis = {
    ablaeufe: 2, stundenProMonat: 3700, luecken: 3, felder: 12,
    plaetze: 3, vergeben: 2, workforceGewaehlt: false,
  };
  const foundation = baueRaeume({ ...basis, paket: "foundation" });
  const wf = foundation.find((r) => r.key === "workforce")!;
  assert.equal(wf.verschlossen, true);
  assert.equal(foundation.length, 4, "sie verschwindet nicht, sie ist zu");

  const operations = baueRaeume({ ...basis, paket: "operations" });
  assert.equal(operations.find((r) => r.key === "workforce")!.verschlossen, false);
});

test("die Türschilder tragen echte Zahlen", () => {
  const raeume = baueRaeume({
    paket: "foundation", ablaeufe: 1, stundenProMonat: 3770, luecken: 4,
    felder: 12, plaetze: 3, vergeben: 2, workforceGewaehlt: false,
  });
  assert.equal(raeume[0].marke, "1 ABLAUF");
  assert.match(raeume[0].kennzahl, /62,8 h/);
  assert.equal(raeume[1].kennzahl, "4 Lücken");
  assert.equal(raeume[2].kennzahl, "2 vergeben");
});

// ─── Workforce-Raum und Plan ─────────────────────────────────────────────────

test("die Workforce-Module stehen gegen das, was den Zweck heute trägt", () => {
  const regal = baueRegal([
    { name: "Excel", purposes: ["pur_time"] },
    { name: "Papier", purposes: ["pur_time"] },
  ]);
  const umfang = umfangFuer("operations")!;
  const block = umfang.bloecke.find((b) => b.titel.includes("Workforce"))!;
  const sechs = baueWorkforce(block.beispiele, regal);

  assert.equal(sechs.length, 6);
  // Die Beschreibung kommt aus dem Angebot, nicht aus einer Produktseite.
  const zeit = sechs.find((m) => m.key === "zeiterfassung")!;
  assert.match(zeit.beschreibung, /stempeln/);
  assert.ok(!zeit.beschreibung.includes("—"), "der Titel steht nicht zweimal da");
  assert.deepEqual(zeit.heute, ["Excel", "Papier"]);
  // Was niemand trägt, bleibt leer — das ist das Argument.
  assert.deepEqual(sechs.find((m) => m.key === "dienstplanung")!.heute, []);
});

test("ohne hinterlegte Beispiele bleiben die Module ohne Behauptung", () => {
  const sechs = baueWorkforce([], baueRegal([]));
  assert.equal(sechs.length, 6);
  assert.ok(sechs.every((m) => m.beschreibung === ""));
  assert.ok(sechs.every((m) => m.heute.length === 0));
});

test("der Plan enthält dieses Gespräch und markiert es als Standort", () => {
  const umfang = umfangFuer("foundation")!;
  const plan = bauePlan(umfang.phasen);

  assert.equal(plan.length, umfang.phasen.length + 1, "das Gespräch kommt dazu");
  const jetzt = plan.filter((p) => p.jetzt);
  assert.equal(jetzt.length, 1, "genau ein Schritt ist der aktuelle");
  assert.match(jetzt[0].titel, /Strategiegespräch/);

  // Direkt nach dem Blueprint, denn dafür ist es das Gespräch.
  const blueprint = plan.find((p) => p.titel.includes("Blueprint"))!;
  assert.equal(jetzt[0].nummer, blueprint.nummer + 1);
  assert.equal(blueprint.erledigt, true);

  // Davor erledigt, danach offen — und die Nummern laufen durch.
  assert.ok(plan.filter((p) => p.erledigt).every((p) => p.nummer < jetzt[0].nummer));
  assert.ok(plan.slice(jetzt[0].nummer).every((p) => !p.erledigt && !p.jetzt));
  assert.deepEqual(plan.map((p) => p.nummer), plan.map((_, i) => i + 1));

  // Titel und Erklärung werden am Gedankenstrich getrennt.
  assert.equal(plan[0].titel, "Buchung und Kickoff");
  assert.match(plan[0].was, /Vertrag abschließen/);
});

test("ein Plan ohne Blueprint-Phase bricht nicht", () => {
  const plan = bauePlan(["Buchung", "Umsetzung"]);
  assert.equal(plan.length, 3);
  assert.equal(plan.filter((p) => p.jetzt).length, 1);
  assert.equal(bauePlan([]).length, 1);
});

// ─── Wer führt ───────────────────────────────────────────────────────────────

test("ohne Lebenszeichen führt niemand", () => {
  assert.equal(istBeraterDa(null), false);
  assert.equal(fuehrungFuer({ abgeschlossenAm: null, beraterPresenceAt: null }), "frei");
});

test("ein frisches Lebenszeichen führt, ein altes nicht mehr", () => {
  const jetzt = new Date("2026-03-02T10:00:00Z");
  const frisch = new Date(jetzt.getTime() - 10_000);
  const alt = new Date(jetzt.getTime() - PRESENCE_MS - 1_000);

  assert.equal(istBeraterDa(frisch, jetzt), true);
  assert.equal(istBeraterDa(alt, jetzt), false);
  assert.equal(
    fuehrungFuer({ abgeschlossenAm: null, beraterPresenceAt: frisch }, jetzt),
    "folgt"
  );
  assert.equal(
    fuehrungFuer({ abgeschlossenAm: null, beraterPresenceAt: alt }, jetzt),
    "frei"
  );
});

test("nach dem Gespräch gehört das Haus dem Kunden", () => {
  const jetzt = new Date("2026-03-02T10:00:00Z");
  const frisch = new Date(jetzt.getTime() - 5_000);
  // Auch wenn der Berater die Seite noch offen hat: Geführt wird nicht mehr.
  assert.equal(
    fuehrungFuer({ abgeschlossenAm: new Date("2026-03-02T09:00:00Z"), beraterPresenceAt: frisch }, jetzt),
    "frei"
  );
});

// ─── Die Geometrie der Räume ─────────────────────────────────────────────────

test("die Schachtel schließt: Wände, Boden und Decke treffen sich", () => {
  // Der linke Rand des Bodens und der linke Rand der Decke stehen senkrecht
  // übereinander — sonst klafft der Raum an der Kante auf.
  for (const t of [0, 0.3, 0.7, 1]) {
    assert.equal(boden(t, 0).x, decke(t, 0).x, `links bei t=${t}`);
    assert.equal(boden(t, 1).x, decke(t, 1).x, `rechts bei t=${t}`);
    assert.equal(wand("links", t, 1).y, boden(t, 0).y, `Wandfuß links bei t=${t}`);
    assert.equal(wand("rechts", t, 0).y, decke(t, 1).y, `Wandkopf rechts bei t=${t}`);
  }
  // Ganz hinten ist der Boden der Fuß der Rückwand.
  assert.equal(boden(1, 0).x, RAUM.links);
  assert.equal(boden(1, 0).y, RAUM.unten);
  assert.equal(decke(1, 1).y, RAUM.oben);
  assert.deepEqual(rueckwand(0, 0), { x: RAUM.links, y: RAUM.oben });
});

test("was hinten steht, ist kleiner als was vorn steht", () => {
  assert.ok(massstab(0) > massstab(0.5));
  assert.ok(massstab(0.5) > massstab(1));
  assert.equal(massstab(0), 1, "vorn ist der Maßstab 1:1");

  // Gleiche Weltabstände rücken nach hinten zusammen.
  const a = tiefe(0.25);
  const b = tiefe(0.5);
  const c = tiefe(0.75);
  assert.ok(b - a > c - b, "hinten ist der Abstand kleiner");
  assert.equal(tiefe(0), 0);
  assert.equal(tiefe(1), 1);
});

test("etwas auf dem Boden steht auf dem Boden", () => {
  assert.equal(raum(0.4, 0.3, 0).y, boden(0.4, 0.3).y);
  assert.equal(raum(0.4, 0.3, 1).y, decke(0.4, 0.3).y);
  assert.ok(raum(0.4, 0.3, 0.5).y < boden(0.4, 0.3).y, "auf halber Höhe ist höher");
});

test("Plätze in einer Reihe halten Abstand zum Rand", () => {
  const acht = plaetze(8, 0.07);
  assert.equal(acht.length, 8);
  assert.ok(acht[0] >= 0.07 && acht[7] <= 0.93);
  assert.deepEqual(plaetze(1), [0.5]);
  assert.deepEqual(plaetze(0), []);
  // Gleichmäßig: alle Abstände sind gleich.
  const schritte = acht.slice(1).map((u, i) => Math.round((u - acht[i]) * 1e6));
  assert.equal(new Set(schritte).size, 1);
});

test("Beschriftungen brechen an Wortgrenzen um", () => {
  assert.deepEqual(umbrechen("Eingang bemerken und lesen", 15), ["Eingang", "bemerken und", "lesen"]);
  assert.deepEqual(umbrechen("Kurz", 15), ["Kurz"]);
  assert.deepEqual(umbrechen("   ", 10), []);
  // Ein einzelnes zu langes Wort wird nicht zerhackt, sondern steht allein.
  assert.deepEqual(umbrechen("Zuständigkeitsbereich", 10), ["Zuständigkeitsbereich"]);
  assert.equal(kuerzen("Zuständigkeitsbereich", 10), "Zuständig…");
  assert.equal(kuerzen("Kurz", 10), "Kurz");
});

console.log(`\n${passed} Tests bestanden.\n`);
