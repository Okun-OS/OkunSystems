/**
 * Geldbeträge werden ausschließlich als Integer in Minor Units (Cent) geführt.
 * Mengen werden als Integer in Milli-Einheiten (Menge × 1000) geführt, damit
 * `Menge × Einzelpreis` ohne Floating-Point-Drift berechnet werden kann.
 */

/** Kaufmännische Rundung (half away from zero) auf ganze Minor Units. */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Betrag ist keine gültige Zahl");
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/** Menge × Einzelpreis → Netto in Cent. quantityMilli = Menge × 1000. */
export function multiplyQuantity(unitPriceCents: number, quantityMilli: number): number {
  assertSafeInt(unitPriceCents, "Einzelpreis");
  assertSafeInt(quantityMilli, "Menge");
  return roundCents((unitPriceCents * quantityMilli) / 1000);
}

/** Rabatt in Basispunkten (100 bp = 1 %) auf einen Nettobetrag anwenden. */
export function applyDiscountBp(netCents: number, discountBp: number): number {
  assertSafeInt(netCents, "Nettobetrag");
  if (!Number.isInteger(discountBp) || discountBp < 0 || discountBp > 10000) {
    throw new Error("Rabatt muss zwischen 0 und 100 % liegen");
  }
  return netCents - roundCents((netCents * discountBp) / 10000);
}

/** Steuerbetrag aus Netto und Steuersatz in Basispunkten (1900 = 19,00 %). */
export function vatFromNet(netCents: number, vatRateBp: number): number {
  assertSafeInt(netCents, "Nettobetrag");
  assertSafeInt(vatRateBp, "Steuersatz");
  return roundCents((netCents * vatRateBp) / 10000);
}

function assertSafeInt(value: number, label: string): void {
  if (!Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new Error(`${label} muss eine ganze Zahl sein`);
  }
}

/**
 * Parst eine Benutzereingabe („1.234,56", „1234.56", „1234") in Cent.
 * Gibt null zurück, wenn die Eingabe keine gültige Zahl ist.
 */
export function parseAmountToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? roundCents(input * 100) : null;
  }
  const raw = input.trim();
  if (!raw) return null;
  const normalized = normalizeDecimalInput(raw);
  if (normalized === null) return null;
  const [intPart, fracPart = ""] = normalized.split(".");
  const sign = intPart.startsWith("-") ? -1 : 1;
  const digits = intPart.replace("-", "");
  const cents =
    Number(digits || "0") * 100 + Number((fracPart + "00").slice(0, 2)) +
    (fracPart.length > 2 && Number(fracPart[2]) >= 5 ? 1 : 0);
  if (!Number.isSafeInteger(cents)) return null;
  return sign * cents;
}

/** Parst eine Mengeneingabe in Milli-Einheiten (max. 3 Nachkommastellen). */
export function parseQuantityToMilli(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 1000) : null;
  }
  const normalized = normalizeDecimalInput(input.trim());
  if (normalized === null) return null;
  const value = Math.round(Number(normalized) * 1000);
  return Number.isSafeInteger(value) ? value : null;
}

/** Steuersatz-Eingabe („19", „19,0", „7") in Basispunkte. */
export function parseVatRateToBp(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const normalized =
    typeof input === "number" ? String(input) : normalizeDecimalInput(input.trim());
  if (normalized === null) return null;
  const value = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(value) || value < 0 || value > 10000) return null;
  return value;
}

/**
 * Vereinheitlicht deutsche und englische Dezimalschreibweise zu „-1234.56".
 * Gibt null zurück, wenn die Eingabe keine Zahl ist.
 */
function normalizeDecimalInput(raw: string): string | null {
  const cleaned = raw.replace(/[\s €]/g, "");
  if (!cleaned) return null;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) {
    // deutsche Schreibweise: Punkt = Tausender, Komma = Dezimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    normalized = cleaned;
  }
  if (!/^-?\d*(\.\d+)?$/.test(normalized) || normalized === "" || normalized === "-") {
    return null;
  }
  return normalized;
}

export function formatCents(
  cents: number | null | undefined,
  currency = "EUR",
  locale = "de-DE"
): string {
  const value = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value / 100);
}

/** Nur die Zahl ohne Währungssymbol — für Platzhalter wie {{one_time_price_net}}. */
export function formatCentsPlain(cents: number | null | undefined, locale = "de-DE"): string {
  const value = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function formatQuantity(quantityMilli: number | null | undefined, locale = "de-DE"): string {
  const value = typeof quantityMilli === "number" ? quantityMilli / 1000 : 0;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(value);
}

export function formatVatRateBp(vatRateBp: number | null | undefined, locale = "de-DE"): string {
  const value = typeof vatRateBp === "number" ? vatRateBp / 100 : 0;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} %`;
}
