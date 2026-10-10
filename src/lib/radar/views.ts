import {
  ACHSEN_FRAGE,
  PHASEN,
  PROFIL_FELDER,
  SCHWELLEN,
  SPOTLIGHT_PROZESSE,
  STUFEN,
  frage as frageAusKatalog,
  type ErgebnisStufe,
  type RadarPhase,
} from "./catalog";
import {
  aktiveFragen,
  auffaelligeAntworten,
  fortschritt,
  naechsteOffeneFrage,
  spotlightVorschlaege,
  type RadarErgebnis,
} from "./engine";
import type { RadarDatensatz } from "./service";

/**
 * Was die beiden Seiten voneinander sehen.
 *
 * Hier verläuft die Grenze, auf die es ankommt: Die Kundensicht wird eigens
 * zusammengestellt, nicht gefiltert. Ein Feld landet dort nur, wenn es hier
 * ausdrücklich hineingeschrieben wird — und nicht, weil jemand vergessen hat,
 * es zu entfernen. Deshalb gibt es keine gemeinsame Basis, von der die
 * Kundensicht etwas abzieht.
 *
 * Nie auf der Kundenseite: Gewichte und Signalwerte, die Absicht hinter einer
 * Frage, die Belege je Achse, die Begründung der Stufe, erkannte
 * Widersprüche, auffällige Antworten, die interne Notiz, die abweichende
 * Einschätzung des Closers.
 */

// ─── Gemeinsame Darstellung einer Frage ──────────────────────────────────────

export type FrageAnsicht = {
  key: string;
  phase: RadarPhase;
  frage: string;
  modus: "einfach" | "mehrfach";
  nummer: number;
  gesamt: number;
  optionen: Array<{ key: string; label: string; hinweis: string | null }>;
};

/**
 * Eine Frage so, wie beide Seiten sie sehen: Text und Antworten, sonst
 * nichts. `signale`, `felder`, `beleg` und `absicht` bleiben zurück — der
 * Interessent soll antworten, nicht rechnen, und wer die Punkte kennt, klickt
 * irgendwann die Punkte statt der Wahrheit.
 */
function frageAnsicht(key: string, aktiv: Array<{ key: string }>): FrageAnsicht | null {
  const f = frageAusKatalog(key);
  if (!f) return null;
  const index = aktiv.findIndex((a) => a.key === key);
  return {
    key: f.key,
    phase: f.phase,
    frage: f.frage,
    modus: f.modus,
    nummer: index >= 0 ? index + 1 : 0,
    gesamt: aktiv.length,
    optionen: f.optionen.map((o) => ({
      key: o.key,
      label: o.label,
      hinweis: o.hinweis ?? null,
    })),
  };
}

// ─── Kundensicht ─────────────────────────────────────────────────────────────

export type KundenErgebnis = {
  stufe: ErgebnisStufe;
  stufeTitel: string;
  einschaetzung: string;
  naechsterSchritt: string;
  achsen: Array<{
    label: string;
    frage: string;
    /** Null, wenn die Abdeckung für eine Zahl nicht reicht. */
    wert: number | null;
    band: string;
  }>;
  /**
   * Wie belastbar diese Viertelstunde ist. Steht ausdrücklich auch auf der
   * Kundenseite: Eine Kurzdiagnose, die ihre eigenen Grenzen verschweigt,
   * verkauft sich besser und ist weniger wert.
   */
  aussagekraft: number;
  zahlenBelastbar: boolean;
  felder: Array<{ label: string; beschreibung: string; belege: string[] }>;
  spotlight: { label: string } | null;
  blueprintEmpfohlen: boolean;
  blueprintBegruendung: string | null;
  erstelltAm: string;
};

export type RadarKundenAnsicht = {
  sessionId: string;
  rev: number;
  companyName: string;
  closerName: string | null;
  phase: RadarPhase | "ergebnis";
  phasen: Array<{ key: string; label: string; aktiv: boolean; erledigt: boolean }>;
  fortschritt: { beantwortet: number; gesamt: number; prozent: number };
  profilFelder: Array<{
    key: string;
    label: string;
    art: string;
    optionen: Array<{ key: string; label: string }> | null;
    wert: string | string[] | null;
  }>;
  frage: FrageAnsicht | null;
  /** Die bereits gegebenen Antworten — damit der Kunde korrigieren kann. */
  antworten: Record<string, string[]>;
  /**
   * Die bereits beantworteten Fragen im Volltext.
   *
   * Damit kann der Interessent eine Angabe von sich aus richtigstellen, ohne
   * dass der Berater erst dorthin zurückblättern muss — und ohne dass die
   * gemeinsame Ansicht springt. „Frage P5“ als Auswahl anzubieten wäre keine
   * Korrekturmöglichkeit, sondern ein Rätsel.
   */
  beantworteteFragen: FrageAnsicht[];
  spotlightAuswahl: Array<{ key: string; label: string }> | null;
  spotlightGewaehlt: { key: string; label: string } | null;
  ergebnis: KundenErgebnis | null;
  abgeschlossen: boolean;
};

export function kundenAnsicht(d: RadarDatensatz): RadarKundenAnsicht {
  const bereiche = Array.isArray(d.profil.bereiche) ? d.profil.bereiche : [];
  const eingabe = { antworten: d.antworten, spotlightKey: d.spotlightKey, bereiche };
  const aktiv = aktiveFragen(eingabe);
  const f = fortschritt(eingabe);

  const antworten: Record<string, string[]> = {};
  for (const a of d.antworten) {
    if (!a.uebersprungen) antworten[a.frageKey] = a.optionKeys;
  }

  // Das Ergebnis erst, wenn der Closer es freigegeben hat. Vorher soll er es
  // erklären können, statt dass der Kunde es vor ihm liest.
  const ergebnis =
    d.freigegebenAm && d.ergebnis ? kundenErgebnis(d.ergebnis, d.ergebnisAm ?? d.erstelltAm) : null;

  return {
    sessionId: d.id,
    rev: d.rev,
    companyName: d.companyName,
    closerName: d.closerName,
    phase: d.phase,
    phasen: PHASEN.map((p, i) => ({
      key: p.key,
      label: p.label,
      aktiv: d.phase === p.key,
      erledigt:
        d.phase === "ergebnis" ||
        PHASEN.findIndex((x) => x.key === d.phase) > i,
    })),
    fortschritt: { beantwortet: f.beantwortet, gesamt: f.gesamt, prozent: f.prozent },
    profilFelder: PROFIL_FELDER.map((feld) => ({
      key: feld.key,
      label: feld.label,
      art: feld.art,
      optionen: feld.optionen ? feld.optionen.map((o) => ({ key: o.key, label: o.label })) : null,
      wert: d.profil[feld.key] ?? null,
    })),
    frage: d.cursorKey ? frageAnsicht(d.cursorKey, aktiv) : null,
    antworten,
    beantworteteFragen: aktiv
      .filter((f) => antworten[f.key]?.length)
      .map((f) => frageAnsicht(f.key, aktiv))
      .filter((f): f is FrageAnsicht => Boolean(f)),
    spotlightAuswahl:
      d.phase === "spotlight" && !d.spotlightKey
        ? spotlightVorschlaege(bereiche).map((p) => ({ key: p.key, label: p.label }))
        : null,
    spotlightGewaehlt: d.spotlightKey
      ? (() => {
          const p = SPOTLIGHT_PROZESSE.find((x) => x.key === d.spotlightKey);
          return p ? { key: p.key, label: p.label } : null;
        })()
      : null,
    ergebnis,
    abgeschlossen: Boolean(d.abgeschlossenAm),
  };
}

/**
 * Das Ergebnis in der Fassung für den Kunden.
 *
 * Die Belege der Potenzialfelder bleiben drin — sie sind seine eigenen
 * Aussagen, und ein Feld ohne Begründung wäre eine Behauptung. Die Belege je
 * Achse, die Stufenbegründung mit ihren Rohwerten und die Widersprüche
 * bleiben draußen: Das ist Werkzeug des Closers, kein Ergebnis.
 */
export function kundenErgebnis(e: RadarErgebnis, erstelltAm: Date | string): KundenErgebnis {
  return {
    stufe: e.stufe,
    stufeTitel: e.stufeTitel,
    einschaetzung: e.einschaetzung,
    naechsterSchritt: STUFEN[e.stufe].naechsterSchritt,
    achsen: e.achsen.map((a) => ({
      label: a.label,
      frage: ACHSEN_FRAGE[a.achse],
      wert: e.zahlenBelastbar ? a.wert : null,
      band: a.band,
    })),
    aussagekraft: e.aussagekraft,
    zahlenBelastbar: e.zahlenBelastbar,
    felder: e.felder.map((f) => ({
      label: f.label,
      beschreibung: f.beschreibung,
      belege: f.belege,
    })),
    spotlight: e.spotlight ? { label: e.spotlight.label } : null,
    blueprintEmpfohlen: e.blueprintEmpfohlen,
    blueprintBegruendung: e.blueprintBegruendung,
    erstelltAm: typeof erstelltAm === "string" ? erstelltAm : erstelltAm.toISOString(),
  };
}

// ─── Closersicht ─────────────────────────────────────────────────────────────

export type CloserFrageAnsicht = FrageAnsicht & {
  /** Worauf die Frage hinauswill. */
  absicht: string;
  /** Ein Satz zum Vorlesen, für Kollegen, die den Betrieb nicht kennen. */
  vorlesen: string | null;
  thema: string;
  kern: boolean;
  /** Wer die Antwort gesetzt hat. */
  quelle: "closer" | "client" | null;
  gewaehlt: string[];
  uebersprungen: boolean;
};

export type RadarCloserAnsicht = {
  sessionId: string;
  rev: number;
  status: string;
  phase: RadarPhase | "ergebnis";
  companyName: string;
  katalogVersion: string;
  /** Der Katalog hat sich seit dieser Analyse geändert. */
  katalogVeraltet: boolean;
  profil: Record<string, string | string[]>;
  profilFelder: typeof PROFIL_FELDER;
  fragen: CloserFrageAnsicht[];
  cursorKey: string | null;
  spotlightAuswahl: Array<{ key: string; label: string; empfohlen: boolean }>;
  spotlightKey: string | null;
  fortschritt: { beantwortet: number; gesamt: number; prozent: number };
  auffaellig: Array<{ frageKey: string; optionKey: string; grund: string }>;
  internalNotes: string;
  ergebnis: RadarErgebnis | null;
  closerStufe: string | null;
  closerNotiz: string | null;
  freigegeben: boolean;
  abgeschlossen: boolean;
  /** Die Schwellen, damit das Steuerpult sie nicht selbst kennen muss. */
  schwellen: typeof SCHWELLEN;
};

export function closerAnsicht(d: RadarDatensatz, katalogVersion: string): RadarCloserAnsicht {
  const bereiche = Array.isArray(d.profil.bereiche) ? d.profil.bereiche : [];
  const eingabe = { antworten: d.antworten, spotlightKey: d.spotlightKey, bereiche };
  const aktiv = aktiveFragen(eingabe);
  const f = fortschritt(eingabe);
  const nachKey = new Map(d.antworten.map((a) => [a.frageKey, a]));

  const fragen: CloserFrageAnsicht[] = aktiv.map((frage) => {
    const basis = frageAnsicht(frage.key, aktiv)!;
    const antwort = nachKey.get(frage.key);
    return {
      ...basis,
      absicht: frage.absicht,
      vorlesen: frage.vorlesen ?? null,
      thema: frage.thema,
      kern: Boolean(frage.kern),
      quelle: antwort ? (d.quellen[frage.key] ?? null) : null,
      gewaehlt: antwort?.optionKeys ?? [],
      uebersprungen: Boolean(antwort?.uebersprungen),
    };
  });

  return {
    sessionId: d.id,
    rev: d.rev,
    status: d.status,
    phase: d.phase,
    companyName: d.companyName,
    katalogVersion: d.katalogVersion,
    katalogVeraltet: d.katalogVersion !== katalogVersion,
    profil: d.profil,
    profilFelder: PROFIL_FELDER,
    fragen,
    cursorKey: d.cursorKey,
    spotlightAuswahl: spotlightVorschlaege(bereiche),
    spotlightKey: d.spotlightKey,
    fortschritt: { beantwortet: f.beantwortet, gesamt: f.gesamt, prozent: f.prozent },
    auffaellig: auffaelligeAntworten(eingabe),
    internalNotes: d.internalNotes ?? "",
    ergebnis: d.ergebnis,
    closerStufe: d.closerStufe,
    closerNotiz: d.closerNotiz,
    freigegeben: Boolean(d.freigegebenAm),
    abgeschlossen: Boolean(d.abgeschlossenAm),
    schwellen: SCHWELLEN,
  };
}

/** Die nächste Frage, auf die der Closer weiterschalten würde. */
export function naechsterSchritt(d: RadarDatensatz): { frageKey: string | null; phase: RadarPhase | "ergebnis" } {
  const bereiche = Array.isArray(d.profil.bereiche) ? d.profil.bereiche : [];
  const eingabe = { antworten: d.antworten, spotlightKey: d.spotlightKey, bereiche };
  const offen = naechsteOffeneFrage(eingabe);
  if (offen) return { frageKey: offen.key, phase: offen.phase };
  if (!d.spotlightKey) return { frageKey: null, phase: "spotlight" };
  return { frageKey: null, phase: "ergebnis" };
}
