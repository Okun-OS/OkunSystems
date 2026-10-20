import { db } from "@/lib/db";
import { getCompanySettings } from "@/lib/company-settings";

/**
 * Concurrency-sichere Nummernvergabe.
 *
 * Der Zähler wird in einer einzigen atomaren SQL-Anweisung erhöht
 * (INSERT … ON CONFLICT DO UPDATE … RETURNING). Zwei gleichzeitige
 * Finalisierungen können dadurch niemals dieselbe Nummer erhalten: die zweite
 * Anweisung wartet auf die Zeilensperre der ersten und liest den bereits
 * erhöhten Wert.
 */

const DEFAULT_PREFIX = "RE";
const DEFAULT_PADDING = 4;

type SequenceRow = {
  lastNumber: number;
  prefix: string;
  year: number;
  padding: number;
};

export type ReservedNumber = {
  number: string;
  sequenceId: string;
  counter: number;
};

async function nextCounter(
  scope: string,
  prefix: string,
  year: number,
  padding: number
): Promise<SequenceRow> {
  const id = `${scope}:${year}`;
  const rows = await db.$queryRaw<SequenceRow[]>`
    INSERT INTO "InvoiceNumberSequence" ("id", "scope", "prefix", "year", "lastNumber", "padding", "updatedAt")
    VALUES (${id}, ${scope}, ${prefix}, ${year}, 1, ${padding}, NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "lastNumber" = "InvoiceNumberSequence"."lastNumber" + 1,
          "updatedAt"  = NOW()
    RETURNING "lastNumber", "prefix", "year", "padding"
  `;
  const row = rows[0];
  if (!row) throw new Error("Nummernkreis konnte nicht fortgeschrieben werden.");
  return row;
}

export function formatNumber(prefix: string, year: number, counter: number, padding: number) {
  return `${prefix}-${year}-${String(counter).padStart(padding, "0")}`;
}

/**
 * Vergibt die nächste freie Rechnungsnummer.
 * Kollidiert die erzeugte Nummer mit einer historischen Nummer, wird der
 * Zähler weitergedreht statt eine Dublette zu erzeugen.
 */
export async function reserveInvoiceNumber(
  scope = "invoice",
  at: Date = new Date()
): Promise<ReservedNumber> {
  const settings = await getCompanySettings();
  const prefix = (settings["company.invoiceNumberPrefix"] || DEFAULT_PREFIX).trim();
  const year = at.getFullYear();

  for (let attempt = 0; attempt < 25; attempt++) {
    const row = await nextCounter(scope, prefix, year, DEFAULT_PADDING);
    const number = formatNumber(row.prefix, row.year, row.lastNumber, row.padding);
    const clash = await db.invoice.findUnique({
      where: { invoiceNumber: number },
      select: { id: true },
    });
    if (!clash) {
      return { number, sequenceId: `${scope}:${year}`, counter: row.lastNumber };
    }
  }
  throw new Error("Es konnte keine freie Rechnungsnummer ermittelt werden.");
}

/** Nächste Nummer als reine Vorschau, ohne den Zähler zu erhöhen. */
export async function peekNextInvoiceNumber(
  scope = "invoice",
  at: Date = new Date()
): Promise<string> {
  const settings = await getCompanySettings();
  const prefix = (settings["company.invoiceNumberPrefix"] || DEFAULT_PREFIX).trim();
  const year = at.getFullYear();
  const sequence = await db.invoiceNumberSequence.findUnique({ where: { id: `${scope}:${year}` } });
  return formatNumber(prefix, year, (sequence?.lastNumber ?? 0) + 1, sequence?.padding ?? DEFAULT_PADDING);
}

/**
 * Fortlaufende Nummer für Abschlussprotokolle.
 * Nutzt denselben atomaren Mechanismus mit eigenem Scope.
 */
export async function reserveCertificateNumber(at: Date = new Date()): Promise<string> {
  const year = at.getFullYear();
  for (let attempt = 0; attempt < 25; attempt++) {
    const row = await nextCounter("closing_certificate", "AP", year, DEFAULT_PADDING);
    const number = formatNumber(row.prefix, row.year, row.lastNumber, row.padding);
    const clash = await db.closingCertificate.findUnique({
      where: { certificateNumber: number },
      select: { id: true },
    });
    if (!clash) return number;
  }
  throw new Error("Es konnte keine freie Protokollnummer ermittelt werden.");
}

/** Fortlaufende Angebotsnummer. */
export async function reserveOfferNumber(at: Date = new Date()): Promise<string> {
  const year = at.getFullYear();
  for (let attempt = 0; attempt < 25; attempt++) {
    const row = await nextCounter("offer", "AN", year, DEFAULT_PADDING);
    const number = formatNumber(row.prefix, row.year, row.lastNumber, row.padding);
    const clash = await db.offer.findUnique({
      where: { offerNumber: number },
      select: { id: true },
    });
    if (!clash) return number;
  }
  throw new Error("Es konnte keine freie Angebotsnummer ermittelt werden.");
}
