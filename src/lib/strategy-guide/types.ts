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

/** Ein Vorschlag mit dem Ergebnis der Prüfung. */
/**
 * Ein Posten aus dem, was wir für diesen Kunden umsetzen.
 *
 * Der wichtigste Baustein des Leitfadens. Wer das Gespräch führt, kennt den
 * Betrieb womöglich nicht und versteht von Software nichts — er hat nur
 * dieses Blatt. Fragt der Kunde „und was genau nehmen Sie da?“, muss die
 * Antwort hier stehen, mit Produktnamen und Begründung.
 */
export interface Umsetzungsposten {
  /** In welchen Block des Pakets das fällt, wörtlich aus dem Leistungsumfang. */
  block: string;
  /** Was eingerichtet, automatisiert oder übernommen wird. */
  titel: string;
  /** Der Befund mit seiner Zahl, der das nötig macht. */
  befund: string;
  /** Das konkrete Produkt oder System — mit Namen. */
  womit: string;
  /** Warum gerade das, für genau diesen Betrieb, und was vorher zu klären ist. */
  warum: string;
  /** Wie wir vorgehen: einrichten, zuschneiden, Daten übernehmen, einweisen. */
  wieWirEsMachen: string;
  /** Ob das im gebuchten Paket liegt oder darüber. */
  einordnung: string;
}

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
  /**
   * 7 — Was wir umsetzen und womit, Posten für Posten.
   *
   * Der wichtigste Abschnitt. Daraus muss jemand, der den Betrieb nicht
   * kennt, das Gespräch führen können: welche digitalen Grundlagen wir
   * empfehlen und warum gerade die, welche Abläufe wir womit automatisieren,
   * und was davon im gebuchten Paket liegt.
   */
  umsetzung: Umsetzungsposten[];
  /**
   * 7c — Was die Auswertung vorschlägt und wir trotzdem nicht tun.
   *
   * Damit nichts stillschweigend unter den Tisch fällt: Der Kunde hat die
   * Empfehlungen im Bericht gelesen.
   */
  nichtUmgesetzt: NichtUmgesetzt[];
  /**
   * 7b — Passt OKUN Workforce für diesen Betrieb?
   *
   * Eine ausdrückliche Antwort samt Begründung. Ein Personalsystem passt
   * nicht zu jedem Betrieb, und wer das Gespräch führt, muss die Frage
   * beantworten können, statt sie zu umgehen.
   */
  workforceUrteil: string;
  /**
   * 8 — Wie wir dabei vorgehen.
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

/** Ein Schritt in der Umsetzungsanleitung. */
export interface AnleitungsSchritt {
  titel: string;
  /** Was zu tun ist, so genau, dass man danach arbeiten kann. */
  was: string;
  /** Wer das macht: wir, der Kunde, oder beide gemeinsam. */
  wer: string;
  /** Woran man erkennt, dass dieser Schritt fertig ist. */
  ergebnis: string;
}

/**
 * Die Anleitung zu einem Posten der Umsetzung.
 *
 * Für die Abteilung, die es baut — nicht für das Kundengespräch. Der
 * Leitfaden sagt, was wir umsetzen und womit; hier steht, in welcher
 * Reihenfolge man vorgeht und woran es scheitert.
 */
export interface Anleitung {
  /** Was am Ende läuft, in zwei bis drei Sätzen. */
  ziel: string;
  /** Was vorher geklärt oder vorhanden sein muss. */
  voraussetzungen: string[];
  schritte: AnleitungsSchritt[];
  /** Was erfahrungsgemäß schiefgeht. */
  fallstricke: string[];
  /** Woran wir erkennen, dass der Posten erledigt ist. */
  fertigWenn: string;
}

/**
 * Eine Empfehlung der Auswertung, die wir bewusst nicht umsetzen.
 *
 * Der Kunde hat den Bericht gelesen und die Empfehlungen darin gesehen.
 * Taucht eine davon im Gespräch nicht auf, fragt er danach — und dann muss
 * der Kollege eine Antwort haben, keine Verlegenheit.
 */
export interface NichtUmgesetzt {
  titel: string;
  /** Warum nicht: schon vorhanden, kein Bedarf, später, oder über dem Paket. */
  warum: string;
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
