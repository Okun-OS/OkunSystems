import { db } from "@/lib/db";
import { sha256Canonical } from "@/lib/documents/hash";
import { vatFromNet, multiplyQuantity } from "@/lib/money";
import {
  buildMasterDataSnapshot,
  validateCompanyMasterData,
  type MasterDataSnapshot,
} from "./master-data";
import { resolveLiveConsents, uniqueDocuments, type ResolvedConsent } from "./consent-resolver";
import { forwardPath, normalizeStatus, type ClosingStatus } from "./state-machine";

/**
 * Contract Snapshot — friert den Vertragsstand serverseitig ein.
 *
 * Nach dem Einfrieren verändern spätere Anpassungen an Paket, Angebot, Preis,
 * Stammdaten, Dokumenten oder Checkbox-Texten diesen Abschluss nicht mehr.
 * Die Erzeugung ist idempotent: Doppelklick oder Browser-Refresh liefern
 * denselben Snapshot zurück (Unique-Constraint auf closingSessionId).
 */

export const SNAPSHOT_SCHEMA_VERSION = 1;

export type SnapshotLineItem = {
  position: number;
  description: string;
  quantityMilli: number;
  unit: string | null;
  unitPriceCents: number;
  netCents: number;
  kind: string;
  isExtra: boolean;
  note: string | null;
};

export type ContractSnapshotData = {
  schemaVersion: number;
  closingSessionId: string;
  companyId: string;
  frozenAt: string;
  timezone: string;
  contractDate: string;
  closer: { id: string; name: string | null; email: string | null };
  masterData: MasterDataSnapshot;
  offer: {
    id: string;
    offerNumber: string | null;
    version: number;
    currency: string;
    packageType: string | null;
    packageName: string | null;
    oneTimeNetCents: number;
    vatRateBp: number;
    oneTimeVatCents: number;
    oneTimeGrossCents: number;
    recurringNetCents: number | null;
    recurringInterval: string | null;
    minimumTermMonths: number | null;
    validUntil: string | null;
    presentedAt: string | null;
    lineItems: SnapshotLineItem[];
    extras: SnapshotLineItem[];
    workforceIncluded: boolean;
    careIncluded: boolean;
  };
  payment: { method: string | null; terms: string | null };
  consents: ResolvedConsent[];
  documents: ReturnType<typeof uniqueDocuments>;
};

export type SnapshotResult =
  | { ok: true; snapshotId: string; created: boolean; data: ContractSnapshotData }
  | { ok: false; error: string; missing?: Array<{ key: string; label: string }> };

const DEFAULT_VAT_RATE_BP = 1900;

function serverTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Erzeugt den Contract Snapshot für eine Closing Session.
 * Der Aufrufer muss die Berechtigung bereits geprüft haben.
 */
export async function createContractSnapshot(
  closingSessionId: string,
  actorId: string
): Promise<SnapshotResult> {
  const existing = await db.contractSnapshot.findUnique({
    where: { closingSessionId },
  });
  if (existing) {
    return {
      ok: true,
      snapshotId: existing.id,
      created: false,
      data: existing.data as unknown as ContractSnapshotData,
    };
  }

  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: {
      company: true,
      closer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };

  const status = normalizeStatus(session.status);
  if (status === "lost" || status === "cancelled") {
    return { ok: false, error: "Die Closing Session ist abgebrochen." };
  }

  const validation = await validateCompanyMasterData(session.company);
  if (!validation.complete) {
    return {
      ok: false,
      error: "Für den Vertragsabschluss fehlen noch Stammdaten.",
      missing: validation.missing,
    };
  }

  if (!session.activeOfferId) {
    return { ok: false, error: "Es ist kein Angebot ausgewählt." };
  }

  const offer = await db.offer.findUnique({
    where: { id: session.activeOfferId },
    include: {
      template: true,
      lineItems: { orderBy: { position: "asc" } },
    },
  });
  if (!offer) return { ok: false, error: "Angebot nicht gefunden." };
  if (offer.closingSessionId && offer.closingSessionId !== closingSessionId) {
    return { ok: false, error: "Das Angebot gehört zu einer anderen Closing Session." };
  }

  const packageType = offer.packageType ?? offer.template?.packageType ?? null;
  const packageName = offer.template?.name ?? null;

  const { consents, problems } = await resolveLiveConsents(packageType);
  if (problems.length > 0) {
    return { ok: false, error: problems.join(" ") };
  }
  if (consents.length === 0) {
    return {
      ok: false,
      error:
        "Es ist keine Erklärung konfiguriert. Bitte im Adminbereich unter Consent-Konfiguration mindestens eine Checkbox anlegen.",
    };
  }

  const vatRateBp = offer.vatRateBp ?? offer.template?.vatRateBp ?? DEFAULT_VAT_RATE_BP;

  const allItems: SnapshotLineItem[] = offer.lineItems.map((item) => {
    const quantityMilli = item.quantityMilli ?? Math.round(item.quantity * 1000);
    return {
      position: item.position,
      description: item.description,
      quantityMilli,
      unit: item.unit,
      unitPriceCents: item.unitPriceCents,
      netCents: item.totalCents || multiplyQuantity(item.unitPriceCents, quantityMilli),
      kind: item.kind,
      isExtra: item.isExtra,
      note: item.note,
    };
  });

  const oneTimeNetCents = offer.priceNet;
  const oneTimeVatCents = vatFromNet(oneTimeNetCents, vatRateBp);
  const now = new Date();

  const masterData = buildMasterDataSnapshot(session.company);

  const data: ContractSnapshotData = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    closingSessionId,
    companyId: session.companyId,
    frozenAt: now.toISOString(),
    timezone: serverTimezone(),
    contractDate: now.toISOString(),
    closer: {
      id: session.closer.id,
      name: session.closer.name,
      email: session.closer.email,
    },
    masterData,
    offer: {
      id: offer.id,
      offerNumber: offer.offerNumber,
      version: offer.version,
      currency: offer.currency,
      packageType,
      packageName,
      oneTimeNetCents,
      vatRateBp,
      oneTimeVatCents,
      oneTimeGrossCents: oneTimeNetCents + oneTimeVatCents,
      recurringNetCents: offer.recurringNetCents ?? offer.template?.recurringNetCents ?? null,
      recurringInterval:
        offer.recurringInterval ?? offer.template?.recurringInterval ?? null,
      minimumTermMonths:
        offer.minimumTermMonths ?? offer.template?.minimumTermMonths ?? null,
      validUntil: offer.validUntil ? offer.validUntil.toISOString() : null,
      presentedAt: offer.presentedAt ? offer.presentedAt.toISOString() : null,
      lineItems: allItems.filter((i) => !i.isExtra),
      extras: allItems.filter((i) => i.isExtra),
      workforceIncluded: offer.workforceIncluded || (offer.template?.workforceIncluded ?? false),
      careIncluded: offer.careIncluded || (offer.template?.careIncluded ?? false),
    },
    payment: {
      method: session.paymentMethod ?? session.company.paymentMethod ?? null,
      terms: offer.paymentTerms ?? offer.template?.paymentTerms ?? null,
    },
    consents,
    documents: uniqueDocuments(consents),
  };

  const snapshotHash = sha256Canonical(data);
  const targetStatus: ClosingStatus = "consent_pending";
  const path = forwardPath(status, targetStatus);
  if (!path) {
    return {
      ok: false,
      error: `Aus dem Status „${session.status}" kann kein Vertragsabschluss gestartet werden.`,
    };
  }

  try {
    const created = await db.$transaction(async (tx) => {
      const snapshot = await tx.contractSnapshot.create({
        data: {
          closingSession: { connect: { id: closingSessionId } },
          offerId: offer.id,
          closerId: session.closerId,
          companyId: session.companyId,
          idempotencyKey: `snapshot:${closingSessionId}`,
          // Bestandsfelder weiterhin befüllen (Rückwärtskompatibilität)
          offerVersion: offer.version,
          packageType: packageType ?? "custom",
          totalNetCents: oneTimeNetCents,
          lineItems: JSON.stringify(data.offer.lineItems),
          extras: JSON.stringify(data.offer.extras),
          offerDate: offer.presentedAt ?? offer.createdAt,
          agbVersion:
            data.documents.find((d) => d.documentType === "agb")?.versionLabel ?? "—",
          privacyVersion:
            data.documents.find((d) => d.documentType === "datenschutz")?.versionLabel ?? "—",
          otherDocVersions: JSON.stringify(
            Object.fromEntries(data.documents.map((d) => [d.documentType, d.versionLabel]))
          ),
          closedAt: now,
          closerName: session.closer.name ?? "",
          companyName: session.company.name,
          fullSnapshot: JSON.stringify({ schemaVersion: SNAPSHOT_SCHEMA_VERSION }),
          // Neue strukturierte Felder
          data: data as unknown as object,
          masterData: masterData as unknown as object,
          documentVersions: data.documents as unknown as object,
          snapshotHash,
          offerNumber: offer.offerNumber,
          contractDate: now,
          oneTimeNetCents,
          recurringNetCents: data.offer.recurringNetCents,
          recurringInterval: data.offer.recurringInterval,
          minimumTermMonths: data.offer.minimumTermMonths,
          vatRateBp,
          currency: offer.currency,
          paymentMethod: data.payment.method,
          paymentTerms: data.payment.terms,
          workforceIncluded: data.offer.workforceIncluded,
          careIncluded: data.offer.careIncluded,
          contactPersonName: masterData.actingPerson.fullName,
          contactPersonPosition: masterData.actingPerson.position,
          frozenAt: now,
        },
      });

      await tx.closingSession.update({
        where: { id: closingSessionId },
        data: { status: targetStatus, startedAt: session.startedAt ?? now },
      });
      await tx.company.update({
        where: { id: session.companyId },
        data: { leadStatus: targetStatus },
      });
      await tx.closingEvent.create({
        data: {
          closingSessionId,
          companyId: session.companyId,
          actorId,
          eventType: "contract_snapshot_created",
          idempotencyKey: `snapshot_created:${closingSessionId}`,
          metadata: JSON.stringify({
            snapshotId: snapshot.id,
            snapshotHash,
            offerId: offer.id,
            documents: data.documents.map((d) => ({
              name: d.name,
              version: d.versionLabel,
              sha256: d.sha256,
            })),
          }),
        },
      });

      return snapshot;
    });

    return { ok: true, snapshotId: created.id, created: true, data };
  } catch (err) {
    // Parallel erzeugter Snapshot (Doppelklick) → bestehenden zurückgeben.
    const concurrent = await db.contractSnapshot.findUnique({ where: { closingSessionId } });
    if (concurrent) {
      return {
        ok: true,
        snapshotId: concurrent.id,
        created: false,
        data: concurrent.data as unknown as ContractSnapshotData,
      };
    }
    console.error("[snapshot] Erstellung fehlgeschlagen:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Snapshot konnte nicht erzeugt werden.",
    };
  }
}

export async function getSnapshotData(
  closingSessionId: string
): Promise<ContractSnapshotData | null> {
  const snapshot = await db.contractSnapshot.findUnique({
    where: { closingSessionId },
    select: { data: true },
  });
  if (!snapshot?.data) return null;
  return snapshot.data as unknown as ContractSnapshotData;
}

/** Prüft, ob die gespeicherten Daten noch zum gespeicherten Hash passen. */
export function verifySnapshotIntegrity(
  data: ContractSnapshotData,
  storedHash: string | null
): boolean {
  if (!storedHash) return false;
  return sha256Canonical(data) === storedHash;
}
