/**
 * Katalog der dritten Blueprint-Säule: Systeme, wiederkehrende Aufgaben,
 * Abläufe.
 *
 * Bewusst eine reine Datei ohne Datenbankzugriff — sie wird von der
 * Kundenoberfläche, der Auswertung und dem Bericht gleichermaßen gelesen.
 *
 * Grundsatz: Alles, was gerechnet wird, entsteht aus Auswahlfeldern, festen
 * Bändern oder einer Zahl mit fester Einheit. Gleiche Eingabe, gleiches
 * Ergebnis. Freitext ist immer nur Bezeichnung — er benennt, was jemand
 * ergänzt hat, und geht als Vorschlag zur Prüfung in den Adminbereich, aber
 * nie in die Rechnung.
 *
 * Dazu gehört auch: Wer etwas ergänzt, wird trotzdem eingeordnet. Eine eigene
 * Häufigkeit („einmal im Jahr") wird in Vorgänge pro Woche umgerechnet und
 * zusätzlich dem nächstgelegenen Band zugeordnet — damit Auswertung und
 * Bericht weiter mit Bändern arbeiten können und die Stunden trotzdem stimmen.
 */

// ─── Block 1: Programme ──────────────────────────────────────────────────────

export type SystemEntry = {
  key: string;
  label: string;
  category: string;
  /** Verlangt eine eigene Bezeichnung vom Kunden. */
  needsName?: boolean;
  /** Steht für „wir haben dafür nichts" — zählt nicht als Programm. */
  isNone?: boolean;
  /** Offene Ergänzung: zusätzlich wählbar, wenn nichts in der Liste passt. */
  isOther?: boolean;
};

export const SYSTEM_CATEGORIES = [
  "Büro & E-Mail",
  "Kundenverwaltung",
  "Buchhaltung & Rechnung",
  "Planung & Einsatz",
  "Arbeitszeiten",
  "Personal",
  "Dokumente & Ablage",
  "Aufgaben & Fristen",
  "Interne Kommunikation",
  "Branchensoftware",
] as const;

export const SYSTEM_CATALOG: SystemEntry[] = [
  { key: "sys_ms365", label: "Microsoft 365 / Outlook", category: "Büro & E-Mail" },
  { key: "sys_google", label: "Google Workspace / Gmail", category: "Büro & E-Mail" },
  { key: "sys_mail_other", label: "anderer E-Mail-Anbieter", category: "Büro & E-Mail" },
  { key: "sys_office_other", label: "Sonstiges — welches?", category: "Büro & E-Mail", needsName: true, isOther: true },

  { key: "sys_hubspot", label: "HubSpot", category: "Kundenverwaltung" },
  { key: "sys_pipedrive", label: "Pipedrive", category: "Kundenverwaltung" },
  { key: "sys_salesforce", label: "Salesforce", category: "Kundenverwaltung" },
  { key: "sys_crm_other", label: "anderes CRM", category: "Kundenverwaltung", needsName: true },
  { key: "sys_crm_excel", label: "Excel-Liste", category: "Kundenverwaltung" },
  { key: "sys_crm_none", label: "kein System", category: "Kundenverwaltung", isNone: true },
  { key: "sys_crm_sonstiges", label: "Sonstiges — welches?", category: "Kundenverwaltung", needsName: true, isOther: true },

  { key: "sys_datev", label: "DATEV", category: "Buchhaltung & Rechnung" },
  { key: "sys_lexoffice", label: "Lexoffice", category: "Buchhaltung & Rechnung" },
  { key: "sys_sevdesk", label: "sevDesk", category: "Buchhaltung & Rechnung" },
  { key: "sys_acc_other", label: "andere Software", category: "Buchhaltung & Rechnung", needsName: true },
  { key: "sys_acc_office", label: "Word oder Excel", category: "Buchhaltung & Rechnung" },
  { key: "sys_acc_tax", label: "macht der Steuerberater", category: "Buchhaltung & Rechnung" },
  { key: "sys_acc_sonstiges", label: "Sonstiges — welches?", category: "Buchhaltung & Rechnung", needsName: true, isOther: true },

  { key: "sys_plan_industry", label: "Branchensoftware", category: "Planung & Einsatz", needsName: true },
  { key: "sys_plan_excel", label: "Excel", category: "Planung & Einsatz" },
  { key: "sys_plan_paper", label: "Papier oder Whiteboard", category: "Planung & Einsatz" },
  { key: "sys_plan_none", label: "keine Planung nötig", category: "Planung & Einsatz", isNone: true },
  { key: "sys_plan_other", label: "Sonstiges — welches?", category: "Planung & Einsatz", needsName: true, isOther: true },

  { key: "sys_time_terminal", label: "Terminal oder Stempeluhr", category: "Arbeitszeiten" },
  { key: "sys_time_app", label: "App auf dem Handy", category: "Arbeitszeiten" },
  { key: "sys_time_paper", label: "Stundenzettel auf Papier", category: "Arbeitszeiten" },
  { key: "sys_time_excel", label: "Excel", category: "Arbeitszeiten" },
  { key: "sys_time_none", label: "keine Erfassung", category: "Arbeitszeiten", isNone: true },
  { key: "sys_time_other", label: "Sonstiges — welches?", category: "Arbeitszeiten", needsName: true, isOther: true },

  { key: "sys_hr_digital", label: "digitale Personalakte", category: "Personal" },
  { key: "sys_hr_folder", label: "Ordner im Schrank", category: "Personal" },
  { key: "sys_hr_external", label: "externes Lohnbüro", category: "Personal" },
  { key: "sys_hr_other", label: "Sonstiges — welches?", category: "Personal", needsName: true, isOther: true },

  { key: "sys_doc_sharepoint", label: "SharePoint / OneDrive", category: "Dokumente & Ablage" },
  { key: "sys_doc_gdrive", label: "Google Drive", category: "Dokumente & Ablage" },
  { key: "sys_doc_dropbox", label: "Dropbox", category: "Dokumente & Ablage" },
  { key: "sys_doc_server", label: "Server oder Netzlaufwerk", category: "Dokumente & Ablage" },
  { key: "sys_doc_paper", label: "Papierordner", category: "Dokumente & Ablage" },
  { key: "sys_doc_other", label: "Sonstiges — welches?", category: "Dokumente & Ablage", needsName: true, isOther: true },

  { key: "sys_task_saas", label: "Asana, Trello oder Monday", category: "Aufgaben & Fristen" },
  { key: "sys_task_ms", label: "Microsoft Planner / To Do", category: "Aufgaben & Fristen" },
  { key: "sys_task_calendar", label: "Kalender", category: "Aufgaben & Fristen" },
  { key: "sys_task_notes", label: "Notizzettel", category: "Aufgaben & Fristen" },
  { key: "sys_task_none", label: "nichts Festes", category: "Aufgaben & Fristen", isNone: true },
  { key: "sys_task_other", label: "Sonstiges — welches?", category: "Aufgaben & Fristen", needsName: true, isOther: true },

  { key: "sys_comm_teams", label: "Microsoft Teams", category: "Interne Kommunikation" },
  { key: "sys_comm_slack", label: "Slack", category: "Interne Kommunikation" },
  { key: "sys_comm_whatsapp", label: "WhatsApp", category: "Interne Kommunikation" },
  { key: "sys_comm_phone", label: "Telefon und Zuruf", category: "Interne Kommunikation" },
  { key: "sys_comm_other", label: "Sonstiges — welches?", category: "Interne Kommunikation", needsName: true, isOther: true },

  { key: "sys_branchen", label: "Branchensoftware — welche?", category: "Branchensoftware", needsName: true },
  { key: "sys_branchen_none", label: "keine", category: "Branchensoftware", isNone: true },
  { key: "sys_branchen_other", label: "Sonstiges — welches?", category: "Branchensoftware", needsName: true, isOther: true },
];

// ─── Block 1: Zwecke ─────────────────────────────────────────────────────────

export type PurposeEntry = { key: string; label: string };

export const PURPOSES: PurposeEntry[] = [
  { key: "pur_customers", label: "Kundendaten pflegen" },
  { key: "pur_offers", label: "Anfragen und Angebote" },
  { key: "pur_orders", label: "Aufträge und Vorgänge" },
  { key: "pur_invoices", label: "Rechnungen und Zahlungen" },
  { key: "pur_scheduling", label: "Dienst- und Einsatzplanung" },
  { key: "pur_time", label: "Arbeitszeiten" },
  { key: "pur_hr", label: "Personaldaten und Verträge" },
  { key: "pur_documents", label: "Dokumente ablegen und finden" },
  { key: "pur_tasks", label: "Aufgaben und Fristen" },
  { key: "pur_comms", label: "Interne Kommunikation" },
  { key: "pur_reports", label: "Auswertungen und Zahlen" },
  { key: "pur_other", label: "Sonstiges" },
];

/** Der Zweck, der nach einer eigenen Bezeichnung verlangt. */
export const OTHER_PURPOSE_KEY = "pur_other";

/** Ab wie vielen Zwecken ein einzelnes Programm als Behelfslösung gilt. */
export const MULTI_PURPOSE_THRESHOLD = 5;

// ─── Block 2: Wiederkehrende Aufgaben ────────────────────────────────────────

export type TaskEntry = {
  key: string;
  label: string;
  area: string;
  /** Ablauf, der durchgegangen wird, wenn diese Aufgabe viel Zeit frisst. */
  flowKey: string;
};

export const TASK_AREAS = [
  "Anfragen & Vertrieb",
  "Auftragsabwicklung",
  "Rechnungen & Zahlungen",
  "Planung & Personal",
  "Verwaltung & Dokumente",
  "Steuerung & Abstimmung",
  "Einkauf & Material",
] as const;

export const TASK_CATALOG: TaskEntry[] = [
  { key: "t01", label: "Anfragen lesen und einordnen", area: "Anfragen & Vertrieb", flowKey: "flow_inquiry" },
  { key: "t02", label: "Kundendaten ins System übertragen", area: "Anfragen & Vertrieb", flowKey: "flow_inquiry" },
  { key: "t03", label: "Angebote schreiben", area: "Anfragen & Vertrieb", flowKey: "flow_offer" },
  { key: "t04", label: "Angebote nachfassen", area: "Anfragen & Vertrieb", flowKey: "flow_offer" },
  { key: "t05", label: "Termine mit Kunden abstimmen", area: "Anfragen & Vertrieb", flowKey: "flow_inquiry" },
  { key: "t06", label: "Rückfragen beantworten", area: "Anfragen & Vertrieb", flowKey: "flow_inquiry" },

  { key: "t07", label: "Aufträge anlegen", area: "Auftragsabwicklung", flowKey: "flow_order" },
  { key: "t08", label: "Aufträge verteilen", area: "Auftragsabwicklung", flowKey: "flow_order" },
  { key: "t09", label: "Auftragsstand nachhalten", area: "Auftragsabwicklung", flowKey: "flow_order" },
  { key: "t10", label: "Leistungsnachweise erstellen", area: "Auftragsabwicklung", flowKey: "flow_order" },
  { key: "t11", label: "Reklamationen bearbeiten", area: "Auftragsabwicklung", flowKey: "flow_complaint" },

  { key: "t12", label: "Rechnungen schreiben", area: "Rechnungen & Zahlungen", flowKey: "flow_invoice" },
  { key: "t13", label: "Rechnungen versenden", area: "Rechnungen & Zahlungen", flowKey: "flow_invoice" },
  { key: "t14", label: "Zahlungseingänge prüfen", area: "Rechnungen & Zahlungen", flowKey: "flow_invoice" },
  { key: "t15", label: "Mahnungen schreiben", area: "Rechnungen & Zahlungen", flowKey: "flow_invoice" },
  { key: "t16", label: "Belege sammeln und weitergeben", area: "Rechnungen & Zahlungen", flowKey: "flow_invoice" },

  { key: "t17", label: "Einsatzpläne erstellen", area: "Planung & Personal", flowKey: "flow_scheduling" },
  { key: "t18", label: "Pläne kommunizieren", area: "Planung & Personal", flowKey: "flow_scheduling" },
  { key: "t19", label: "Ausfälle umplanen", area: "Planung & Personal", flowKey: "flow_sickness" },
  { key: "t20", label: "Urlaubsanträge bearbeiten", area: "Planung & Personal", flowKey: "flow_absence" },
  { key: "t21", label: "Arbeitszeiten prüfen", area: "Planung & Personal", flowKey: "flow_payroll" },
  { key: "t22", label: "Stunden für den Lohn aufbereiten", area: "Planung & Personal", flowKey: "flow_payroll" },
  { key: "t23", label: "Nachweise und Qualifikationen verfolgen", area: "Planung & Personal", flowKey: "flow_absence" },
  { key: "t24", label: "Bewerbungen bearbeiten", area: "Planung & Personal", flowKey: "flow_application" },
  { key: "t25", label: "Neue einarbeiten", area: "Planung & Personal", flowKey: "flow_application" },

  { key: "t26", label: "Dokumente suchen", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },
  { key: "t27", label: "Dokumente ablegen und benennen", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },
  { key: "t28", label: "Formulare ausfüllen", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },
  { key: "t29", label: "Daten von System zu System übertragen", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },
  { key: "t30", label: "Listen in Excel pflegen", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },
  { key: "t31", label: "Post bearbeiten", area: "Verwaltung & Dokumente", flowKey: "flow_inquiry" },

  { key: "t32", label: "Wiedervorlagen und Fristen setzen", area: "Steuerung & Abstimmung", flowKey: "flow_inquiry" },
  { key: "t33", label: "Zahlen zusammenstellen", area: "Steuerung & Abstimmung", flowKey: "flow_report" },
  { key: "t34", label: "Berichte für Kunden erstellen", area: "Steuerung & Abstimmung", flowKey: "flow_report" },
  { key: "t35", label: "Rückfragen aus dem Team beantworten", area: "Steuerung & Abstimmung", flowKey: "flow_scheduling" },
  { key: "t36", label: "Absprachen weitergeben", area: "Steuerung & Abstimmung", flowKey: "flow_scheduling" },
  { key: "t37", label: "Besprechungen vorbereiten", area: "Steuerung & Abstimmung", flowKey: "flow_report" },

  { key: "t38", label: "Material bestellen", area: "Einkauf & Material", flowKey: "flow_purchase" },
  { key: "t39", label: "Bestände prüfen", area: "Einkauf & Material", flowKey: "flow_purchase" },
  { key: "t40", label: "Lieferantenrechnungen prüfen", area: "Einkauf & Material", flowKey: "flow_purchase" },
];

export const MAX_TASKS = 10;

/**
 * Eigene Aufgaben, die im Katalog fehlen.
 *
 * Der Schlüssel ist fest vergeben (`custom_1` …), die Bezeichnung kommt vom
 * Kunden. Sie zählen wie jede andere Aufgabe in die Stundenrechnung — wer
 * seinen größten Zeitfresser ergänzt, soll ihn im Bericht wiederfinden.
 */
export const MAX_CUSTOM_TASKS = 3;

export function customTaskKey(index: number): string {
  return `custom_${index + 1}`;
}

export function isCustomTaskKey(key: string): boolean {
  return /^custom_[1-9][0-9]*$/.test(key);
}

// ─── Block 2: Bänder ─────────────────────────────────────────────────────────

export type Band = { key: string; label: string; value: number; hint: string };

/** Häufigkeit, gerechnet in Vorgängen pro Woche. */
export const FREQUENCY_BANDS: Band[] = [
  { key: "freq_daily_multi", label: "Mehrmals am Tag", value: 15, hint: "15 × / Woche" },
  { key: "freq_daily", label: "Täglich", value: 5, hint: "5 × / Woche" },
  { key: "freq_weekly_multi", label: "Mehrmals pro Woche", value: 3, hint: "3 × / Woche" },
  { key: "freq_weekly", label: "Einmal pro Woche", value: 1, hint: "1 × / Woche" },
  { key: "freq_monthly_multi", label: "Mehrmals im Monat", value: 0.5, hint: "0,5 × / Woche" },
  { key: "freq_monthly", label: "Einmal im Monat", value: 0.25, hint: "0,25 × / Woche" },
];

/** Dauer je Vorgang in Minuten — gerechnet wird mit der Mitte des Bandes. */
export const DURATION_BANDS: Band[] = [
  { key: "dur_under5", label: "Unter 5 Minuten", value: 3, hint: "3 min" },
  { key: "dur_5_15", label: "5 bis 15 Minuten", value: 10, hint: "10 min" },
  { key: "dur_15_30", label: "15 bis 30 Minuten", value: 22, hint: "22 min" },
  { key: "dur_30_60", label: "30 bis 60 Minuten", value: 45, hint: "45 min" },
  { key: "dur_over60", label: "Über eine Stunde", value: 90, hint: "90 min" },
];

/** Wochen je Monat. 52 Wochen auf 12 Monate. */
export const WEEKS_PER_MONTH = 4.33;

// ─── Block 2: Eigene Angaben ─────────────────────────────────────────────────

/**
 * Wenn kein Band passt.
 *
 * „Stündlich, täglich, wöchentlich, monatlich" deckt nicht alles ab — manches
 * fällt einmal im Quartal oder einmal im Jahr an. Statt den Kunden auf das
 * nächstbeste Band zu zwingen, nimmt er eine Zahl und eine Einheit. Beides
 * feste Werte, also weiterhin dieselbe Eingabe, dasselbe Ergebnis.
 */
export const CUSTOM_FREQUENCY_KEY = "freq_custom";
export const CUSTOM_DURATION_KEY = "dur_custom";

/** Faktoren auf Vorgänge pro Woche. Ein Arbeitsmonat hat 5 Tage je Woche. */
export const FREQUENCY_UNITS: Array<{ key: string; label: string; perWeek: number }> = [
  { key: "hour", label: "pro Stunde", perWeek: 40 },
  { key: "day", label: "pro Arbeitstag", perWeek: 5 },
  { key: "week", label: "pro Woche", perWeek: 1 },
  { key: "month", label: "pro Monat", perWeek: 1 / WEEKS_PER_MONTH },
  { key: "quarter", label: "pro Quartal", perWeek: 1 / (3 * WEEKS_PER_MONTH) },
  { key: "year", label: "pro Jahr", perWeek: 1 / 52 },
];

export function frequencyUnitByKey(key: string) {
  return FREQUENCY_UNITS.find((unit) => unit.key === key);
}

/** Vorgänge pro Woche aus Anzahl und Einheit. Null, wenn die Angabe unbrauchbar ist. */
export function frequencyPerWeekFrom(count: number, unitKey: string): number | null {
  const unit = frequencyUnitByKey(unitKey);
  if (!unit) return null;
  if (!Number.isFinite(count) || count <= 0 || count > 10_000) return null;
  return count * unit.perWeek;
}

/**
 * Ordnet eine eigene Angabe dem nächstgelegenen Band zu.
 *
 * Gerechnet wird mit dem genauen Wert; das Band sorgt dafür, dass Auswertung
 * und Bericht eine Einstufung in der Hand haben, die sie kennen. Verglichen
 * wird logarithmisch, weil die Bänder sich vervielfachen statt zu addieren:
 * von 0,25 auf 0,5 ist derselbe Schritt wie von 5 auf 10.
 */
function nearestBand(bands: Band[], value: number): Band {
  let best = bands[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const band of bands) {
    const distance = Math.abs(Math.log(band.value) - Math.log(value));
    if (distance < bestDistance) {
      best = band;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Der Rückweg: aus Vorgängen pro Woche wieder eine lesbare Angabe.
 *
 * Gespeichert wird immer pro Woche. Wer „einmal pro Jahr" eingetragen hat,
 * soll beim erneuten Öffnen nicht „0,02 pro Woche" vorfinden — gesucht wird
 * deshalb die Einheit, bei der die kleinste Zahl ab 1 herauskommt.
 */
export function splitFrequency(perWeek: number): { count: number; unit: string } {
  let best: { count: number; unit: string } | null = null;
  for (const unit of FREQUENCY_UNITS) {
    const count = Math.round((perWeek / unit.perWeek) * 100) / 100;
    if (count >= 1 && (best === null || count < best.count)) {
      best = { count, unit: unit.key };
    }
  }
  return best ?? { count: Math.round(perWeek * 100) / 100, unit: "week" };
}

export function nearestFrequencyBand(perWeek: number): Band {
  return nearestBand(FREQUENCY_BANDS, perWeek);
}

export function nearestDurationBand(minutes: number): Band {
  return nearestBand(DURATION_BANDS, minutes);
}

// ─── Block 3: Abläufe ────────────────────────────────────────────────────────

export type FlowEntry = {
  key: string;
  title: string;
  /** Branchenschlüssel aus M1.1, für die dieser Ablauf der Standard ist. */
  industryDefaults?: string[];
};

export const FLOW_CATALOG: FlowEntry[] = [
  { key: "flow_inquiry", title: "Eine Kundenanfrage kommt herein", industryDefaults: ["M1.1-OPT-7"] },
  { key: "flow_offer", title: "Ein Angebot wird erstellt und nachgefasst", industryDefaults: ["M1.1-OPT-2"] },
  { key: "flow_order", title: "Ein Auftrag wird angelegt und abgewickelt", industryDefaults: ["M1.1-OPT-6"] },
  { key: "flow_invoice", title: "Eine Rechnung muss geschrieben werden" },
  { key: "flow_scheduling", title: "Ein Einsatzplan wird erstellt und verteilt", industryDefaults: ["M1.1-OPT-4"] },
  { key: "flow_sickness", title: "Jemand meldet sich krank", industryDefaults: ["M1.1-OPT-3"] },
  { key: "flow_absence", title: "Ein Urlaubsantrag wird bearbeitet" },
  { key: "flow_payroll", title: "Stunden werden für den Lohn aufbereitet" },
  { key: "flow_complaint", title: "Ein Kunde reklamiert" },
  { key: "flow_application", title: "Eine Bewerbung geht ein", industryDefaults: ["M1.1-OPT-1"] },
  { key: "flow_report", title: "Eine Auswertung wird zusammengestellt" },
  { key: "flow_purchase", title: "Material wird bestellt", industryDefaults: ["M1.1-OPT-5"] },
];

/** Fällt für eine Branche kein Standard an, gilt dieser Ablauf. */
export const FALLBACK_FLOW_KEY = "flow_inquiry";

/** Wie viele Abläufe höchstens durchgegangen werden. */
export const MAX_FLOWS = 3;

// ─── Block 3: Stationen ──────────────────────────────────────────────────────

export type StationEntry = { key: string; label: string; hint: string };

export const STATIONS: StationEntry[] = [
  { key: "st_receive", label: "Eingang bemerken und lesen", hint: "Wer sieht es zuerst, und wo?" },
  { key: "st_route", label: "Einordnen und Zuständigkeit klären", hint: "Wer entscheidet, wer es übernimmt?" },
  { key: "st_transfer", label: "Daten in ein System übertragen", hint: "Abtippen, kopieren, neu erfassen." },
  { key: "st_create", label: "Vorgang oder Aufgabe anlegen", hint: "Damit es nicht vergessen wird." },
  { key: "st_document", label: "Unterlagen oder Dokument erstellen", hint: "Angebot, Nachweis, Formular." },
  { key: "st_reply", label: "Antwort verfassen und versenden", hint: "An den Kunden oder den Anfragenden." },
  { key: "st_inform", label: "Beteiligte informieren", hint: "Kollegen, Objektleitung, Geschäftsführung." },
  { key: "st_followup", label: "Wiedervorlage oder Frist setzen", hint: "Damit jemand daran denkt." },
  { key: "st_archive", label: "Ablegen und dokumentieren", hint: "Damit es später wiederzufinden ist." },
];

export type StationMode = "manual" | "partial" | "automatic" | "none";

export const STATION_MODES: Array<{ key: StationMode; label: string }> = [
  { key: "manual", label: "von Hand" },
  { key: "partial", label: "teilweise automatisch" },
  { key: "automatic", label: "vollständig automatisch" },
  { key: "none", label: "entfällt bei uns" },
];

/**
 * Stationen, die OKUN im Soll-Ablauf übernimmt, sofern sie heute von Hand
 * laufen. Eine feste Zuordnung, keine Einschätzung: Das Lesen, Übertragen,
 * Anlegen, Vorbereiten, Informieren und Protokollieren ist Transportarbeit.
 * Was bewusst beim Menschen bleibt, ist die Entscheidung über die
 * Zuständigkeit und der Inhalt der Antwort.
 */
export const STATIONS_OKUN_TAKES: string[] = [
  "st_receive",
  "st_transfer",
  "st_create",
  "st_document",
  "st_inform",
  "st_followup",
  "st_archive",
];

/** Bezeichnungen für „kein Programm" an einer Station. */
export const NON_SYSTEM_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "paper", label: "Papier" },
  { key: "none", label: "gar nichts — das weiß man" },
];

/**
 * An einer Station kann etwas zum Einsatz kommen, das oben nicht als Programm
 * angegeben wurde. Statt „bitte wählen" stehen zu lassen, wird es benannt.
 */
export const OTHER_SYSTEM_KEY = "other";
export const OTHER_SYSTEM_PREFIX = "other:";

// ─── Nachschlagehilfen ───────────────────────────────────────────────────────

export function systemByKey(key: string): SystemEntry | undefined {
  return SYSTEM_CATALOG.find((entry) => entry.key === key);
}

export function taskByKey(key: string): TaskEntry | undefined {
  return TASK_CATALOG.find((entry) => entry.key === key);
}

export function flowByKey(key: string): FlowEntry | undefined {
  return FLOW_CATALOG.find((entry) => entry.key === key);
}

export function stationByKey(key: string): StationEntry | undefined {
  return STATIONS.find((entry) => entry.key === key);
}

export function purposeByKey(key: string): PurposeEntry | undefined {
  return PURPOSES.find((entry) => entry.key === key);
}

export function frequencyByKey(key: string): Band | undefined {
  return FREQUENCY_BANDS.find((entry) => entry.key === key);
}

export function durationByKey(key: string): Band | undefined {
  return DURATION_BANDS.find((entry) => entry.key === key);
}
