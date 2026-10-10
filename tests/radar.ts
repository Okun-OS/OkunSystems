/**
 * Tests der Radar-Bewertung.
 * Ausführen mit: npx tsx tests/radar.ts
 *
 * Geprüft werden die Szenarien aus dem Entwicklungsauftrag — vor allem das
 * unbequeme: Ein gut aufgestellter Betrieb muss ein ehrliches Nein bekommen.
 */
import assert from "node:assert/strict";
import {
  aktiveFragen,
  bewerteRadar,
  fortschritt,
  naechsteOffeneFrage,
  auffaelligeAntworten,
  spotlightVorschlaege,
  type RadarAntwort,
} from "../src/lib/radar/engine";
import { FRAGEN, SCHWELLEN, frage, option } from "../src/lib/radar/catalog";

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

const a = (frageKey: string, ...optionKeys: string[]): RadarAntwort => ({ frageKey, optionKeys });

// ─── Katalogintegrität ───────────────────────────────────────────────────────

test("jede Option hat einen Beleg und gehört zu genau einer Frage", () => {
  const keys = new Set<string>();
  for (const f of FRAGEN) {
    assert.ok(f.optionen.length >= 2, `${f.key} braucht mindestens zwei Antworten`);
    for (const o of f.optionen) {
      assert.ok(o.beleg.trim().length > 0, `${o.key} ohne Beleg`);
      assert.ok(!keys.has(o.key), `Optionsschlüssel ${o.key} doppelt`);
      keys.add(o.key);
      for (const s of o.signale) {
        assert.ok(Number.isFinite(s.wert), `${o.key}: ungültiger Signalwert`);
      }
    }
  }
});

test("jede Verzweigungsbedingung zeigt auf eine Frage und Optionen, die es gibt", () => {
  for (const f of FRAGEN) {
    for (const b of f.wenn ?? []) {
      if (b.art === "antwort_ist" || b.art === "antwort_ist_nicht") {
        const ziel = frage(b.frage);
        assert.ok(ziel, `${f.key}: Bedingung zeigt auf unbekannte Frage ${b.frage}`);
        for (const k of b.optionen) {
          assert.ok(option(b.frage, k), `${f.key}: Bedingung nennt unbekannte Option ${k}`);
        }
      }
    }
  }
});

test("die Fragenphase bleibt im Zeitrahmen: 8 bis 12 aktive Fragen", () => {
  // Ohne Antworten: alle bedingungsfreien Fragen des Potenzialchecks.
  const leer = aktiveFragen({ antworten: [] }).filter((f) => f.phase === "potenzial");
  assert.ok(leer.length >= 8 && leer.length <= 12, `${leer.length} Fragen ohne Antworten`);

  // Ein Durchlauf mit Verzweigung auf P4.
  const mitP4 = aktiveFragen({ antworten: [a("P3", "P3-C")] }).filter((f) => f.phase === "potenzial");
  assert.ok(mitP4.length <= 12, `${mitP4.length} Fragen mit aktivem P4`);
  assert.ok(mitP4.some((f) => f.key === "P4"));
});

// ─── Szenario 1: viele manuelle Abläufe ──────────────────────────────────────

const szenarioHandarbeit: RadarAntwort[] = [
  a("P1", "P1-C"),
  a("P2", "P2-D"),
  a("P3", "P3-B"),
  a("P4", "P4-C"),
  a("P5", "P5-C"),
  a("P6", "P6-C"),
  a("P7", "P7-C"),
  a("P9", "P9-AUFTRAG", "P9-RECHNUNG"),
  a("P10", "P10-C"),
  a("P11", "P11-B"),
  a("P12", "P12-C"),
  a("S1", "S1-C"),
  a("S2", "S2-C"),
  a("S3", "S3-DOPPELT", "S3-FEHLER"),
  a("S4", "S4-A"),
  a("S5", "S5-A"),
];

test("Szenario 1: viel Handarbeit ergibt Stufe A mit belegten Feldern", () => {
  const r = bewerteRadar({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  assert.equal(r.stufe, "A", `Stufe ${r.stufe} statt A (${JSON.stringify(r.stufeGrund)})`);
  assert.ok(r.achsen.find((x) => x.achse === "potenzial")!.wert >= SCHWELLEN.hoch);
  assert.ok(r.achsen.find((x) => x.achse === "reife")!.wert < SCHWELLEN.hoch, "Reifegrad darf nicht hoch sein");
  assert.ok(r.felder.length > 0 && r.felder.length <= 3);
  for (const f of r.felder) assert.ok(f.belege.length >= SCHWELLEN.belegeProFeld, `${f.key} unbelegt`);
  assert.equal(r.zahlenBelastbar, true);
  assert.equal(r.blueprintEmpfohlen, true);
  assert.ok(r.einschaetzung.length > 40);
});

// ─── Szenario 2: hoch digitalisiert, großes Integrationspotenzial ────────────

// Ein durchdigitalisierter Betrieb: wenig Handarbeit, dokumentierte Abläufe,
// Zahlen auf Knopfdruck — aber fünf Programme, die nur halb zusammenspielen.
const szenarioIntegration: RadarAntwort[] = [
  a("P1", "P1-A"),
  a("P2", "P2-B"),
  a("P3", "P3-C"),
  a("P4", "P4-B"),
  a("P5", "P5-B"),
  a("P6", "P6-A"),
  a("P7", "P7-A"),
  a("P8", "P8-B"),
  a("P9", "P9-SUCHEN", "P9-AUFTRAG"),
  a("P10", "P10-A"),
  a("P11", "P11-A"),
  a("P12", "P12-C"),
  a("S1", "S1-B"),
  a("S2", "S2-B"),
  a("S3", "S3-DOPPELT"),
  a("S4", "S4-A"),
  a("S5", "S5-A"),
];

test("Szenario 2: ein hoher Reifegrad schließt eine klare Empfehlung nicht aus", () => {
  const r = bewerteRadar({ antworten: szenarioIntegration, spotlightKey: "sp_uebertragung" });
  const reife = r.achsen.find((x) => x.achse === "reife")!.wert;
  const potenzial = r.achsen.find((x) => x.achse === "potenzial")!.wert;
  const fit = r.achsen.find((x) => x.achse === "fit")!.wert;

  assert.ok(reife >= SCHWELLEN.hoch, `Reifegrad ${reife} sollte hoch sein`);
  assert.ok(fit >= SCHWELLEN.hoch, `Fit ${fit} sollte trotz hoher Reife hoch sein`);
  // Das ist der Kern: Das Gesamtpotenzial bleibt mittel, weil der Betrieb in
  // den meisten Punkten gut dasteht — und trotzdem muss Stufe A möglich sein.
  assert.ok(potenzial < SCHWELLEN.hoch, `Potenzial ${potenzial} — hier wird der konzentrierte Weg geprüft`);
  assert.equal(r.stufe, "A", `Stufe ${r.stufe} statt A (${JSON.stringify(r.stufeGrund)})`);
  assert.ok(
    r.stufeGrund.join(" ").includes("konzentriert"),
    `Die Begründung muss den Weg benennen: ${r.stufeGrund.join(" ")}`
  );
  assert.ok(
    r.felder.some((f) => f.key === "systemintegration"),
    `Systemintegration fehlt: ${r.felder.map((f) => f.key).join(", ")}`
  );
});

test("der konzentrierte Weg öffnet keine Hintertür für einen Betrieb ohne Bedarf", () => {
  // Hohe Passung, aber nur ein belegtes Feld: das reicht nicht für Stufe A.
  const r = bewerteRadar({
    antworten: [
      a("P1", "P1-A"), a("P2", "P2-A"), a("P3", "P3-A"), a("P5", "P5-A"), a("P6", "P6-A"),
      a("P7", "P7-A"), a("P8", "P8-A"), a("P9", "P9-X"), a("P10", "P10-A"),
      a("P11", "P11-A"), a("P12", "P12-C"),
    ],
  });
  assert.notEqual(r.stufe, "A", `Stufe A ohne belegte Felder (${JSON.stringify(r.stufeGrund)})`);
});

test("P8 erscheint nur bei einem bereits automatisierten Betrieb", () => {
  const mit = aktiveFragen({ antworten: [a("P7", "P7-A")] });
  const ohne = aktiveFragen({ antworten: [a("P7", "P7-C")] });
  assert.ok(mit.some((f) => f.key === "P8"));
  assert.ok(!ohne.some((f) => f.key === "P8"));
});

// ─── Szenario 3: bereits sehr gut aufgestellt ────────────────────────────────

const szenarioRund: RadarAntwort[] = [
  a("P1", "P1-A"),
  a("P2", "P2-A"),
  a("P3", "P3-A"),
  a("P5", "P5-A"),
  a("P6", "P6-A"),
  a("P7", "P7-A"),
  a("P8", "P8-A"),
  a("P9", "P9-X"),
  a("P10", "P10-A"),
  a("P11", "P11-A"),
  a("P12", "P12-A"),
  a("S1", "S1-A"),
  a("S2", "S2-A"),
  a("S3", "S3-X"),
  a("S4", "S4-C"),
  a("S5", "S5-C"),
];

test("Szenario 3: ein gut aufgestellter Betrieb bekommt ein ehrliches Nein", () => {
  const r = bewerteRadar({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  assert.equal(r.stufe, "C", `Stufe ${r.stufe} statt C (${JSON.stringify(r.stufeGrund)})`);
  assert.ok(r.achsen.find((x) => x.achse === "reife")!.wert >= SCHWELLEN.hoch);
  assert.equal(r.blueprintEmpfohlen, false, "Bei Stufe C darf kein Blueprint empfohlen werden");
  assert.equal(r.blueprintBegruendung, null);
  assert.ok(
    /kein(en)? Handlungsbedarf/i.test(r.einschaetzung),
    `Die Einschätzung muss das Nein aussprechen: ${r.einschaetzung}`
  );
  // Keine Zahl, die nicht im Ergebnis steht, und kein Einsparversprechen.
  assert.ok(!/€|Euro|spar/i.test(r.einschaetzung));
});

test("P4 entfällt, wenn nur ein bis zwei Programme im Einsatz sind", () => {
  const aktiv = aktiveFragen({ antworten: [a("P3", "P3-A")] });
  assert.ok(!aktiv.some((f) => f.key === "P4"));
});

// ─── Szenario 4: unvollständig und widersprüchlich ───────────────────────────

test("Szenario 4a: zu wenige Antworten ergeben Stufe B statt eines Urteils", () => {
  const r = bewerteRadar({ antworten: [a("P1", "P1-C"), a("P2", "P2-D"), a("P5", "P5-C")] });
  assert.equal(r.stufe, "B");
  assert.ok(r.aussagekraft < SCHWELLEN.aussagekraftFuerUrteil);
  assert.equal(r.zahlenBelastbar, false, "Ohne Abdeckung keine belastbaren Zahlen");
  assert.ok(r.offeneFragen.length > 0);
  assert.ok(r.stufeGrund.join(" ").includes("Abdeckung"));
});

test("Szenario 4b: „weiß ich nicht“ senkt die Aussagekraft, statt still durchzugehen", () => {
  const unwissend = szenarioHandarbeit.map((x) =>
    ["P5", "P6", "P10", "P11"].includes(x.frageKey)
      ? a(x.frageKey, `${x.frageKey}-X`)
      : x
  );
  const r = bewerteRadar({ antworten: unwissend, spotlightKey: "sp_rechnung" });
  const voll = bewerteRadar({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  assert.ok(r.aussagekraft < voll.aussagekraft, "Unwissen muss die Abdeckung senken");
  assert.ok(r.offeneFragen.length >= 4);
});

test("Szenario 4c: widersprüchliche Angaben werden benannt", () => {
  const r = bewerteRadar({
    antworten: [...szenarioHandarbeit.filter((x) => x.frageKey !== "P5"), a("P5", "P5-A")],
    spotlightKey: "sp_rechnung",
  });
  assert.ok(r.widersprueche.length >= 1, "Der Widerspruch P5-A gegen P4-C muss auffallen");
  assert.ok(r.widersprueche[0].length > 20);
});

test("zwei Widersprüche verhindern ein A, auch bei starken Werten", () => {
  const r = bewerteRadar({
    antworten: [
      ...szenarioHandarbeit.filter((x) => !["P5", "S5"].includes(x.frageKey)),
      a("P5", "P5-A"), // widerspricht P4-C
      a("S5", "S5-C"), // widerspricht S3-FEHLER
    ],
    spotlightKey: "sp_rechnung",
  });
  assert.ok(r.widersprueche.length >= 2, `nur ${r.widersprueche.length} Widersprüche erkannt`);
  assert.notEqual(r.stufe, "A");
  assert.ok(r.stufeGrund.join(" ").includes("widersprechen"));
});

// ─── Rechenverhalten ─────────────────────────────────────────────────────────

test("gleiche Antworten ergeben immer dasselbe Ergebnis", () => {
  const eins = bewerteRadar({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  const zwei = bewerteRadar({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  assert.deepEqual({ ...eins, berechnetAm: "" }, { ...zwei, berechnetAm: "" });
});

test("alle Achsen bleiben zwischen 0 und 100", () => {
  for (const szenario of [szenarioHandarbeit, szenarioIntegration, szenarioRund]) {
    const r = bewerteRadar({ antworten: szenario, spotlightKey: "sp_auftrag" });
    for (const achse of r.achsen) {
      assert.ok(achse.wert >= 0 && achse.wert <= 100, `${achse.achse}: ${achse.wert}`);
    }
  }
});

test("wer sechs Zeitfresser nennt, bekommt nicht mehr als die drei stärksten", () => {
  const p = (antwort: RadarAntwort) =>
    bewerteRadar({ antworten: [...szenarioHandarbeit.filter((x) => x.frageKey !== "P9"), antwort] })
      .achsen.find((x) => x.achse === "potenzial")!.wert;

  // Die drei stärksten Nennungen schöpfen die Spanne bereits aus.
  const dreiStaerkste = p(a("P9", "P9-PLANUNG", "P9-SUCHEN", "P9-AUFTRAG"));
  const alleSechs = p(
    a("P9", "P9-ANGEBOT", "P9-AUFTRAG", "P9-RECHNUNG", "P9-PLANUNG", "P9-PERSONAL", "P9-SUCHEN")
  );
  assert.equal(alleSechs, dreiStaerkste, "Die Deckelung bei drei Nennungen greift nicht");

  // Und weniger Nennungen bleiben darunter — die Breite trägt bis dahin schon.
  assert.ok(p(a("P9", "P9-ANGEBOT")) < dreiStaerkste);
});

test("ohne jede Antwort entsteht kein Urteil, sondern Stufe B", () => {
  const r = bewerteRadar({ antworten: [] });
  assert.equal(r.stufe, "B");
  assert.equal(r.aussagekraft, 0);
  assert.equal(r.felder.length, 0);
  assert.equal(r.zahlenBelastbar, false);
});

test("ein übersprungener Posten zählt wie eine offene Frage", () => {
  const r = bewerteRadar({
    antworten: [...szenarioHandarbeit.filter((x) => x.frageKey !== "P12"), { frageKey: "P12", optionKeys: [], uebersprungen: true }],
    spotlightKey: "sp_rechnung",
  });
  assert.ok(r.offeneFragen.some((f) => f.frageKey === "P12"));
});

test("eine ausschließende Antwort verdrängt jede andere, egal in welcher Reihenfolge", () => {
  const r = bewerteRadar({ antworten: [a("P9", "P9-AUFTRAG", "P9-X")] });
  assert.deepEqual(
    r.belege.reife.filter((b) => b.includes("Zeitfresser")),
    ["Kein Bereich wird als besonderer Zeitfresser benannt."]
  );
});

test("eine unbekannte Option wird ignoriert statt zu einem Absturz zu führen", () => {
  const r = bewerteRadar({ antworten: [a("P1", "GIBT-ES-NICHT"), a("GIBT-ES-AUCH-NICHT", "X")] });
  assert.equal(r.aussagekraft, 0);
});

// ─── Ablaufhilfen ────────────────────────────────────────────────────────────

test("die nächste offene Frage folgt der Katalogreihenfolge", () => {
  const naechste = naechsteOffeneFrage({ antworten: [a("P1", "P1-C")] });
  assert.equal(naechste?.key, "P2");
});

test("der Fortschritt zählt nur aktive Fragen", () => {
  const f = fortschritt({ antworten: [a("P3", "P3-A"), a("P1", "P1-A")] });
  assert.equal(f.beantwortet, 2);
  assert.ok(f.gesamt >= 8);
  assert.ok(f.prozent > 0 && f.prozent < 100);
});

test("auffällige Antworten erkennen starke Hinweise und offene Punkte", () => {
  const liste = auffaelligeAntworten({ antworten: [a("P2", "P2-D"), a("P11", "P11-C"), a("P5", "P5-X")] });
  assert.ok(liste.some((x) => x.frageKey === "P2" && x.grund.includes("Potenzial")));
  assert.ok(liste.some((x) => x.frageKey === "P11" && x.grund.includes("gegen")));
  assert.ok(liste.some((x) => x.frageKey === "P5" && x.grund.includes("offen")));
});

test("der Spotlight schlägt vor, was zum Profil passt — sperrt aber nichts", () => {
  const liste = spotlightVorschlaege(["b_buchhaltung"]);
  assert.equal(liste[0].key, "sp_rechnung");
  assert.equal(liste.length, 10, "alle Prozesse bleiben wählbar");
});

test("Spotlight-Fragen erscheinen erst nach der Prozesswahl", () => {
  assert.ok(!aktiveFragen({ antworten: [] }).some((f) => f.phase === "spotlight"));
  assert.ok(
    aktiveFragen({ antworten: [], spotlightKey: "sp_rechnung" }).some((f) => f.phase === "spotlight")
  );
});

console.log(`\n${passed} Tests bestanden.\n`);
