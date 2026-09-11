import {
  companyAddressLines,
  getCompanySettings,
  NOT_CONFIGURED,
  type CompanySettings,
} from "@/lib/company-settings";
import { getLogoDataUri } from "@/lib/documents/branding";
import { formatCents, formatQuantity, formatVatRateBp } from "@/lib/money";
import type { TemplateContext, TemplateValue } from "@/lib/documents/template-engine";
import { VAT_MODE_LABELS, type CalculatedInvoice } from "./calc";

/** Nicht gepflegte Angaben werden gekennzeichnet, niemals erfunden. */
export function orNotConfigured(value: string | null | undefined): string {
  return value && value.trim() ? value.trim() : NOT_CONFIGURED;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export type BillingSnapshot = {
  name: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  contactName?: string | null;
  vatId?: string | null;
  customerNumber?: string | null;
};

export function billingAddressLines(billing: BillingSnapshot): string[] {
  const lines: string[] = [];
  if (billing.name) lines.push(billing.name);
  if (billing.contactName) lines.push(billing.contactName);
  const street = [billing.street, billing.houseNumber].filter(Boolean).join(" ");
  if (street) lines.push(street);
  const city = [billing.postalCode, billing.city].filter(Boolean).join(" ");
  if (city) lines.push(city);
  if (billing.country) lines.push(billing.country);
  return lines;
}

export async function buildCompanyContext(
  settings?: CompanySettings
): Promise<TemplateContext> {
  const s = settings ?? (await getCompanySettings());
  const addressLines = companyAddressLines(s);
  const logoDataUri = s["company.logoUrl"] ?? (await getLogoDataUri());

  return {
    name: orNotConfigured(s["company.name"]),
    legalForm: orNotConfigured(s["company.legalForm"]),
    managingDirector: orNotConfigured(s["company.managingDirector"]),
    addressLines: addressLines.length > 0 ? addressLines : [NOT_CONFIGURED],
    headerLines: addressLines.slice(1),
    returnAddressLine: addressLines.join(" · ") || NOT_CONFIGURED,
    street: orNotConfigured(s["company.street"]),
    houseNumber: orNotConfigured(s["company.houseNumber"]),
    postalCode: orNotConfigured(s["company.postalCode"]),
    city: orNotConfigured(s["company.city"]),
    country: orNotConfigured(s["company.country"]),
    registerCourt: orNotConfigured(s["company.registerCourt"]),
    registerNumber: orNotConfigured(s["company.registerNumber"]),
    taxNumber: orNotConfigured(s["company.taxNumber"]),
    vatId: orNotConfigured(s["company.vatId"]),
    bankName: orNotConfigured(s["company.bankName"]),
    iban: orNotConfigured(s["company.iban"]),
    bic: orNotConfigured(s["company.bic"]),
    email: orNotConfigured(s["company.email"]),
    phone: orNotConfigured(s["company.phone"]),
    website: orNotConfigured(s["company.website"]),
    paymentInfo: s["company.paymentInfo"] ?? "",
    invoiceFooter: s["company.invoiceFooter"] ?? "",
    logoDataUri: logoDataUri ?? "",
  };
}

export type InvoiceContextInput = {
  invoiceNumber: string;
  invoiceDate: Date | string | null;
  dueDate: Date | string | null;
  servicePeriodText: string | null;
  serviceDateFrom: Date | string | null;
  serviceDateTo: Date | string | null;
  currency: string;
  paymentTerms: string | null;
  notes: string | null;
  footerNote: string | null;
  introText?: string | null;
  billing: BillingSnapshot;
  totals: CalculatedInvoice;
  itemNotes?: Record<number, string | null>;
  customPlaceholders?: Record<string, string>;
};

/** Baut den vollständigen Template-Kontext einer Rechnung. */
export async function buildInvoiceContext(
  input: InvoiceContextInput,
  settings?: CompanySettings
): Promise<TemplateContext> {
  const company = await buildCompanyContext(settings);
  const currency = input.currency || "EUR";

  const servicePeriod =
    input.servicePeriodText ||
    (input.serviceDateFrom && input.serviceDateTo
      ? `${formatDate(input.serviceDateFrom)} – ${formatDate(input.serviceDateTo)}`
      : input.serviceDateFrom
        ? formatDate(input.serviceDateFrom)
        : "");

  const items: TemplateValue[] = input.totals.items.map((item) => ({
    position: item.position,
    description: item.description,
    note: input.itemNotes?.[item.position] ?? "",
    quantity: formatQuantity(item.quantityMilli),
    unit: item.unit ?? "",
    unitPrice: formatCents(item.unitPriceCents, currency),
    vatRate: formatVatRateBp(item.vatRateBp),
    discount: item.discountBp > 0 ? formatVatRateBp(item.discountBp) : "",
    netAmount: formatCents(item.netAmountCents, currency),
    vatAmount: formatCents(item.vatAmountCents, currency),
    grossAmount: formatCents(item.grossAmountCents, currency),
  }));

  const vatBreakdown: TemplateValue[] = input.totals.vatBreakdown.map((row) => ({
    rate: formatVatRateBp(row.vatRateBp),
    net: formatCents(row.netAmountCents, currency),
    vat: formatCents(row.vatAmountCents, currency),
  }));

  const vatNotice =
    input.totals.vatMode === "standard" ? "" : VAT_MODE_LABELS[input.totals.vatMode];

  return {
    company,
    customer: {
      addressLines: billingAddressLines(input.billing),
      name: input.billing.name ?? "",
      contact: input.billing.contactName ?? "",
      salutation: input.billing.contactName ? "Sehr geehrte/r" : "",
      vatId: input.billing.vatId ?? "",
      number: input.billing.customerNumber ?? "",
      email: input.billing.email ?? "",
    },
    invoice: {
      number: input.invoiceNumber,
      date: formatDate(input.invoiceDate),
      dueDate: formatDate(input.dueDate),
      servicePeriod,
      currency,
      items,
      vatBreakdown,
      netTotal: formatCents(input.totals.netTotalCents, currency),
      vatTotal: formatCents(input.totals.vatTotalCents, currency),
      grossTotal: formatCents(input.totals.grossTotalCents, currency),
      net_total: formatCents(input.totals.netTotalCents, currency),
      vat_total: formatCents(input.totals.vatTotalCents, currency),
      gross_total: formatCents(input.totals.grossTotalCents, currency),
      paymentTerms: input.paymentTerms ?? (company.paymentInfo as string) ?? "",
      payment_terms: input.paymentTerms ?? "",
      notes: input.notes ?? "",
      footerNote: input.footerNote ?? (company.invoiceFooter as string) ?? "",
      introText: input.introText ?? "",
      vatNotice,
      itemCount: items.length,
    },
    custom: (input.customPlaceholders ?? {}) as TemplateValue,
  };
}

/** Systemplatzhalter, die der Admin nicht überschreiben darf. */
export const SYSTEM_PLACEHOLDER_PREFIXES = ["company.", "customer.", "invoice.", "contract.", "certificate.", "consents", "documents", "recording."];

export function isSystemPlaceholderKey(key: string): boolean {
  return SYSTEM_PLACEHOLDER_PREFIXES.some((prefix) => key === prefix.replace(/\.$/, "") || key.startsWith(prefix));
}
