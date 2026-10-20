"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireInvoiceAccess, requireSales } from "@/lib/auth-guards";
import { parseAmountToCents, parseQuantityToMilli, parseVatRateToBp } from "@/lib/money";
import {
  buildDraftFromClosing,
  finalizeInvoice,
  regenerateInvoicePdf,
  saveInvoiceDraft,
} from "@/lib/invoicing/invoice";
import { calculateInvoiceTotals, type InvoiceItemInput } from "@/lib/invoicing/calc";
import type { BillingSnapshot } from "@/lib/invoicing/context";
import { markPaymentPending } from "@/lib/closing/payments";

/** Server Actions des Rechnungsmoduls. */

const LIST_PATH = "/admin/sales/rechnungen";

export type ClientInvoiceItem = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
  discount: string;
  sourceRef?: string | null;
};

/**
 * Übersetzt die Eingaben des Browsers in geprüfte Ganzzahlen.
 * Die vom Client mitgeschickten Summen werden bewusst ignoriert.
 */
function parseItems(
  items: ClientInvoiceItem[],
  defaultVatRateBp: number
): { ok: true; items: InvoiceItemInput[] } | { ok: false; error: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Bitte mindestens eine Position erfassen." };
  }
  const parsed: InvoiceItemInput[] = [];
  for (const [index, item] of items.entries()) {
    const description = item.description?.trim();
    if (!description) return { ok: false, error: `Position ${index + 1}: Beschreibung fehlt.` };

    const quantityMilli = parseQuantityToMilli(item.quantity);
    if (quantityMilli === null || quantityMilli <= 0) {
      return { ok: false, error: `Position ${index + 1}: Menge ist ungültig.` };
    }
    const unitPriceCents = parseAmountToCents(item.unitPrice);
    if (unitPriceCents === null) {
      return { ok: false, error: `Position ${index + 1}: Einzelpreis ist ungültig.` };
    }
    const vatRateBp = item.vatRate?.trim() ? parseVatRateToBp(item.vatRate) : defaultVatRateBp;
    if (vatRateBp === null) {
      return { ok: false, error: `Position ${index + 1}: Steuersatz ist ungültig.` };
    }
    const discountBp = item.discount?.trim() ? parseVatRateToBp(item.discount) : 0;
    if (discountBp === null) {
      return { ok: false, error: `Position ${index + 1}: Rabatt ist ungültig.` };
    }

    parsed.push({
      description,
      quantityMilli,
      unitPriceCents,
      vatRateBp,
      discountBp,
      unit: item.unit?.trim() || null,
      sourceRef: item.sourceRef ?? null,
    });
  }
  return { ok: true, items: parsed };
}

export type SaveInvoicePayload = {
  invoiceId?: string;
  companyId: string;
  closingSessionId?: string | null;
  offerId?: string | null;
  contractSnapshotId?: string | null;
  billing: BillingSnapshot;
  currency: string;
  vatMode: string;
  vatRate: string;
  invoiceDate: string;
  dueDate: string;
  serviceDateFrom?: string | null;
  serviceDateTo?: string | null;
  servicePeriodText?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  footerNote?: string | null;
  customPlaceholders?: Record<string, string>;
  items: ClientInvoiceItem[];
  idempotencyKey?: string | null;
};

export async function saveInvoice(payload: SaveInvoicePayload) {
  return guarded(async () => {
    const actor = payload.invoiceId
      ? (await requireInvoiceAccess(payload.invoiceId)).actor
      : await requireSales();

    // Ein Closer darf nur aus einem eigenen Closing heraus eine neue Rechnung
    // anlegen — nicht frei für beliebige Unternehmen.
    if (!payload.invoiceId && actor.role !== "ADMIN") {
      if (!payload.closingSessionId) {
        return { error: "Freie Rechnungen können nur von Administratoren angelegt werden." };
      }
      const { requireSessionAccess } = await import("@/lib/auth-guards");
      await requireSessionAccess(payload.closingSessionId);
    }

    const defaultVatRateBp = parseVatRateToBp(payload.vatRate) ?? 1900;
    const parsed = parseItems(payload.items, defaultVatRateBp);
    if (!parsed.ok) return { error: parsed.error };

    const invoiceDate = new Date(payload.invoiceDate);
    const dueDate = new Date(payload.dueDate);
    if (Number.isNaN(invoiceDate.getTime())) return { error: "Rechnungsdatum ist ungültig." };
    if (Number.isNaN(dueDate.getTime())) return { error: "Fälligkeitsdatum ist ungültig." };

    const result = await saveInvoiceDraft({
      invoiceId: payload.invoiceId,
      companyId: payload.companyId,
      closingSessionId: payload.closingSessionId ?? null,
      offerId: payload.offerId ?? null,
      contractSnapshotId: payload.contractSnapshotId ?? null,
      billing: payload.billing,
      currency: payload.currency || "EUR",
      vatMode: payload.vatMode || "standard",
      vatRateBp: defaultVatRateBp,
      invoiceDate,
      dueDate,
      serviceDateFrom: payload.serviceDateFrom ? new Date(payload.serviceDateFrom) : null,
      serviceDateTo: payload.serviceDateTo ? new Date(payload.serviceDateTo) : null,
      servicePeriodText: payload.servicePeriodText ?? null,
      paymentTerms: payload.paymentTerms ?? null,
      notes: payload.notes ?? null,
      footerNote: payload.footerNote ?? null,
      customPlaceholders: payload.customPlaceholders ?? {},
      items: parsed.items,
      createdById: actor.id,
      idempotencyKey: payload.idempotencyKey ?? null,
    });

    if (!result.ok) return { error: result.error };
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${result.invoiceId}`);
    return {
      ok: true,
      invoiceId: result.invoiceId,
      netTotalCents: result.totals.netTotalCents,
      vatTotalCents: result.totals.vatTotalCents,
      grossTotalCents: result.totals.grossTotalCents,
    };
  });
}

/** Serverseitige Neuberechnung für die Vorschau — ohne zu speichern. */
export async function recalculateInvoice(items: ClientInvoiceItem[], vatMode: string, vatRate: string) {
  return guarded(async () => {
    await requireSales();
    const defaultVatRateBp = parseVatRateToBp(vatRate) ?? 1900;
    const parsed = parseItems(items, defaultVatRateBp);
    if (!parsed.ok) return { error: parsed.error };
    try {
      const totals = calculateInvoiceTotals({
        items: parsed.items,
        vatMode,
        defaultVatRateBp,
      });
      return { ok: true, totals };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Berechnung fehlgeschlagen." };
    }
  });
}

export async function createInvoiceDraftFromClosing(closingSessionId: string) {
  return guarded(async () => {
    const { requireSessionAccess } = await import("@/lib/auth-guards");
    await requireSessionAccess(closingSessionId);
    const result = await buildDraftFromClosing(closingSessionId);
    return result.ok ? { ok: true, draft: result.draft } : { error: result.error };
  });
}

export async function finalizeInvoiceAction(invoiceId: string) {
  return guarded(async () => {
    const { actor } = await requireInvoiceAccess(invoiceId);
    const result = await finalizeInvoice(invoiceId, actor.id);
    if (!result.ok) return { error: result.error };

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { closingSessionId: true, companyId: true },
    });
    if (invoice?.closingSessionId) {
      await markPaymentPending(
        invoice.closingSessionId,
        invoice.companyId,
        "invoice",
        actor.id
      );
      revalidatePath(`/admin/sales/closing/${invoice.closingSessionId}`);
    }

    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${invoiceId}`);
    revalidatePath("/portal/dokumente");
    return {
      ok: true,
      invoiceNumber: result.invoiceNumber,
      alreadyFinal: result.alreadyFinal,
      pdfWarning: result.pdfWarning,
    };
  });
}

export async function regeneratePdfAction(invoiceId: string) {
  return guarded(async () => {
    const { actor } = await requireInvoiceAccess(invoiceId);
    const result = await regenerateInvoicePdf(invoiceId, actor.id);
    revalidatePath(`${LIST_PATH}/${invoiceId}`);
    return result.ok ? { ok: true } : { error: result.error };
  });
}

export async function cancelInvoiceAction(invoiceId: string, reason: string) {
  return guarded(async () => {
    const { actor } = await requireInvoiceAccess(invoiceId);
    if (!reason.trim()) return { error: "Eine Begründung ist erforderlich." };
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });
    if (!invoice) return { error: "Rechnung nicht gefunden." };
    if (invoice.status === "paid") {
      return { error: "Eine bezahlte Rechnung kann nicht storniert werden." };
    }

    await db.$transaction([
      db.invoice.update({ where: { id: invoiceId }, data: { status: "cancelled" } }),
      db.invoicePaymentEvent.create({
        data: {
          invoiceId,
          previousStatus: invoice.status,
          newStatus: "cancelled",
          source: "admin",
          actorId: actor.id,
          note: reason.trim(),
          idempotencyKey: `invoice_cancelled:${invoiceId}`,
        },
      }),
    ]);

    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${invoiceId}`);
    return { ok: true };
  });
}

export async function deleteInvoiceDraft(invoiceId: string) {
  return guarded(async () => {
    await requireInvoiceAccess(invoiceId);
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, finalizedAt: true },
    });
    if (!invoice) return { error: "Rechnung nicht gefunden." };
    if (invoice.finalizedAt || invoice.status !== "draft") {
      return { error: "Nur Entwürfe können gelöscht werden." };
    }
    await db.$transaction([
      db.invoiceItem.deleteMany({ where: { invoiceId } }),
      db.invoice.delete({ where: { id: invoiceId } }),
    ]);
    revalidatePath(LIST_PATH);
    return { ok: true };
  });
}
