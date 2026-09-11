/** USt-Modi als Client-taugliches Modul. */
export const VAT_MODES = ["standard", "reverse_charge", "exempt", "small_business"] as const;
export type VatMode = (typeof VAT_MODES)[number];

export const VAT_MODE_LABELS: Record<VatMode, string> = {
  standard: "Regelbesteuerung",
  reverse_charge: "Reverse Charge (§ 13b UStG / innergemeinschaftlich)",
  exempt: "Steuerfrei",
  small_business: "Kleinunternehmerregelung (§ 19 UStG)",
};
