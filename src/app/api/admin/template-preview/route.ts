import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthorizationError } from "@/lib/auth-guards";
import { buildDocumentHtml, renderTemplate } from "@/lib/documents/template-engine";
import { buildInvoiceContext } from "@/lib/invoicing/context";
import { calculateInvoiceTotals } from "@/lib/invoicing/calc";

export const dynamic = "force-dynamic";

/**
 * Live-Vorschau einer Dokumentvorlage.
 *
 * Die Vorschau nutzt einen klar als Muster gekennzeichneten Beispieldatensatz —
 * er dient ausschließlich der Layoutkontrolle und wird nie gespeichert oder
 * versendet. Firmendaten stammen aus den echten Unternehmenseinstellungen.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  let body: { html?: string; css?: string; custom?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const totals = calculateInvoiceTotals({
    vatMode: "standard",
    defaultVatRateBp: 1900,
    items: [
      { description: "MUSTER — Position 1", quantityMilli: 1000, unitPriceCents: 250000, vatRateBp: 1900, discountBp: 0 },
      { description: "MUSTER — Position 2", quantityMilli: 2500, unitPriceCents: 48000, vatRateBp: 1900, discountBp: 0, unit: "Std." },
      { description: "MUSTER — Position 3", quantityMilli: 12000, unitPriceCents: 29900, vatRateBp: 700, discountBp: 0, unit: "Monate" },
    ],
  });

  const context = await buildInvoiceContext({
    invoiceNumber: "MUSTER-0000",
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 14 * 86400000),
    servicePeriodText: null,
    serviceDateFrom: null,
    serviceDateTo: null,
    currency: "EUR",
    paymentTerms: "MUSTER — Zahlungsbedingungen aus den Unternehmenseinstellungen",
    notes: null,
    footerNote: null,
    billing: {
      name: "MUSTER Empfänger GmbH",
      street: "Musterstraße",
      houseNumber: "1",
      postalCode: "00000",
      city: "Musterstadt",
      country: "Deutschland",
      email: null,
      contactName: "MUSTER Ansprechpartner:in",
      vatId: null,
    },
    totals,
    customPlaceholders: body.custom ?? {},
  });

  const missing: string[] = [];
  const renderedBody = renderTemplate(body.html ?? "", context, {
    collectMissing: missing,
    missingValue: "—",
  });
  const renderedCss = renderTemplate(body.css ?? "", context, { missingValue: "" });

  return NextResponse.json({
    html: buildDocumentHtml({
      html: renderedBody,
      css: renderedCss,
      title: "Vorlagenvorschau",
    }),
    missing,
  });
}
