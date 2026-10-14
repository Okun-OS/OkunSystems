import { db } from "@/lib/db";
import { renderDocumentPdf, storeDocumentPdf } from "@/lib/documents/render";
import { sha256Canonical } from "@/lib/documents/hash";
import { buildCompanyContext, formatDate, formatDateTime } from "@/lib/invoicing/context";
import { reserveCertificateNumber } from "@/lib/invoicing/numbering";
import { formatCents, formatVatRateBp } from "@/lib/money";
import type { TemplateContext, TemplateValue } from "@/lib/documents/template-engine";
import { evaluateConsentState } from "./consent";
import { RECORDING_STATUS_LABELS, formatDuration } from "./recording";
import { RECURRING_INTERVAL_LABELS, PAYMENT_METHOD_LABELS } from "./scripts";
import type { ContractSnapshotData } from "./snapshot";
import { forwardPath, normalizeStatus } from "./state-machine";

/**
 * Elektronisches Abschlussprotokoll.
 *
 * Wird nach beendeter und archivierter Aufzeichnung automatisch erzeugt,
 * serverseitig gerendert, gehasht, privat in R2 abgelegt und verifiziert.
 * Ein erzeugtes Protokoll wird niemals überschrieben — eine Korrektur entsteht
 * als neue Version mit Verweis auf die Vorgängerversion.
 */

export type CertificateResult =
  | {
      ok: true;
      certificateId: string;
      certificateNumber: string;
      version: number;
      alreadyExisted: boolean;
    }
  | { ok: false; error: string };

function serverTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export async function generateClosingCertificate(input: {
  closingSessionId: string;
  actorId?: string | null;
  /** Erzwingt eine neue Version (Korrektur) statt Rückgabe der bestehenden. */
  asNewVersion?: boolean;
  correctionReason?: string;
}): Promise<CertificateResult> {
  const existing = await db.closingCertificate.findFirst({
    where: { closingSessionId: input.closingSessionId },
    orderBy: { version: "desc" },
  });
  if (existing && !input.asNewVersion) {
    return {
      ok: true,
      certificateId: existing.id,
      certificateNumber: existing.certificateNumber,
      version: existing.version,
      alreadyExisted: true,
    };
  }

  const session = await db.closingSession.findUnique({
    where: { id: input.closingSessionId },
    include: {
      company: { select: { id: true, name: true } },
      closer: { select: { name: true } },
      contractSnapshot: true,
      recordings: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };
  const snapshot = session.contractSnapshot;
  if (!snapshot?.data) {
    return { ok: false, error: "Für diese Session existiert kein Contract Snapshot." };
  }

  const data = snapshot.data as unknown as ContractSnapshotData;
  const consentState = await evaluateConsentState(input.closingSessionId);
  if (!consentState.allRequiredConfirmed) {
    return { ok: false, error: "Es sind noch nicht alle erforderlichen Erklärungen bestätigt." };
  }

  const auditEvents = await db.consentAuditEvent.findMany({
    where: { closingSessionId: input.closingSessionId, accepted: true },
    orderBy: { serverTimestamp: "asc" },
  });

  const recording = session.recordings[0] ?? null;
  const now = new Date();
  const timezone = serverTimezone();
  const currency = data.offer?.currency ?? "EUR";
  const version = existing ? existing.version + 1 : 1;
  const certificateNumber = existing
    ? `${existing.certificateNumber}-K${version - 1}`
    : await reserveCertificateNumber(now);

  const contractDate = snapshot.contractDate ?? snapshot.closedAt;

  const certificateData = {
    schemaVersion: 1,
    certificateNumber,
    version,
    generatedAt: now.toISOString(),
    timezone,
    closingSessionId: session.id,
    contractSnapshotId: snapshot.id,
    snapshotHash: snapshot.snapshotHash,
    company: data.masterData,
    offer: data.offer,
    payment: data.payment,
    consents: auditEvents.map((event) => ({
      auditEventId: event.id,
      checkboxText: event.checkboxText,
      consentType: event.consentType,
      accepted: event.accepted,
      serverTimestamp: event.serverTimestamp.toISOString(),
      timezone: event.timezone,
      documentName: event.documentName,
      documentVersion: event.documentVersionLabel,
      documentSha256: event.documentSha256,
    })),
    documents: data.documents,
    recording: recording
      ? {
          recordingId: recording.id,
          reference: recording.dailyRecordingId ?? recording.id,
          startedAt: recording.startedAt?.toISOString() ?? null,
          endedAt: recording.endedAt?.toISOString() ?? null,
          durationSeconds: recording.durationSeconds,
          status: recording.status,
          sha256: recording.sha256,
          // Der private R2-Pfad wird bewusst nicht als Kunden-URL ausgegeben.
          archived: recording.status === "archived",
        }
      : null,
    supersedes: existing?.id ?? null,
    correctionReason: input.correctionReason ?? null,
  };

  const dataHash = sha256Canonical(certificateData);

  const company = await buildCompanyContext();
  const address = data.masterData?.address ?? {};
  const addressLine = [
    [address.street, address.houseNumber].filter(Boolean).join(" "),
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.country,
  ]
    .filter((part) => part && String(part).trim())
    .join(", ");

  const context: TemplateContext = {
    company,
    certificate: {
      number: certificateNumber,
      version,
      generatedAt: formatDateTime(now),
      timezone,
      dataHash,
      selfHashNotice: `${dataHash} (Datenhash) — der Dateihash wird nach der Archivierung im Audit Trail geführt.`,
    },
    contract: {
      organizationName: data.masterData?.organizationName ?? session.company.name,
      legalForm: data.masterData?.legalFormLabel ?? "",
      addressLine: addressLine || "—",
      actingPersonName: data.masterData?.actingPerson?.fullName ?? "—",
      actingPersonPosition: data.masterData?.actingPerson?.position ?? "—",
      closedAtDate: formatDate(contractDate),
      closedAtTime: contractDate
        ? new Date(contractDate).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "—",
      closingSessionId: session.id,
      snapshotId: snapshot.id,
      snapshotHash: snapshot.snapshotHash ?? "—",
      closerName: session.closer?.name ?? data.closer?.name ?? "—",
      offerNumber: data.offer?.offerNumber ?? "—",
      offerVersion: String(data.offer?.version ?? 1),
      packageName: data.offer?.packageName ?? data.offer?.packageType ?? "—",
      oneTimeNet: formatCents(data.offer?.oneTimeNetCents ?? 0, currency),
      vatRate: formatVatRateBp(data.offer?.vatRateBp ?? 0),
      oneTimeVat: formatCents(data.offer?.oneTimeVatCents ?? 0, currency),
      oneTimeGross: formatCents(data.offer?.oneTimeGrossCents ?? 0, currency),
      recurringNet:
        data.offer?.recurringNetCents && data.offer.recurringNetCents > 0
          ? formatCents(data.offer.recurringNetCents, currency)
          : "",
      recurringInterval:
        RECURRING_INTERVAL_LABELS[data.offer?.recurringInterval ?? ""] ?? "",
      minimumTerm: data.offer?.minimumTermMonths ? String(data.offer.minimumTermMonths) : "",
      hasExtras: (data.offer?.extras ?? []).length > 0,
      extras: (data.offer?.extras ?? []).map((extra) => ({
        description: extra.description,
        netAmount: formatCents(extra.netCents, currency),
      })) as TemplateValue,
      workforce: data.offer?.workforceIncluded ? "ja" : "nein",
      care: data.offer?.careIncluded ? "ja" : "nein",
      paymentMethod: PAYMENT_METHOD_LABELS[data.payment?.method ?? ""] ?? "noch nicht festgelegt",
      paymentTerms: data.payment?.terms ?? "—",
    },
    consents: auditEvents.map((event) => ({
      checkboxText: event.checkboxText,
      acceptedLabel: event.accepted ? "bestätigt" : "nicht bestätigt",
      timestamp: formatDateTime(event.serverTimestamp),
      timezone: event.timezone,
      documentName: event.documentName ?? "",
      documentVersion: event.documentVersionLabel ?? "",
      documentSha256: event.documentSha256 ?? "",
    })) as TemplateValue,
    documents: (data.documents ?? []).map((doc) => ({
      name: doc.name,
      version: doc.versionLabel,
      sha256: doc.sha256 ?? "—",
    })) as TemplateValue,
    recording: recording
      ? {
          present: true,
          reference: recording.dailyRecordingId ?? recording.id,
          startedAt: formatDateTime(recording.startedAt),
          endedAt: formatDateTime(recording.endedAt),
          duration: formatDuration(recording.durationSeconds),
          statusLabel: RECORDING_STATUS_LABELS[recording.status] ?? recording.status,
          sha256: recording.sha256 ?? "",
        }
      : { present: false },
  };

  let rendered;
  try {
    rendered = await renderDocumentPdf({
      type: "closing_certificate",
      context,
      title: `Elektronisches Abschlussprotokoll ${certificateNumber}`,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Das Protokoll konnte nicht erzeugt werden.",
    };
  }

  let stored;
  try {
    stored = await storeDocumentPdf({
      buffer: rendered.buffer,
      key: `closing-certificates/${session.companyId}/${certificateNumber}.pdf`,
      sha256: rendered.sha256,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Das Protokoll konnte nicht archiviert werden.",
    };
  }

  try {
    const certificate = await db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          title:
            version > 1
              ? `Elektronisches Abschlussprotokoll ${certificateNumber} (Korrektur v${version})`
              : `Elektronisches Abschlussprotokoll ${certificateNumber}`,
          category: "CONTRACT",
          fileName: `${certificateNumber}.pdf`,
          mimeType: "application/pdf",
          r2Key: stored.r2Key,
          visibility: "customer",
          isPublished: true,
          version: `v${version}`,
          companyId: session.companyId,
          uploadedById: input.actorId ?? null,
        },
        select: { id: true },
      });

      const created = await tx.closingCertificate.create({
        data: {
          closingSessionId: session.id,
          contractSnapshotId: snapshot.id,
          companyId: session.companyId,
          certificateNumber,
          version,
          r2Key: stored.r2Key,
          sha256: stored.sha256,
          fileSize: stored.size,
          data: { ...certificateData, pdfSha256: stored.sha256 } as unknown as object,
          templateId: rendered.templateId,
          templateVersion: rendered.templateVersion,
          supersedesId: existing?.id ?? null,
          documentId: document.id,
          generatedById: input.actorId ?? null,
        },
      });

      await tx.closingEvent.create({
        data: {
          closingSessionId: session.id,
          companyId: session.companyId,
          actorId: input.actorId ?? null,
          eventType: "closing_certificate_created",
          idempotencyKey: `certificate:${session.id}:v${version}`,
          reason: input.correctionReason ?? null,
          metadata: JSON.stringify({
            certificateId: created.id,
            certificateNumber,
            version,
            pdfSha256: stored.sha256,
          }),
        },
      });

      return created;
    });

    return {
      ok: true,
      certificateId: certificate.id,
      certificateNumber,
      version,
      alreadyExisted: false,
    };
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      const concurrent = await db.closingCertificate.findFirst({
        where: { closingSessionId: input.closingSessionId },
        orderBy: { version: "desc" },
      });
      if (concurrent) {
        return {
          ok: true,
          certificateId: concurrent.id,
          certificateNumber: concurrent.certificateNumber,
          version: concurrent.version,
          alreadyExisted: true,
        };
      }
    }
    console.error("[certificate] Speichern fehlgeschlagen:", err);
    return { ok: false, error: "Das Protokoll konnte nicht gespeichert werden." };
  }
}

/**
 * Schließt den Vertrag ab: Status setzen und Abschlussprotokoll erzeugen.
 * Idempotent — mehrfacher Aufruf erzeugt weder zwei Status-Events noch zwei
 * Protokolle.
 */
export async function closeContractAndCertify(input: {
  closingSessionId: string;
  actorId: string;
}): Promise<
  | { ok: true; certificateNumber: string | null; certificateError?: string }
  | { ok: false; error: string }
> {
  const session = await db.closingSession.findUnique({
    where: { id: input.closingSessionId },
    select: { id: true, status: true, companyId: true, contractClosedAt: true },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };

  const current = normalizeStatus(session.status);
  const now = new Date();

  if (current !== "contract_closed" && !session.contractClosedAt) {
    if (!forwardPath(current, "contract_closed")) {
      return {
        ok: false,
        error: `Aus dem Status „${session.status}" kann der Vertrag nicht abgeschlossen werden.`,
      };
    }
    await db.$transaction([
      db.closingSession.update({
        where: { id: session.id },
        data: { status: "contract_closed", contractClosedAt: now, closedAt: now },
      }),
      db.company.update({
        where: { id: session.companyId },
        data: { leadStatus: "contract_closed" },
      }),
      db.closingEvent.create({
        data: {
          closingSessionId: session.id,
          companyId: session.companyId,
          actorId: input.actorId,
          eventType: "contract_closed",
          idempotencyKey: `contract_closed:${session.id}`,
          metadata: JSON.stringify({ closedAt: now.toISOString() }),
        },
      }),
    ]);
  }

  const certificate = await generateClosingCertificate({
    closingSessionId: input.closingSessionId,
    actorId: input.actorId,
  });

  if (!certificate.ok) {
    return { ok: true, certificateNumber: null, certificateError: certificate.error };
  }
  return { ok: true, certificateNumber: certificate.certificateNumber };
}
