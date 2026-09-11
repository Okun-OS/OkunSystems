/** Typen der Vertragsdokumente (nicht-Server-Modul, damit im Client nutzbar). */
export const CONTRACT_DOCUMENT_TYPES = [
  { value: "agb", label: "AGB" },
  { value: "avv", label: "Auftragsverarbeitungsvertrag (AVV)" },
  { value: "datenschutz", label: "Datenschutzerklärung" },
  { value: "widerruf_b2b", label: "B2B-Hinweis zum Widerrufsrecht" },
  { value: "anlage", label: "Vertragsanlage" },
  { value: "sonstiges", label: "Sonstiges Vertragsdokument" },
] as const;

export function contractDocumentTypeLabel(value: string): string {
  return CONTRACT_DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}
