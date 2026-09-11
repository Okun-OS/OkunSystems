import { db } from "@/lib/db";
import { formatCents, formatQuantity, formatVatRateBp } from "@/lib/money";
import {
  billingAddressLines,
  buildCompanyContext,
  formatDate,
  orNotConfigured,
} from "@/lib/invoicing/context";
import { renderDocumentPdf, renderTemplateHtml } from "@/lib/documents/render";
import type { TemplateContext } from "@/lib/documents/template-engine";
import { buildMasterDataSnapshot } from "./master-data";
import { getSnapshotData, type SnapshotLineItem } from "./snapshot";
import { RECURRING_INTERVAL_LABELS } from "./scripts";

/**
 * Angebotsdokument für die Kundenseite.
 *
 * Die Zahlen stammen bevorzugt aus dem eingefrorenen Contract Snapshot — dann
 * zeigt das PDF exakt das, was der Kunde bestätigt hat. Ist noch kein Snapshot
 * vorhanden, wird das aktuell hinterlegte Angebot dargestellt.
 *
 * Inhalte werden nicht erfunden: fehlende Stammdaten erscheinen als
 * „nicht konfiguriert", fehlende Positionen führen zu einer reinen
 * Summendarstellung.
 */

const DEFAULT_VAT_RATE_BP = 1900;

export type OfferDocumentSource = "snapshot" | "live";

type OfferDocument = {
  context: TemplateContext;
  source: OfferDocumentSource;
  offerNumber: string | null;
};

function mapLineItem(item: SnapshotLineItem, currency: string) {
  return {
    position: item.position,
    description: item.description,
    quantity: formatQuantity(item.quantityMilli),
    unit: item.unit ?? "",
    unitPrice: formatCents(item.unitPriceCents, currency),
    netAmount: formatCents(item.netCents, currency),
    note: item.note ?? "",
  };
}

/** Stellt den Template-Kontext des Angebots zusammen. */
export async function buildOfferContext(
  closingSessionId: string
): Promise<OfferDocument | null> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: {
      company: true,
      closer: { select: { name: true } },
    },
  });
  if (!session) return null;

  const snapshot = await getSnapshotData(closingSessionId);
  const company = await buildCompanyContext();

  const masterData = snapshot?.masterData ?? buildMasterDataSnapshot(session.company);
  const customerAddressLines = billingAddressLines({
    name: masterData.organizationName,
    contactName: masterData.actingPerson.fullName,
    street: masterData.address.street,
    houseNumber: masterData.address.houseNumber,
    postalCode: masterData.address.postalCode,
    city: masterData.address.city,
    country: masterData.address.country,
    email: masterData.actingPerson.email,
  });

  const customer: TemplateContext = {
    name: orNotConfigured(masterData.organizationName),
    contact: masterData.actingPerson.fullName ?? "",
    addressLines: customerAddressLines.length > 0 ? customerAddressLines : [orNotConfigured(null)],
    vatId: masterData.registry.vatId ?? "",
  };

  const documents = (snapshot?.documents ?? []).map((doc) => ({
    name: doc.name,
    version: doc.versionLabel,
  }));

  if (snapshot?.offer) {
    const offer = snapshot.offer;
    const currency = offer.currency || "EUR";
    return {
      source: "snapshot",
      offerNumber: offer.offerNumber,
      context: {
        company,
        customer,
        offer: {
          number: offer.offerNumber ?? "",
          date: formatDate(snapshot.contractDate ?? snapshot.frozenAt),
          validUntil: offer.validUntil ? formatDate(offer.validUntil) : "",
          closerName: snapshot.closer?.name ?? session.closer.name ?? "",
          packageName: offer.packageName ?? offer.packageType ?? "",
          lineItems: offer.lineItems.map((item) => mapLineItem(item, currency)),
          hasLineItems: offer.lineItems.length > 0,
          extras: offer.extras.map((item) => mapLineItem(item, currency)),
          hasExtras: offer.extras.length > 0,
          oneTimeNet: formatCents(offer.oneTimeNetCents, currency),
          oneTimeVat: formatCents(offer.oneTimeVatCents, currency),
          oneTimeGross: formatCents(offer.oneTimeGrossCents, currency),
          vatRate: formatVatRateBp(offer.vatRateBp),
          hasRecurring: Boolean(offer.recurringNetCents && offer.recurringNetCents > 0),
          recurringNet: formatCents(offer.recurringNetCents ?? 0, currency),
          recurringInterval: RECURRING_INTERVAL_LABELS[offer.recurringInterval ?? ""] ?? "",
          minimumTerm: offer.minimumTermMonths ?? "",
          paymentTerms: snapshot.payment?.terms ?? "",
          documents,
          hasDocuments: documents.length > 0,
        },
      },
    };
  }

  if (!session.activeOfferId) return null;

  const raw = await db.offer.findUnique({
    where: { id: session.activeOfferId },
    include: {
      template: { select: { name: true, packageType: true } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });
  if (!raw) return null;

  const currency = raw.currency || "EUR";
  const vatRateBp = raw.vatRateBp ?? DEFAULT_VAT_RATE_BP;
  const vatCents = Math.round((raw.priceNet * vatRateBp) / 10000);
  const items = raw.lineItems.map((item, index) => ({
    position: item.position ?? index + 1,
    description: item.description,
    quantityMilli: item.quantityMilli ?? 1000,
    unit: item.unit ?? null,
    unitPriceCents: item.unitPriceCents,
    netCents: item.totalCents,
    kind: item.kind ?? "service",
    isExtra: item.kind === "extra",
    note: item.note ?? null,
  }));

  return {
    source: "live",
    offerNumber: raw.offerNumber,
    context: {
      company,
      customer,
      offer: {
        number: raw.offerNumber ?? "",
        date: formatDate(raw.createdAt),
        validUntil: raw.validUntil ? formatDate(raw.validUntil) : "",
        closerName: session.closer.name ?? "",
        packageName: raw.template?.name ?? raw.packageType ?? "",
        lineItems: items.filter((i) => !i.isExtra).map((i) => mapLineItem(i, currency)),
        hasLineItems: items.some((i) => !i.isExtra),
        extras: items.filter((i) => i.isExtra).map((i) => mapLineItem(i, currency)),
        hasExtras: items.some((i) => i.isExtra),
        oneTimeNet: formatCents(raw.priceNet, currency),
        oneTimeVat: formatCents(vatCents, currency),
        oneTimeGross: formatCents(raw.priceNet + vatCents, currency),
        vatRate: formatVatRateBp(vatRateBp),
        hasRecurring: Boolean(raw.recurringNetCents && raw.recurringNetCents > 0),
        recurringNet: formatCents(raw.recurringNetCents ?? 0, currency),
        recurringInterval: RECURRING_INTERVAL_LABELS[raw.recurringInterval ?? ""] ?? "",
        minimumTerm: raw.minimumTermMonths ?? "",
        paymentTerms: raw.paymentTerms ?? "",
        documents: [],
        hasDocuments: false,
      },
    },
  };
}

export type RenderedOffer = {
  buffer: Buffer;
  fileName: string;
  source: OfferDocumentSource;
};

/** Rendert das Angebot als PDF. Gibt null zurück, wenn kein Angebot vorliegt. */
export async function renderOfferPdf(closingSessionId: string): Promise<RenderedOffer | null> {
  const document = await buildOfferContext(closingSessionId);
  if (!document) return null;

  const rendered = await renderDocumentPdf({
    type: "offer",
    context: document.context,
    title: document.offerNumber ? `Angebot ${document.offerNumber}` : "Angebot",
  });

  const suffix = (document.offerNumber ?? closingSessionId.slice(-8)).replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
  return {
    buffer: rendered.buffer,
    fileName: `Angebot_${suffix}.pdf`,
    source: document.source,
  };
}

/** HTML-Variante, z. B. für die Vorschau im Admin. */
export async function renderOfferHtml(closingSessionId: string): Promise<string | null> {
  const document = await buildOfferContext(closingSessionId);
  if (!document) return null;
  const rendered = await renderTemplateHtml({
    type: "offer",
    context: document.context,
    title: document.offerNumber ? `Angebot ${document.offerNumber}` : "Angebot",
  });
  return rendered?.html ?? null;
}
