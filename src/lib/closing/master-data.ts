import { db } from "@/lib/db";

/**
 * Vollständigkeitsprüfung der Kundenstammdaten vor „Closing Meeting erstellen".
 *
 * Der Feldkatalog ist strukturell im Code hinterlegt (Feldname → Spalte), die
 * Pflichtigkeit und die betroffenen Rechtsformen sind über
 * `MasterDataRequirement` administrierbar. Es wird bewusst NICHT jedes Feld für
 * jede Rechtsform verlangt.
 */

export {
  LEGAL_FORMS,
  REGISTERED_LEGAL_FORMS,
  GROUP_LABELS,
  legalFormLabel,
  type LegalFormDefinition,
  type MasterDataGroup,
} from "./master-data-catalog";
import { REGISTERED_LEGAL_FORMS, legalFormLabel, type MasterDataGroup } from "./master-data-catalog";

export type MasterDataField = {
  key: string;
  label: string;
  group: MasterDataGroup;
  /** Standard-Pflichtigkeit, falls kein administrativer Eintrag existiert. */
  defaultRequired: boolean;
  /** Rechtsformen, für die das Feld gilt. Leer = alle. */
  defaultLegalForms: string[];
  /** Feld gilt nur, wenn eine abweichende Rechnungsanschrift gepflegt wird. */
  onlyIfBillingDiffers?: boolean;
  helpText?: string;
};

/** Struktureller Feldkatalog — Reihenfolge bestimmt die Anzeige. */
export const MASTER_DATA_FIELDS: MasterDataField[] = [
  { key: "name", label: "Unternehmensname", group: "company", defaultRequired: true, defaultLegalForms: [] },
  { key: "legalForm", label: "Rechtsform", group: "company", defaultRequired: true, defaultLegalForms: [] },

  { key: "street", label: "Straße", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "houseNumber", label: "Hausnummer", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "postalCode", label: "PLZ", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "city", label: "Ort", group: "address", defaultRequired: true, defaultLegalForms: [] },
  { key: "country", label: "Land", group: "address", defaultRequired: true, defaultLegalForms: [] },

  {
    key: "contactFirstName",
    label: "Vorname (vertretungsberechtigte Person)",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
  },
  {
    key: "contactLastName",
    label: "Nachname (vertretungsberechtigte Person)",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
  },
  {
    key: "contactPosition",
    label: "Position / Funktion",
    group: "contact",
    defaultRequired: true,
    defaultLegalForms: [],
    helpText: "z. B. Geschäftsführung, Prokura, Inhaber:in",
  },
  { key: "contactEmail", label: "Geschäftliche E-Mail", group: "contact", defaultRequired: true, defaultLegalForms: [] },
  { key: "contactPhone", label: "Telefonnummer", group: "contact", defaultRequired: false, defaultLegalForms: [] },

  {
    key: "registerCourt",
    label: "Registergericht",
    group: "registry",
    defaultRequired: true,
    defaultLegalForms: REGISTERED_LEGAL_FORMS,
  },
  {
    key: "registerNumber",
    label: "Registernummer",
    group: "registry",
    defaultRequired: true,
    defaultLegalForms: REGISTERED_LEGAL_FORMS,
  },
  { key: "vatId", label: "USt-IdNr.", group: "registry", defaultRequired: false, defaultLegalForms: [] },
  { key: "taxNumber", label: "Steuernummer", group: "registry", defaultRequired: false, defaultLegalForms: [] },

  {
    key: "billingName",
    label: "Rechnungsempfänger",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingStreet",
    label: "Rechnungsanschrift — Straße",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingPostalCode",
    label: "Rechnungsanschrift — PLZ",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
  {
    key: "billingCity",
    label: "Rechnungsanschrift — Ort",
    group: "billing",
    defaultRequired: true,
    defaultLegalForms: [],
    onlyIfBillingDiffers: true,
  },
];

export type ResolvedRequirement = MasterDataField & {
  isRequired: boolean;
  legalForms: string[];
  isActive: boolean;
  displayOrder: number;
};

/** Feldkatalog mit der administrativen Konfiguration zusammenführen. */
export async function getMasterDataRequirements(): Promise<ResolvedRequirement[]> {
  const configured = await db.masterDataRequirement.findMany();
  const byKey = new Map(configured.map((r) => [r.fieldKey, r]));

  return MASTER_DATA_FIELDS.map((field, index) => {
    const row = byKey.get(field.key);
    const legalForms = Array.isArray(row?.legalForms)
      ? (row!.legalForms as unknown[]).filter((v): v is string => typeof v === "string")
      : field.defaultLegalForms;
    return {
      ...field,
      isRequired: row?.isRequired ?? field.defaultRequired,
      legalForms,
      isActive: row?.isActive ?? true,
      displayOrder: row?.displayOrder ?? index,
    };
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Nur die Felder, die für diese Rechtsform/Konstellation gelten. */
export function applicableRequirements(
  requirements: ResolvedRequirement[],
  input: { legalForm?: string | null; billingDiffers?: boolean | null }
): ResolvedRequirement[] {
  return requirements.filter((req) => {
    if (!req.isActive) return false;
    if (req.onlyIfBillingDiffers && !input.billingDiffers) return false;
    if (req.legalForms.length > 0) {
      // Solange keine Rechtsform gewählt ist, kann rechtsformabhängig nicht
      // geprüft werden — diese Felder werden erst danach eingefordert.
      if (!input.legalForm) return false;
      if (!req.legalForms.includes(input.legalForm)) return false;
    }
    return true;
  });
}

export type MasterDataInput = {
  name?: string | null;
  legalForm?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  registerCourt?: string | null;
  registerNumber?: string | null;
  vatId?: string | null;
  taxNumber?: string | null;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactPosition?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  billingDiffers?: boolean | null;
  billingName?: string | null;
  billingStreet?: string | null;
  billingHouseNumber?: string | null;
  billingPostalCode?: string | null;
  billingCity?: string | null;
  billingCountry?: string | null;
  billingEmail?: string | null;
};

export type MasterDataValidation = {
  complete: boolean;
  missing: Array<{ key: string; label: string; group: MasterDataGroup }>;
  applicable: ResolvedRequirement[];
};

export function validateMasterData(
  company: MasterDataInput,
  requirements: ResolvedRequirement[]
): MasterDataValidation {
  const applicable = applicableRequirements(requirements, {
    legalForm: company.legalForm,
    billingDiffers: company.billingDiffers,
  });

  const missing = applicable
    .filter((req) => req.isRequired)
    .filter((req) => {
      const value = (company as Record<string, unknown>)[req.key];
      return typeof value !== "string" || value.trim() === "";
    })
    .map((req) => ({ key: req.key, label: req.label, group: req.group }));

  return { complete: missing.length === 0, missing, applicable };
}

/** Bequeme Variante: lädt die Konfiguration selbst. */
export async function validateCompanyMasterData(
  company: MasterDataInput
): Promise<MasterDataValidation> {
  const requirements = await getMasterDataRequirements();
  return validateMasterData(company, requirements);
}

/** Die für Snapshot/Dokumente relevanten Felder in normalisierter Form. */
export function buildMasterDataSnapshot(company: MasterDataInput & { id?: string }) {
  const contactName = [company.contactFirstName, company.contactLastName]
    .filter((p) => p && p.trim())
    .join(" ")
    .trim();

  return {
    companyId: company.id ?? null,
    organizationName: company.name ?? null,
    legalForm: company.legalForm ?? null,
    legalFormLabel: legalFormLabel(company.legalForm),
    address: {
      street: company.street ?? null,
      houseNumber: company.houseNumber ?? null,
      postalCode: company.postalCode ?? null,
      city: company.city ?? null,
      country: company.country ?? null,
    },
    registry: {
      registerCourt: company.registerCourt ?? null,
      registerNumber: company.registerNumber ?? null,
      vatId: company.vatId ?? null,
      taxNumber: company.taxNumber ?? null,
    },
    actingPerson: {
      firstName: company.contactFirstName ?? null,
      lastName: company.contactLastName ?? null,
      fullName: contactName || null,
      position: company.contactPosition ?? null,
      email: company.contactEmail ?? null,
      phone: company.contactPhone ?? null,
    },
    billing: company.billingDiffers
      ? {
          differs: true,
          name: company.billingName ?? null,
          street: company.billingStreet ?? null,
          houseNumber: company.billingHouseNumber ?? null,
          postalCode: company.billingPostalCode ?? null,
          city: company.billingCity ?? null,
          country: company.billingCountry ?? null,
          email: company.billingEmail ?? null,
        }
      : {
          differs: false,
          name: company.name ?? null,
          street: company.street ?? null,
          houseNumber: company.houseNumber ?? null,
          postalCode: company.postalCode ?? null,
          city: company.city ?? null,
          country: company.country ?? null,
          email: company.contactEmail ?? null,
        },
  };
}

export type MasterDataSnapshot = ReturnType<typeof buildMasterDataSnapshot>;
