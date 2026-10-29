/**
 * Was OKUN Care ist — als Katalog.
 *
 * Getrennt von `leistungen.ts`, weil beide Seiten das hier brauchen: die
 * Kundenseite auf dem Server und die Erfassungsmaske im Browser. Läge es
 * neben der Datenbankabfrage, zöge jeder Import aus dem Browser den
 * Prisma-Client mit — und der Build bricht ab, zu Recht.
 */

// ─── Arten einer Leistung ────────────────────────────────────────────────────

/**
 * Care ist ausdrücklich nicht nur Support.
 *
 * Wer ein Sheet gebaut haben will, das rechnet, oder eine kleine Automation
 * zwischendurch braucht, soll nicht überlegen, ob das „noch Support" ist.
 * Deshalb stehen die Arten hier gleichberechtigt nebeneinander und nicht als
 * Störung und Ausnahme.
 */
export const CARE_ARTEN = [
  { key: "automatisierung", label: "Automation" },
  { key: "anpassung", label: "Anpassung" },
  { key: "support", label: "Support" },
  { key: "checkin", label: "Check-in" },
  { key: "sonstiges", label: "Sonstiges" },
] as const;

export type CareArt = (typeof CARE_ARTEN)[number]["key"];

export function istCareArt(wert: string): wert is CareArt {
  return CARE_ARTEN.some((a) => a.key === wert);
}

export function careArtLabel(key: string): string {
  return CARE_ARTEN.find((a) => a.key === key)?.label ?? "Sonstiges";
}

/**
 * Was Care hergibt, in der Sprache des Kunden.
 *
 * Bewusst konkret und bewusst klein: Die großen Vorhaben stehen im Projekt.
 * Care ist das, was zwischendurch anfällt — und genau das muss hier
 * draufstehen, sonst wird es nicht angefragt.
 */
export const CARE_UMFANG = [
  {
    titel: "Kleine Automationen zwischendurch",
    text:
      "Ein Ablauf, der noch von Hand läuft, eine Übergabe, die jedes Mal hakt — " +
      "sagen Sie es uns, wir bauen es dazwischen.",
  },
  {
    titel: "Tabellen, die rechnen sollen",
    text:
      "Ein Sheet, das sich selbst füllt, statt dass jemand es pflegt. " +
      "Auch das gehört dazu, nicht erst ab Projektgröße.",
  },
  {
    titel: "Anpassungen an dem, was läuft",
    text:
      "Prozesse ändern sich. Wir ziehen die Systeme nach, statt dass Sie " +
      "sich an eine alte Einstellung gewöhnen.",
  },
  {
    titel: "Support mit Vorfahrt",
    text: "Wenn etwas steht, gehen Sie vor — ohne Ticketnummer und Warteschlange.",
  },
  {
    titel: "Monatlicher Check-in",
    text: "Einmal im Monat gemeinsam draufsehen: Was läuft, was lohnt sich als Nächstes.",
  },
] as const;

// ─── Zeilen und Stand ────────────────────────────────────────────────────────

export type CareLeistungZeile = {
  id: string;
  titel: string;
  art: string;
  beschreibung: string | null;
  erledigtAm: Date;
  minuten: number | null;
  kundeSieht: boolean;
  erfasstVon: string | null;
};

export type CareStand = {
  status: string;
  aktiv: boolean;
  seit: Date | null;
  gekuendigtAm: Date | null;
  hatZahlungsdaten: boolean;
  /** Wer den Betrieb betreut — mit Namen, nicht als „Ihr Berater". */
  berater: { name: string; email: string | null } | null;
  naechsterTermin: { id: string; titel: string; beginn: Date } | null;
  leistungen: CareLeistungZeile[];
};
