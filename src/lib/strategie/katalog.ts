import { MAX_AUTOMATISIERUNGEN } from "@/lib/packages/umfang";

/**
 * Die festen Größen des Strategiegesprächs.
 *
 * Das Gespräch ist Schritt 3 des Projektablaufs und im Angebot wörtlich
 * zugesagt: Ergebnispräsentation, Roadmap und Auswahl der Lösungen. Diese
 * Datei hält fest, woraus es besteht — die Ansichten, die beide Seiten sehen,
 * und die Zustände, die ein Posten annehmen kann.
 *
 * Bewusst kleiner Vorrat an Werten: Jeder zusätzliche Zustand ist ein Fall,
 * den die Kundenseite, das Protokoll und die Umsetzung mitdenken müssen.
 */

export const GRENZE_AUTOMATISIERUNGEN = MAX_AUTOMATISIERUNGEN;

// ─── Ansichten ───────────────────────────────────────────────────────────────

export type AnsichtKey =
  | "betrieb"
  | "grundlagen"
  | "auswahl"
  | "wandel"
  | "workforce"
  | "plan"
  | "abschluss";

export type Ansicht = {
  key: AnsichtKey;
  label: string;
  /** Was auf dieser Ansicht beantwortet wird. */
  frage: string;
  /** Nur bei gebuchter Workforce. */
  nurMitWorkforce?: boolean;
};

export const ANSICHTEN: Ansicht[] = [
  {
    key: "betrieb",
    label: "Ihr Betrieb heute",
    frage: "Wie läuft die Arbeit heute wirklich — und wo bricht sie?",
  },
  {
    key: "grundlagen",
    label: "Digitale Grundlagen",
    frage: "Welche Werkzeuge fehlen, und welche richten wir ein?",
  },
  {
    key: "auswahl",
    label: "Die Auswahl",
    frage: "Welche Lösungen setzen wir um?",
  },
  {
    key: "wandel",
    label: "Heute und danach",
    frage: "Was ändert sich an den Abläufen?",
  },
  {
    key: "workforce",
    label: "OKUN Workforce",
    frage: "Was übernimmt das Personalsystem?",
    nurMitWorkforce: true,
  },
  { key: "plan", label: "Ihr Plan", frage: "Was passiert wann, und wer macht was?" },
  {
    key: "abschluss",
    label: "Festgehalten",
    frage: "Worauf haben wir uns geeinigt?",
  },
];

export function ansichtByKey(key: string): Ansicht | undefined {
  return ANSICHTEN.find((a) => a.key === key);
}

/**
 * Die Ansichten, die für dieses Paket gelten.
 *
 * Workforce ist nur in Operations und Custom enthalten; wer Foundation
 * gebucht hat, bekommt dafür keine eigene Ansicht. Ein leeres Kapitel im
 * Gespräch ist schlimmer als keines — es sieht aus, als hätten wir etwas
 * vergessen.
 */
export function ansichtenFuer(paket: string | null | undefined): Ansicht[] {
  const mitWorkforce = paket === "operations" || paket === "custom";
  return ANSICHTEN.filter((a) => !a.nurMitWorkforce || mitWorkforce);
}

// ─── Posten ──────────────────────────────────────────────────────────────────

/**
 * Welcher Art ein Posten ist.
 *
 * `offen` ist kein Versehen, sondern die Voreinstellung für alles, was sich
 * nicht sicher einordnen ließ. Ein Posten, dessen Art niemand bestimmt hat,
 * darf nicht zur Wahl stehen: Sonst zählte er womöglich nicht gegen die drei
 * Automatisierungen, obwohl er eine ist — und aus dem Gespräch käme eine
 * Nachforderung.
 */
export type PostenArt = "grundlage" | "automatisierung" | "workforce" | "custom" | "offen";

export const POSTEN_ARTEN: Array<{ key: PostenArt; label: string; hinweis: string }> = [
  {
    key: "grundlage",
    label: "Digitale Grundlage",
    hinweis: "Zählt nicht gegen die drei — Grundlagen sind unbegrenzt im Paket.",
  },
  {
    key: "automatisierung",
    label: "Automatisierung",
    hinweis: `Zählt gegen die ${GRENZE_AUTOMATISIERUNGEN}, die das Paket hergibt.`,
  },
  {
    key: "workforce",
    label: "OKUN Workforce",
    hinweis: "Teil des Pakets Operations, zählt nicht gegen die drei.",
  },
  {
    key: "custom",
    label: "Individuelle Entwicklung",
    hinweis: "Liegt über dem Paket — ein eigenes Vorhaben.",
  },
  {
    key: "offen",
    label: "Noch nicht eingeordnet",
    hinweis: "Muss vor der Freigabe zugeordnet werden.",
  },
];

export type PostenZustand = "kandidat" | "gewaehlt" | "spaeter" | "verworfen";

export const POSTEN_ZUSTAENDE: Array<{ key: PostenZustand; label: string }> = [
  { key: "kandidat", label: "Steht zur Wahl" },
  { key: "gewaehlt", label: "Gewählt" },
  { key: "spaeter", label: "Später möglich" },
  { key: "verworfen", label: "Verworfen" },
];

// ─── Sitzung ─────────────────────────────────────────────────────────────────

export type SitzungsStatus =
  | "vorbereitet"
  | "freigegeben"
  | "laeuft"
  | "abgeschlossen"
  | "abgebrochen";

export const SITZUNGS_STATUS: Array<{ key: SitzungsStatus; label: string }> = [
  { key: "vorbereitet", label: "In Vorbereitung" },
  { key: "freigegeben", label: "Freigegeben" },
  { key: "laeuft", label: "Läuft" },
  { key: "abgeschlossen", label: "Abgeschlossen" },
  { key: "abgebrochen", label: "Abgebrochen" },
];

/**
 * Ab wann der Kunde überhaupt etwas sieht.
 *
 * Die Posten entstehen maschinell und nennen Produkte beim Namen. Zwischen
 * „der Leitfaden schlägt vor" und „der Kunde liest es" gehört ein Mensch.
 */
export function kundeDarfSehen(status: string, freigegebenAm: Date | null): boolean {
  if (!freigegebenAm) return false;
  return status === "freigegeben" || status === "laeuft" || status === "abgeschlossen";
}

/**
 * Welche Blöcke des Leistungsumfangs auf welche Art zeigen.
 *
 * Der Leitfaden schreibt den Block „wörtlich aus dem Leistungsumfang", aber
 * geschrieben hat ihn ein Sprachmodell — auf Übereinstimmung aufs Zeichen
 * genau ist kein Verlass. Deshalb wird auf Stichworte geprüft, und was nicht
 * eindeutig ist, bleibt `offen`.
 */
export function artAusBlock(block: string | null | undefined): PostenArt {
  const t = (block ?? "").toLowerCase();
  if (!t.trim()) return "offen";
  if (t.includes("workforce")) return "workforce";
  if (t.includes("grundlag")) return "grundlage";
  if (t.includes("automat")) return "automatisierung";
  if (t.includes("individuell") || t.includes("custom") || t.includes("eigenentwicklung")) {
    return "custom";
  }
  return "offen";
}
