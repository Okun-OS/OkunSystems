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

const OPERATIONS: Paketumfang = {
  key: "operations",
  phasen: [
    "Buchung und Kickoff — Vertragsabschluss, gemeinsame Ziele festlegen",
    "OKUN Blueprint — Analyse der Ausgangssituation, Prozesse und Automatisierungspotenziale",
    "Digitale Grundlagen — die notwendigen Systeme und Strukturen einrichten oder verbessern",
    "Auswahl und Umsetzung — bis zu drei bewährte Automatisierungslösungen, passend zu den Prozessen",
    "OKUN Workforce — die digitalen Mitarbeitenden für wiederkehrende Aufgaben einführen",
    "Go-Live und Stabilisierung — Systeme gehen live, wir begleiten die erste Zeit",
  ],
  bloecke: [
    {
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
    },
    {
      titel: "Automatisierungen",
      versprechen: "Weniger manuelle Arbeit, mehr Wirkung",
      beschreibung:
        "Wir suchen wiederkehrende Tätigkeiten von Hand und setzen dafür bewährte Automatisierungslösungen um — standardisiert, erprobt, in die vorhandene Systemlandschaft eingebunden.",
      beispiele: [
        "standardisierte, erprobte Lösungen",
        "passend zu den Prozessen des Betriebs",
        "Einbindung in die vorhandene Systemlandschaft",
        "schnelle und messbare Ergebnisse",
      ],
      grenze: "Höchstens drei. Mehr ist nicht im Paket und wäre eine Nachforderung.",
    },
    {
      titel: "OKUN Workforce",
      versprechen: "Digitale Mitarbeitende, echte Entlastung",
      beschreibung:
        "Die digitale Workforce übernimmt wiederkehrende Aufgaben: Sie verarbeitet Daten, erstellt Dokumente und unterstützt die Teams — rund um die Uhr.",
      beispiele: [
        "Datenverarbeitung",
        "Dokumentenerstellung",
        "Statusmeldungen und Benachrichtigungen",
        "Vorbereitung von Auswertungen",
      ],
    },
  ],
};

/**
 * Der hinterlegte Umfang je Paket.
 *
 * Nur Operations ist belegt — für Foundation und Custom liegt das Angebot
 * noch nicht vor. Lieber nichts als etwas Erfundenes: Der Leitfaden sagt
 * dann, dass der Umfang nicht hinterlegt ist, statt einen zu behaupten.
 */
export const PAKETUMFANG: Partial<Record<PackageKey, Paketumfang>> = {
  operations: OPERATIONS,
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
