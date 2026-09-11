/**
 * Stammdatenkatalog.
 *
 * Bewusst frei von Imports — weder Datenbank noch Pfad-Alias. Dadurch lädt
 * sowohl der Client als auch das Bootstrap-Skript (prisma/seed-closing.ts)
 * dieses Modul über einen rein relativen Pfad.
 */
export type MasterDataGroup = "company" | "address" | "contact" | "registry" | "billing";

export const GROUP_LABELS: Record<MasterDataGroup, string> = {
  company: "Unternehmen",
  address: "Anschrift",
  contact: "Vertretungsberechtigte Person",
  registry: "Register & Steuern",
  billing: "Abweichende Rechnungsanschrift",
};

export type LegalFormDefinition = {
  value: string;
  label: string;
  /** Handels-/Vereins-/Genossenschaftsregister vorhanden. */
  registered: boolean;
};

export const LEGAL_FORMS: LegalFormDefinition[] = [
  { value: "gmbh", label: "GmbH", registered: true },
  { value: "ug", label: "UG (haftungsbeschränkt)", registered: true },
  { value: "gmbh_co_kg", label: "GmbH & Co. KG", registered: true },
  { value: "ag", label: "AG", registered: true },
  { value: "kgaa", label: "KGaA", registered: true },
  { value: "se", label: "SE", registered: true },
  { value: "ohg", label: "OHG", registered: true },
  { value: "kg", label: "KG", registered: true },
  { value: "eg", label: "eG (Genossenschaft)", registered: true },
  { value: "ev", label: "e. V.", registered: true },
  { value: "ek", label: "e. K. (eingetragener Kaufmann)", registered: true },
  { value: "ltd", label: "Limited", registered: true },
  { value: "gbr", label: "GbR", registered: false },
  { value: "partg", label: "PartG / PartG mbB", registered: true },
  { value: "einzelunternehmen", label: "Einzelunternehmen", registered: false },
  { value: "freiberufler", label: "Freiberufler:in", registered: false },
  { value: "koerperschaft", label: "Körperschaft / Anstalt d. ö. R.", registered: false },
  { value: "sonstige", label: "Sonstige", registered: false },
];

export const REGISTERED_LEGAL_FORMS = LEGAL_FORMS.filter((f) => f.registered).map((f) => f.value);

export function legalFormLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return LEGAL_FORMS.find((f) => f.value === value)?.label ?? value;
}

export type MasterDataField = {
  key: string;
  label: string;
  group: MasterDataGroup;
  /** Standard-Pflichtigkeit, falls kein administrativer Eintrag existiert. */
  defaultRequired: boolean;
  /** Rechtsformen, für die das Feld gilt. Leer = alle. */
  defaultLegalForms: string[];
  /** Feld gilt nur, wenn eine abweichende Rechnungsanschrift gepflegt wird. */
  onlyIfBillingDiffers?: boolean;
  helpText?: string;
};

/** Struktureller Feldkatalog — Reihenfolge bestimmt die Anzeige. */
export const MASTER_DATA_FIELDS: MasterDataField[] = [
  { key: "name", label: "Unternehmensname", group: "company", defaultRequired: true, defaultLegalForms: [] },
  { key: "legalForm", label: "Rechtsform", group: "company", defaultRequired: true, defaultLegalForms: [] },

  { key: "street", label: "Straße", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "houseNumber", label: "Hausnummer", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "postalCode", label: "PLZ", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "city", label: "Ort", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "country", label: "Land", group: "address", defaultRequired: true, defaultLegalForms: [] },

  {
    key: "contactFirstName",
    label: "Vorname (vertretungsberechtigte Person)",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
  },
  {
    key: "contactLastName",
    label: "Nachname (vertretungsberechtigte Person)",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
  },
  {
    key: "contactPosition",
    label: "Position / Funktion",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
    helpText: "z. B. Geschäftsführung, Prokura, Inhaber:in",
  },
  { key: "contactEmail", label: "Geschäftliche E-Mail", group: "contact", defaultRequired: true, defaultLegalForms: [] },
  { key: "contactPhone", label: "Telefonnummer", group: "contact", defaultRequired: false, defaultLegalForms: [] },

  {
    key: "registerCourt",
    label: "Registergericht",
    group: "registry",
    defaultRequired: true,
    defaultLegalForms: REGISTERED_LEGAL_FORMS,
  },
  {
    key: "registerNumber",
    label: "Registernummer",
    group: "registry",
    defaultRequired: true,
    defaultLegalForms: REGISTERED_LEGAL_FORMS,
  },
  { key: "vatId", label: "USt-IdNr.", group: "registry", defaultRequired: false, defaultLegalForms: [] },
  { key: "taxNumber", label: "Steuernummer", group: "registry", defaultRequired: false, defaultLegalForms: [] },

  {
    key: "billingName",
    label: "Rechnungsempfänger",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingStreet",
    label: "Rechnungsanschrift — Straße",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingPostalCode",
    label: "Rechnungsanschrift — PLZ",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingCity",
    label: "Rechnungsanschrift — Ort",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
];
