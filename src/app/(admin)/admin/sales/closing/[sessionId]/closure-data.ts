import { db } from "@/lib/db";
import { evaluateConsentState } from "@/lib/closing/consent";
import { checkRecordingRelease, RECORDING_STATUS_LABELS, formatDuration } from "@/lib/closing/recording";
import { getFrozenScript } from "@/lib/closing/script-service";
import {
  getMasterDataRequirements,
  validateMasterData,
} from "@/lib/closing/master-data";
import { normalizeStatus, STATUS_LABELS } from "@/lib/closing/state-machine";
import { formatCents } from "@/lib/money";
import type { ContractClosureData } from "./ContractClosurePanel";

/** Bündelt den serverseitig ermittelten Stand des Vertragsabschlusses. */
export async function loadContractClosureData(
  closingSessionId: string
): Promise<ContractClosureData | null> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: {
      company: true,
      contractSnapshot: { select: { id: true, snapshotHash: true } },
      recordings: { orderBy: { createdAt: "desc" }, take: 1 },
      certificates: { orderBy: { version: "desc" }, take: 1 },
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!session) return null;

  const requirements = await getMasterDataRequirements();
  const validation = validateMasterData(session.company, requirements);

  const consentState = session.contractSnapshot
    ? await evaluateConsentState(closingSessionId)
    : null;

  const release = session.contractSnapshot
    ? await checkRecordingRelease(closingSessionId)
    : { released: false, reasons: ["Es wurde noch kein Contract Snapshot erzeugt."] };

  const script = await getFrozenScript(closingSessionId);
  const recording = session.recordings[0] ?? null;
  const certificate = session.certificates[0] ?? null;
  const invoice = session.invoices[0] ?? null;
  const status = normalizeStatus(session.status);

  return {
    sessionId: session.id,
    companyId: session.companyId,
    status,
    statusLabel: STATUS_LABELS[status],
    masterDataComplete: validation.complete,
    masterDataMissing: validation.missing.map((m) => ({ key: m.key, label: m.label })),
    snapshotId: session.contractSnapshot?.id ?? null,
    snapshotHash: session.contractSnapshot?.snapshotHash ?? null,
    offerSelected: Boolean(session.activeOfferId),
    consents:
      consentState?.consents.map((c) => ({
        definitionId: c.definitionId,
        title: c.title,
        checkboxText: c.checkboxText,
        consentType: c.consentType,
        isRequired: c.isRequired,
        accepted: c.accepted,
        acceptedAt: c.acceptedAt ? c.acceptedAt.toISOString() : null,
        documentName: c.document?.name ?? null,
        documentVersion: c.document?.versionLabel ?? null,
        documentSha256: c.document?.sha256 ?? null,
      })) ?? [],
    allRequiredConfirmed: consentState?.allRequiredConfirmed ?? false,
    recordingConsentConfirmed: consentState?.recordingConsentConfirmed ?? false,
    recordingRelease: release,
    script:
      script?.sections.map((s) => ({
        step: s.step,
        title: s.title,
        text: s.text,
        kind: s.kind,
        unresolvedPlaceholders: s.unresolvedPlaceholders,
      })) ?? [],
    scriptUnresolved: script?.sections.flatMap((s) => s.unresolvedPlaceholders) ?? [],
    recording: recording
      ? {
          id: recording.id,
          status: recording.status,
          statusLabel: RECORDING_STATUS_LABELS[recording.status] ?? recording.status,
          startedAt: recording.startedAt?.toISOString() ?? null,
          endedAt: recording.endedAt?.toISOString() ?? null,
          duration: formatDuration(recording.durationSeconds),
          sha256: recording.sha256,
          lastError: recording.lastError,
          migrationAttempts: recording.migrationAttempts,
        }
      : null,
    certificate: certificate
      ? {
          number: certificate.certificateNumber,
          version: certificate.version,
          sha256: certificate.sha256,
          generatedAt: certificate.generatedAt.toLocaleString("de-DE"),
        }
      : null,
    invoice: invoice
      ? {
          id: invoice.id,
          number: invoice.invoiceNumber,
          status: invoice.status,
          grossTotal: formatCents(
            invoice.grossTotalCents ?? invoice.grossAmount,
            invoice.currency
          ),
        }
      : null,
    clientUrlHint: session.tokenRevokedAt ? null : "aktiv",
  };
}
