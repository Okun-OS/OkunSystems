/** Consent-Typen als Client-taugliches Modul. */
export const CONSENT_TYPES = [
  "ACCEPTANCE",
  "ACKNOWLEDGEMENT",
  "RECORDING_CONSENT",
  "OTHER",
] as const;

export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_TYPE_LABELS: Record<string, string> = {
  ACCEPTANCE: "Annahme / Akzeptanz",
  ACKNOWLEDGEMENT: "Kenntnisnahme",
  RECORDING_CONSENT: "Einwilligung Vertragsaufzeichnung",
  OTHER: "Sonstige Erklärung",
};
