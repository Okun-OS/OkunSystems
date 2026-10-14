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
import {
  BEOBACHTUNGEN,
  DIMENSIONEN,
  DIMENSION_MAX,
  FRAGEN,
  SCHWELLEN,
  STUFEN,
  frage,
  option,
} from "../src/lib/radar/catalog";
import { liveProfil } from "../src/lib/radar/live";
import {
  KATEGORIE_LABEL,
  SOFTWARE,
  findeSoftware,
  normalisiere,
  schlageSoftwareVor,
} from "../src/lib/radar/software-katalog";
import { istSauber, pruefeAntwort } from "../src/lib/radar/deutung";
import { groszeZeile } from "../src/components/radar/modus-uebergang";

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
  /*
    Welcher der beiden Wege zu A führt, hängt an den Zahlen: Seit Oktober 2026
    trägt eine hohe Achse zusammen mit einer tragfähigen zweiten (ab 45) das
    Ergebnis; darunter greift weiterhin der konzentrierte Weg über dicht
    belegte Felder. Beide müssen sich in der Begründung wiederfinden — ein A
    ohne nachvollziehbaren Weg wäre eine Behauptung.
  */
  const begruendung = r.stufeGrund.join(" ");
  assert.ok(
    begruendung.includes("tragfähig") || begruendung.includes("konzentriert"),
    `Die Begründung muss den Weg benennen: ${begruendung}`
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

test("zwei Widersprüche kosten kein A — sie stehen aber in der Begründung", () => {
  /*
    Bis Oktober 2026 schickten zwei sich widersprechende Angaben das Ergebnis
    auf Stufe B. Im Gespräch ist das der falsche Schluss: Der Berater sitzt
    daneben, sieht den Widerspruch in seiner Ansicht und klärt ihn in zwei
    Sätzen. Dem Interessenten dafür ein „noch nicht" zu zeigen, sät Zweifel,
    wo keine hingehören. Erst ab dem dritten Widerspruch steht das Bild
    insgesamt auf wackligen Füßen.
  */
  const r = bewerteRadar({
    antworten: [
      ...szenarioHandarbeit.filter((x) => !["P5", "S5"].includes(x.frageKey)),
      a("P5", "P5-A"), // widerspricht P4-C
      a("S5", "S5-C"), // widerspricht S3-FEHLER
    ],
    spotlightKey: "sp_rechnung",
  });
  assert.ok(r.widersprueche.length >= 2, `nur ${r.widersprueche.length} Widersprüche erkannt`);
  assert.equal(r.stufe, "A");
  assert.ok(
    r.stufeGrund.join(" ").includes("widersprechen"),
    "der Berater muss den Widerspruch trotzdem sehen"
  );
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

// ─── Live-Bild ───────────────────────────────────────────────────────────────

test("ohne Antworten hat keine Dimension einen Wert — auch nicht null", () => {
  const p = liveProfil({ antworten: [] });
  assert.equal(p.dimensionen.length, 5);
  for (const d of p.dimensionen) {
    assert.equal(d.wert, null, `${d.key} zeigt ${d.wert} statt „noch offen“`);
    assert.equal(d.status, "offen");
  }
  assert.equal(p.erfassteDimensionen, 0);
  assert.equal(p.beobachtungen.length, 0);
});

test("eine Antwort füllt genau die Dimension, zu der sie gehört", () => {
  const p = liveProfil({ antworten: [a("P3", "P3-C")] });
  const systeme = p.dimensionen.find((d) => d.key === "systeme")!;
  assert.notEqual(systeme.wert, null, "Systemlandschaft gehört zu den Systemen");
  assert.equal(p.erfassteDimensionen, 1, "Keine andere Dimension darf sich mitfüllen");
});

test("die Werte bleiben zwischen 0 und der Skala", () => {
  const p = liveProfil({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  for (const d of p.dimensionen) {
    if (d.wert === null) continue;
    assert.ok(d.wert >= 0 && d.wert <= DIMENSION_MAX, `${d.key}: ${d.wert}`);
  }
});

test("ein gut aufgestellter Betrieb bekommt hohe Werte, ein schwacher niedrige", () => {
  const schwach = liveProfil({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  const stark = liveProfil({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  const mittel = (x: ReturnType<typeof liveProfil>) => {
    const werte = x.dimensionen.map((d) => d.wert).filter((w): w is number => w !== null);
    return werte.reduce((s2, w) => s2 + w, 0) / werte.length;
  };
  assert.ok(mittel(stark) > mittel(schwach), `${mittel(stark)} sollte über ${mittel(schwach)} liegen`);
});

test("Beobachtungen entstehen nur aus tatsächlich gegebenen Antworten", () => {
  const ohne = liveProfil({ antworten: [a("P3", "P3-B")] });
  assert.equal(ohne.beobachtungen.length, 0, "P3 hat keine Beobachtung hinterlegt");

  const mit = liveProfil({ antworten: [a("P4", "P4-C")] });
  const medienbruch = mit.beobachtungen.find((b) => b.key === "medienbruch");
  assert.ok(medienbruch, "P4-C muss den Medienbruch auslösen");
  assert.equal(medienbruch!.art, "hinweis");
  assert.equal(medienbruch!.quelle, "P4");
});

test("Stärken werden genauso benannt wie Schwächen", () => {
  const p = liveProfil({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  assert.ok(
    p.beobachtungen.some((b) => b.art === "staerke"),
    "Ein gut aufgestellter Betrieb muss Stärken angezeigt bekommen"
  );
  assert.ok(
    !p.beobachtungen.some((b) => b.art === "hinweis"),
    `Hier darf kein Hinweis stehen: ${p.beobachtungen.filter((b) => b.art === "hinweis").map((b) => b.key).join(", ")}`
  );
});

test("Hinweise stehen vor Stärken — im Gespräch ist das die Information", () => {
  const p = liveProfil({ antworten: [a("P4", "P4-C"), a("P10", "P10-A")] });
  assert.equal(p.beobachtungen[0].art, "hinweis");
});

test("keine Beobachtung erfindet Zahlen, Vergleiche oder Versprechen", () => {
  // Das Referenzbild zeigte „bis zu 40 % Effizienzgewinn“ und einen
  // Branchenvergleich. Beides haben wir nicht und erfinden wir nicht.
  const verboten = /\d\s*%|Euro|€|durchschnittlich|Branche|Benchmark|Vergleich|spar|Potenzial von|bis zu/i;
  for (const b of BEOBACHTUNGEN) {
    assert.ok(!verboten.test(b.text), `„${b.key}“ behauptet etwas Erfundenes: ${b.text}`);
    assert.ok(!verboten.test(b.titel), `„${b.key}“ behauptet etwas Erfundenes: ${b.titel}`);
  }
});

test("jede Beobachtung zeigt auf eine Frage und Optionen, die es gibt", () => {
  for (const b of BEOBACHTUNGEN) {
    assert.ok(frage(b.frage), `${b.key}: unbekannte Frage ${b.frage}`);
    for (const k of b.optionen) {
      assert.ok(option(b.frage, k), `${b.key}: unbekannte Option ${k}`);
    }
    assert.ok(b.dimension in DIMENSIONEN, `${b.key}: unbekannte Dimension ${b.dimension}`);
  }
});

test("eine übersprungene Frage füllt ihre Dimension nicht", () => {
  const p = liveProfil({
    antworten: [{ frageKey: "P3", optionKeys: [], uebersprungen: true }],
  });
  assert.equal(p.dimensionen.find((d) => d.key === "systeme")!.wert, null);
});

test("das Live-Bild deckt sich mit dem Reifegrad der Auswertung", () => {
  // Beide rechnen dieselbe Achse. Wenn sie auseinanderlaufen, reden Gespräch
  // und Bericht über verschiedene Betriebe.
  const schwach = liveProfil({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  const ergebnis = bewerteRadar({ antworten: szenarioHandarbeit, spotlightKey: "sp_rechnung" });
  const mittel =
    (schwach.dimensionen.map((d) => d.wert).filter((w): w is number => w !== null)
      .reduce((s2, w) => s2 + w, 0) /
      schwach.erfassteDimensionen /
      DIMENSION_MAX) *
    100;
  const reife = ergebnis.achsen.find((x) => x.achse === "reife")!.wert;
  assert.ok(
    Math.abs(mittel - reife) < 25,
    `Live-Mittel ${Math.round(mittel)} gegen Reifegrad ${reife} — das driftet auseinander`
  );
});

// ─── Wortlaut der Stufen ─────────────────────────────────────────────────────

test("Stufe A lädt zum Angebot ein, statt ein Vielleicht zu formulieren", () => {
  const text = `${STUFEN.A.titel} ${STUFEN.A.kurz} ${STUFEN.A.naechsterSchritt}`;
  assert.ok(text.includes("Angebot"), "das Angebot muss vorkommen");
  assert.ok(/glückwunsch/i.test(STUFEN.A.titel), "der Moment darf gefeiert werden");
  // Die Verknappung muss wahr sein: Sie stimmt, weil Stufe C existiert.
  assert.ok(/nicht jede/i.test(STUFEN.A.naechsterSchritt));
});

test("das ehrliche Nein bleibt ein Nein", () => {
  assert.ok(/kein/i.test(STUFEN.C.titel));
  assert.ok(/kein weiterer Schritt/i.test(STUFEN.C.naechsterSchritt));
});

test("keine Stufe stellt den Interessenten als unfertig hin", () => {
  /*
    Der Satz „offene Punkte nachfassen" stand vorher bei Stufe B und klang
    wie „Sie sind noch nicht so weit, bei uns zu kaufen". Zweifel sollen aus
    der Sache kommen, nicht aus der Wortwahl.
  */
  const zweifel = ["nicht bereit", "noch nicht so weit", "erst wenn Sie", "nachfassen"];
  for (const stufe of ["A", "B"] as const) {
    const text =
      `${STUFEN[stufe].titel} ${STUFEN[stufe].kurz} ${STUFEN[stufe].naechsterSchritt}`.toLowerCase();
    for (const wendung of zweifel) {
      assert.ok(!text.includes(wendung), `Stufe ${stufe} enthält „${wendung}"`);
    }
  }
});

// ─── Softwarekatalog ─────────────────────────────────────────────────────────

test("der Katalog findet Programme über Name und Schreibweise", () => {
  assert.equal(findeSoftware("Outlook")?.name, "Microsoft Outlook");
  assert.equal(findeSoftware("outlook")?.name, "Microsoft Outlook");
  assert.equal(findeSoftware("MS-Outlook")?.name, "Microsoft Outlook");
  assert.equal(findeSoftware("o365")?.name, "Microsoft 365");
  assert.equal(findeSoftware("datev unternehmen online")?.name, "DATEV");
  assert.equal(findeSoftware("Hausinterne Eigenentwicklung"), null);
});

test("Vorschläge beginnen mit dem, was vorn passt", () => {
  const vorschlaege = schlageSoftwareVor("outl");
  assert.ok(vorschlaege.length > 0, "zu „outl“ muss etwas kommen");
  assert.equal(vorschlaege[0].name, "Microsoft Outlook");
  // Ein einzelner Buchstabe ergibt noch keine sinnvolle Liste.
  assert.equal(schlageSoftwareVor("o").length, 0);
});

test("der Katalog ist in sich sauber", () => {
  assert.ok(SOFTWARE.length >= 150, `nur ${SOFTWARE.length} Programme — zu dünn`);
  const keys = new Set<string>();
  const formen = new Map<string, string>();
  for (const eintrag of SOFTWARE) {
    assert.ok(!keys.has(eintrag.key), `doppelter Schlüssel: ${eintrag.key}`);
    keys.add(eintrag.key);
    assert.ok(eintrag.zweck.length > 5, `${eintrag.name} ohne Zweck`);
    assert.ok(KATEGORIE_LABEL[eintrag.kategorie], `${eintrag.name}: unbekannte Kategorie`);
    for (const schreibweise of [eintrag.name, ...(eintrag.aliase ?? [])]) {
      const form = normalisiere(schreibweise);
      const belegt = formen.get(form);
      // Eine doppelt belegte Schreibweise würde einen Eintrag unauffindbar
      // machen — die Suche nimmt den ersten Treffer.
      assert.ok(!belegt || belegt === eintrag.key, `„${schreibweise}“ zeigt auf ${belegt} und ${eintrag.key}`);
      formen.set(form, eintrag.key);
    }
  }
});

test("der Katalog deckt mehrere Branchen ab", () => {
  const kategorien = new Set(SOFTWARE.map((s) => s.kategorie));
  assert.ok(kategorien.size >= 10, `nur ${kategorien.size} Kategorien`);
  const branchen = new Set(SOFTWARE.flatMap((s) => s.branchen ?? []));
  for (const erwartet of ["handwerk", "bau", "pflege", "gastronomie", "logistik"]) {
    assert.ok(branchen.has(erwartet), `keine Software für ${erwartet}`);
  }
});

// ─── Freitexte in der Bewertung ──────────────────────────────────────────────

function deutung(achse: "reife" | "potenzial" | "fit", wert: number, sicher = true) {
  return { einordnung: "Einordnung", achse, wert, felder: [], sicher, modell: "test" };
}

test("eine eingeordnete Angabe verschiebt die Achse, eine ungedeutete nicht", () => {
  const ohne = bewerteRadar({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  const mitDeutung = bewerteRadar({
    antworten: szenarioRund,
    spotlightKey: "sp_auftrag",
    freitexte: [
      { bezug: "profil:modell", text: "Wir betreiben nebenbei einen Onlineshop.", deutung: deutung("potenzial", 2) },
    ],
  });
  const ohneDeutung = bewerteRadar({
    antworten: szenarioRund,
    spotlightKey: "sp_auftrag",
    freitexte: [{ bezug: "profil:modell", text: "Wir betreiben nebenbei einen Onlineshop.", deutung: null }],
  });

  const potenzial = (r: ReturnType<typeof bewerteRadar>) =>
    r.achsen.find((a) => a.achse === "potenzial")!.wert;

  assert.ok(potenzial(mitDeutung) > potenzial(ohne), "die Angabe muss wirken");
  assert.equal(potenzial(ohneDeutung), potenzial(ohne), "ohne Einordnung darf nichts passieren");
});

test("unsichere Angaben zählen nicht", () => {
  const ohne = bewerteRadar({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  const mit = bewerteRadar({
    antworten: szenarioRund,
    spotlightKey: "sp_auftrag",
    freitexte: [{ bezug: "frage:P1", text: "weiß nicht", deutung: deutung("potenzial", 2, false) }],
  });
  assert.deepEqual(
    mit.achsen.map((a) => a.wert),
    ohne.achsen.map((a) => a.wert)
  );
});

test("Freitexte können den Fragebogen nicht überstimmen", () => {
  /*
    Zehn begeisterte Sätze dürfen aus einem gut aufgestellten Betrieb keinen
    Sanierungsfall machen. Je Achse zählen drei Angaben mit je zwei Punkten —
    das verschiebt, aber es entscheidet nicht.
  */
  const ohne = bewerteRadar({ antworten: szenarioRund, spotlightKey: "sp_auftrag" });
  const viele = bewerteRadar({
    antworten: szenarioRund,
    spotlightKey: "sp_auftrag",
    freitexte: Array.from({ length: 10 }, (_, i) => ({
      bezug: `frage:X${i}`,
      text: `Angabe ${i}`,
      deutung: deutung("potenzial", 2),
    })),
  });
  const potenzial = (r: ReturnType<typeof bewerteRadar>) =>
    r.achsen.find((a) => a.achse === "potenzial")!.wert;
  assert.ok(potenzial(viele) > potenzial(ohne));
  assert.ok(
    potenzial(viele) - potenzial(ohne) <= 20,
    `Freitexte haben die Achse um ${potenzial(viele) - potenzial(ohne)} Punkte bewegt`
  );
  assert.equal(viele.stufe, ohne.stufe, "die Stufe darf daran nicht kippen");
});

test("der Wortlaut wird zum Beleg, nicht die Deutung", () => {
  const r = bewerteRadar({
    antworten: szenarioHandarbeit,
    spotlightKey: "sp_rechnung",
    freitexte: [
      {
        bezug: "frage:P1",
        text: "Die Monteure schreiben alles auf Zettel.",
        deutung: { ...deutung("potenzial", 2), felder: ["doppelerfassung"], einordnung: "Erfassung auf Papier" },
      },
    ],
  });
  const alleBelege = [...r.belege.potenzial, ...r.felder.flatMap((f) => f.belege)].join(" | ");
  assert.ok(alleBelege.includes("Die Monteure schreiben alles auf Zettel."), "der Wortlaut fehlt");
  assert.ok(!alleBelege.includes("Erfassung auf Papier"), "die Deutung darf nicht als Beleg gelten");
  // Das genannte Potenzialfeld bekommt den Wortlaut ebenfalls als Beleg.
  const doppel = r.felder.find((f) => f.key === "doppelerfassung");
  assert.ok(
    doppel?.belege.some((b) => b.includes("Zettel")),
    "das Feld muss den Wortlaut als Beleg führen"
  );
});

test("eine Ergänzung zählt für die Abdeckung wie eine Antwort", () => {
  const halbe = szenarioHandarbeit.slice(0, 4);
  const ohne = bewerteRadar({ antworten: halbe, spotlightKey: "sp_rechnung" });
  const mit = bewerteRadar({
    antworten: halbe,
    spotlightKey: "sp_rechnung",
    freitexte: szenarioHandarbeit.slice(4, 8).map((a) => ({
      bezug: `frage:${a.frageKey}`,
      text: "In unserem Fall läuft das anders.",
      deutung: null,
    })),
  });
  assert.ok(
    mit.aussagekraft > ohne.aussagekraft,
    `Abdeckung blieb bei ${mit.aussagekraft} statt zu steigen`
  );
});

test("eine saubere Modellantwort wird übernommen", () => {
  const d = pruefeAntwort(
    '```json\n{"einordnung":"Der Betrieb erfasst Aufträge doppelt.","achse":"potenzial","wert":2,"felder":["doppelerfassung"],"sicher":true}\n```'
  );
  assert.ok(d, "die Antwort hätte durchgehen müssen");
  assert.equal(d!.achse, "potenzial");
  assert.equal(d!.wert, 2);
  assert.deepEqual(d!.felder, ["doppelerfassung"]);
});

test("eine Modellantwort mit erfundenen Zahlen wird verworfen", () => {
  const d = pruefeAntwort(
    '{"einordnung":"Spart rund 30 % der Zeit.","achse":"potenzial","wert":2,"felder":[],"sicher":true}'
  );
  assert.equal(d, null);
});

test("unsicher heißt: kein Ausschlag, keine Felder", () => {
  const d = pruefeAntwort(
    '{"einordnung":"Die Angabe ist unklar.","achse":"potenzial","wert":2,"felder":["doppelerfassung"],"sicher":false}'
  );
  assert.ok(d);
  assert.equal(d!.sicher, false);
  assert.equal(d!.wert, 0);
  assert.equal(d!.achse, null);
  assert.deepEqual(d!.felder, []);
});

test("erfundene Potenzialfelder und Ausreißer fallen weg", () => {
  const d = pruefeAntwort(
    '{"einordnung":"Ein klarer Befund.","achse":"fit","wert":2,"felder":["gibtesnicht","doppelerfassung"],"sicher":true}'
  );
  assert.ok(d);
  assert.deepEqual(d!.felder, ["doppelerfassung"]);
  // Werte außerhalb der Kappung lässt schon die Form nicht durch.
  assert.equal(
    pruefeAntwort('{"einordnung":"X Y Z","achse":"fit","wert":9,"felder":[],"sicher":true}'),
    null
  );
});

test("Geschwätz statt JSON ergibt keine Deutung", () => {
  assert.equal(pruefeAntwort("Das kann ich so nicht beantworten."), null);
  assert.equal(pruefeAntwort(""), null);
});

test("keine Einordnung darf Zahlen erfinden", () => {
  assert.equal(istSauber("Der Betrieb erfasst Aufträge auf Papier."), true);
  assert.equal(istSauber("Das spart 30 % der Zeit."), false);
  assert.equal(istSauber("Branchenüblich sind hier zwei Systeme."), false);
  assert.equal(istSauber("Bis zu 5.000 EUR im Jahr."), false);
});

// ─── Der Glückwunsch ─────────────────────────────────────────────────────────

test("gratuliert wird nur beim Angebot — und nur, wenn gefeiert werden darf", () => {
  /*
    Der Schirm vor dem Angebot gratuliert. Alle anderen Schnitte nicht: Ein
    Glückwunsch beim Zurückwechseln ins Gespräch oder beim Öffnen der
    Auswertung wäre eine Floskel, und eine Floskel, die jeder Wechsel
    wiederholt, entwertet den einen Moment, auf den das Gespräch zuläuft.
    Dass er sich innerhalb eines Gesprächs nicht wiederholt, hält der
    Komponentenzustand fest (`schonGefeiert`); hier steht die Regel selbst.
  */
  assert.equal(groszeZeile("angebot", "Nordlicht GmbH"), "Herzlichen Glückwunsch");
  assert.equal(groszeZeile("angebot", "Nordlicht GmbH", false), null);
  assert.equal(groszeZeile("radar", "Nordlicht GmbH"), "Nordlicht GmbH");
  assert.equal(groszeZeile("gespraech", "Nordlicht GmbH"), null);
  assert.equal(groszeZeile("ergebnis", "Nordlicht GmbH"), null);
});

test("nur Stufe A gratuliert, B und C nicht", () => {
  assert.ok(/glückwunsch/i.test(STUFEN.A.titel));
  assert.ok(!/glückwunsch/i.test(STUFEN.B.titel));
  assert.ok(!/glückwunsch/i.test(STUFEN.C.titel));
  // Und der Bericht nimmt den Titel aus der Stufe, nicht aus der Laune.
  for (const stufe of ["A", "B", "C"] as const) {
    assert.ok(STUFEN[stufe].titel.length > 10);
  }
});

console.log(`\n${passed} Tests bestanden.\n`);
