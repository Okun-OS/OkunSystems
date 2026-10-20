import { applyDiscountBp, multiplyQuantity, vatFromNet } from "@/lib/money";

/**
 * Serverseitiger Rechenkern für Rechnungen.
 *
 * Die clientseitige Berechnung dient ausschließlich der Vorschau — vor dem
 * Speichern und vor der PDF-Erzeugung werden sämtliche Beträge hier neu
 * berechnet. Es wird ausschließlich in Ganzzahlen gerechnet (Cent bzw.
 * Milli-Einheiten), niemals in Fließkomma.
 */

export { VAT_MODES, VAT_MODE_LABELS, type VatMode } from "./vat-modes";
import { VAT_MODES, type VatMode } from "./vat-modes";

/** In diesen Modi wird keine Umsatzsteuer ausgewiesen. */
export function isZeroVatMode(mode: string): boolean {
  return mode === "reverse_charge" || mode === "exempt" || mode === "small_business";
}

export type InvoiceItemInput = {
  description: string;
  quantityMilli: number;
  unitPriceCents: number;
  vatRateBp?: number | null;
  discountBp?: number | null;
  unit?: string | null;
  sourceRef?: string | null;
};

export type CalculatedInvoiceItem = {
  position: number;
  description: string;
  quantityMilli: number;
  unit: string | null;
  unitPriceCents: number;
  discountBp: number;
  vatRateBp: number;
  netAmountCents: number;
  vatAmountCents: number;
  grossAmountCents: number;
  sourceRef: string | null;
};

export type VatBreakdownRow = {
  vatRateBp: number;
  netAmountCents: number;
  vatAmountCents: number;
};

export type CalculatedInvoice = {
  items: CalculatedInvoiceItem[];
  netTotalCents: number;
  vatTotalCents: number;
  grossTotalCents: number;
  vatBreakdown: VatBreakdownRow[];
  vatMode: VatMode;
};

export type CalculateInput = {
  items: InvoiceItemInput[];
  vatMode: string;
  defaultVatRateBp: number;
};

export class InvoiceCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceCalculationError";
  }
}

/**
 * Berechnet alle Positions- und Summenbeträge neu.
 * Es entstehen exakt so viele Positionen wie übergeben — keine Dummy-Zeilen.
 */
export function calculateInvoiceTotals(input: CalculateInput): CalculatedInvoice {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new InvoiceCalculationError("Eine Rechnung benötigt mindestens eine Position.");
  }
  const vatMode = (VAT_MODES as readonly string[]).includes(input.vatMode)
    ? (input.vatMode as VatMode)
    : "standard";
  const zeroVat = isZeroVatMode(vatMode);

  const items: CalculatedInvoiceItem[] = input.items.map((raw, index) => {
    const description = raw.description?.trim();
    if (!description) {
      throw new InvoiceCalculationError(`Position ${index + 1}: Beschreibung fehlt.`);
    }
    if (!Number.isInteger(raw.quantityMilli)) {
      throw new InvoiceCalculationError(`Position ${index + 1}: Menge ist ungültig.`);
    }
    if (!Number.isInteger(raw.unitPriceCents)) {
      throw new InvoiceCalculationError(`Position ${index + 1}: Einzelpreis ist ungültig.`);
    }

    const discountBp = clampBp(raw.discountBp ?? 0, `Position ${index + 1}: Rabatt`);
    const vatRateBp = zeroVat
      ? 0
      : clampBp(raw.vatRateBp ?? input.defaultVatRateBp, `Position ${index + 1}: Steuersatz`);

    const grossOfLine = multiplyQuantity(raw.unitPriceCents, raw.quantityMilli);
    const netAmountCents = applyDiscountBp(grossOfLine, discountBp);
    const vatAmountCents = zeroVat ? 0 : vatFromNet(netAmountCents, vatRateBp);

    return {
      position: index + 1,
      description,
      quantityMilli: raw.quantityMilli,
      unit: raw.unit?.trim() || null,
      unitPriceCents: raw.unitPriceCents,
      discountBp,
      vatRateBp,
      netAmountCents,
      vatAmountCents,
      grossAmountCents: netAmountCents + vatAmountCents,
      sourceRef: raw.sourceRef ?? null,
    };
  });

  const netTotalCents = items.reduce((sum, i) => sum + i.netAmountCents, 0);
  const vatTotalCents = items.reduce((sum, i) => sum + i.vatAmountCents, 0);

  const breakdownMap = new Map<number, VatBreakdownRow>();
  for (const item of items) {
    const row = breakdownMap.get(item.vatRateBp) ?? {
      vatRateBp: item.vatRateBp,
      netAmountCents: 0,
      vatAmountCents: 0,
    };
    row.netAmountCents += item.netAmountCents;
    row.vatAmountCents += item.vatAmountCents;
    breakdownMap.set(item.vatRateBp, row);
  }

  return {
    items,
    netTotalCents,
    vatTotalCents,
    grossTotalCents: netTotalCents + vatTotalCents,
    vatBreakdown: [...breakdownMap.values()].sort((a, b) => a.vatRateBp - b.vatRateBp),
    vatMode,
  };
}

function clampBp(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 10000) {
    throw new InvoiceCalculationError(`${label} ist ungültig.`);
  }
  return value;
}
