import { db } from "@/lib/db";
import {
  COMPANY_SETTING_FIELDS,
  defaultPaymentTermDays,
  defaultVatRateBp,
  getCompanySettings,
  missingInvoiceSettings,
} from "@/lib/company-settings";
import { buildDraftFromClosing } from "@/lib/invoicing/invoice";
import { peekNextInvoiceNumber } from "@/lib/invoicing/numbering";
import { resolveTemplate } from "@/lib/documents/render";
import type { BillingSnapshot } from "@/lib/invoicing/context";
import type { InvoiceEditorData } from "./InvoiceEditor";
import type { ClientInvoiceItem } from "./invoice-actions";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function customPlaceholders(values: Record<string, string>) {
  const template = await resolveTemplate("invoice");
  if (!template) return [];
  const placeholders = await db.customPlaceholder.findMany({
    where: { templateId: template.templateId, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return placeholders.map((p) => ({
    key: p.key,
    label: p.label,
    type: p.type,
    defaultValue: p.defaultValue,
    isRequired: p.isRequired,
    value: values[p.key] ?? p.defaultValue ?? "",
  }));
}

/** Lädt eine bestehende Rechnung in den Editor. */
export async function loadInvoiceEditorData(
  invoiceId: string
): Promise<InvoiceEditorData | null> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: { orderBy: { position: "asc" } },
      company: { select: { name: true } },
    },
  });
  if (!invoice) return null;

  const settings = await getCompanySettings();
  const billing = (invoice.billingSnapshot as unknown as BillingSnapshot) ?? {
    name: invoice.billingName,
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    country: null,
    email: null,
  };
  const customValues = (invoice.customPlaceholders as Record<string, string>) ?? {};

  const items: ClientInvoiceItem[] = invoice.items.map((item) => ({
    description: item.description,
    quantity: String((item.quantityMilli ?? Math.round(item.quantity * 1000)) / 1000).replace(".", ","),
    unit: item.unit ?? "",
    unitPrice: (item.unitPrice / 100).toFixed(2).replace(".", ","),
    vatRate: item.vatRateBp !== null ? String(item.vatRateBp / 100).replace(".", ",") : "",
    discount: item.discountBp > 0 ? String(item.discountBp / 100).replace(".", ",") : "",
    sourceRef: item.sourceRef,
  }));

  return {
    id: invoice.id,
    invoiceNumber: invoice.finalizedAt ? invoice.invoiceNumber : null,
    status: invoice.status,
    finalized: Boolean(invoice.finalizedAt),
    companyId: invoice.companyId,
    companyName: invoice.company.name,
    closingSessionId: invoice.closingSessionId,
    offerId: invoice.offerId,
    contractSnapshotId: invoice.contractSnapshotId,
    billing: {
      name: billing.name,
      street: billing.street,
      houseNumber: billing.houseNumber,
      postalCode: billing.postalCode,
      city: billing.city,
      country: billing.country,
      email: billing.email,
      contactName: billing.contactName ?? null,
      vatId: billing.vatId ?? null,
    },
    currency: invoice.currency,
    vatMode: invoice.vatMode,
    vatRate: String((invoice.vatRateBp ?? 1900) / 100).replace(".", ","),
    invoiceDate: isoDate(invoice.invoiceDate ?? invoice.createdAt),
    dueDate: isoDate(invoice.dueDate),
    servicePeriodText: invoice.servicePeriodText,
    paymentTerms: invoice.paymentTerms,
    notes: invoice.notes,
    footerNote: invoice.footerNote,
    items,
    customPlaceholders: await customPlaceholders(customValues),
    pdfSha256: invoice.pdfSha256,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
    nextNumberPreview: await peekNextInvoiceNumber("invoice", invoice.invoiceDate ?? new Date()),
    companySettingsMissing: missingInvoiceSettings(settings).map((f) => f.label),
  };
}

/** Erzeugt einen neuen Editor-Zustand — optional aus einem Closing heraus. */
export async function buildNewInvoiceEditorData(input: {
  closingSessionId?: string;
  companyId?: string;
}): Promise<InvoiceEditorData | null> {
  const settings = await getCompanySettings();
  const vatRateBp = defaultVatRateBp(settings) ?? 1900;
  const dueDays = defaultPaymentTermDays(settings) ?? 14;
  const today = new Date();
  const due = new Date(today.getTime() + dueDays * 86400000);

  const base: Omit<InvoiceEditorData, "companyId" | "companyName" | "billing" | "items"> = {
    id: null,
    invoiceNumber: null,
    status: "draft",
    finalized: false,
    closingSessionId: input.closingSessionId ?? null,
    offerId: null,
    contractSnapshotId: null,
    currency: "EUR",
    vatMode: "standard",
    vatRate: String(vatRateBp / 100).replace(".", ","),
    invoiceDate: isoDate(today),
    dueDate: isoDate(due),
    servicePeriodText: null,
    paymentTerms: settings["company.paymentTerms"] ?? null,
    notes: null,
    footerNote: settings["company.invoiceFooter"] ?? null,
    customPlaceholders: await customPlaceholders({}),
    pdfSha256: null,
    paidAt: null,
    nextNumberPreview: await peekNextInvoiceNumber("invoice", today),
    companySettingsMissing: missingInvoiceSettings(settings).map((f) => f.label),
  };

  if (input.closingSessionId) {
    const draft = await buildDraftFromClosing(input.closingSessionId);
    if (!draft.ok) return null;
    const company = await db.company.findUnique({
      where: { id: draft.draft.companyId },
      select: { name: true },
    });
    const draftDue = new Date(today.getTime() + draft.draft.dueDays * 86400000);
    return {
      ...base,
      companyId: draft.draft.companyId,
      companyName: company?.name ?? "",
      offerId: draft.draft.offerId,
      contractSnapshotId: draft.draft.contractSnapshotId,
      vatRate: String(draft.draft.vatRateBp / 100).replace(".", ","),
      currency: draft.draft.currency,
      paymentTerms: draft.draft.paymentTerms,
      dueDate: isoDate(draftDue),
      billing: {
        name: draft.draft.billing.name,
        street: draft.draft.billing.street,
        houseNumber: draft.draft.billing.houseNumber,
        postalCode: draft.draft.billing.postalCode,
        city: draft.draft.billing.city,
        country: draft.draft.billing.country,
        email: draft.draft.billing.email,
        contactName: draft.draft.billing.contactName ?? null,
        vatId: draft.draft.billing.vatId ?? null,
      },
      items: draft.draft.items.map((item) => ({
        description: item.description,
        quantity: String(item.quantityMilli / 1000).replace(".", ","),
        unit: item.unit ?? "",
        unitPrice: (item.unitPriceCents / 100).toFixed(2).replace(".", ","),
        vatRate: String(item.vatRateBp / 100).replace(".", ","),
        discount: "",
        sourceRef: item.sourceRef,
      })),
    };
  }

  if (!input.companyId) return null;
  const company = await db.company.findUnique({ where: { id: input.companyId } });
  if (!company) return null;

  return {
    ...base,
    companyId: company.id,
    companyName: company.name,
    billing: {
      name: company.billingDiffers ? company.billingName : company.name,
      street: company.billingDiffers ? company.billingStreet : company.street,
      houseNumber: company.billingDiffers ? company.billingHouseNumber : company.houseNumber,
      postalCode: company.billingDiffers ? company.billingPostalCode : company.postalCode,
      city: company.billingDiffers ? company.billingCity : company.city,
      country: company.billingDiffers ? company.billingCountry : company.country,
      email: company.billingDiffers ? company.billingEmail : company.contactEmail,
      contactName:
        [company.contactFirstName, company.contactLastName].filter(Boolean).join(" ") || null,
      vatId: company.vatId,
    },
    items: [],
  };
}

export { COMPANY_SETTING_FIELDS };
