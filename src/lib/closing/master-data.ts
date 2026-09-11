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
  MASTER_DATA_FIELDS,
  legalFormLabel,
  type LegalFormDefinition,
  type MasterDataField,
  type MasterDataGroup,
} from "./master-data-catalog";
import {
  MASTER_DATA_FIELDS,
  legalFormLabel,
  type MasterDataField,
  type MasterDataGroup,
} from "./master-data-catalog";


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
