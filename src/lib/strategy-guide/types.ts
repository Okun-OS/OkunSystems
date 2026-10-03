/**
 * Der Leitfaden für das Strategiegespräch.
 *
 * Interne Unterlage für den Kollegen, der das Gespräch führt — nicht für den
 * Kunden. Er sagt, was wir festgestellt haben, wie man es vorträgt, und welche
 * Projekte sich anbieten, die über das gebuchte Paket hinausgehen.
 */

/** Ein Befund, der im Gespräch vorgetragen wird. */
export interface Kernbefund {
  titel: string;
  /** Die Zahl aus der Auswertung, auf die er sich stützt — wörtlich. */
  beleg: string;
  /** Was das für den Betrieb bedeutet, in Alltagssprache. */
  wirkung: string;
}

/** Ein möglicher Einwand des Kunden samt Antwort. */
export interface Einwand {
  einwand: string;
  antwort: string;
}

/**
 * Ein Vorschlag für ein individuell zu entwickelndes System.
 *
 * Entsteht aus der freien Analyse des Falls und muss die unabhängige Prüfung
 * bestehen, bevor er im Leitfaden steht.
 */
export interface CustomVorschlag {
  titel: string;
  /**
   * Der Befund, auf dem der Vorschlag fußt — die Brücke ins Gespräch.
   * Ohne ihn ist der Vorschlag eine Behauptung.
   */
  aufhaenger: string;
  /** Was gebaut würde. */
  idee: string;
  /** Was der Betrieb davon hat. */
  nutzen: string;
  /** Grobe Einordnung, ausdrücklich als Schätzung. */
  groessenordnung: string;
}

/**
 * Eine fertige Lösung, die wir bei diesem Betrieb einrichten würden.
 *
 * Das Gegenstück zum Custom-Vorschlag: nichts, was gebaut wird, sondern
 * etwas, das es gibt und das zu seinem Betrieb passend eingerichtet werden
 * muss. Das ist für den Kunden oft der schnellere Weg und für uns
 * trotzdem eine Leistung — nur eine andere.
 */
export interface StandardLoesung {
  titel: string;
  /** Die Stelle im Fall, die sie nötig macht. */
  aufhaenger: string;
  /** Was eingerichtet würde und was dabei auf den Betrieb zugeschnitten wird. */
  loesung: string;
  /** Was der Betrieb davon hat. */
  nutzen: string;
  /** Ob das im gebuchten Paket liegt oder darüber. */
  einordnung: string;
}

/**
 * Ein Posten aus dem, was wir für diesen Kunden umsetzen.
 *
 * Der Leitfaden sagte bisher in Fließtext, was wir tun, und blieb dabei
 * ungenau — er nannte eine Lösung und ließ offen, welcher Befund sie nötig
 * macht und in welchen Teil des gebuchten Pakets sie fällt. Der Kollege
 * konnte daraus nicht ableiten, was der Kunde am Ende bekommt.
 */
export interface Umsetzungsposten {
  /** In welchen Block des Pakets das fällt, wörtlich aus dem Leistungsumfang. */
  block: string;
  /** Was eingerichtet, automatisiert oder übernommen wird. */
  titel: string;
  /** Der Befund mit seiner Zahl, der das nötig macht. */
  befund: string;
  /** Was wir dafür konkret tun. */
  wasWirTun: string;
  /** Ob das im gebuchten Paket liegt oder darüber. */
  einordnung: string;
}

/** Ein Vorschlag mit dem Ergebnis der Prüfung. */
export interface GepruefterVorschlag extends CustomVorschlag {
  geprueftInRunde: number;
}

export interface GuideDocument {
  /** 1 — Was wir festgestellt haben, in drei Sätzen. */
  befund: string;
  /** 2 — Der Gesprächseinstieg, ausformuliert zum Vorlesen. */
  gespraechseinstieg: string;
  /** 3 — Die stärksten Befunde, je mit der Zahl dahinter. */
  kernbefunde: Kernbefund[];
  /** 4 — Die Beobachtung, auf die der Kunde selbst nicht gekommen wäre. */
  expertise: string;
  /** 5 — Unsere Empfehlung und die Reihenfolge. */
  empfehlung: string;
  /** 6 — Custom-Projekte, die hier gehen. Geprüft. */
  customVorschlaege: GepruefterVorschlag[];
  /** 7 — Fertige Lösungen, die wir für ihn einrichten würden. */
  standardLoesungen: StandardLoesung[];
  /**
   * 8 — Was wir umsetzen, Posten für Posten.
   *
   * Je Posten: welcher Befund, was wir damit machen, in welchem Teil des
   * gebuchten Pakets das liegt. Daraus muss der Kollege ablesen können,
   * welche Abläufe automatisiert werden und welche digitalen Grundlagen
   * der Kunde bekommt.
   */
  umsetzung: Umsetzungsposten[];
  /**
   * 8b — Wie wir dabei vorgehen.
   *
   * Erhebung, Einrichtung, Übernahme von Daten, Einweisung, Begleitung —
   * die Antwort auf „und wie läuft das dann ab?“.
   */
  unsereLeistung: string;
  /** 9 — Wahrscheinliche Einwände mit Antwort. */
  einwaende: Einwand[];
  /** 10 — Was am Ende vereinbart wird. */
  abschluss: string;
}

/** Das Urteil der unabhängigen Prüfung zu einem Vorschlag. */
export interface Pruefurteil {
  index: number;
  /**
   * Welche Standardprodukte das schon können — zuerst zu beantworten,
   * bevor ein Urteil fällt.
   *
   * Ohne diesen Zwang kann die Prüfung behaupten, etwas müsse gebaut
   * werden, ohne je über den Markt nachgedacht zu haben. Wer erst
   * aufschreiben muss, wer es von der Stange liefert, kann hinterher
   * schlecht das Gegenteil behaupten.
   */
  standardprodukte: string;
  bestanden: boolean;
  begruendung: string;
}

/** Ein Eintrag im Prüfprotokoll. */
export interface ProtokollEintrag {
  runde: number;
  titel: string;
  bestanden: boolean;
  begruendung: string;
  /** Was der Markt schon kann. Fehlt bei Fassungen aus früheren Ständen. */
  standardprodukte?: string;
}
