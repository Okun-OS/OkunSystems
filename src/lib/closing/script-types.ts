/** Script-Typen und Platzhalterkatalog als Client-taugliches Modul. */
export const SCRIPT_KINDS = [
  "GENERAL_INTRO",
  "PACKAGE",
  "ADDON",
  "FINAL_ACCEPTANCE",
] as const;

export type ScriptKind = (typeof SCRIPT_KINDS)[number];

export const SCRIPT_KIND_LABELS: Record<string, string> = {
  GENERAL_INTRO: "Allgemeine Einleitung",
  PACKAGE: "Paket-Abschnitt",
  ADDON: "Add-on / laufende Kosten",
  FINAL_ACCEPTANCE: "Verbindliche Annahme",
};

export const SCRIPT_PLACEHOLDERS: Array<{ key: string; description: string }> = [
  { key: "customer_name", description: "Name der vertretungsberechtigten Person" },
  { key: "customer_first_name", description: "Vorname der vertretungsberechtigten Person" },
  { key: "customer_position", description: "Position / Funktion" },
  { key: "company_name", description: "Unternehmensname des Kunden" },
  { key: "company_legal_form", description: "Rechtsform des Kunden" },
  { key: "company_address", description: "Anschrift des Kunden (einzeilig)" },
  { key: "package_name", description: "Name des gewählten Pakets" },
  { key: "package_type", description: "Technischer Paket-Schlüssel" },
  { key: "one_time_price_net", description: "Einmalige Investition netto" },
  { key: "one_time_price_gross", description: "Einmalige Investition brutto" },
  { key: "recurring_price_net", description: "Laufende Gebühr netto" },
  { key: "recurring_interval", description: "Abrechnungsintervall" },
  { key: "minimum_term", description: "Mindestlaufzeit in Monaten" },
  { key: "payment_method", description: "Zahlungsart" },
  { key: "payment_terms", description: "Zahlungsbedingungen" },
  { key: "offer_number", description: "Angebotsnummer" },
  { key: "offer_version", description: "Angebotsversion" },
  { key: "contract_date", description: "Vertragsdatum" },
  { key: "vat_rate", description: "Umsatzsteuersatz" },
  { key: "closer_name", description: "Name des Closers" },
  { key: "addons", description: "Zusatzleistungen als Aufzählung" },
];
