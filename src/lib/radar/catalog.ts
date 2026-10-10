/**
 * Der Fragenkatalog des OKUN Radar.
 *
 * Bewusst eine reine Datei ohne Datenbankzugriff: Sie wird vom Steuerpult des
 * Closers, von der Interessentenansicht, von der Bewertung und vom Bericht
 * gleichermaßen gelesen — die Interessentenansicht ist eine Client-Komponente,
 * und was `db` importiert, kommt dort nicht an.
 *
 * Alles, was später verbessert werden soll, steht hier und nicht in einer
 * Oberfläche: Fragen, Antworttexte, Gewichte, Verzweigungsregeln,
 * Potenzialfelder, Schwellen und die Formulierungen des Ergebnisses. Eine
 * Oberfläche rendert, was hier steht; sie entscheidet nichts.
 *
 * Grundsatz der Gewichte: Jede Antwort trägt Punkte auf höchstens drei
 * getrennten Achsen und sagt dazu in einem Satz, was sie über den Betrieb
 * aussagt. Dieser Satz ist kein Beiwerk — er ist die Begründung, die der
 * Closer später vorzeigen kann. Eine Antwort ohne Beleg darf keine Punkte
 * geben.
 */

// ─── Achsen ──────────────────────────────────────────────────────────────────

/**
 * Die drei Bewertungsachsen.
 *
 * Sie sind absichtlich unabhängig. Ein Betrieb, der kaum digital arbeitet, hat
 * deshalb noch lange keinen hohen Fit — und ein durchdigitalisierter Betrieb
 * mit Integrationsproblemen kann der beste Kunde sein, den wir kriegen können.
 * Wer die Achsen koppelt, bekommt am Ende das Ergebnis, das er sich wünscht.
 */
export type RadarAchse = "reife" | "potenzial" | "fit";

export const ACHSEN_LABEL: Record<RadarAchse, string> = {
  reife: "Digitaler Reifegrad",
  potenzial: "Optimierungspotenzial",
  fit: "Passung zu OKUN Systems",
};

export const ACHSEN_FRAGE: Record<RadarAchse, string> = {
  reife: "Wie gut ist der Betrieb heute digital organisiert?",
  potenzial: "Wie groß ist das erkennbare Verbesserungspotenzial?",
  fit: "Passen Problem, Rahmen und Bereitschaft zu dem, was wir tatsächlich leisten?",
};

// ─── Potenzialfelder ─────────────────────────────────────────────────────────

/**
 * Felder, in denen wir tatsächlich etwas anbieten. Ein Feld erscheint im
 * Bericht nur, wenn mindestens zwei Antworten es stützen — eine einzelne
 * Antwort ist ein Hinweis, kein Befund.
 */
export const POTENZIALFELDER = {
  prozessautomatisierung: {
    label: "Prozessautomatisierung",
    beschreibung: "Wiederkehrende Handarbeit, die ein System übernehmen kann.",
  },
  systemintegration: {
    label: "Systemintegration",
    beschreibung: "Programme, die heute nebeneinander statt miteinander arbeiten.",
  },
  doppelerfassung: {
    label: "Doppelte Datenerfassung",
    beschreibung: "Dieselbe Information wird an mehreren Stellen eingetippt.",
  },
  prozessstruktur: {
    label: "Abläufe und Zuständigkeiten",
    beschreibung: "Abläufe, die an einzelnen Köpfen hängen statt an einem System.",
  },
  transparenz: {
    label: "Überblick und Kennzahlen",
    beschreibung: "Zahlen, die erst zusammengesucht werden müssen.",
  },
  einsatzplanung: {
    label: "Personal- und Einsatzplanung",
    beschreibung: "Planung von Menschen, Schichten oder Einsätzen.",
  },
  dokumente: {
    label: "Dokumente und Ablage",
    beschreibung: "Unterlagen, die gesucht statt gefunden werden.",
  },
  kundenprozess: {
    label: "Kundenanfragen und Angebote",
    beschreibung: "Der Weg von der Anfrage bis zum Auftrag.",
  },
} as const;

export type PotenzialfeldKey = keyof typeof POTENZIALFELDER;

// ─── Themen ──────────────────────────────────────────────────────────────────

/** Die Themenbereiche des Potenzialchecks. Dient der Abdeckungsprüfung. */
export const THEMEN = {
  digitalisierungsgrad: "Digitalisierungsgrad",
  handarbeit: "Manuelle Tätigkeiten",
  systemlandschaft: "Systemlandschaft",
  informationsfluss: "Daten und Informationsfluss",
  prozessorganisation: "Prozessorganisation",
  automatisierung: "Automatisierung",
  engpaesse: "Zeitaufwand und Engpässe",
  transparenz: "Transparenz und Steuerung",
  bereitschaft: "Veränderungsbereitschaft",
  relevanz: "Wirtschaftliche Relevanz",
  spotlight: "Prozess-Spotlight",
} as const;

export type ThemaKey = keyof typeof THEMEN;

// ─── Bausteine ───────────────────────────────────────────────────────────────

export type RadarSignal = {
  achse: RadarAchse;
  /** Punkte auf der Rohskala der Achse. Negative Werte sind zulässig. */
  wert: number;
};

export type RadarOption = {
  key: string;
  label: string;
  /** Erläuterung unter dem Antworttext — hilft beim Einordnen im Gespräch. */
  hinweis?: string;
  signale: RadarSignal[];
  /** Potenzialfelder, auf die diese Antwort einzahlt. */
  felder?: PotenzialfeldKey[];
  /**
   * Was diese Antwort über den Betrieb aussagt. Wandert wörtlich in die
   * interne Begründung des Ergebnisses.
   */
  beleg: string;
  /**
   * Ein eigenes Bildzeichen für diese Antwort.
   *
   * Nur dort gesetzt, wo die Antworten inhaltlich Verschiedenes bezeichnen —
   * etwa die Bereiche, in denen Zeit verloren geht. Bei Skalenfragen („unter
   * zwei Stunden“ bis „mehr als fünfzehn“) bleibt das Zeichen der Frage für
   * alle gleich: Vier verschiedene Zeichen auf einer Skala sagen nichts über
   * den Inhalt, sondern nur, welche Antwort uns am liebsten wäre.
   */
  symbol?: SymbolKey;
  /**
   * „Weiß ich nicht“. Schließt jede andere Auswahl aus und zählt bei der
   * Abdeckung als **nicht** beantwortet — die Frage ist offen geblieben.
   */
  unbekannt?: boolean;
  /**
   * „Nichts davon“. Schließt ebenfalls jede andere Auswahl aus, ist aber eine
   * vollwertige Antwort: Der Betrieb sagt nicht, dass er es nicht weiß,
   * sondern dass es nichts zu berichten gibt. Zählt bei der Abdeckung mit.
   *
   * Der Unterschied ist keine Spitzfindigkeit. Wer „weiß ich nicht“ sagt,
   * macht das Ergebnis unsicherer; wer „nichts davon“ sagt, macht es klarer —
   * und zwar in Richtung eines ehrlichen Negativbefunds.
   */
  keinBefund?: boolean;
};

export type RadarBedingung =
  | { art: "antwort_ist"; frage: string; optionen: string[] }
  | { art: "antwort_ist_nicht"; frage: string; optionen: string[] }
  | { art: "beantwortet"; frage: string }
  | { art: "laufwert_mindestens"; achse: RadarAchse; wert: number }
  | { art: "laufwert_hoechstens"; achse: RadarAchse; wert: number };

/**
 * Bildzeichen für die Antwortkarten.
 *
 * Eines je Frage, nicht je Antwort — und das ist Absicht. Gäbe man der
 * „besten“ Antwort ein anderes Zeichen als den übrigen, verriete die Oberfläche,
 * welche Antwort uns lieber wäre. Dann klickt der Interessent irgendwann das
 * Zeichen statt der Wahrheit, und die ganze Analyse ist nichts mehr wert.
 *
 * Ausnahme sind „weiß ich nicht“ und „nichts davon“: Die sind keine Antwort auf
 * die Sachfrage und dürfen sich auch so zeigen.
 */
export type SymbolKey =
  | "papier"
  | "uhr"
  | "programme"
  | "verbindung"
  | "daten"
  | "menschen"
  | "blitz"
  | "zeit"
  | "zahlen"
  | "team"
  | "ziel"
  | "ablauf"
  // Für Antworten, die inhaltlich Verschiedenes bezeichnen.
  | "angebot"
  | "auftrag"
  | "rechnung"
  | "planung"
  | "personal"
  | "suche"
  | "warten"
  | "doppelt"
  | "rueckfrage"
  | "fehler";

export type RadarFrage = {
  key: string;
  phase: RadarPhase;
  thema: ThemaKey;
  /** Bildzeichen aller Antwortkarten dieser Frage. */
  symbol?: SymbolKey;
  /**
   * Wörter, die in der Frage hervorgehoben werden. Rein gestalterisch — sie
   * geben dem Blick einen Halt, wenn die Frage vorgelesen wird.
   */
  betonung?: string[];
  /** Worauf die Frage hinauswill. Nur der Closer sieht das. */
  absicht: string;
  frage: string;
  /**
   * Ein Satz zum Vorlesen. Das Radar wird auch von Kollegen geführt, die den
   * Betrieb nicht kennen; eine Frage ohne Anlauf klingt wie ein Formular.
   */
  vorlesen?: string;
  modus: "einfach" | "mehrfach";
  optionen: RadarOption[];
  /** Die Frage wird nur gestellt, wenn alle Bedingungen zutreffen. */
  wenn?: RadarBedingung[];
  /**
   * Kernfrage. Ohne sie sinkt die Aussagekraft des Ergebnisses spürbar; der
   * Abdeckungsgrad rechnet ausschließlich mit diesen Fragen.
   */
  kern?: boolean;
};

export type RadarPhase = "profil" | "potenzial" | "spotlight";

export const PHASEN: Array<{ key: RadarPhase; label: string; zielzeit: string }> = [
  { key: "profil", label: "Unternehmensprofil", zielzeit: "2–3 Minuten" },
  { key: "potenzial", label: "Digitalisierungs- und Potenzialcheck", zielzeit: "6–8 Minuten" },
  { key: "spotlight", label: "Prozess-Spotlight", zielzeit: "2–4 Minuten" },
];

// ─── Phase 1: Unternehmensprofil ─────────────────────────────────────────────

/**
 * Woher ein Profilfeld vorbelegt wird.
 *
 * Nur Felder, die im CRM tatsächlich geführt werden. Eine Mitarbeiterzahl
 * steht dort nicht — sie hier als vorbelegt auszuweisen, hieße, eine Zahl zu
 * erfinden und sie dann als bestätigt zu behandeln.
 */
export type ProfilQuelle = "company.name" | "company.industry" | "company.contactPerson";

export type RadarProfilFeld = {
  key: string;
  label: string;
  art: "text" | "auswahl" | "mehrfach";
  optionen?: Array<{ key: string; label: string }>;
  quelle?: ProfilQuelle;
  pflicht?: boolean;
  hinweis?: string;
};

export const PROFIL_FELDER: RadarProfilFeld[] = [
  {
    key: "firma",
    label: "Unternehmen",
    art: "text",
    quelle: "company.name",
    pflicht: true,
  },
  {
    key: "branche",
    label: "Branche",
    art: "text",
    quelle: "company.industry",
    hinweis: "Wie der Betrieb sich selbst beschreibt — nicht die amtliche Klassifikation.",
  },
  {
    key: "groesse",
    label: "Mitarbeitende",
    art: "auswahl",
    pflicht: true,
    optionen: [
      { key: "g_solo", label: "nur ich" },
      { key: "g_2_9", label: "2 bis 9" },
      { key: "g_10_24", label: "10 bis 24" },
      { key: "g_25_49", label: "25 bis 49" },
      { key: "g_50_199", label: "50 bis 199" },
      { key: "g_200", label: "200 und mehr" },
    ],
  },
  {
    key: "modell",
    label: "Geschäftsmodell",
    art: "auswahl",
    optionen: [
      { key: "m_handwerk", label: "Handwerk / Dienstleistung beim Kunden" },
      { key: "m_dienstleistung", label: "Dienstleistung im Büro" },
      { key: "m_handel", label: "Handel" },
      { key: "m_produktion", label: "Produktion" },
      { key: "m_mix", label: "mehreres davon" },
    ],
  },
  {
    key: "bereiche",
    label: "Bereiche im Haus",
    art: "mehrfach",
    hinweis: "Mehrfachauswahl. Bestimmt, welche Prozesse im Spotlight angeboten werden.",
    optionen: [
      { key: "b_vertrieb", label: "Vertrieb und Angebote" },
      { key: "b_auftrag", label: "Auftragsabwicklung" },
      { key: "b_buchhaltung", label: "Buchhaltung und Rechnung" },
      { key: "b_personal", label: "Personal" },
      { key: "b_planung", label: "Einsatz- und Dienstplanung" },
      { key: "b_lager", label: "Lager und Material" },
      { key: "b_service", label: "Service und Support" },
    ],
  },
  {
    key: "software",
    label: "Genutzte Software",
    art: "text",
    hinweis: "Was ihm einfällt, in seinen Worten. Keine vollständige Liste — die kommt im Blueprint.",
  },
  {
    key: "herausforderung",
    label: "Größte aktuelle Herausforderung",
    art: "text",
    pflicht: true,
    hinweis: "Wörtlich aufnehmen. Dieser Satz trägt das ganze Gespräch.",
  },
  {
    key: "ziel",
    label: "Was er sich von Digitalisierung erhofft",
    art: "text",
  },
];

// ─── Phase 2: Potenzialcheck ─────────────────────────────────────────────────

const FRAGEN_POTENZIAL: RadarFrage[] = [
  {
    key: "P1",
    phase: "potenzial",
    thema: "digitalisierungsgrad",
    symbol: "papier",
    betonung: ["Auftrag", "Papier"],
    kern: true,
    absicht: "Grundlinie: Wie viel läuft überhaupt digital? Ordnet alles Folgende ein.",
    frage: "Wenn bei Ihnen ein Auftrag durchs Haus geht — wie viel davon läuft auf Papier?",
    vorlesen:
      "Lassen Sie uns ganz vorne anfangen. Wenn bei Ihnen ein Auftrag reinkommt und bis zur Rechnung durchläuft: Wie viel davon ist Papier?",
    modus: "einfach",
    optionen: [
      {
        key: "P1-A",
        label: "So gut wie nichts, wir arbeiten durchgehend digital",
        signale: [{ achse: "reife", wert: 4 }],
        beleg: "Der Auftragsdurchlauf ist durchgehend digital.",
      },
      {
        key: "P1-B",
        label: "Gemischt — manches digital, manches auf Papier",
        signale: [
          { achse: "reife", wert: 2 },
          { achse: "potenzial", wert: 1.5 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "Der Auftragsdurchlauf wechselt zwischen Papier und System.",
      },
      {
        key: "P1-C",
        label: "Das meiste läuft noch über Zettel und Ausdrucke",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 3 },
        ],
        felder: ["prozessautomatisierung", "dokumente"],
        beleg: "Der Auftragsdurchlauf läuft überwiegend auf Papier.",
      },
      {
        key: "P1-X",
        label: "Das kann ich so nicht sagen",
        unbekannt: true,
        signale: [],
        beleg: "Zum Papieranteil im Auftragsdurchlauf liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P2",
    phase: "potenzial",
    thema: "handarbeit",
    symbol: "uhr",
    betonung: ["Stunden pro Woche", "Abtippen"],
    kern: true,
    absicht:
      "Die wichtigste Zahl des Radar. Sie trägt später die Wirtschaftlichkeit — und sie ist die Zahl, die der Kunde selbst genannt hat.",
    frage:
      "Wie viele Stunden pro Woche gehen im Büro für Abtippen, Übertragen und Nachpflegen drauf?",
    vorlesen:
      "Jetzt wird es konkret: Wenn Sie zusammenzählen, was Ihre Leute pro Woche nur mit Abtippen und Übertragen verbringen — wo landen wir da ungefähr?",
    modus: "einfach",
    optionen: [
      {
        key: "P2-A",
        label: "Unter 2 Stunden",
        signale: [
          { achse: "reife", wert: 3 },
          { achse: "potenzial", wert: 0 },
        ],
        beleg: "Unter 2 Stunden pro Woche gehen für Übertragungsarbeit drauf.",
      },
      {
        key: "P2-B",
        label: "Ungefähr 2 bis 5 Stunden",
        signale: [
          { achse: "reife", wert: 1.5 },
          { achse: "potenzial", wert: 2 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "2 bis 5 Stunden pro Woche gehen für Übertragungsarbeit drauf.",
      },
      {
        key: "P2-C",
        label: "Eher 5 bis 15 Stunden",
        signale: [
          { achse: "potenzial", wert: 3.5 },
          { achse: "fit", wert: 2 },
        ],
        felder: ["prozessautomatisierung", "doppelerfassung"],
        beleg: "5 bis 15 Stunden pro Woche gehen für Übertragungsarbeit drauf.",
      },
      {
        key: "P2-D",
        label: "Mehr als 15 Stunden",
        hinweis: "Das ist eine halbe Stelle, die nur überträgt.",
        signale: [
          { achse: "potenzial", wert: 4.5 },
          { achse: "fit", wert: 3 },
        ],
        felder: ["prozessautomatisierung", "doppelerfassung"],
        beleg: "Mehr als 15 Stunden pro Woche gehen für Übertragungsarbeit drauf.",
      },
      {
        key: "P2-X",
        label: "Haben wir noch nie gemessen",
        unbekannt: true,
        signale: [{ achse: "reife", wert: -0.5 }],
        felder: ["transparenz"],
        beleg: "Der Aufwand für Übertragungsarbeit ist im Betrieb nicht bekannt.",
      },
    ],
  },
  {
    key: "P3",
    phase: "potenzial",
    thema: "systemlandschaft",
    symbol: "programme",
    betonung: ["Programme"],
    kern: true,
    absicht: "Wie breit ist die Programmlandschaft? Legt fest, ob Integration überhaupt Thema ist.",
    frage: "Wie viele verschiedene Programme braucht einer Ihrer Mitarbeiter an einem normalen Tag?",
    modus: "einfach",
    optionen: [
      {
        key: "P3-A",
        label: "Ein oder zwei",
        signale: [{ achse: "reife", wert: 2 }],
        beleg: "Ein Arbeitsplatz kommt mit ein bis zwei Programmen aus.",
      },
      {
        key: "P3-B",
        label: "Drei oder vier",
        signale: [
          { achse: "reife", wert: 1.5 },
          { achse: "potenzial", wert: 1 },
        ],
        beleg: "Ein Arbeitsplatz arbeitet mit drei bis vier Programmen.",
      },
      {
        key: "P3-C",
        label: "Fünf und mehr",
        signale: [
          { achse: "reife", wert: 1 },
          { achse: "potenzial", wert: 2 },
        ],
        felder: ["systemintegration"],
        beleg: "Ein Arbeitsplatz arbeitet mit fünf oder mehr Programmen.",
      },
      {
        key: "P3-X",
        label: "Weiß ich nicht genau",
        unbekannt: true,
        signale: [],
        beleg: "Zur Zahl der eingesetzten Programme liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P4",
    phase: "potenzial",
    thema: "systemlandschaft",
    symbol: "verbindung",
    betonung: ["Daten", "von Hand"],
    kern: true,
    // Bei ein bis zwei Programmen gibt es nichts zu verbinden. Die Frage dann
    // trotzdem zu stellen, kostet Gesprächszeit und liefert nichts.
    wenn: [{ art: "antwort_ist", frage: "P3", optionen: ["P3-B", "P3-C"] }],
    absicht: "Der Kern der Integrationsfrage: Reden die Programme miteinander oder der Mensch dazwischen?",
    frage: "Geben diese Programme ihre Daten untereinander weiter — oder macht das jemand von Hand?",
    vorlesen:
      "Und wenn in dem einen Programm etwas Neues steht: Weiß das andere das dann automatisch, oder trägt das jemand ein zweites Mal ein?",
    modus: "einfach",
    optionen: [
      {
        key: "P4-A",
        label: "Die hängen zusammen, das läuft automatisch",
        signale: [{ achse: "reife", wert: 4 }],
        beleg: "Die eingesetzten Programme tauschen Daten automatisch aus.",
      },
      {
        key: "P4-B",
        label: "Teilweise — manches automatisch, manches von Hand",
        signale: [
          { achse: "reife", wert: 2 },
          { achse: "potenzial", wert: 2.5 },
          { achse: "fit", wert: 1.5 },
        ],
        felder: ["systemintegration"],
        beleg: "Die Programme tauschen nur teilweise automatisch Daten aus.",
      },
      {
        key: "P4-C",
        label: "Gar nicht, das macht bei uns immer jemand",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 4 },
          { achse: "fit", wert: 2.5 },
        ],
        felder: ["systemintegration", "doppelerfassung"],
        beleg: "Zwischen den Programmen überträgt ausschließlich ein Mensch.",
      },
      {
        key: "P4-X",
        label: "Weiß ich nicht",
        unbekannt: true,
        signale: [],
        beleg: "Zum Zusammenspiel der Programme liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P5",
    phase: "potenzial",
    thema: "informationsfluss",
    symbol: "daten",
    betonung: ["mehreren Stellen"],
    kern: true,
    absicht: "Doppelerfassung belegen — unabhängig davon, ob er sie vorher als Problem benannt hat.",
    frage: "Kommt es vor, dass dieselbe Angabe bei Ihnen an mehreren Stellen eingetragen wird?",
    modus: "einfach",
    optionen: [
      {
        key: "P5-A",
        label: "Nein, jede Angabe steht genau einmal",
        signale: [{ achse: "reife", wert: 3 }],
        beleg: "Jede Angabe wird nach eigener Aussage nur einmal erfasst.",
      },
      {
        key: "P5-B",
        label: "Ja, bei einzelnen Dingen",
        signale: [
          { achse: "reife", wert: 1.5 },
          { achse: "potenzial", wert: 2 },
        ],
        felder: ["doppelerfassung"],
        beleg: "Einzelne Angaben werden mehrfach erfasst.",
      },
      {
        key: "P5-C",
        label: "Ja, ständig — das ist bei uns normal",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 3.5 },
          { achse: "fit", wert: 2 },
        ],
        felder: ["doppelerfassung", "systemintegration"],
        beleg: "Mehrfacherfassung derselben Angabe ist im Betrieb der Normalfall.",
      },
      {
        key: "P5-X",
        label: "Weiß ich nicht",
        unbekannt: true,
        signale: [],
        beleg: "Zur Mehrfacherfassung liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P6",
    phase: "potenzial",
    thema: "prozessorganisation",
    symbol: "menschen",
    betonung: ["zwei Wochen ausfällt"],
    kern: true,
    absicht:
      "Hängt der Betrieb an Systemen oder an Köpfen? Die Ausfallfrage bringt das schneller zutage als jede Frage nach Dokumentation.",
    frage: "Wenn jemand zwei Wochen ausfällt — weiß ein anderer, wie dessen Abläufe gehen?",
    vorlesen:
      "Mal angenommen, einer Ihrer Leute fällt zwei Wochen aus. Kann jemand anderes seine Arbeit übernehmen, ohne dass es hakt?",
    modus: "einfach",
    optionen: [
      {
        key: "P6-A",
        label: "Ja, das ist festgehalten und jeder kommt dran",
        signale: [{ achse: "reife", wert: 3.5 }],
        beleg: "Abläufe sind festgehalten und für andere nachvollziehbar.",
      },
      {
        key: "P6-B",
        label: "Teilweise — manches steht fest, manches nicht",
        signale: [
          { achse: "reife", wert: 1.5 },
          { achse: "potenzial", wert: 1.5 },
        ],
        felder: ["prozessstruktur"],
        beleg: "Abläufe sind nur teilweise festgehalten.",
      },
      {
        key: "P6-C",
        label: "Ehrlich gesagt hängt das an den Personen",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 3 },
          { achse: "fit", wert: 2 },
        ],
        felder: ["prozessstruktur", "dokumente"],
        beleg: "Abläufe hängen an einzelnen Personen statt an einem System.",
      },
      {
        key: "P6-X",
        label: "Weiß ich nicht",
        unbekannt: true,
        signale: [],
        beleg: "Zur Vertretbarkeit von Abläufen liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P7",
    phase: "potenzial",
    thema: "automatisierung",
    symbol: "blitz",
    betonung: ["automatisch"],
    kern: true,
    absicht: "Ist Automatisierung schon ein Begriff im Haus? Entscheidet über den weiteren Gesprächsweg.",
    frage: "Läuft bei Ihnen heute schon irgendetwas automatisch — ohne dass jemand es anstößt?",
    modus: "einfach",
    optionen: [
      {
        key: "P7-A",
        label: "Ja, mehrere Abläufe laufen automatisch",
        signale: [{ achse: "reife", wert: 4 }],
        beleg: "Mehrere Abläufe laufen bereits automatisiert.",
      },
      {
        key: "P7-B",
        label: "Einzelne Kleinigkeiten, mehr nicht",
        signale: [
          { achse: "reife", wert: 2 },
          { achse: "potenzial", wert: 2 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "Automatisiert sind bisher nur Einzelheiten.",
      },
      {
        key: "P7-C",
        label: "Nein, bei uns stößt alles ein Mensch an",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 2.5 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "Es gibt bisher keine automatisierten Abläufe.",
      },
      {
        key: "P7-X",
        label: "Weiß ich nicht",
        unbekannt: true,
        signale: [],
        beleg: "Zum Automatisierungsgrad liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P8",
    phase: "potenzial",
    thema: "automatisierung",
    symbol: "blitz",
    betonung: ["hakt"],
    kern: true,
    // Der wichtigste Zweig des Radar: Wer schon weit ist, wird nicht nach dem
    // Offensichtlichen gefragt, sondern danach, ob überhaupt noch etwas übrig
    // ist. Genau hier muss ein ehrliches „nein“ möglich sein.
    wenn: [{ art: "antwort_ist", frage: "P7", optionen: ["P7-A"] }],
    absicht:
      "Die Gegenprobe bei einem gut aufgestellten Betrieb: Bleibt überhaupt etwas übrig, wofür wir gebraucht werden?",
    frage: "Wo hakt es trotzdem noch — oder läuft das inzwischen rund?",
    vorlesen:
      "Das klingt, als wären Sie schon ein gutes Stück weiter als die meisten. Dann die ehrliche Frage: Wo hakt es trotzdem noch — oder läuft das inzwischen rund?",
    modus: "einfach",
    optionen: [
      {
        key: "P8-A",
        label: "Ehrlich gesagt läuft das rund",
        hinweis: "Nicht wegdiskutieren. Das ist ein zulässiges Ergebnis.",
        signale: [
          { achse: "reife", wert: 3 },
          { achse: "potenzial", wert: -3 },
          { achse: "fit", wert: -3 },
        ],
        beleg: "Der Betrieb sieht an den automatisierten Abläufen keinen offenen Punkt.",
      },
      {
        key: "P8-B",
        label: "An den Übergängen zwischen den Programmen",
        signale: [
          { achse: "potenzial", wert: 3.5 },
          { achse: "fit", wert: 3 },
        ],
        felder: ["systemintegration"],
        beleg: "Trotz Automatisierung bleiben die Übergänge zwischen Programmen offen.",
      },
      {
        key: "P8-C",
        label: "Bei Auswertungen und Zahlen",
        signale: [
          { achse: "potenzial", wert: 2.5 },
          { achse: "fit", wert: 2 },
        ],
        felder: ["transparenz"],
        beleg: "Trotz Automatisierung fehlen auswertbare Zahlen.",
      },
      {
        key: "P8-D",
        label: "Bei allem, was neu dazukommt — das bauen wir jedes Mal von Hand",
        signale: [
          { achse: "potenzial", wert: 3 },
          { achse: "fit", wert: 3.5 },
        ],
        felder: ["prozessautomatisierung", "prozessstruktur"],
        beleg: "Neue Abläufe müssen jedes Mal von Hand aufgebaut werden.",
      },
    ],
  },
  {
    key: "P9",
    phase: "potenzial",
    thema: "engpaesse",
    symbol: "zeit",
    betonung: ["Zeit verloren"],
    kern: true,
    modus: "mehrfach",
    absicht:
      "Wo tut es weh? Steuert zugleich, welche Prozesse im Spotlight vorgeschlagen werden.",
    frage: "In welchen Bereichen geht bei Ihnen am meisten Zeit verloren?",
    vorlesen: "Wenn Sie an die letzten Wochen denken: Wo ist bei Ihnen am meisten Zeit liegengeblieben?",
    optionen: [
      {
        key: "P9-ANGEBOT",
        symbol: "angebot",
        label: "Angebote schreiben und nachfassen",
        signale: [
          { achse: "potenzial", wert: 1.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["kundenprozess"],
        beleg: "Angebotserstellung wird als Zeitfresser benannt.",
      },
      {
        key: "P9-AUFTRAG",
        symbol: "auftrag",
        label: "Aufträge abwickeln und nachhalten",
        signale: [
          { achse: "potenzial", wert: 1.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "Auftragsabwicklung wird als Zeitfresser benannt.",
      },
      {
        key: "P9-RECHNUNG",
        symbol: "rechnung",
        label: "Rechnungen stellen und prüfen",
        signale: [
          { achse: "potenzial", wert: 1.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["prozessautomatisierung", "doppelerfassung"],
        beleg: "Rechnungsstellung wird als Zeitfresser benannt.",
      },
      {
        key: "P9-PLANUNG",
        symbol: "planung",
        label: "Einsätze und Schichten planen",
        signale: [
          { achse: "potenzial", wert: 2 },
          { achse: "fit", wert: 1.5 },
        ],
        felder: ["einsatzplanung"],
        beleg: "Einsatz- und Schichtplanung wird als Zeitfresser benannt.",
      },
      {
        key: "P9-PERSONAL",
        symbol: "personal",
        label: "Personalthemen: Zeiten, Urlaub, Unterlagen",
        signale: [
          { achse: "potenzial", wert: 1.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["einsatzplanung", "dokumente"],
        beleg: "Personalverwaltung wird als Zeitfresser benannt.",
      },
      {
        key: "P9-SUCHEN",
        symbol: "suche",
        label: "Unterlagen und Informationen suchen",
        signale: [
          { achse: "potenzial", wert: 2 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["dokumente", "transparenz"],
        beleg: "Das Suchen von Unterlagen wird als Zeitfresser benannt.",
      },
      {
        key: "P9-X",
        label: "Nichts davon sticht heraus",
        keinBefund: true,
        signale: [{ achse: "reife", wert: 1 }],
        beleg: "Kein Bereich wird als besonderer Zeitfresser benannt.",
      },
    ],
  },
  {
    key: "P10",
    phase: "potenzial",
    thema: "transparenz",
    symbol: "zahlen",
    betonung: ["offen sind", "wie lange"],
    kern: true,
    absicht: "Hat er Zahlen oder Bauchgefühl? Die Antwort trägt später das Thema Steuerung.",
    frage:
      "Wenn Sie jetzt wissen wollten, wie viele Aufträge gerade offen sind — wie lange dauert das?",
    modus: "einfach",
    optionen: [
      {
        key: "P10-A",
        label: "Das sehe ich sofort auf einen Blick",
        signale: [{ achse: "reife", wert: 3.5 }],
        beleg: "Betriebszahlen sind unmittelbar abrufbar.",
      },
      {
        key: "P10-B",
        label: "Ein paar Minuten, ich muss es zusammensuchen",
        signale: [
          { achse: "reife", wert: 1.5 },
          { achse: "potenzial", wert: 1.5 },
        ],
        felder: ["transparenz"],
        beleg: "Betriebszahlen müssen zusammengesucht werden.",
      },
      {
        key: "P10-C",
        label: "Da muss ich jemanden fragen oder selbst nachzählen",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 2.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["transparenz"],
        beleg: "Betriebszahlen entstehen nur durch Nachfragen oder Nachzählen.",
      },
      {
        key: "P10-X",
        label: "Weiß ich nicht",
        unbekannt: true,
        signale: [],
        beleg: "Zur Verfügbarkeit von Betriebszahlen liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P11",
    phase: "potenzial",
    thema: "bereitschaft",
    symbol: "team",
    betonung: ["neuen Programm"],
    kern: true,
    absicht:
      "Zahlt ausschließlich auf die Passung ein. Das beste Potenzial nützt nichts, wenn niemand mitgeht.",
    frage: "Wie steht Ihr Team dazu, mit einem neuen Programm zu arbeiten?",
    modus: "einfach",
    optionen: [
      {
        key: "P11-A",
        label: "Offen — wir haben schon mal etwas umgestellt",
        signale: [{ achse: "fit", wert: 3 }],
        beleg: "Der Betrieb hat Erfahrung mit Umstellungen und steht ihnen offen gegenüber.",
      },
      {
        key: "P11-B",
        label: "Gemischt, es käme auf die Begleitung an",
        signale: [{ achse: "fit", wert: 1.5 }],
        beleg: "Die Bereitschaft im Team ist gemischt und hängt an der Begleitung.",
      },
      {
        key: "P11-C",
        label: "Eher skeptisch, das wird schwierig",
        signale: [{ achse: "fit", wert: -1.5 }],
        beleg: "Das Team steht neuen Programmen skeptisch gegenüber.",
      },
      {
        key: "P11-X",
        label: "Das kann ich nicht einschätzen",
        unbekannt: true,
        signale: [],
        beleg: "Zur Veränderungsbereitschaft im Team liegt keine Angabe vor.",
      },
    ],
  },
  {
    key: "P12",
    phase: "potenzial",
    thema: "relevanz",
    symbol: "ziel",
    betonung: ["unverändert"],
    kern: true,
    absicht:
      "Die Relevanzfrage. Ohne wirtschaftlichen Druck ist auch ein großes Potenzial kein Auftrag — und das darf das Ergebnis ruhig sagen.",
    frage: "Wenn das alles nächstes Jahr unverändert bliebe — was würde das für Sie bedeuten?",
    vorlesen:
      "Letzte Frage in diesem Teil, und die ist mir die wichtigste: Angenommen, wir sprechen in einem Jahr wieder und es hat sich nichts verändert — was heißt das dann für Sie?",
    modus: "einfach",
    optionen: [
      {
        key: "P12-A",
        label: "Das wäre verkraftbar, wir kämen zurecht",
        signale: [
          { achse: "potenzial", wert: -1 },
          { achse: "fit", wert: -2 },
        ],
        beleg: "Ein unveränderter Zustand wäre für den Betrieb verkraftbar.",
      },
      {
        key: "P12-B",
        label: "Es würde uns bremsen, aber es ginge",
        signale: [{ achse: "fit", wert: 1.5 }],
        beleg: "Ein unveränderter Zustand würde den Betrieb bremsen.",
      },
      {
        key: "P12-C",
        label: "Wir kämen an eine Grenze — so geht es nicht weiter",
        signale: [
          { achse: "potenzial", wert: 1.5 },
          { achse: "fit", wert: 4 },
        ],
        beleg: "Der Betrieb sieht sich ohne Veränderung an einer Grenze.",
      },
      {
        key: "P12-X",
        label: "Darüber habe ich noch nicht nachgedacht",
        unbekannt: true,
        signale: [],
        beleg: "Zur Folge eines unveränderten Zustands liegt keine Angabe vor.",
      },
    ],
  },
];

// ─── Phase 3: Prozess-Spotlight ──────────────────────────────────────────────

/**
 * Prozesse, die im Spotlight betrachtet werden können.
 *
 * `bereiche` steuert die Vorauswahl: Wer im Profil keine Einsatzplanung
 * angegeben hat, bekommt sie nicht als ersten Vorschlag. Wählbar bleibt alles —
 * die Vorauswahl ist eine Hilfe, keine Schranke.
 */
export const SPOTLIGHT_PROZESSE = [
  { key: "sp_anfrage", label: "Kundenanfragen und Kundenverwaltung", bereiche: ["b_vertrieb", "b_service"], felder: ["kundenprozess"] },
  { key: "sp_angebot", label: "Angebotserstellung", bereiche: ["b_vertrieb"], felder: ["kundenprozess"] },
  { key: "sp_auftrag", label: "Auftragsabwicklung", bereiche: ["b_auftrag"], felder: ["prozessautomatisierung"] },
  { key: "sp_rechnung", label: "Rechnungsverarbeitung", bereiche: ["b_buchhaltung"], felder: ["prozessautomatisierung", "doppelerfassung"] },
  { key: "sp_personal", label: "Personalverwaltung", bereiche: ["b_personal"], felder: ["einsatzplanung"] },
  { key: "sp_planung", label: "Dienst- und Einsatzplanung", bereiche: ["b_planung"], felder: ["einsatzplanung"] },
  { key: "sp_dokumente", label: "Dokumentenverwaltung", bereiche: [], felder: ["dokumente"] },
  { key: "sp_freigaben", label: "Interne Freigaben", bereiche: [], felder: ["prozessstruktur"] },
  { key: "sp_verwaltung", label: "Wiederkehrende Verwaltungsaufgaben", bereiche: [], felder: ["prozessautomatisierung"] },
  { key: "sp_uebertragung", label: "Datenübertragung zwischen Programmen", bereiche: [], felder: ["systemintegration", "doppelerfassung"] },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  bereiche: readonly string[];
  felder: readonly PotenzialfeldKey[];
}>;

export type SpotlightProzessKey = (typeof SPOTLIGHT_PROZESSE)[number]["key"];

const FRAGEN_SPOTLIGHT: RadarFrage[] = [
  {
    key: "S1",
    phase: "spotlight",
    thema: "spotlight",
    symbol: "ablauf",
    betonung: ["heute hauptsächlich"],
    kern: true,
    absicht: "Wie viel Hand steckt in diesem einen Ablauf?",
    frage: "Wie läuft dieser Ablauf heute hauptsächlich?",
    modus: "einfach",
    optionen: [
      {
        key: "S1-A",
        label: "Weitgehend automatisch im System",
        signale: [{ achse: "reife", wert: 2.5 }],
        beleg: "Der betrachtete Ablauf läuft weitgehend automatisch.",
      },
      {
        key: "S1-B",
        label: "Im System, aber mit vielen Handgriffen",
        signale: [
          { achse: "reife", wert: 1 },
          { achse: "potenzial", wert: 2 },
        ],
        felder: ["prozessautomatisierung"],
        beleg: "Der betrachtete Ablauf läuft im System, verlangt aber viele Handgriffe.",
      },
      {
        key: "S1-C",
        label: "Überwiegend von Hand, per Mail oder auf Zuruf",
        signale: [
          { achse: "reife", wert: 0 },
          { achse: "potenzial", wert: 3 },
          { achse: "fit", wert: 1.5 },
        ],
        felder: ["prozessautomatisierung", "prozessstruktur"],
        beleg: "Der betrachtete Ablauf läuft überwiegend von Hand.",
      },
    ],
  },
  {
    key: "S2",
    phase: "spotlight",
    thema: "spotlight",
    symbol: "programme",
    betonung: ["Programme und Personen"],
    kern: true,
    absicht: "Wie viele Beteiligte und Programme hängen an dem Ablauf?",
    frage: "Wie viele Programme und Personen sind daran beteiligt?",
    modus: "einfach",
    optionen: [
      {
        key: "S2-A",
        label: "Ein Programm, eine Person",
        signale: [{ achse: "reife", wert: 2 }],
        beleg: "Der betrachtete Ablauf liegt bei einer Person in einem Programm.",
      },
      {
        key: "S2-B",
        label: "Zwei bis drei Beteiligte oder Programme",
        signale: [{ achse: "potenzial", wert: 1.5 }],
        felder: ["systemintegration"],
        beleg: "Am betrachteten Ablauf hängen zwei bis drei Beteiligte oder Programme.",
      },
      {
        key: "S2-C",
        label: "Mehr als drei — da hängt einiges dran",
        signale: [
          { achse: "potenzial", wert: 2.5 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["systemintegration", "prozessstruktur"],
        beleg: "Am betrachteten Ablauf hängen mehr als drei Beteiligte oder Programme.",
      },
    ],
  },
  {
    key: "S3",
    phase: "spotlight",
    thema: "spotlight",
    symbol: "uhr",
    betonung: ["regelmäßig"],
    kern: true,
    modus: "mehrfach",
    absicht: "Die konkreten Reibungspunkte — belegbar und im Gespräch sofort anschlussfähig.",
    frage: "Was passiert dabei regelmäßig?",
    optionen: [
      {
        key: "S3-WARTEN",
        symbol: "warten",
        label: "Es wird auf jemanden gewartet",
        signale: [{ achse: "potenzial", wert: 1.5 }],
        felder: ["prozessstruktur"],
        beleg: "Im betrachteten Ablauf entstehen regelmäßig Wartezeiten.",
      },
      {
        key: "S3-DOPPELT",
        symbol: "doppelt",
        label: "Dasselbe wird zweimal eingegeben",
        signale: [{ achse: "potenzial", wert: 2 }],
        felder: ["doppelerfassung"],
        beleg: "Im betrachteten Ablauf wird dieselbe Angabe zweimal eingegeben.",
      },
      {
        key: "S3-NACHFRAGE",
        symbol: "rueckfrage",
        label: "Es gibt Rückfragen, weil etwas fehlt",
        signale: [{ achse: "potenzial", wert: 1.5 }],
        felder: ["prozessstruktur"],
        beleg: "Im betrachteten Ablauf entstehen regelmäßig Rückfragen.",
      },
      {
        key: "S3-FEHLER",
        symbol: "fehler",
        label: "Es passieren Fehler, die später auffallen",
        signale: [
          { achse: "potenzial", wert: 2 },
          { achse: "fit", wert: 1 },
        ],
        felder: ["doppelerfassung", "prozessstruktur"],
        beleg: "Im betrachteten Ablauf entstehen Fehler, die erst später auffallen.",
      },
      {
        key: "S3-X",
        label: "Nichts davon, das läuft glatt",
        keinBefund: true,
        signale: [{ achse: "reife", wert: 1.5 }],
        beleg: "Im betrachteten Ablauf werden keine Reibungspunkte benannt.",
      },
    ],
  },
  {
    key: "S4",
    phase: "spotlight",
    thema: "spotlight",
    symbol: "zeit",
    betonung: ["wie oft"],
    kern: true,
    absicht: "Häufigkeit mal Aufwand — erst daraus wird aus einem Ärgernis ein Geschäftsfall.",
    frage: "Wie oft läuft dieser Ablauf ungefähr?",
    modus: "einfach",
    optionen: [
      {
        key: "S4-A",
        label: "Mehrmals am Tag",
        signale: [
          { achse: "potenzial", wert: 2.5 },
          { achse: "fit", wert: 1.5 },
        ],
        beleg: "Der betrachtete Ablauf läuft mehrmals täglich.",
      },
      {
        key: "S4-B",
        label: "Täglich",
        signale: [
          { achse: "potenzial", wert: 2 },
          { achse: "fit", wert: 1 },
        ],
        beleg: "Der betrachtete Ablauf läuft täglich.",
      },
      {
        key: "S4-C",
        label: "Wöchentlich",
        signale: [{ achse: "potenzial", wert: 1 }],
        beleg: "Der betrachtete Ablauf läuft wöchentlich.",
      },
      {
        key: "S4-D",
        label: "Monatlich oder seltener",
        signale: [{ achse: "potenzial", wert: 0 }],
        beleg: "Der betrachtete Ablauf läuft monatlich oder seltener.",
      },
    ],
  },
  {
    key: "S5",
    phase: "spotlight",
    thema: "spotlight",
    symbol: "ziel",
    betonung: ["Problem"],
    kern: true,
    absicht:
      "Die Eigenwahrnehmung. Was der Betrieb selbst nicht als Problem sieht, verkaufen wir ihm auch nicht.",
    frage: "Sehen Sie diesen Ablauf selbst als Problem?",
    modus: "einfach",
    optionen: [
      {
        key: "S5-A",
        label: "Ja, das ärgert uns regelmäßig",
        signale: [{ achse: "fit", wert: 3 }],
        beleg: "Der Betrieb benennt den betrachteten Ablauf selbst als Problem.",
      },
      {
        key: "S5-B",
        label: "Stört, aber wir haben uns arrangiert",
        signale: [{ achse: "fit", wert: 1 }],
        beleg: "Der betrachtete Ablauf stört, wird aber hingenommen.",
      },
      {
        key: "S5-C",
        label: "Nein, das ist für uns in Ordnung so",
        signale: [{ achse: "fit", wert: -2 }],
        beleg: "Der Betrieb sieht den betrachteten Ablauf nicht als Problem.",
      },
    ],
  },
];

export const FRAGEN: RadarFrage[] = [...FRAGEN_POTENZIAL, ...FRAGEN_SPOTLIGHT];

export const FRAGE_NACH_KEY = new Map(FRAGEN.map((f) => [f.key, f]));

export function frage(key: string): RadarFrage | null {
  return FRAGE_NACH_KEY.get(key) ?? null;
}

export function option(frageKey: string, optionKey: string): RadarOption | null {
  return frage(frageKey)?.optionen.find((o) => o.key === optionKey) ?? null;
}

// ─── Widersprüche ────────────────────────────────────────────────────────────

/**
 * Antwortpaare, die sich fachlich nicht vertragen.
 *
 * Ein Widerspruch ist kein Fehler des Kunden — meistens schätzt jemand das
 * große Bild anders ein als den Einzelfall. Er senkt aber die Aussagekraft,
 * und der Closer muss ihn im Gespräch auflösen können, statt ihn zu
 * überspielen.
 *
 * Bewusst knapp gehalten: Jeder Eintrag muss ein echter Widerspruch sein, kein
 * bloß auffälliges Muster. „Durchgehend digital, aber viele Programme ohne
 * Verbindung" ist kein Widerspruch, sondern der häufigste Integrationsfall
 * überhaupt.
 */
export const WIDERSPRUECHE: Array<{
  wenn: Array<{ frage: string; optionen: string[] }>;
  text: string;
}> = [
  {
    wenn: [
      { frage: "P5", optionen: ["P5-A"] },
      { frage: "P4", optionen: ["P4-C"] },
    ],
    text:
      "Jede Angabe werde nur einmal erfasst — zugleich überträgt zwischen den Programmen ausschließlich ein Mensch. Eines von beidem stimmt so nicht.",
  },
  {
    wenn: [
      { frage: "P2", optionen: ["P2-A"] },
      { frage: "P5", optionen: ["P5-C"] },
    ],
    text:
      "Unter zwei Stunden Übertragungsarbeit pro Woche, aber Mehrfacherfassung als Normalfall. Der Aufwand dürfte höher liegen als geschätzt.",
  },
  {
    wenn: [
      { frage: "P7", optionen: ["P7-C"] },
      { frage: "P1", optionen: ["P1-A"] },
    ],
    text:
      "Durchgehend digitaler Auftragsdurchlauf, aber kein einziger automatischer Ablauf. Vermutlich ist „digital“ hier gleichbedeutend mit „am Bildschirm“.",
  },
  {
    wenn: [
      { frage: "P9", optionen: ["P9-X"] },
      { frage: "P2", optionen: ["P2-C", "P2-D"] },
    ],
    text:
      "Kein Bereich sticht als Zeitfresser heraus, zugleich mehr als fünf Stunden Übertragungsarbeit pro Woche. Der Aufwand verteilt sich offenbar, statt zu fehlen.",
  },
  {
    wenn: [
      { frage: "S5", optionen: ["S5-C"] },
      { frage: "S3", optionen: ["S3-FEHLER"] },
    ],
    text:
      "Der betrachtete Ablauf gilt als unproblematisch, produziert aber Fehler, die später auffallen.",
  },
];

// ─── Schwellen und Ergebnisstufen ────────────────────────────────────────────

export type ErgebnisStufe = "A" | "B" | "C";

/**
 * Schwellen auf der normierten Skala 0–100.
 *
 * Sie stehen hier und nicht in der Engine, damit sich das Urteil nachjustieren
 * lässt, ohne die Rechnung anzufassen.
 */
export const SCHWELLEN = {
  /** Ab hier gilt eine Achse als hoch. */
  hoch: 60,
  /** Darunter gilt eine Achse als niedrig. */
  niedrig: 35,
  /**
   * Mindestabdeckung der Kernfragen, damit überhaupt Zahlen ausgewiesen
   * werden. Darunter nennt der Bericht nur Kategorien — eine Prozentzahl aus
   * vier beantworteten Fragen wäre eine Genauigkeit, die es nicht gibt.
   */
  aussagekraftFuerZahlen: 60,
  /**
   * Mindestabdeckung für ein klares Urteil. Darunter ist das Ergebnis immer
   * Stufe B, in beide Richtungen: weder ein Zuschlag noch eine Absage lässt
   * sich auf halbe Daten stützen.
   */
  aussagekraftFuerUrteil: 70,
  /** Ab so vielen stützenden Antworten gilt ein Potenzialfeld als belegt. */
  belegeProFeld: 2,
  /**
   * Ab so vielen stützenden Antworten gilt ein Feld als dicht belegt. Zwei
   * solche Felder tragen eine Empfehlung auch dann, wenn das Gesamtpotenzial
   * nur mittel ist — siehe `bestimmeStufe`.
   */
  belegeDichtesFeld: 3,
} as const;

export const STUFEN: Record<
  ErgebnisStufe,
  { titel: string; kurz: string; naechsterSchritt: string; ton: "positiv" | "offen" | "zurueckhaltend" }
> = {
  A: {
    titel: "Hohes Potenzial für eine Zusammenarbeit",
    kurz: "Es wurden Herausforderungen erkannt, bei denen wir voraussichtlich helfen können.",
    naechsterSchritt:
      "Die erkannten Felder im Detail durchgehen und besprechen, welcher Weg zu Ihrem Betrieb passt.",
    ton: "positiv",
  },
  B: {
    titel: "Vertiefte Prüfung empfohlen",
    kurz:
      "Es gibt Anhaltspunkte, aber die Kurzanalyse reicht für eine klare Empfehlung noch nicht aus.",
    naechsterSchritt:
      "Die offenen Punkte gezielt nachschärfen, bevor über eine Umsetzung gesprochen wird.",
    ton: "offen",
  },
  C: {
    titel: "Aktuell kein ausreichender Bedarf erkennbar",
    kurz:
      "Der Betrieb ist in den betrachteten Punkten gut aufgestellt; ein Auftrag an uns würde sich daraus heute nicht rechnen.",
    naechsterSchritt:
      "Heute kein weiterer Schritt. Wir melden uns gern wieder, wenn sich etwas verändert.",
    ton: "zurueckhaltend",
  },
};

/** Qualitative Bänder, wenn Zahlen nicht tragen. */
export const BAENDER = [
  { bis: 35, label: "gering" },
  { bis: 60, label: "mittel" },
  { bis: 101, label: "hoch" },
] as const;

export function band(wert: number): string {
  return BAENDER.find((b) => wert < b.bis)?.label ?? "hoch";
}

/**
 * Fingerabdruck des Katalogs.
 *
 * Wird auf der Analyse gespeichert. Ändert sich der Katalog, lässt sich später
 * erkennen, dass ein altes Ergebnis mit anderen Fragen entstanden ist — statt
 * zwei Ergebnisse zu vergleichen, die nie vergleichbar waren.
 */
export const KATALOG_VERSION = "radar-1";

// ─── Live-Dimensionen ────────────────────────────────────────────────────────

/**
 * Die fünf Dimensionen des Live-Diagramms.
 *
 * Sie zeigen, **wie der Betrieb heute aufgestellt ist** — aufgeschlüsselt nach
 * Bereichen. Es ist derselbe Reifegrad wie auf der Achse „reife“, nur nicht als
 * eine Zahl, sondern als fünf.
 *
 * Bewusst nicht dabei: Veränderungsbereitschaft und wirtschaftliche Relevanz.
 * Beides sind gute Fragen, aber sie sagen nichts darüber aus, wie der Betrieb
 * digital dasteht — sie gehören zur Passung. Sie hier einzuzeichnen hieße, zwei
 * verschiedene Dinge in dieselbe Fläche zu malen.
 */
export const DIMENSIONEN = {
  prozesse: {
    label: "Prozesse",
    themen: ["digitalisierungsgrad", "engpaesse", "spotlight"] as ThemaKey[],
  },
  systeme: { label: "Systeme", themen: ["systemlandschaft"] as ThemaKey[] },
  automatisierung: {
    label: "Automatisierung",
    themen: ["automatisierung", "handarbeit"] as ThemaKey[],
  },
  daten: { label: "Daten", themen: ["informationsfluss", "transparenz"] as ThemaKey[] },
  organisation: { label: "Organisation", themen: ["prozessorganisation"] as ThemaKey[] },
} as const;

export type DimensionKey = keyof typeof DIMENSIONEN;

/** Reihenfolge im Diagramm — im Uhrzeigersinn ab oben. */
export const DIMENSION_REIHENFOLGE: DimensionKey[] = [
  "prozesse",
  "systeme",
  "automatisierung",
  "daten",
  "organisation",
];

/** Die Skala des Diagramms. Fünf Punkte, wie es jeder von Schulnoten kennt. */
export const DIMENSION_MAX = 5;

// ─── Live-Beobachtungen ──────────────────────────────────────────────────────

/**
 * Was während des Gesprächs rechts auftaucht.
 *
 * Jede Beobachtung hängt an einer konkreten Antwort und sagt, welcher. Es gibt
 * hier keine Branchenvergleiche, keine Einsparquoten und keine Hochrechnungen —
 * nichts, was über das hinausgeht, was der Betrieb selbst gesagt hat. Der Grund
 * ist nicht Zurückhaltung: Eine erfundene Zahl im Gespräch ist eine Zahl, die
 * der Kunde nachfragt, und dann steht der Kollege da.
 *
 * `text` muss aus der Antwort folgen. Wer hier etwas hineinschreibt, das die
 * Antwort nicht hergibt, baut genau den Blender, den das Radar nicht sein soll.
 */
export type BeobachtungsArt = "hinweis" | "staerke";

export const BEOBACHTUNGEN: Array<{
  key: string;
  frage: string;
  optionen: string[];
  art: BeobachtungsArt;
  dimension: DimensionKey;
  titel: string;
  text: string;
}> = [
  {
    key: "medienbruch",
    frage: "P4",
    optionen: ["P4-C"],
    art: "hinweis",
    dimension: "systeme",
    titel: "Medienbruch erkannt",
    text: "Zwischen den Programmen überträgt ausschließlich ein Mensch.",
  },
  {
    key: "medienbruch-teilweise",
    frage: "P4",
    optionen: ["P4-B"],
    art: "hinweis",
    dimension: "systeme",
    titel: "Teilweise verbunden",
    text: "Ein Teil der Übergaben zwischen den Programmen läuft von Hand.",
  },
  {
    key: "doppelerfassung",
    frage: "P5",
    optionen: ["P5-C"],
    art: "hinweis",
    dimension: "daten",
    titel: "Mehrfacherfassung",
    text: "Dieselbe Angabe wird nach eigener Aussage regelmäßig mehrfach eingetragen.",
  },
  {
    key: "handarbeit-hoch",
    frage: "P2",
    optionen: ["P2-C", "P2-D"],
    art: "hinweis",
    dimension: "automatisierung",
    titel: "Hoher Übertragungsaufwand",
    text: "Mehr als fünf Stunden pro Woche gehen für Abtippen und Übertragen drauf.",
  },
  {
    key: "handarbeit-unbekannt",
    frage: "P2",
    optionen: ["P2-X"],
    art: "hinweis",
    dimension: "daten",
    titel: "Aufwand nicht bekannt",
    text: "Der Zeitaufwand für Übertragungsarbeit wird im Betrieb nicht gemessen.",
  },
  {
    key: "papier",
    frage: "P1",
    optionen: ["P1-C"],
    art: "hinweis",
    dimension: "prozesse",
    titel: "Papier im Auftragsdurchlauf",
    text: "Der Weg vom Auftrag zur Rechnung läuft überwiegend über Zettel und Ausdrucke.",
  },
  {
    key: "personenabhaengig",
    frage: "P6",
    optionen: ["P6-C"],
    art: "hinweis",
    dimension: "organisation",
    titel: "Abläufe hängen an Personen",
    text: "Fällt jemand aus, ist unklar, wie seine Abläufe weitergehen.",
  },
  {
    key: "keine-automatisierung",
    frage: "P7",
    optionen: ["P7-C"],
    art: "hinweis",
    dimension: "automatisierung",
    titel: "Nichts läuft automatisch",
    text: "Jeder wiederkehrende Ablauf wird heute von einem Menschen angestoßen.",
  },
  {
    key: "zahlen-fehlen",
    frage: "P10",
    optionen: ["P10-C"],
    art: "hinweis",
    dimension: "daten",
    titel: "Zahlen auf Nachfrage",
    text: "Betriebszahlen entstehen durch Nachfragen oder Nachzählen.",
  },
  // ── Stärken: was gut läuft, wird genauso benannt ──────────────────────────
  {
    key: "durchgehend-digital",
    frage: "P1",
    optionen: ["P1-A"],
    art: "staerke",
    dimension: "prozesse",
    titel: "Durchgehend digital",
    text: "Der Auftragsdurchlauf kommt ohne Papier aus.",
  },
  {
    key: "systeme-verbunden",
    frage: "P4",
    optionen: ["P4-A"],
    art: "staerke",
    dimension: "systeme",
    titel: "Systeme verbunden",
    text: "Die eingesetzten Programme tauschen ihre Daten automatisch aus.",
  },
  {
    key: "automatisiert",
    frage: "P7",
    optionen: ["P7-A"],
    art: "staerke",
    dimension: "automatisierung",
    titel: "Automatisierung vorhanden",
    text: "Mehrere Abläufe laufen bereits ohne Zutun.",
  },
  {
    key: "dokumentiert",
    frage: "P6",
    optionen: ["P6-A"],
    art: "staerke",
    dimension: "organisation",
    titel: "Abläufe festgehalten",
    text: "Eine Vertretung kann übernehmen, ohne dass es hakt.",
  },
  {
    key: "zahlen-sofort",
    frage: "P10",
    optionen: ["P10-A"],
    art: "staerke",
    dimension: "daten",
    titel: "Zahlen auf Knopfdruck",
    text: "Betriebszahlen sind unmittelbar abrufbar.",
  },
  {
    key: "einmal-erfasst",
    frage: "P5",
    optionen: ["P5-A"],
    art: "staerke",
    dimension: "daten",
    titel: "Keine Mehrfacherfassung",
    text: "Jede Angabe wird nach eigener Aussage nur einmal erfasst.",
  },
];
