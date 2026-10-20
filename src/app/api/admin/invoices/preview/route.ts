import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSales, AuthorizationError } from "@/lib/auth-guards";
import { renderTemplateHtml } from "@/lib/documents/render";
import { calculateInvoiceTotals } from "@/lib/invoicing/calc";
import { buildInvoiceContext, type BillingSnapshot } from "@/lib/invoicing/context";
import { peekNextInvoiceNumber } from "@/lib/invoicing/numbering";

export const dynamic = "force-dynamic";

/**
 * Live-Vorschau einer Rechnung — exakt mit der Vorlage, die auch das finale PDF
 * erzeugt. Beträge werden serverseitig neu berechnet; die Rechnungsnummer ist
 * bis zur Finalisierung nur eine Vorschau und wird hier nicht reserviert.
 */
export async function GET(request: NextRequest) {
  try {
    await requireSales();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  const invoiceId = request.nextUrl.searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId fehlt" }, { status: 400 });

  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!invoice) return NextResponse.json({ error: "Rechnung nicht gefunden" }, { status: 404 });
  if (invoice.items.length === 0) {
    return NextResponse.json({ error: "Die Rechnung hat noch keine Position." }, { status: 422 });
  }

  let totals;
  try {
    totals = calculateInvoiceTotals({
      vatMode: invoice.vatMode,
      defaultVatRateBp: invoice.vatRateBp ?? 1900,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantityMilli: item.quantityMilli ?? Math.round(item.quantity * 1000),
        unitPriceCents: item.unitPrice,
        vatRateBp: item.vatRateBp,
        discountBp: item.discountBp,
        unit: item.unit,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Berechnung fehlgeschlagen" },
      { status: 422 }
    );
  }

  const billing = (invoice.billingSnapshot as unknown as BillingSnapshot) ?? {
    name: invoice.billingName,
    street: null,
    houseNumber: null,
    postalCode: null,
    city: null,
    country: null,
    email: null,
  };

  const number = invoice.finalizedAt
    ? invoice.invoiceNumber
    : `${await peekNextInvoiceNumber("invoice", invoice.invoiceDate ?? new Date())} (Vorschau)`;

  const context = await buildInvoiceContext({
    invoiceNumber: number,
    invoiceDate: invoice.invoiceDate ?? new Date(),
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

  const rendered = await renderTemplateHtml({
    type: "invoice",
    context,
    title: `Rechnung ${number}`,
    templateId: invoice.templateId,
    templateVersion: invoice.templateVersion,
  });
  if (!rendered) {
    return NextResponse.json(
      { error: "Es ist keine aktive Rechnungsvorlage konfiguriert." },
      { status: 422 }
    );
  }

  return new NextResponse(rendered.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
