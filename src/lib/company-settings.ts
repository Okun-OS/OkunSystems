import { db } from "@/lib/db";

/**
 * Zentrale Unternehmensdaten für Rechnungen, Protokolle und sonstige
 * Dokumente. Werte werden in SystemSetting (group = "company") gehalten.
 *
 * Es werden bewusst KEINE Beispielwerte hinterlegt — fehlende Angaben bleiben
 * leer und werden in der UI und in Dokumenten als „nicht konfiguriert"
 * gekennzeichnet.
 */

export const COMPANY_SETTING_GROUP = "company";

export type CompanySettingType = "text" | "multiline" | "number" | "url" | "email";

export type CompanySettingField = {
  key: string;
  label: string;
  type: CompanySettingType;
  section: "identity" | "address" | "registry" | "bank" | "contact" | "invoice" | "branding";
  hint?: string;
};

export const COMPANY_SETTING_FIELDS: CompanySettingField[] = [
  { key: "company.name", label: "Firmenname", type: "text", section: "identity" },
  { key: "company.legalForm", label: "Rechtsform", type: "text", section: "identity" },
  { key: "company.managingDirector", label: "Geschäftsführung", type: "text", section: "identity" },

  { key: "company.street", label: "Straße", type: "text", section: "address" },
  { key: "company.houseNumber", label: "Hausnummer", type: "text", section: "address" },
  { key: "company.postalCode", label: "PLZ", type: "text", section: "address" },
  { key: "company.city", label: "Ort", type: "text", section: "address" },
  { key: "company.country", label: "Land", type: "text", section: "address" },

  { key: "company.registerCourt", label: "Registergericht", type: "text", section: "registry" },
  { key: "company.registerNumber", label: "Registernummer", type: "text", section: "registry" },
  { key: "company.taxNumber", label: "Steuernummer", type: "text", section: "registry" },
  { key: "company.vatId", label: "USt-IdNr.", type: "text", section: "registry" },

  { key: "company.bankName", label: "Bank", type: "text", section: "bank" },
  { key: "company.iban", label: "IBAN", type: "text", section: "bank" },
  { key: "company.bic", label: "BIC", type: "text", section: "bank" },

  { key: "company.email", label: "E-Mail", type: "email", section: "contact" },
  { key: "company.phone", label: "Telefon", type: "text", section: "contact" },
  { key: "company.website", label: "Website", type: "url", section: "contact" },

  {
    key: "company.defaultPaymentTermDays",
    label: "Standard-Zahlungsziel (Tage)",
    type: "number",
    section: "invoice",
  },
  {
    key: "company.defaultVatRatePercent",
    label: "Standard-USt.-Satz (%)",
    type: "number",
    section: "invoice",
  },
  {
    key: "company.invoiceNumberPrefix",
    label: "Rechnungsnummer-Präfix",
    type: "text",
    section: "invoice",
    hint: "Wird der Jahreszahl vorangestellt, z. B. RE → RE-2026-0001",
  },
  {
    key: "company.paymentTerms",
    label: "Standard-Zahlungsbedingungen",
    type: "multiline",
    section: "invoice",
  },
  { key: "company.invoiceFooter", label: "Rechnungs-Footer", type: "multiline", section: "invoice" },
  {
    key: "company.paymentInfo",
    label: "Zahlungsinformation",
    type: "multiline",
    section: "invoice",
  },

  { key: "company.logoUrl", label: "Logo (URL oder Pfad)", type: "text", section: "branding" },
  { key: "company.accentColor", label: "Akzentfarbe", type: "text", section: "branding" },
];

export type CompanySettings = Record<string, string | null>;

export async function getCompanySettings(): Promise<CompanySettings> {
  const rows = await db.systemSetting.findMany({
    where: { group: COMPANY_SETTING_GROUP },
    select: { key: true, value: true },
  });
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const settings: CompanySettings = {};
  for (const field of COMPANY_SETTING_FIELDS) {
    const raw = stored.get(field.key);
    settings[field.key] = raw && raw.trim() ? raw.trim() : null;
  }
  return settings;
}

export async function saveCompanySettings(values: Record<string, string>): Promise<void> {
  const allowed = new Set(COMPANY_SETTING_FIELDS.map((f) => f.key));
  const entries = Object.entries(values).filter(([key]) => allowed.has(key));
  await db.$transaction(
    entries.map(([key, value]) => {
      const label = COMPANY_SETTING_FIELDS.find((f) => f.key === key)?.label ?? key;
      return db.systemSetting.upsert({
        where: { key },
        update: { value: value.trim(), label, group: COMPANY_SETTING_GROUP },
        create: { key, value: value.trim(), label, group: COMPANY_SETTING_GROUP },
      });
    })
  );
}

/** Liste der Pflichtangaben, die für eine vollständige Rechnung fehlen. */
export function missingInvoiceSettings(settings: CompanySettings): CompanySettingField[] {
  const requiredKeys = [
    "company.name",
    "company.street",
    "company.postalCode",
    "company.city",
    "company.email",
  ];
  return COMPANY_SETTING_FIELDS.filter(
    (f) => requiredKeys.includes(f.key) && !settings[f.key]
  );
}

export const NOT_CONFIGURED = "nicht konfiguriert";

/** Baut den Absenderblock aus den Unternehmenseinstellungen. */
export function companyAddressLines(settings: CompanySettings): string[] {
  const lines: string[] = [];
  const name = [settings["company.name"], settings["company.legalForm"]]
    .filter(Boolean)
    .join(" ");
  if (name) lines.push(name);
  const street = [settings["company.street"], settings["company.houseNumber"]]
    .filter(Boolean)
    .join(" ");
  if (street) lines.push(street);
  const city = [settings["company.postalCode"], settings["company.city"]]
    .filter(Boolean)
    .join(" ");
  if (city) lines.push(city);
  if (settings["company.country"]) lines.push(settings["company.country"]!);
  return lines;
}

export function defaultVatRateBp(settings: CompanySettings): number | null {
  const raw = settings["company.defaultVatRatePercent"];
  if (!raw) return null;
  const value = Math.round(Number(raw.replace(",", ".")) * 100);
  return Number.isSafeInteger(value) && value >= 0 && value <= 10000 ? value : null;
}

export function defaultPaymentTermDays(settings: CompanySettings): number | null {
  const raw = settings["company.defaultPaymentTermDays"];
  if (!raw) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value >= 0 ? value : null;
}
