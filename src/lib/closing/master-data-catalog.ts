/** Client-taugliche Konstanten des Stammdatenkatalogs. */
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
