import type { PackageKey } from "@/lib/packages";

/**
 * Was in einem Paket tatsächlich drinsteckt.
 *
 * Bisher kannte das System nur Namen und Preis der Pakete. Was der Kunde für
 * sein Geld bekommt, stand allein im Angebots-PDF — und deshalb konnte der
 * Leitfaden nicht sagen, was wir für ihn tun. Er schrieb Fließtext über die
 * Lösungen, die die Auswertung vorschlägt, ohne zu wissen, dass daraus drei
 * Blöcke mit einer Obergrenze werden.
 *
 * Die Zahlen hier sind bindend: "bis zu drei" heißt drei, nicht fünf. Wer
 * im Gespräch mehr zusagt, als das Paket hergibt, verkauft eine Nachforderung.
 */

export interface Leistungsblock {
  titel: string;
  /** Der Satz aus dem Angebot, in einem Halbsatz. */
  versprechen: string;
  beschreibung: string;
  beispiele: string[];
  /** Eine Obergrenze, wenn es eine gibt. */
  grenze?: string;
}

export interface Paketumfang {
  key: PackageKey;
  /** Die Schritte von der Buchung bis zum Betrieb. */
  phasen: string[];
  bloecke: Leistungsblock[];
}

const GRUNDLAGEN: Leistungsblock = {
  titel: "Digitale Grundlagen",
  versprechen: "Die Basis für effizientes Arbeiten",
  beschreibung:
    "Wir prüfen, welche digitalen Werkzeuge und Strukturen im Unternehmen vorhanden sind, und richten sie bei Bedarf ein oder verbessern sie.",
  beispiele: [
    "E-Mail und Kalender",
    "zentrale Dateiablage",
    "Aufgaben- und Projektmanagement",
    "digitale Formulare und Datenerfassung",
    "Zusammenarbeit im Team (etwa Google Workspace oder Microsoft 365)",
  ],
};

const AUTOMATISIERUNGEN: Leistungsblock = {
  titel: "Bewährte Automatisierungslösungen",
  versprechen: "Weniger manuelle Arbeit, mehr Wirkung",
  beschreibung:
    "Wir suchen wiederkehrende Tätigkeiten von Hand mit Automatisierungspotenzial und setzen passende Lösungen um — standardisiert, erprobt, in die vorhandene Systemlandschaft eingebunden.",
  beispiele: [
    "standardisierte, erprobte Lösungen",
    "passend zu den Prozessen des Betriebs",
    "Einbindung in die vorhandene Systemlandschaft",
    "schnelle und messbare Ergebnisse",
  ],
  grenze:
    "Höchstens drei. Eine vierte ist nicht im Paket und wäre eine Nachforderung.",
};

const FOKUS: Leistungsblock = {
  titel: "Klarer Fokus",
  versprechen: "Lösungen mit echtem Mehrwert",
  beschreibung:
    "Wir setzen dort an, wo der Nutzen am größten ist, und begleiten die Umstellung persönlich.",
  beispiele: [
    "praxisnahe Umsetzung",
    "individuell priorisiert",
    "transparent und nachvollziehbar",
    "persönliche Begleitung",
    "Wissenstransfer für das Team",
  ],
};

/** Die sechs Module aus dem Angebot — nicht aus dem Lösungskatalog. */
const WORKFORCE: Leistungsblock = {
  titel: "OKUN Workforce",
  versprechen: "Das Betriebssystem für das Personal",
  beschreibung:
    "OKUN Workforce digitalisiert und automatisiert die Personalprozesse, von der Dienstplanung bis zur Lohnabrechnung.",
  beispiele: [
    "Dienstplanung — Pläne in wenigen Klicks, mit Verfügbarkeiten, Qualifikationen und gesetzlichen Vorgaben",
    "Zeiterfassung — Mitarbeitende stempeln sich ein und aus, alles wird für die Lohnabrechnung bereitgestellt",
    "Urlaubsmanagement — Anträge, Krankmeldungen und Abwesenheiten digital, automatisch geprüft, im Dienstplan berücksichtigt",
    "Lohnabrechnung — automatisiert und fehlerfrei, samt gesetzlicher Anforderungen",
    "Digitale Mitarbeiterakte — Personaldokumente, Verträge, Nachweise und Qualifikationen an einem Ort",
    "Auswertungen und Reports — Personalzahlen, Auslastung, Kosten und Abwesenheiten in Echtzeit",
  ],
};

const FOUNDATION: Paketumfang = {
  key: "foundation",
  phasen: [
    "Buchung und Kickoff — Vertrag abschließen, gemeinsame Ziele festlegen",
    "OKUN Blueprint — Analyse der Ausgangssituation, Prozesse und Automatisierungspotenziale",
    "Digitale Grundlagen — die notwendigen Systeme und Strukturen einrichten oder verbessern",
    "Auswahl und Umsetzung — bis zu drei bewährte Digitalisierungs- und Automatisierungslösungen",
    "Einrichtungstermin — gemeinsamer Termin zur Einrichtung, Konfiguration und Integration",
    "Go-Live und Stabilisierung — Systeme gehen live, wir begleiten die erste Zeit",
  ],
  bloecke: [GRUNDLAGEN, AUTOMATISIERUNGEN, FOKUS],
};

const OPERATIONS: Paketumfang = {
  key: "operations",
  phasen: [
    "Buchung und Kickoff — Vertragsabschluss, gemeinsame Ziele festlegen",
    "OKUN Blueprint — Analyse der Ausgangssituation, Prozesse und Automatisierungspotenziale",
    "Digitale Grundlagen — die notwendigen Systeme und Strukturen einrichten oder verbessern",
    "Auswahl und Umsetzung — bis zu drei bewährte Automatisierungslösungen, passend zu den Prozessen",
    "OKUN Workforce — Einführung für wiederkehrende Aufgaben und skalierbare Prozesse",
    "Go-Live und Stabilisierung — Systeme gehen live, wir begleiten die erste Zeit",
  ],
  bloecke: [GRUNDLAGEN, AUTOMATISIERUNGEN, WORKFORCE, FOKUS],

};

/**
 * Custom: alles aus Operations, dazu ein individuell entwickeltes Projekt.
 *
 * Dafür gibt es kein eigenes Angebotsblatt — das Projekt wird im Einzelfall
 * zugeschnitten und eingeschätzt.
 */
const CUSTOM: Paketumfang = {
  key: "custom",
  phasen: [
    ...OPERATIONS.phasen.slice(0, 5),
    "Individuelle Entwicklung — ein eigens gebautes System, im Einzelfall zugeschnitten und eingeschätzt",
    "Go-Live und Stabilisierung — Systeme gehen live, wir begleiten die erste Zeit",
  ],
  bloecke: [
    GRUNDLAGEN,
    AUTOMATISIERUNGEN,
    WORKFORCE,
    {
      titel: "Individuelle Entwicklung",
      versprechen: "Ein System, das es so noch nicht gibt",
      beschreibung:
        "Wir entwickeln ein System eigens für diesen Betrieb — entweder weil es das so nicht zu kaufen gibt, oder weil das Vorhandene so schlecht passt, dass eine eigene Lösung die bessere ist.",
      beispiele: [
        "Umfang und Preis werden im Einzelfall eingeschätzt",
        "setzt auf den digitalen Grundlagen und den Automatisierungen auf",
      ],
      grenze: "Ein Projekt. Was darüber hinausgeht, ist ein eigenes Vorhaben.",
    },
    FOKUS,
  ],
};

/** Der hinterlegte Umfang je Paket. */
export const PAKETUMFANG: Partial<Record<PackageKey, Paketumfang>> = {
  foundation: FOUNDATION,
  operations: OPERATIONS,
  custom: CUSTOM,
};

export function umfangFuer(key: string | null | undefined): Paketumfang | null {
  if (!key) return null;
  return PAKETUMFANG[key as PackageKey] ?? null;
}

/** Der Umfang als Text für das Dossier. */
export function umfangAlsText(key: string | null | undefined): string {
  const u = umfangFuer(key);
  if (!u) {
    return [
      "## Was der Kunde gebucht hat",
      "",
      "Für dieses Paket ist der Leistungsumfang nicht hinterlegt. Sag deshalb",
      "nicht, was im Paket enthalten ist — du weißt es nicht.",
    ].join("\n");
  }

  const bloecke = u.bloecke.map((b) =>
    [
      `### ${b.titel} — ${b.versprechen}`,
      b.beschreibung,
      b.beispiele.length > 0 ? `Beispiele: ${b.beispiele.join("; ")}` : "",
      b.grenze ? `GRENZE: ${b.grenze}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  );

  return [
    "## Was der Kunde gebucht hat",
    "",
    "Das ist der vereinbarte Leistungsumfang. Alles, was du im Abschnitt über",
    "unser Tun versprichst, muss hier hineinpassen — und was darüber",
    "hinausgeht, sagst du ausdrücklich als solches.",
    "",
    "Ablauf:",
    ...u.phasen.map((p, i) => `${i + 1}. ${p}`),
    "",
    ...bloecke,
  ].join("\n");
}
