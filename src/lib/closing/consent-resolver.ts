import { db } from "@/lib/db";
import { ensureVersionHash } from "@/lib/documents/hash";

/**
 * Serverseitige Ermittlung der für einen Abschluss erforderlichen Erklärungen.
 *
 * Vor dem Einfrieren wird live aus der Admin-Konfiguration aufgelöst; danach
 * gilt ausschließlich der Contract Snapshot. Damit ändert eine spätere
 * Anpassung von Checkbox-Text oder Dokumentversion einen laufenden oder
 * abgeschlossenen Vorgang nicht mehr.
 */

export type ResolvedDocumentRef = {
  documentId: string;
  documentType: string;
  name: string;
  versionId: string;
  versionLabel: string;
  sha256: string | null;
  mimeType: string;
  hasFile: boolean;
  hasInlineContent: boolean;
};

export type ResolvedConsent = {
  definitionId: string;
  definitionKey: string;
  definitionVersion: number;
  title: string;
  checkboxText: string;
  consentType: string;
  isRequired: boolean;
  displayOrder: number;
  document: ResolvedDocumentRef | null;
};

function appliesToPackage(appliesTo: unknown, packageType: string | null): boolean {
  if (!Array.isArray(appliesTo) || appliesTo.length === 0) return true;
  if (!packageType) return false;
  return appliesTo.some((entry) => entry === packageType);
}

/** Aktive Version eines logischen Vertragsdokuments. */
export async function activeVersionOf(contractDocumentId: string) {
  return db.legalDocument.findFirst({
    where: { contractDocumentId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Löst die aktuell konfigurierten Erklärungen für ein Paket auf.
 * Dokument-Hashes werden dabei sichergestellt (idempotent).
 */
export async function resolveLiveConsents(
  packageType: string | null
): Promise<{ consents: ResolvedConsent[]; problems: string[] }> {
  const definitions = await db.consentDefinition.findMany({
    where: { isActive: true },
    include: { contractDocument: true, documentVersion: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });

  const problems: string[] = [];
  const consents: ResolvedConsent[] = [];

  for (const def of definitions) {
    if (!appliesToPackage(def.appliesTo, packageType)) continue;

    let version = def.documentVersion ?? null;
    let document = def.contractDocument ?? null;

    if (!version && def.contractDocumentId) {
      version = await activeVersionOf(def.contractDocumentId);
      if (!version) {
        problems.push(
          `Für „${def.title}" ist keine aktive Dokumentversion hinterlegt.`
        );
        continue;
      }
    }

    if (version && !document && version.contractDocumentId) {
      document = await db.contractDocument.findUnique({
        where: { id: version.contractDocumentId },
      });
    }

    let documentRef: ResolvedDocumentRef | null = null;
    if (version) {
      const sha256 = version.sha256 ?? (await ensureVersionHash(version.id));
      if (!sha256) {
        problems.push(
          `Für „${version.title} ${version.version}" konnte kein SHA-256-Hash ermittelt werden.`
        );
      }
      documentRef = {
        documentId: document?.id ?? version.contractDocumentId ?? version.id,
        documentType: document?.type ?? version.type,
        name: document?.name ?? version.title,
        versionId: version.id,
        versionLabel: version.version,
        sha256,
        mimeType: version.mimeType,
        hasFile: Boolean(version.r2Key),
        hasInlineContent: Boolean(version.content),
      };
    }

    consents.push({
      definitionId: def.id,
      definitionKey: def.key,
      definitionVersion: def.version,
      title: def.title,
      checkboxText: def.checkboxText,
      consentType: def.consentType,
      isRequired: def.isRequired,
      displayOrder: def.displayOrder,
      document: documentRef,
    });
  }

  return { consents, problems };
}

/** Liste der eindeutigen Dokumentversionen hinter den Erklärungen. */
export function uniqueDocuments(consents: ResolvedConsent[]): ResolvedDocumentRef[] {
  const seen = new Map<string, ResolvedDocumentRef>();
  for (const consent of consents) {
    if (consent.document && !seen.has(consent.document.versionId)) {
      seen.set(consent.document.versionId, consent.document);
    }
  }
  return [...seen.values()];
}

export { CONSENT_TYPES, CONSENT_TYPE_LABELS, type ConsentType } from "./consent-types";

/** Für den Start der Aufzeichnung ist mindestens eine solche Erklärung nötig. */
export function recordingConsents(consents: ResolvedConsent[]): ResolvedConsent[] {
  return consents.filter((c) => c.consentType === "RECORDING_CONSENT");
}
