import { db } from "@/lib/db";
import { getCompanySettings, defaultPaymentTermDays, defaultVatRateBp } from "@/lib/company-settings";
import { renderDocumentPdf, storeDocumentPdf } from "@/lib/documents/render";
import { formatCents } from "@/lib/money";
import type { ContractSnapshotData } from "@/lib/closing/snapshot";
import { calculateInvoiceTotals, type CalculatedInvoice, type InvoiceItemInput } from "./calc";
import { buildInvoiceContext, type BillingSnapshot } from "./context";
import { reserveInvoiceNumber } from "./numbering";

/**
 * Rechnungsservice.
 *
 * Zentrale Regel: Beträge und Rechnungsnummer entstehen ausschließlich
 * serverseitig. Die Vorschau im Browser ist unverbindlich; bei der
 * Finalisierung wird alles neu berechnet, eingefroren und archiviert.
 */

const FALLBACK_VAT_RATE_BP = 1900;
const FALLBACK_PAYMENT_TERM_DAYS = 14;

export type InvoiceDraftItem = {
  description: string;
  quantityMilli: number;
  unit: string | null;
  unitPriceCents: number;
  vatRateBp: number;
  discountBp: number;
  sourceRef: string | null;
  note?: string | null;
};

export type InvoiceDraft = {
  companyId: string;
  closingSessionId: string | null;
  offerId: string | null;
  contractSnapshotId: string | null;
  billing: BillingSnapshot;
  currency: string;
  vatMode: string;
  vatRateBp: number;
  paymentTerms: string | null;
  dueDays: number;
  items: InvoiceDraftItem[];
  notes: string | null;
};

/** Erzeugt den Rechnungsentwurf aus dem eingefrorenen Vertragsstand. */
export async function buildDraftFromClosing(
  closingSessionId: string
): Promise<{ ok: true; draft: InvoiceDraft } | { ok: false; error: string }> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: { company: true, contractSnapshot: true },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };
  if (!session.contractSnapshot?.data) {
    return { ok: false, error: "Für diese Session existiert noch kein Contract Snapshot." };
  }

  const snapshot = session.contractSnapshot;
  const data = snapshot.data as unknown as ContractSnapshotData;
  const settings = await getCompanySettings();
  const vatRateBp = snapshot.vatRateBp ?? defaultVatRateBp(settings) ?? FALLBACK_VAT_RATE_BP;
  const billingSource = data.masterData?.billing;

  const items: InvoiceDraftItem[] = [];
  const push = (
    description: string,
    unitPriceCents: number,
    options: Partial<InvoiceDraftItem> = {}
  ) => {
    items.push({
      description,
      quantityMilli: options.quantityMilli ?? 1000,
      unit: options.unit ?? null,
      unitPriceCents,
      vatRateBp: options.vatRateBp ?? vatRateBp,
      discountBp: 0,
      sourceRef: options.sourceRef ?? null,
      note: options.note ?? null,
    });
  };

  const lineItems = data.offer?.lineItems ?? [];
  if (lineItems.length > 0) {
    for (const item of lineItems) {
      push(item.description, item.unitPriceCents, {
        quantityMilli: item.quantityMilli,
        unit: item.unit,
        sourceRef: `offer_line:${item.position}`,
        note: item.note,
      });
    }
  } else {
    push(
      data.offer?.packageName
        ? `${data.offer.packageName} — einmalige Investition`
        : "Einmalige Investition",
      data.offer?.oneTimeNetCents ?? snapshot.oneTimeNetCents ?? snapshot.totalNetCents,
      { sourceRef: "offer:one_time" }
    );
  }

  for (const extra of data.offer?.extras ?? []) {
    push(extra.description, extra.unitPriceCents, {
      quantityMilli: extra.quantityMilli,
      unit: extra.unit,
      sourceRef: `offer_extra:${extra.position}`,
      note: extra.note,
    });
  }

  return {
    ok: true,
    draft: {
      companyId: session.companyId,
      closingSessionId: session.id,
      offerId: data.offer?.id ?? snapshot.offerId,
      contractSnapshotId: snapshot.id,
      billing: {
        name: billingSource?.name ?? session.company.name,
        street: billingSource?.street ?? null,
        houseNumber: billingSource?.houseNumber ?? null,
        postalCode: billingSource?.postalCode ?? null,
        city: billingSource?.city ?? null,
        country: billingSource?.country ?? null,
        email: billingSource?.email ?? null,
        contactName: data.masterData?.actingPerson?.fullName ?? null,
        vatId: data.masterData?.registry?.vatId ?? null,
      },
      currency: data.offer?.currency ?? snapshot.currency ?? "EUR",
      vatMode: "standard",
      vatRateBp,
      paymentTerms: data.payment?.terms ?? settings["company.paymentTerms"] ?? null,
      dueDays: defaultPaymentTermDays(settings) ?? FALLBACK_PAYMENT_TERM_DAYS,
      items,
      notes: null,
    },
  };
}

export type PersistInvoiceInput = {
  invoiceId?: string;
  companyId: string;
  closingSessionId?: string | null;
  offerId?: string | null;
  contractSnapshotId?: string | null;
  billing: BillingSnapshot;
  currency: string;
  vatMode: string;
  vatRateBp: number;
  invoiceDate: Date;
  dueDate: Date;
  serviceDateFrom?: Date | null;
  serviceDateTo?: Date | null;
  servicePeriodText?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  footerNote?: string | null;
  customPlaceholders?: Record<string, string>;
  items: InvoiceItemInput[];
  createdById: string;
  /** Verhindert doppelte Erstellung bei Doppelklick. */
  idempotencyKey?: string | null;
};

/**
 * Legt einen Rechnungsentwurf an oder aktualisiert ihn. Beträge werden immer
 * neu berechnet — die Werte aus dem Browser dienen nur als Eingabe.
 */
export async function saveInvoiceDraft(
  input: PersistInvoiceInput
): Promise<{ ok: true; invoiceId: string; totals: CalculatedInvoice } | { ok: false; error: string }> {
  let totals: CalculatedInvoice;
  try {
    totals = calculateInvoiceTotals({
      items: input.items,
      vatMode: input.vatMode,
      defaultVatRateBp: input.vatRateBp,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Berechnung fehlgeschlagen." };
  }

  if (input.invoiceId) {
    const existing = await db.invoice.findUnique({
      where: { id: input.invoiceId },
      select: { status: true },
    });
    if (!existing) return { ok: false, error: "Rechnung nicht gefunden." };
    if (existing.status !== "draft") {
      return { ok: false, error: "Eine finalisierte Rechnung kann nicht mehr geändert werden." };
    }
  }

  if (!input.invoiceId && input.idempotencyKey) {
    const duplicate = await db.invoice.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true },
    });
    if (duplicate) {
      return { ok: true, invoiceId: duplicate.id, totals };
    }
  }

  const scalar = {
    status: "draft",
    companyId: input.companyId,
    closingSessionId: input.closingSessionId ?? null,
    offerId: input.offerId ?? null,
    contractSnapshotId: input.contractSnapshotId ?? null,
    currency: input.currency,
    vatMode: input.vatMode,
    vatRateBp: input.vatRateBp,
    invoiceDate: input.invoiceDate,
    dueDate: input.dueDate,
    serviceDateFrom: input.serviceDateFrom ?? null,
    serviceDateTo: input.serviceDateTo ?? null,
    servicePeriodText: input.servicePeriodText ?? null,
    paymentTerms: input.paymentTerms ?? null,
    notes: input.notes ?? null,
    footerNote: input.footerNote ?? null,
    customPlaceholders: (input.customPlaceholders ?? {}) as object,
    billingSnapshot: input.billing as unknown as object,
    billingName: input.billing.name,
    billingAddress: [
      [input.billing.street, input.billing.houseNumber].filter(Boolean).join(" "),
      [input.billing.postalCode, input.billing.city].filter(Boolean).join(" "),
      input.billing.country,
    ]
      .filter((line) => line && line.trim())
      .join("\n"),
    netTotalCents: totals.netTotalCents,
    vatTotalCents: totals.vatTotalCents,
    grossTotalCents: totals.grossTotalCents,
    // Bestandsfelder gespiegelt halten
    netAmount: totals.netTotalCents,
    grossAmount: totals.grossTotalCents,
    taxRate: input.vatRateBp / 10000,
  };

  const itemRows = totals.items.map((item) => ({
    position: item.position,
    description: item.description,
    quantity: item.quantityMilli / 1000,
    quantityMilli: item.quantityMilli,
    unit: item.unit,
    unitPrice: item.unitPriceCents,
    totalPrice: item.netAmountCents,
    vatRateBp: item.vatRateBp,
    discountBp: item.discountBp,
    netAmountCents: item.netAmountCents,
    vatAmountCents: item.vatAmountCents,
    grossAmountCents: item.grossAmountCents,
    sourceRef: item.sourceRef,
  }));

  try {
    const invoiceId = await db.$transaction(async (tx) => {
      if (input.invoiceId) {
        await tx.invoice.update({ where: { id: input.invoiceId }, data: scalar });
        await tx.invoiceItem.deleteMany({ where: { invoiceId: input.invoiceId } });
        await tx.invoiceItem.createMany({
          data: itemRows.map((row) => ({ ...row, invoiceId: input.invoiceId! })),
        });
        return input.invoiceId;
      }

      const created = await tx.invoice.create({
        data: {
          ...scalar,
          // Platzhalternummer — die verbindliche Nummer wird erst bei der
          // Finalisierung aus dem Nummernkreis gezogen.
          invoiceNumber: `ENTWURF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdById: input.createdById,
          idempotencyKey: input.idempotencyKey ?? null,
          items: { create: itemRows },
        },
        select: { id: true },
      });
      return created.id;
    });

    return { ok: true, invoiceId, totals };
  } catch (err) {
    if ((err as { code?: string }).code === "P2002" && input.idempotencyKey) {
      const duplicate = await db.invoice.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { id: true },
      });
      if (duplicate) return { ok: true, invoiceId: duplicate.id, totals };
    }
    console.error("[invoice] Entwurf konnte nicht gespeichert werden:", err);
    return { ok: false, error: "Der Rechnungsentwurf konnte nicht gespeichert werden." };
  }
}

export type FinalizeResult =
  | { ok: true; invoiceId: string; invoiceNumber: string; alreadyFinal: boolean; pdfWarning?: string }
  | { ok: false; error: string };

/**
 * Finalisiert eine Rechnung: Nummer vergeben, Beträge neu berechnen,
 * Billing-Snapshot einfrieren, PDF erzeugen, hashen, privat in R2 ablegen und
 * beim Kunden unter Dokumente verlinken.
 *
 * Idempotent: eine bereits finalisierte Rechnung wird unverändert
 * zurückgegeben, eine zweite Nummer wird nicht vergeben.
 */
export async function finalizeInvoice(
  invoiceId: string,
  actorId: string
): Promise<FinalizeResult> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { position: "asc" } }, company: true },
  });
  if (!invoice) return { ok: false, error: "Rechnung nicht gefunden." };
  if (invoice.finalizedAt) {
    return {
      ok: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      alreadyFinal: true,
    };
  }
  if (invoice.items.length === 0) {
    return { ok: false, error: "Eine Rechnung benötigt mindestens eine Position." };
  }

  let totals: CalculatedInvoice;
  try {
    totals = calculateInvoiceTotals({
      vatMode: invoice.vatMode,
      defaultVatRateBp: invoice.vatRateBp ?? FALLBACK_VAT_RATE_BP,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantityMilli: item.quantityMilli ?? Math.round(item.quantity * 1000),
        unitPriceCents: item.unitPrice,
        vatRateBp: item.vatRateBp,
        discountBp: item.discountBp,
        unit: item.unit,
        sourceRef: item.sourceRef,
      })),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Berechnung fehlgeschlagen." };
  }

  // Nummer erst unmittelbar vor dem Festschreiben ziehen.
  const reserved = await reserveInvoiceNumber("invoice", invoice.invoiceDate ?? new Date());
  const now = new Date();

  const billing = (invoice.billingSnapshot as unknown as BillingSnapshot) ?? {
    name: invoice.billingName,
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    country: null,
    email: null,
  };

  const context = await buildInvoiceContext({
    invoiceNumber: reserved.number,
    invoiceDate: invoice.invoiceDate ?? now,
    dueDate: invoice.dueDate,
    servicePeriodText: invoice.servicePeriodText,
    serviceDateFrom: invoice.serviceDateFrom,
    serviceDateTo: invoice.serviceDateTo,
    currency: invoice.currency,
    paymentTerms: invoice.paymentTerms,
    notes: invoice.notes,
    footerNote: invoice.footerNote,
    billing,
    totals,
    itemNotes: Object.fromEntries(invoice.items.map((i) => [i.position, i.description ? null : null])),
    customPlaceholders: (invoice.customPlaceholders as Record<string, string>) ?? {},
  });

  let pdfR2Key: string | null = null;
  let pdfSha256: string | null = null;
  let templateId: string | null = null;
  let templateVersion: number | null = null;
  let pdfWarning: string | undefined;

  try {
    const rendered = await renderDocumentPdf({
      type: "invoice",
      context,
      title: `Rechnung ${reserved.number}`,
    });
    const stored = await storeDocumentPdf({
      buffer: rendered.buffer,
      key: `invoices/${invoice.companyId}/${reserved.number}.pdf`,
      sha256: rendered.sha256,
    });
    pdfR2Key = stored.r2Key;
    pdfSha256 = stored.sha256;
    templateId = rendered.templateId;
    templateVersion = rendered.templateVersion;
  } catch (err) {
    // Die Rechnung wird trotzdem festgeschrieben — die Nummer ist gezogen und
    // darf nicht verfallen. Das PDF kann anschließend neu erzeugt werden.
    pdfWarning =
      err instanceof Error ? err.message : "Das Rechnungs-PDF konnte nicht erzeugt werden.";
    console.error("[invoice] PDF-Erzeugung fehlgeschlagen:", err);
  }

  await db.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        invoiceNumber: reserved.number,
        status: "sent",
        issuedAt: now,
        finalizedAt: now,
        finalizedById: actorId,
        invoiceDate: invoice.invoiceDate ?? now,
        netTotalCents: totals.netTotalCents,
        vatTotalCents: totals.vatTotalCents,
        grossTotalCents: totals.grossTotalCents,
        netAmount: totals.netTotalCents,
        grossAmount: totals.grossTotalCents,
        billingSnapshot: billing as unknown as object,
        pdfR2Key,
        pdfSha256,
        templateId,
        templateVersion,
      },
    });

    for (const item of totals.items) {
      const row = invoice.items.find((i) => i.position === item.position);
      if (!row) continue;
      await tx.invoiceItem.update({
        where: { id: row.id },
        data: {
          netAmountCents: item.netAmountCents,
          vatAmountCents: item.vatAmountCents,
          grossAmountCents: item.grossAmountCents,
          totalPrice: item.netAmountCents,
        },
      });
    }

    await tx.invoicePaymentEvent.create({
      data: {
        invoiceId: invoice.id,
        previousStatus: invoice.status,
        newStatus: "sent",
        source: "system",
        actorId,
        amountCents: totals.grossTotalCents,
        note: `Rechnung finalisiert (${reserved.number})`,
        idempotencyKey: `invoice_finalized:${invoice.id}`,
      },
    });

    if (pdfR2Key) {
      const document = await tx.document.create({
        data: {
          title: `Rechnung ${reserved.number}`,
          description: `Gesamtbetrag ${formatCents(totals.grossTotalCents, invoice.currency)}`,
          category: "INVOICE",
          fileName: `${reserved.number}.pdf`,
          mimeType: "application/pdf",
          r2Key: pdfR2Key,
          visibility: "customer",
          isPublished: true,
          version: templateVersion ? `Vorlage v${templateVersion}` : null,
          companyId: invoice.companyId,
          uploadedById: actorId,
        },
        select: { id: true },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { documentId: document.id },
      });
    }

    if (invoice.closingSessionId) {
      await tx.closingEvent.create({
        data: {
          closingSessionId: invoice.closingSessionId,
          companyId: invoice.companyId,
          actorId,
          eventType: "invoice_finalized",
          idempotencyKey: `invoice_finalized:${invoice.id}`,
          metadata: JSON.stringify({
            invoiceId: invoice.id,
            invoiceNumber: reserved.number,
            grossTotalCents: totals.grossTotalCents,
            pdfSha256,
          }),
        },
      });
    }
  });

  return {
    ok: true,
    invoiceId: invoice.id,
    invoiceNumber: reserved.number,
    alreadyFinal: false,
    pdfWarning,
  };
}

/** Erzeugt das PDF einer bereits finalisierten Rechnung erneut (z. B. nach Fehler). */
export async function regenerateInvoicePdf(
  invoiceId: string,
  actorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) return { ok: false, error: "Rechnung nicht gefunden." };
  if (!invoice.finalizedAt) return { ok: false, error: "Die Rechnung ist noch nicht finalisiert." };
  if (invoice.pdfR2Key) {
    return { ok: false, error: "Für diese Rechnung existiert bereits ein archiviertes PDF." };
  }

  const totals = calculateInvoiceTotals({
    vatMode: invoice.vatMode,
    defaultVatRateBp: invoice.vatRateBp ?? FALLBACK_VAT_RATE_BP,
    items: invoice.items.map((item) => ({
      description: item.description,
      quantityMilli: item.quantityMilli ?? Math.round(item.quantity * 1000),
      unitPriceCents: item.unitPrice,
      vatRateBp: item.vatRateBp,
      discountBp: item.discountBp,
      unit: item.unit,
    })),
  });

  const billing = (invoice.billingSnapshot as unknown as BillingSnapshot) ?? {
    name: invoice.billingName,
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    country: null,
    email: null,
  };

  try {
    const context = await buildInvoiceContext({
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      servicePeriodText: invoice.servicePeriodText,
      serviceDateFrom: invoice.serviceDateFrom,
      serviceDateTo: invoice.serviceDateTo,
      currency: invoice.currency,
      paymentTerms: invoice.paymentTerms,
      notes: invoice.notes,
      footerNote: invoice.footerNote,
      billing,
      totals,
      customPlaceholders: (invoice.customPlaceholders as Record<string, string>) ?? {},
    });
    const rendered = await renderDocumentPdf({
      type: "invoice",
      context,
      title: `Rechnung ${invoice.invoiceNumber}`,
      templateId: invoice.templateId,
      templateVersion: invoice.templateVersion,
    });
    const stored = await storeDocumentPdf({
      buffer: rendered.buffer,
      key: `invoices/${invoice.companyId}/${invoice.invoiceNumber}.pdf`,
      sha256: rendered.sha256,
    });

    const document = await db.document.create({
      data: {
        title: `Rechnung ${invoice.invoiceNumber}`,
        category: "INVOICE",
        fileName: `${invoice.invoiceNumber}.pdf`,
        mimeType: "application/pdf",
        r2Key: stored.r2Key,
        visibility: "customer",
        isPublished: true,
        companyId: invoice.companyId,
        uploadedById: actorId,
      },
      select: { id: true },
    });

    await db.invoice.update({
      where: { id: invoice.id },
      data: {
        pdfR2Key: stored.r2Key,
        pdfSha256: stored.sha256,
        templateId: rendered.templateId,
        templateVersion: rendered.templateVersion,
        documentId: document.id,
      },
    });
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "PDF konnte nicht erzeugt werden.",
    };
  }
}
