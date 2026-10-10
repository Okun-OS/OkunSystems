/**
 * Die Bewertung des OKUN Radar.
 *
 * Regelbasiert, deterministisch und begründbar: Gleiche Antworten ergeben
 * immer dasselbe Ergebnis, und zu jeder Zahl lässt sich sagen, aus welchen
 * Antworten sie entstanden ist. Es gibt keinen Zufall, keine erfundenen
 * Prozentzahlen und keine Einsparversprechen — das Radar misst, was der
 * Betrieb gesagt hat, und sonst nichts.
 *
 * Drei Dinge sind hier wichtiger als ein hoher Wert:
 *
 *  1. **Ein ehrliches Nein muss möglich sein.** Stufe C ist kein Fehlerfall,
 *     sondern ein reguläres Ergebnis. Wer gut aufgestellt ist, bekommt das
 *     gesagt.
 *  2. **Fehlende Antworten senken die Aussagekraft, statt still durchzugehen.**
 *     Unter der Schwelle gibt es keine Zahlen, sondern Kategorien — und kein
 *     klares Urteil, weder zu noch ab.
 *  3. **Die Achsen bleiben getrennt.** Ein niedriger Reifegrad erzeugt keinen
 *     hohen Fit. Wer das koppelt, bekommt am Ende immer das Ergebnis, das er
 *     sich wünscht.
 */

import {
  ACHSEN_LABEL,
  FRAGEN,
  KATALOG_VERSION,
  POTENZIALFELDER,
  SCHWELLEN,
  STUFEN,
  SPOTLIGHT_PROZESSE,
  WIDERSPRUECHE,
  band,
  frage as frageAusKatalog,
  type ErgebnisStufe,
  type PotenzialfeldKey,
  type RadarAchse,
  type RadarBedingung,
  type RadarFrage,
  type RadarOption,
} from "./catalog";

// ─── Eingaben ────────────────────────────────────────────────────────────────

export type RadarAntwort = {
  frageKey: string;
  /** Gewählte Antwortoptionen. Leer bei übersprungenen Fragen. */
  optionKeys: string[];
  uebersprungen?: boolean;
};

export type RadarEingabe = {
  antworten: RadarAntwort[];
  /** Der im Spotlight gewählte Prozess. */
  spotlightKey?: string | null;
  /** Im Profil angegebene Bereiche — steuert die Spotlight-Vorauswahl. */
  bereiche?: string[];
};

// ─── Ergebnis ────────────────────────────────────────────────────────────────

export type AchsenErgebnis = {
  achse: RadarAchse;
  label: string;
  /** Normiert auf 0–100. Nur belastbar, wenn `zahlenBelastbar` gilt. */
  wert: number;
  /** „gering“ | „mittel“ | „hoch“ — trägt auch ohne belastbare Zahl. */
  band: string;
  /** Wie viele beantwortete Fragen auf diese Achse eingezahlt haben. */
  beitraege: number;
};

export type PotenzialfeldErgebnis = {
  key: PotenzialfeldKey;
  label: string;
  beschreibung: string;
  /** Die Antworten, die dieses Feld stützen. Ohne Beleg kein Feld. */
  belege: string[];
};

export type RadarErgebnis = {
  katalogVersion: string;
  achsen: AchsenErgebnis[];
  /** Abdeckung der aktiven Kernfragen in Prozent. */
  aussagekraft: number;
  /** Reichen die Antworten für Zahlen — oder nur für Kategorien? */
  zahlenBelastbar: boolean;
  stufe: ErgebnisStufe;
  stufeTitel: string;
  /** Warum genau diese Stufe. Intern; der Closer muss es vertreten können. */
  stufeGrund: string[];
  felder: PotenzialfeldErgebnis[];
  /** Alle Belege je Achse, in Katalogreihenfolge. */
  belege: Record<RadarAchse, string[]>;
  widersprueche: string[];
  /** Aktive Kernfragen, die offen geblieben sind. */
  offeneFragen: Array<{ frageKey: string; frage: string }>;
  spotlight: { key: string; label: string } | null;
  /** Zwei bis vier Sätze für den Kunden. Aus den Daten, nicht aus Textbausteinen. */
  einschaetzung: string;
  naechsterSchritt: string;
  blueprintEmpfohlen: boolean;
  blueprintBegruendung: string | null;
  berechnetAm: string;
};

// ─── Aktive Fragen ───────────────────────────────────────────────────────────

type Gewaehlt = {
  frage: RadarFrage;
  optionen: RadarOption[];
  /** Beantwortet im Sinne der Abdeckung: nicht übersprungen, nicht „weiß nicht“. */
  zaehlt: boolean;
  uebersprungen: boolean;
};

function istUnbekannt(optionen: RadarOption[]): boolean {
  return optionen.length > 0 && optionen.every((o) => o.unbekannt);
}

/**
 * Welche Fragen in dieser Analyse überhaupt gestellt werden.
 *
 * Wird in Katalogreihenfolge ausgewertet, weil Bedingungen sich auf frühere
 * Antworten und auf den bis dahin aufgelaufenen Achsenwert beziehen dürfen.
 * Eine Frage, die ihre Bedingung verliert, weil eine frühere Antwort geändert
 * wurde, fällt damit automatisch wieder heraus — mitsamt ihrer Antwort.
 */
export function aktiveFragen(eingabe: RadarEingabe): RadarFrage[] {
  const nachKey = new Map(eingabe.antworten.map((a) => [a.frageKey, a]));
  const aktiv: RadarFrage[] = [];
  const beantwortet = new Map<string, string[]>();
  const laufwert: Record<RadarAchse, number> = { reife: 0, potenzial: 0, fit: 0 };

  for (const f of FRAGEN) {
    // Spotlight-Fragen erscheinen erst, wenn ein Prozess gewählt ist.
    if (f.phase === "spotlight" && !eingabe.spotlightKey) continue;
    if (f.wenn && !f.wenn.every((b) => pruefeBedingung(b, beantwortet, laufwert))) continue;

    aktiv.push(f);

    const antwort = nachKey.get(f.key);
    if (!antwort || antwort.uebersprungen) continue;
    const optionen = aufloesen(f, antwort.optionKeys);
    if (optionen.length === 0) continue;

    beantwortet.set(f.key, optionen.map((o) => o.key));
    for (const o of optionen) {
      for (const s of o.signale) laufwert[s.achse] += s.wert;
    }
  }

  return aktiv;
}

function pruefeBedingung(
  b: RadarBedingung,
  beantwortet: Map<string, string[]>,
  laufwert: Record<RadarAchse, number>
): boolean {
  switch (b.art) {
    case "antwort_ist": {
      const gewaehlt = beantwortet.get(b.frage);
      return Boolean(gewaehlt?.some((k) => b.optionen.includes(k)));
    }
    case "antwort_ist_nicht": {
      const gewaehlt = beantwortet.get(b.frage);
      if (!gewaehlt) return false;
      return !gewaehlt.some((k) => b.optionen.includes(k));
    }
    case "beantwortet":
      return beantwortet.has(b.frage);
    case "laufwert_mindestens":
      return laufwert[b.achse] >= b.wert;
    case "laufwert_hoechstens":
      return laufwert[b.achse] <= b.wert;
  }
}

function aufloesen(f: RadarFrage, optionKeys: string[]): RadarOption[] {
  const gefunden = optionKeys
    .map((k) => f.optionen.find((o) => o.key === k))
    .filter((o): o is RadarOption => Boolean(o));

  // Eine ausschließende Antwort verträgt sich mit keiner anderen. Kommt sie
  // mit, gilt nur sie — egal, in welcher Reihenfolge gespeichert wurde.
  const alleine = gefunden.find((o) => o.unbekannt || o.keinBefund);
  if (alleine) return [alleine];

  return f.modus === "einfach" ? gefunden.slice(0, 1) : gefunden;
}

/**
 * Die nächste Frage, die noch nicht beantwortet ist. Grundlage für das
 * Weiterschalten im Gespräch.
 */
export function naechsteOffeneFrage(eingabe: RadarEingabe): RadarFrage | null {
  const beantwortet = new Set(
    eingabe.antworten.filter((a) => a.optionKeys.length > 0 || a.uebersprungen).map((a) => a.frageKey)
  );
  return aktiveFragen(eingabe).find((f) => !beantwortet.has(f.key)) ?? null;
}

// ─── Achsenrechnung ──────────────────────────────────────────────────────────

/**
 * Spanne, die eine Frage auf einer Achse überhaupt erzeugen kann.
 *
 * Bei Mehrfachauswahl wird die Spanne aus den drei stärksten Optionen
 * gebildet, nicht aus allen: Wer sechs Zeitfresser nennt, hat nicht doppelt so
 * viel Potenzial wie jemand mit dreien — er hat es nur breiter verteilt. Der
 * tatsächliche Wert wird in dieselbe Spanne gestaucht.
 */
const MEHRFACH_GEWERTET = 3;

function spanne(f: RadarFrage, achse: RadarAchse): { min: number; max: number } {
  const werte = f.optionen.map(
    (o) => o.signale.filter((s) => s.achse === achse).reduce((sum, s) => sum + s.wert, 0)
  );
  if (werte.length === 0) return { min: 0, max: 0 };

  if (f.modus === "einfach") {
    return { min: Math.min(...werte), max: Math.max(...werte) };
  }

  const positiv = werte.filter((w) => w > 0).sort((a, b) => b - a).slice(0, MEHRFACH_GEWERTET);
  const negativ = werte.filter((w) => w < 0).sort((a, b) => a - b).slice(0, MEHRFACH_GEWERTET);
  return {
    min: negativ.reduce((s, w) => s + w, 0),
    max: positiv.reduce((s, w) => s + w, 0),
  };
}

function istWert(gewaehlt: RadarOption[], achse: RadarAchse): number {
  return gewaehlt.reduce(
    (sum, o) => sum + o.signale.filter((s) => s.achse === achse).reduce((s2, s) => s2 + s.wert, 0),
    0
  );
}

// ─── Bewertung ───────────────────────────────────────────────────────────────

export function bewerteRadar(eingabe: RadarEingabe): RadarErgebnis {
  const aktiv = aktiveFragen(eingabe);
  const nachKey = new Map(eingabe.antworten.map((a) => [a.frageKey, a]));

  const gewaehlt: Gewaehlt[] = aktiv.map((f) => {
    const a = nachKey.get(f.key);
    const optionen = a && !a.uebersprungen ? aufloesen(f, a.optionKeys) : [];
    return {
      frage: f,
      optionen,
      uebersprungen: Boolean(a?.uebersprungen) || optionen.length === 0,
      zaehlt: optionen.length > 0 && !istUnbekannt(optionen),
    };
  });

  // ── Abdeckung ──────────────────────────────────────────────────────────
  const kernfragen = gewaehlt.filter((g) => g.frage.kern);
  const aussagekraft =
    kernfragen.length === 0
      ? 0
      : Math.round((kernfragen.filter((g) => g.zaehlt).length / kernfragen.length) * 100);
  const zahlenBelastbar = aussagekraft >= SCHWELLEN.aussagekraftFuerZahlen;

  // ── Achsen ─────────────────────────────────────────────────────────────
  const achsen: AchsenErgebnis[] = (["reife", "potenzial", "fit"] as RadarAchse[]).map((achse) => {
    let ist = 0;
    let min = 0;
    let max = 0;
    let beitraege = 0;

    for (const g of gewaehlt) {
      if (g.optionen.length === 0) continue;
      const s = spanne(g.frage, achse);
      if (s.max === s.min) continue; // Die Frage sagt zu dieser Achse nichts.
      const roh = istWert(g.optionen, achse);
      ist += Math.min(Math.max(roh, s.min), s.max);
      min += s.min;
      max += s.max;
      beitraege++;
    }

    const wert = max === min ? 0 : Math.round(((ist - min) / (max - min)) * 100);
    const begrenzt = Math.min(100, Math.max(0, wert));
    return {
      achse,
      label: ACHSEN_LABEL[achse],
      wert: begrenzt,
      band: band(begrenzt),
      beitraege,
    };
  });

  const wertVon = (a: RadarAchse) => achsen.find((x) => x.achse === a)!.wert;

  // ── Belege ─────────────────────────────────────────────────────────────
  const belege: Record<RadarAchse, string[]> = { reife: [], potenzial: [], fit: [] };
  for (const g of gewaehlt) {
    for (const o of g.optionen) {
      for (const s of o.signale) {
        if (s.wert === 0) continue;
        if (!belege[s.achse].includes(o.beleg)) belege[s.achse].push(o.beleg);
      }
    }
  }

  // ── Potenzialfelder ────────────────────────────────────────────────────
  const feldBelege = new Map<PotenzialfeldKey, string[]>();
  for (const g of gewaehlt) {
    for (const o of g.optionen) {
      for (const feld of o.felder ?? []) {
        const liste = feldBelege.get(feld) ?? [];
        if (!liste.includes(o.beleg)) liste.push(o.beleg);
        feldBelege.set(feld, liste);
      }
    }
  }
  const felder: PotenzialfeldErgebnis[] = [...feldBelege.entries()]
    .filter(([, b]) => b.length >= SCHWELLEN.belegeProFeld)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([key, b]) => ({
      key,
      label: POTENZIALFELDER[key].label,
      beschreibung: POTENZIALFELDER[key].beschreibung,
      belege: b,
    }));

  // ── Widersprüche ───────────────────────────────────────────────────────
  const gewaehltNachFrage = new Map(gewaehlt.map((g) => [g.frage.key, g.optionen.map((o) => o.key)]));
  const widersprueche = WIDERSPRUECHE.filter((w) =>
    w.wenn.every(({ frage, optionen }) =>
      (gewaehltNachFrage.get(frage) ?? []).some((k) => optionen.includes(k))
    )
  ).map((w) => w.text);

  // ── Offene Kernfragen ──────────────────────────────────────────────────
  const offeneFragen = kernfragen
    .filter((g) => !g.zaehlt)
    .map((g) => ({ frageKey: g.frage.key, frage: g.frage.frage }));

  // ── Stufe ──────────────────────────────────────────────────────────────
  const { stufe, gruende } = bestimmeStufe({
    aussagekraft,
    potenzial: wertVon("potenzial"),
    fit: wertVon("fit"),
    reife: wertVon("reife"),
    felder,
    widersprueche: widersprueche.length,
    offene: offeneFragen.length,
  });

  const spotlight = eingabe.spotlightKey
    ? (SPOTLIGHT_PROZESSE.find((p) => p.key === eingabe.spotlightKey) ?? null)
    : null;

  const blueprint = empfiehltBlueprint(stufe, wertVon("potenzial"), felder, aussagekraft);

  return {
    katalogVersion: KATALOG_VERSION,
    achsen,
    aussagekraft,
    zahlenBelastbar,
    stufe,
    stufeTitel: STUFEN[stufe].titel,
    stufeGrund: gruende,
    felder,
    belege,
    widersprueche,
    offeneFragen,
    spotlight: spotlight ? { key: spotlight.key, label: spotlight.label } : null,
    einschaetzung: formuliereEinschaetzung({
      stufe,
      achsen,
      felder,
      zahlenBelastbar,
      widersprueche,
      offene: offeneFragen.length,
      spotlightLabel: spotlight?.label ?? null,
    }),
    naechsterSchritt: STUFEN[stufe].naechsterSchritt,
    blueprintEmpfohlen: blueprint.empfohlen,
    blueprintBegruendung: blueprint.begruendung,
    berechnetAm: new Date().toISOString(),
  };
}

/**
 * Die Stufenentscheidung.
 *
 * Die Reihenfolge der Prüfungen ist die eigentliche Aussage: Zuerst wird
 * gefragt, ob die Daten überhaupt für ein Urteil reichen. Erst danach darf es
 * ein Urteil geben — und ein „kein Bedarf“ kommt vor einem „hohes Potenzial“,
 * damit ein starker Einzelwert kein schwaches Gesamtbild überstimmt.
 *
 * Zwei Wege führen zu Stufe A, und der zweite ist der wichtigere:
 *
 *  • **Breiter Bedarf.** Potenzial und Passung liegen beide hoch. Der
 *    klassische Fall: Im Betrieb liegt vieles im Argen.
 *  • **Konzentrierter Bedarf.** Das Gesamtpotenzial ist nur mittel, weil der
 *    Betrieb in den meisten Punkten gut dasteht — aber zwei Felder sind
 *    dicht belegt und die Passung ist hoch. Ohne diesen Weg könnte ein
 *    durchdigitalisierter Betrieb mit einem ernsten Integrationsproblem nie
 *    Stufe A erreichen: Die Potenzialachse misst, wie viel im Ganzen hakt,
 *    nicht, wie viel an einer Stelle hakt. Genau solche Betriebe sind aber
 *    oft die besten Kunden, die wir bekommen können.
 */
function bestimmeStufe(input: {
  aussagekraft: number;
  potenzial: number;
  fit: number;
  reife: number;
  felder: PotenzialfeldErgebnis[];
  widersprueche: number;
  offene: number;
}): { stufe: ErgebnisStufe; gruende: string[] } {
  const gruende: string[] = [];

  if (input.aussagekraft < SCHWELLEN.aussagekraftFuerUrteil) {
    gruende.push(
      `Abdeckung ${input.aussagekraft} % der Kernfragen — unter ${SCHWELLEN.aussagekraftFuerUrteil} %. Für ein klares Urteil in die eine oder andere Richtung reicht das nicht.`
    );
    if (input.offene > 0) gruende.push(`${input.offene} Kernfragen sind offen geblieben.`);
    return { stufe: "B", gruende };
  }

  if (input.potenzial < SCHWELLEN.niedrig) {
    gruende.push(
      `Optimierungspotenzial ${input.potenzial} von 100 — unter ${SCHWELLEN.niedrig}. Der Betrieb ist in den betrachteten Punkten gut aufgestellt.`
    );
    return { stufe: "C", gruende };
  }

  if (input.fit < SCHWELLEN.niedrig) {
    gruende.push(
      `Passung ${input.fit} von 100 — unter ${SCHWELLEN.niedrig}. Potenzial ist erkennbar, aber Relevanz oder Bereitschaft tragen eine Umsetzung heute nicht.`
    );
    return { stufe: "C", gruende };
  }

  const dichtBelegt = input.felder.filter((f) => f.belege.length >= SCHWELLEN.belegeDichtesFeld);
  const breit = input.potenzial >= SCHWELLEN.hoch && input.fit >= SCHWELLEN.hoch;
  const konzentriert =
    !breit && input.fit >= SCHWELLEN.hoch && dichtBelegt.length >= 2;

  if (breit || konzentriert) {
    if (input.widersprueche >= 2) {
      gruende.push(
        `Potenzial ${input.potenzial} und Passung ${input.fit} tragen eine Empfehlung — aber ${input.widersprueche} Angaben widersprechen sich. Das ist vor einer Zusage zu klären.`
      );
      return { stufe: "B", gruende };
    }
    gruende.push(
      breit
        ? `Optimierungspotenzial ${input.potenzial} und Passung ${input.fit} liegen beide über ${SCHWELLEN.hoch}.`
        : `Passung ${input.fit}. Das Gesamtpotenzial liegt mit ${input.potenzial} nur im Mittelfeld — der Betrieb steht in den meisten Punkten gut da. Der Bedarf sitzt konzentriert: ${dichtBelegt
            .map((f) => `${f.label} (${f.belege.length} Belege)`)
            .join(", ")}.`
    );
    return { stufe: "A", gruende };
  }

  gruende.push(
    `Optimierungspotenzial ${input.potenzial}, Passung ${input.fit}. Anhaltspunkte ja, aber nicht beide über ${SCHWELLEN.hoch}.`
  );
  return { stufe: "B", gruende };
}

/**
 * Der Blueprint wird nur empfohlen, wenn es dafür einen sachlichen Grund gibt.
 *
 * Er ist kostenpflichtig. Ihn an jedes Ergebnis zu hängen, wäre genau der
 * Reflex, den das Radar vermeiden soll. Eine Preisangabe entsteht hier nicht —
 * die kommt ausschließlich aus einem konfigurierten Angebot.
 */
function empfiehltBlueprint(
  stufe: ErgebnisStufe,
  potenzial: number,
  felder: PotenzialfeldErgebnis[],
  aussagekraft: number
): { empfohlen: boolean; begruendung: string | null } {
  if (stufe === "C") return { empfohlen: false, begruendung: null };

  if (stufe === "A" && felder.length > 0) {
    return {
      empfohlen: true,
      begruendung: `Die Kurzanalyse zeigt ${felder.length === 1 ? "ein Feld" : `${felder.length} Felder`} mit belegtem Handlungsbedarf (${felder.map((f) => f.label).join(", ")}). Was dort tatsächlich steckt, lässt sich erst mit einer vollständigen Erhebung beziffern.`,
    };
  }

  if (stufe === "B" && potenzial >= SCHWELLEN.hoch) {
    return {
      empfohlen: true,
      begruendung:
        "Das Potenzial ist erkennbar, die Kurzanalyse trägt für eine Umsetzungsempfehlung aber nicht. Eine vollständige Erhebung würde die offenen Punkte schließen.",
    };
  }

  if (stufe === "B" && aussagekraft < SCHWELLEN.aussagekraftFuerUrteil) {
    return {
      empfohlen: false,
      begruendung:
        "Vor einer vertieften Analyse sollten zunächst die offenen Fragen aus diesem Gespräch geklärt werden.",
    };
  }

  return { empfohlen: false, begruendung: null };
}

/**
 * Die Ersteinschätzung für den Kunden: zwei bis vier Sätze, aus seinen eigenen
 * Antworten zusammengesetzt. Keine Textbausteine, die zu jedem Ergebnis
 * passen — und keine Einsparversprechen, weil das Radar dafür nicht genug
 * weiß.
 */
function formuliereEinschaetzung(input: {
  stufe: ErgebnisStufe;
  achsen: AchsenErgebnis[];
  felder: PotenzialfeldErgebnis[];
  zahlenBelastbar: boolean;
  widersprueche: string[];
  offene: number;
  spotlightLabel: string | null;
}): string {
  const reife = input.achsen.find((a) => a.achse === "reife")!;
  const potenzial = input.achsen.find((a) => a.achse === "potenzial")!;
  const saetze: string[] = [];

  const reifeSatz = input.zahlenBelastbar
    ? `Ihr Betrieb erreicht beim digitalen Reifegrad ${reife.wert} von 100 Punkten`
    : `Ihr Betrieb ist digital ${reife.band} aufgestellt`;

  if (input.stufe === "C") {
    saetze.push(
      `${reifeSatz} — in den Punkten, die wir heute betrachtet haben, läuft das rund.`
    );
    saetze.push(
      "Wir sehen daraus aktuell keinen Handlungsbedarf, der eine umfassende Zusammenarbeit mit uns rechtfertigen würde."
    );
    saetze.push(
      "Das ist ausdrücklich ein gutes Ergebnis. Wenn sich etwas verändert, schauen wir gern erneut darauf."
    );
    return saetze.join(" ");
  }

  if (input.stufe === "B") {
    saetze.push(`${reifeSatz}.`);
    if (input.offene > 0) {
      saetze.push(
        `Zu ${input.offene === 1 ? "einem Punkt" : `${input.offene} Punkten`} konnten wir im Gespräch noch keine belastbare Antwort festhalten — für eine klare Empfehlung fehlt uns das.`
      );
    } else if (input.widersprueche.length > 0) {
      saetze.push(
        "Einzelne Angaben passen noch nicht ganz zusammen; das sollten wir klären, bevor wir etwas versprechen."
      );
    }
    if (input.felder.length > 0) {
      saetze.push(
        `Anhaltspunkte sehen wir bei ${aufzaehlung(input.felder.map((f) => f.label))}.`
      );
    }
    saetze.push("Eine belastbare Aussage braucht einen genaueren Blick als diese Viertelstunde.");
    return saetze.join(" ");
  }

  // Stufe A
  saetze.push(`${reifeSatz}.`);
  saetze.push(
    input.zahlenBelastbar
      ? `Gleichzeitig liegt das erkennbare Optimierungspotenzial bei ${potenzial.wert} von 100 — und zwar belegt durch Ihre eigenen Angaben.`
      : "Gleichzeitig ist das erkennbare Optimierungspotenzial deutlich."
  );
  if (input.felder.length > 0) {
    saetze.push(
      `Am stärksten fällt das bei ${aufzaehlung(input.felder.map((f) => f.label))} auf.`
    );
  }
  if (input.spotlightLabel) {
    saetze.push(
      `Der gemeinsam betrachtete Ablauf „${input.spotlightLabel}“ ist dafür ein gutes Beispiel.`
    );
  }
  return saetze.slice(0, 4).join(" ");
}

function aufzaehlung(teile: string[]): string {
  if (teile.length <= 1) return teile[0] ?? "";
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

// ─── Fortschritt ─────────────────────────────────────────────────────────────

export type RadarFortschritt = {
  gesamt: number;
  beantwortet: number;
  prozent: number;
  proPhase: Array<{ phase: string; gesamt: number; beantwortet: number }>;
};

export function fortschritt(eingabe: RadarEingabe): RadarFortschritt {
  const aktiv = aktiveFragen(eingabe);
  const erledigt = new Set(
    eingabe.antworten.filter((a) => a.optionKeys.length > 0 || a.uebersprungen).map((a) => a.frageKey)
  );
  const phasen = ["potenzial", "spotlight"];
  return {
    gesamt: aktiv.length,
    beantwortet: aktiv.filter((f) => erledigt.has(f.key)).length,
    prozent: aktiv.length === 0 ? 0 : Math.round((aktiv.filter((f) => erledigt.has(f.key)).length / aktiv.length) * 100),
    proPhase: phasen.map((phase) => {
      const fragen = aktiv.filter((f) => f.phase === phase);
      return {
        phase,
        gesamt: fragen.length,
        beantwortet: fragen.filter((f) => erledigt.has(f.key)).length,
      };
    }),
  };
}

/**
 * Antworten, die im Gespräch auffallen sollten.
 *
 * Der Closer sieht daran, wo es sich lohnt nachzuhaken — ohne dass der
 * Interessent erfährt, dass eine Antwort „auffällig“ war.
 */
export function auffaelligeAntworten(eingabe: RadarEingabe): Array<{
  frageKey: string;
  optionKey: string;
  grund: string;
}> {
  const auffaellig: Array<{ frageKey: string; optionKey: string; grund: string }> = [];
  for (const a of eingabe.antworten) {
    const f = frageAusKatalog(a.frageKey);
    if (!f) continue;
    for (const o of aufloesen(f, a.optionKeys)) {
      const potenzial = o.signale.find((s) => s.achse === "potenzial")?.wert ?? 0;
      const fit = o.signale.find((s) => s.achse === "fit")?.wert ?? 0;
      if (potenzial >= 3) {
        auffaellig.push({ frageKey: f.key, optionKey: o.key, grund: "starker Potenzialhinweis" });
      } else if (fit <= -1.5) {
        auffaellig.push({ frageKey: f.key, optionKey: o.key, grund: "spricht gegen eine Zusammenarbeit" });
      } else if (o.unbekannt) {
        auffaellig.push({ frageKey: f.key, optionKey: o.key, grund: "offen geblieben" });
      }
    }
  }
  return auffaellig;
}

/** Vorschlagsreihenfolge der Spotlight-Prozesse, abgeleitet aus dem Profil. */
export function spotlightVorschlaege(bereiche: string[]): Array<{ key: string; label: string; empfohlen: boolean }> {
  return SPOTLIGHT_PROZESSE.map((p) => ({
    key: p.key,
    label: p.label,
    empfohlen: p.bereiche.length > 0 && p.bereiche.some((b) => bereiche.includes(b)),
  })).sort((a, b) => Number(b.empfohlen) - Number(a.empfohlen));
}
