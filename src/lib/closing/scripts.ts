import { db } from "@/lib/db";
import { formatCentsPlain } from "@/lib/money";

/**
 * Closing-Script-Engine.
 *
 * Die Texte selbst werden ausschließlich vom Admin gepflegt (Modell
 * `ClosingScript`). Diese Datei setzt die Abschnitte in der richtigen
 * Reihenfolge zusammen und ersetzt die Platzhalter durch die konkreten
 * Vertragsdaten. Der gerenderte Text wird im Contract Snapshot eingefroren,
 * damit später rekonstruierbar bleibt, was im Closing angezeigt wurde.
 */

export {
  SCRIPT_KINDS,
  SCRIPT_KIND_LABELS,
  SCRIPT_PLACEHOLDERS,
  type ScriptKind,
} from "./script-types";
import { SCRIPT_KINDS, type ScriptKind } from "./script-types";

const KIND_ORDER: Record<ScriptKind, number> = {
  GENERAL_INTRO: 0,
  PACKAGE: 1,
  ADDON: 2,
  FINAL_ACCEPTANCE: 3,
};

export type ScriptContext = Record<string, string>;

export type RenderedScriptSection = {
  step: number;
  scriptId: string;
  scriptKey: string;
  scriptVersion: number;
  kind: ScriptKind;
  title: string;
  /** Rohtext mit Platzhaltern — für die Rekonstruktion mitgespeichert. */
  template: string;
  /** Fertig gerenderter Text, exakt so wie dem Closer angezeigt. */
  text: string;
  unresolvedPlaceholders: string[];
};

export type RenderedScript = {
  sections: RenderedScriptSection[];
  context: ScriptContext;
  renderedAt: string;
};

/**
 * Ersetzt {{platzhalter}} durch Werte aus dem Kontext.
 * Unbekannte Platzhalter bleiben unverändert stehen und werden gemeldet,
 * damit im Admin sichtbar wird, dass ein Wert fehlt.
 */
export function renderPlaceholders(
  template: string,
  context: ScriptContext
): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const text = template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null || value === "") {
      if (!unresolved.includes(key)) unresolved.push(key);
      return match;
    }
    return value;
  });
  return { text, unresolved };
}

export type ScriptSourceData = {
  packageType: string | null;
  packageName: string | null;
  addonKeys: string[];
};

/**
 * Wählt die passenden Script-Bausteine:
 * allgemeine Einleitung + paketabhängiger Text + relevante Add-on-Blöcke +
 * verbindliche Annahme.
 */
export async function selectScriptSections(source: ScriptSourceData) {
  const scripts = await db.closingScript.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const intro = scripts.filter((s) => s.kind === "GENERAL_INTRO");
  const final = scripts.filter((s) => s.kind === "FINAL_ACCEPTANCE");

  const packageScripts = scripts.filter(
    (s) => s.kind === "PACKAGE" && (!s.packageType || s.packageType === source.packageType)
  );
  // Exakte Paketzuordnung gewinnt gegenüber einem generischen Paket-Script.
  const exactPackage = packageScripts.filter((s) => s.packageType === source.packageType);
  const selectedPackage = exactPackage.length > 0 ? exactPackage : packageScripts;

  const addonScripts = scripts.filter(
    (s) => s.kind === "ADDON" && (!s.addonKey || source.addonKeys.includes(s.addonKey))
  );

  return [...intro, ...selectedPackage, ...addonScripts, ...final].sort((a, b) => {
    const kindDiff = KIND_ORDER[a.kind as ScriptKind] - KIND_ORDER[b.kind as ScriptKind];
    if (kindDiff !== 0) return kindDiff;
    return a.displayOrder - b.displayOrder;
  });
}

export function renderScriptSections(
  scripts: Array<{
    id: string;
    key: string;
    kind: string;
    title: string;
    body: string;
    version: number;
  }>,
  context: ScriptContext
): RenderedScript {
  const sections = scripts.map((script, index) => {
    const { text, unresolved } = renderPlaceholders(script.body, context);
    const { text: title } = renderPlaceholders(script.title, context);
    return {
      step: index + 1,
      scriptId: script.id,
      scriptKey: script.key,
      scriptVersion: script.version,
      kind: script.kind as ScriptKind,
      title,
      template: script.body,
      text,
      unresolvedPlaceholders: unresolved,
    };
  });

  return { sections, context, renderedAt: new Date().toISOString() };
}

/** Baut den Platzhalter-Kontext aus einem Contract Snapshot. */
export function buildScriptContext(input: {
  masterData: {
    organizationName?: string | null;
    legalFormLabel?: string | null;
    address?: {
      street?: string | null;
      houseNumber?: string | null;
      postalCode?: string | null;
      city?: string | null;
      country?: string | null;
    } | null;
    actingPerson?: {
      fullName?: string | null;
      firstName?: string | null;
      position?: string | null;
    } | null;
  };
  packageName: string | null;
  packageType: string | null;
  oneTimeNetCents: number | null;
  oneTimeGrossCents: number | null;
  recurringNetCents: number | null;
  recurringInterval: string | null;
  minimumTermMonths: number | null;
  paymentMethod: string | null;
  paymentTerms: string | null;
  offerNumber: string | null;
  offerVersion: number | null;
  contractDate: Date | string | null;
  vatRateBp: number | null;
  closerName: string | null;
  addons: string[];
}): ScriptContext {
  const addr = input.masterData.address ?? {};
  const addressLine = [
    [addr.street, addr.houseNumber].filter(Boolean).join(" "),
    [addr.postalCode, addr.city].filter(Boolean).join(" "),
    addr.country,
  ]
    .filter((part) => part && String(part).trim())
    .join(", ");

  const contractDate = input.contractDate ? new Date(input.contractDate) : null;

  return stripEmpty({
    customer_name: input.masterData.actingPerson?.fullName ?? "",
    customer_first_name: input.masterData.actingPerson?.firstName ?? "",
    customer_position: input.masterData.actingPerson?.position ?? "",
    company_name: input.masterData.organizationName ?? "",
    company_legal_form: input.masterData.legalFormLabel ?? "",
    company_address: addressLine,
    package_name: input.packageName ?? "",
    package_type: input.packageType ?? "",
    one_time_price_net:
      input.oneTimeNetCents !== null ? formatCentsPlain(input.oneTimeNetCents) : "",
    one_time_price_gross:
      input.oneTimeGrossCents !== null ? formatCentsPlain(input.oneTimeGrossCents) : "",
    recurring_price_net:
      input.recurringNetCents !== null && input.recurringNetCents > 0
        ? formatCentsPlain(input.recurringNetCents)
        : "",
    recurring_interval: RECURRING_INTERVAL_LABELS[input.recurringInterval ?? ""] ?? "",
    minimum_term: input.minimumTermMonths ? String(input.minimumTermMonths) : "",
    payment_method: PAYMENT_METHOD_LABELS[input.paymentMethod ?? ""] ?? "",
    payment_terms: input.paymentTerms ?? "",
    offer_number: input.offerNumber ?? "",
    offer_version: input.offerVersion !== null ? String(input.offerVersion) : "",
    contract_date: contractDate
      ? contractDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "",
    vat_rate:
      input.vatRateBp !== null && input.vatRateBp !== undefined
        ? `${(input.vatRateBp / 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`
        : "",
    closer_name: input.closerName ?? "",
    addons: input.addons.length > 0 ? input.addons.join(", ") : "",
  });
}

export const RECURRING_INTERVAL_LABELS: Record<string, string> = {
  monthly: "monatlich",
  quarterly: "quartalsweise",
  yearly: "jährlich",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: "Zahlung per Stripe",
  invoice: "Zahlung per Rechnung",
};

function stripEmpty(context: ScriptContext): ScriptContext {
  const out: ScriptContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (value !== "") out[key] = value;
  }
  return out;
}
