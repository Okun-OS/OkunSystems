/**
 * Die Arten von Terminen.
 *
 * Bisher stand die Liste an vier Stellen verstreut und jedes Mal anders: im
 * Portal des Kunden als Beschriftungstabelle, in der Terminseite des Admins
 * als Sonderfall für „STRATEGY", in `daily.ts` als Zeile, die alles außer
 * dem Closing zu „strategiegespraech" erklärte, und im Anlegeformular gar
 * nicht — dort wurde jeder Termin stillschweigend ein Strategiegespräch.
 *
 * Hier steht sie einmal. Eine neue Art hinzuzufügen heißt: eine Zeile.
 */

export type Terminart = {
  key: string;
  label: string;
  /** Ein Satz fürs Anlegen — wofür ist diese Art gedacht? */
  hinweis: string;
  /**
   * Der Namensraum des Videoraums bei Daily. `null` heißt: kein Video,
   * etwa bei einem Termin vor Ort.
   */
  raumPraefix: string | null;
  /** Darf im Anlegeformular gewählt werden. */
  waehlbar: boolean;
  /**
   * Hat die Art einen eigenen Arbeitsplatz?
   *
   * Strategiegespräch und Closing bringen ihre eigene Fläche mit — Haus,
   * Auswahl, Angebot. Alles andere läuft in der schlichten Besprechung.
   */
  eigenerArbeitsplatz: boolean;
};

export const TERMINARTEN: Terminart[] = [
  {
    key: "STRATEGY",
    label: "Strategiegespräch",
    hinweis: "Schritt 3: Ergebnisse, Auswahl und das Haus. Wird gesondert vorbereitet.",
    raumPraefix: "strategiegespraech",
    waehlbar: true,
    eigenerArbeitsplatz: true,
  },
  {
    key: "CLOSING_CALL",
    label: "Closing-Gespräch",
    hinweis: "Radar, Angebot und Vertragsabschluss.",
    raumPraefix: "closing",
    waehlbar: false,
    eigenerArbeitsplatz: true,
  },
  {
    key: "MEETING",
    label: "Besprechung",
    hinweis:
      "Ein ganz normales Videogespräch mit eigenem Titel — Rückfragen, Abstimmung, " +
      "Check-in. Ohne Haus, ohne Leitfaden.",
    raumPraefix: "besprechung",
    waehlbar: true,
    eigenerArbeitsplatz: false,
  },
  {
    key: "REVIEW",
    label: "Review-Termin",
    hinweis: "Rückblick auf das Umgesetzte.",
    raumPraefix: "besprechung",
    waehlbar: true,
    eigenerArbeitsplatz: false,
  },
  {
    key: "SUPPORT",
    label: "Supporttermin",
    hinweis: "Hilfe zu etwas Konkretem, meist kurz.",
    raumPraefix: "besprechung",
    waehlbar: true,
    eigenerArbeitsplatz: false,
  },
  {
    key: "ONSITE",
    label: "Vor Ort",
    hinweis: "Termin beim Kunden — kein Videoraum.",
    raumPraefix: null,
    waehlbar: true,
    eigenerArbeitsplatz: false,
  },
];

/** Die Standardart, wenn nichts gewählt wurde. */
export const STANDARD_ART = "MEETING";

export function terminart(key: string | null | undefined): Terminart | null {
  if (!key) return null;
  return TERMINARTEN.find((a) => a.key === key) ?? null;
}

/**
 * Die Beschriftung einer Art.
 *
 * Unbekannte Schlüssel geben den rohen Wert zurück statt „Sonstiger Termin":
 * Wer einen Termin mit einer Art aus einer älteren Fassung öffnet, soll
 * sehen, was dort steht, und nicht eine Beschriftung, die etwas anderes
 * behauptet.
 */
export function terminartLabel(key: string | null | undefined): string {
  if (!key) return "Termin";
  return terminart(key)?.label ?? key;
}

/** Bekommt diese Art einen Videoraum? */
export function hatVideoraum(key: string | null | undefined): boolean {
  return Boolean(terminart(key)?.raumPraefix);
}

/**
 * Wohin dieser Termin führt.
 *
 * Strategiegespräch und Closing haben eigene Arbeitsplätze, die anderswo
 * aufgesetzt werden. Alles mit Videoraum und ohne eigenen Arbeitsplatz
 * landet in der schlichten Besprechung.
 */
export function fuehrtZurBesprechung(key: string | null | undefined): boolean {
  const art = terminart(key);
  return Boolean(art && art.raumPraefix && !art.eigenerArbeitsplatz);
}

/** Die Arten, die im Anlegeformular zur Wahl stehen. */
export function waehlbareArten(): Terminart[] {
  return TERMINARTEN.filter((a) => a.waehlbar);
}
