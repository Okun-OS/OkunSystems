import { db } from "@/lib/db";
import { getSnapshotData, type ContractSnapshotData } from "./snapshot";
import { forwardPath, normalizeStatus } from "./state-machine";
import type { ResolvedConsent } from "./consent-resolver";

/**
 * Serverseitiger Audit-Trail der elektronischen Erklärungen.
 *
 * Der Browser übermittelt ausschließlich, welche Checkboxen der Kunde gesetzt
 * hat. Welche Erklärungen erforderlich sind, welcher Wortlaut gilt und welche
 * Dokumentversion zugeordnet ist, bestimmt allein der Server aus dem
 * eingefrorenen Contract Snapshot.
 *
 * Audit Events sind append-only: sie werden nie überschrieben oder gelöscht.
 * Eine Korrektur entsteht als Folgeevent mit `supersedesEventId`.
 */

export type ConsentSubmission = {
  definitionId: string;
  accepted: boolean;
};

export type ConfirmConsentsInput = {
  closingSessionId: string;
  submissions: ConsentSubmission[];
  sessionTokenHash: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Nur die Erklärungen dieses Typs verarbeiten (z. B. RECORDING_CONSENT). */
  onlyConsentType?: string;
};

export type ConfirmConsentsResult =
  | {
      ok: true;
      createdEventIds: string[];
      alreadyRecorded: number;
      allRequiredConfirmed: boolean;
      recordingReleased: boolean;
    }
  | { ok: false; error: string; missing?: string[] };

function serverTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Ein Event pro Session und Erklärungsversion — verhindert Doppelerfassung. */
function eventKey(
  closingSessionId: string,
  definitionId: string,
  definitionVersion: number
): string {
  return `consent:${closingSessionId}:${definitionId}:v${definitionVersion}`;
}

/**
 * Verarbeitet die Kundenbestätigung.
 *
 * Ablauf: Session validieren → Snapshot validieren → erforderliche Erklärungen
 * serverseitig ermitteln → Dokumentversionen validieren → prüfen, dass keine
 * Pflichterklärung fehlt → Audit Events atomar schreiben.
 */
export async function confirmConsents(
  input: ConfirmConsentsInput
): Promise<ConfirmConsentsResult> {
  const session = await db.closingSession.findUnique({
    where: { id: input.closingSessionId },
    include: { company: { select: { id: true, name: true } } },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };

  const status = normalizeStatus(session.status);
  if (status === "lost" || status === "cancelled") {
    return { ok: false, error: "Die Closing Session ist abgebrochen." };
  }

  const snapshot = await db.contractSnapshot.findUnique({
    where: { closingSessionId: input.closingSessionId },
    select: { id: true, data: true },
  });
  if (!snapshot?.data) {
    return {
      ok: false,
      error: "Der Vertragsabschluss wurde noch nicht gestartet.",
    };
  }
  const data = snapshot.data as unknown as ContractSnapshotData;
  const allConsents: ResolvedConsent[] = data.consents ?? [];

  const scope = input.onlyConsentType
    ? allConsents.filter((c) => c.consentType === input.onlyConsentType)
    : allConsents;
  if (scope.length === 0) {
    return { ok: false, error: "Für diesen Schritt ist keine Erklärung konfiguriert." };
  }

  const submitted = new Map(input.submissions.map((s) => [s.definitionId, s.accepted]));

  // Bereits protokollierte Erklärungen (append-only, daher nur lesen).
  const existingEvents = await db.consentAuditEvent.findMany({
    where: { closingSessionId: input.closingSessionId },
    select: { consentDefinitionId: true, consentDefinitionVersion: true, accepted: true },
  });
  const alreadyAccepted = new Set(
    existingEvents
      .filter((e) => e.accepted && e.consentDefinitionId)
      .map((e) => `${e.consentDefinitionId}:v${e.consentDefinitionVersion}`)
  );

  // Serverseitige Pflichtprüfung: keine Erklärung darf fehlen.
  const missing = scope
    .filter((c) => c.isRequired)
    .filter(
      (c) =>
        !alreadyAccepted.has(`${c.definitionId}:v${c.definitionVersion}`) &&
        submitted.get(c.definitionId) !== true
    )
    .map((c) => c.title);
  if (missing.length > 0) {
    return {
      ok: false,
      error: "Es fehlen noch erforderliche Bestätigungen.",
      missing,
    };
  }

  // Dokumentversionen gegen die Datenbank validieren.
  const versionIds = scope
    .map((c) => c.document?.versionId)
    .filter((id): id is string => Boolean(id));
  if (versionIds.length > 0) {
    const versions = await db.legalDocument.findMany({
      where: { id: { in: versionIds } },
      select: { id: true, sha256: true, version: true },
    });
    const byId = new Map(versions.map((v) => [v.id, v]));
    for (const consent of scope) {
      const ref = consent.document;
      if (!ref) continue;
      const version = byId.get(ref.versionId);
      if (!version) {
        return {
          ok: false,
          error: `Die im Vertrag referenzierte Dokumentversion „${ref.name} ${ref.versionLabel}" existiert nicht mehr.`,
        };
      }
      if (ref.sha256 && version.sha256 && ref.sha256 !== version.sha256) {
        return {
          ok: false,
          error: `Die Datei zu „${ref.name} ${ref.versionLabel}" stimmt nicht mehr mit dem Vertragsstand überein.`,
        };
      }
    }
  }

  const now = new Date();
  const timezone = serverTimezone();
  const actingPerson = data.masterData?.actingPerson;

  const toWrite = scope.filter(
    (c) =>
      !alreadyAccepted.has(`${c.definitionId}:v${c.definitionVersion}`) &&
      submitted.has(c.definitionId)
  );

  const createdEventIds: string[] = [];
  try {
    await db.$transaction(async (tx) => {
      for (const consent of toWrite) {
        const accepted = submitted.get(consent.definitionId) === true;
        const created = await tx.consentAuditEvent.create({
          data: {
            closingSessionId: input.closingSessionId,
            contractSnapshotId: snapshot.id,
            companyId: session.companyId,
            consentDefinitionId: consent.definitionId,
            consentDefinitionVersion: consent.definitionVersion,
            consentType: consent.consentType,
            // Exakter Wortlaut aus dem eingefrorenen Snapshot.
            checkboxText: consent.checkboxText,
            accepted,
            serverTimestamp: now,
            timezone,
            documentId: consent.document?.documentId ?? null,
            documentVersionId: consent.document?.versionId ?? null,
            documentName: consent.document?.name ?? null,
            documentVersionLabel: consent.document?.versionLabel ?? null,
            documentSha256: consent.document?.sha256 ?? null,
            organizationName: data.masterData?.organizationName ?? session.company.name,
            actingPersonName: actingPerson?.fullName ?? null,
            actingPersonEmail: actingPerson?.email ?? null,
            sessionTokenHash: input.sessionTokenHash,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
            idempotencyKey: eventKey(
              input.closingSessionId,
              consent.definitionId,
              consent.definitionVersion
            ),
          },
          select: { id: true },
        });
        createdEventIds.push(created.id);
      }
    });
  } catch (err) {
    // Unique-Verletzung = paralleler Doppelklick; der bestehende Event gilt.
    const code = (err as { code?: string }).code;
    if (code !== "P2002") {
      console.error("[consent] Audit-Event konnte nicht geschrieben werden:", err);
      return { ok: false, error: "Die Bestätigung konnte nicht protokolliert werden." };
    }
  }

  const state = await evaluateConsentState(input.closingSessionId);

  if (state.allRequiredConfirmed && normalizeStatus(session.status) === "consent_pending") {
    const path = forwardPath(normalizeStatus(session.status), "consents_confirmed");
    if (path) {
      await db.$transaction([
        db.closingSession.update({
          where: { id: input.closingSessionId },
          data: { status: "consents_confirmed", consentsConfirmedAt: now },
        }),
        db.company.update({
          where: { id: session.companyId },
          data: { leadStatus: "consents_confirmed" },
        }),
        db.closingEvent.create({
          data: {
            closingSessionId: input.closingSessionId,
            companyId: session.companyId,
            eventType: "consents_confirmed",
            idempotencyKey: `consents_confirmed:${input.closingSessionId}`,
            metadata: JSON.stringify({
              confirmed: state.confirmedTitles,
              snapshotId: snapshot.id,
            }),
          },
        }),
      ]);
    }
  }

  return {
    ok: true,
    createdEventIds,
    alreadyRecorded: scope.length - toWrite.length,
    allRequiredConfirmed: state.allRequiredConfirmed,
    recordingReleased: state.recordingConsentConfirmed && state.allRequiredConfirmed,
  };
}

export type ConsentState = {
  consents: Array<ResolvedConsent & { accepted: boolean; acceptedAt: Date | null }>;
  allRequiredConfirmed: boolean;
  recordingConsentConfirmed: boolean;
  hasRecordingConsent: boolean;
  confirmedTitles: string[];
};

/** Aktueller Bestätigungsstand — ausschließlich aus Snapshot + Audit Events. */
export async function evaluateConsentState(
  closingSessionId: string
): Promise<ConsentState> {
  const data = await getSnapshotData(closingSessionId);
  const consents: ResolvedConsent[] = data?.consents ?? [];

  const events = await db.consentAuditEvent.findMany({
    where: { closingSessionId },
    orderBy: { serverTimestamp: "asc" },
    select: {
      consentDefinitionId: true,
      consentDefinitionVersion: true,
      accepted: true,
      serverTimestamp: true,
      supersedesEventId: true,
    },
  });

  const superseded = new Set(
    events.map((e) => e.supersedesEventId).filter((id): id is string => Boolean(id))
  );

  const latest = new Map<string, { accepted: boolean; at: Date }>();
  for (const event of events) {
    if (!event.consentDefinitionId || superseded.has(event.consentDefinitionId)) continue;
    latest.set(`${event.consentDefinitionId}:v${event.consentDefinitionVersion}`, {
      accepted: event.accepted,
      at: event.serverTimestamp,
    });
  }

  const enriched = consents.map((consent) => {
    const hit = latest.get(`${consent.definitionId}:v${consent.definitionVersion}`);
    return {
      ...consent,
      accepted: hit?.accepted ?? false,
      acceptedAt: hit?.at ?? null,
    };
  });

  const recording = enriched.filter((c) => c.consentType === "RECORDING_CONSENT");

  return {
    consents: enriched,
    allRequiredConfirmed:
      enriched.length > 0 && enriched.filter((c) => c.isRequired).every((c) => c.accepted),
    recordingConsentConfirmed:
      recording.length > 0 && recording.filter((c) => c.isRequired).every((c) => c.accepted),
    hasRecordingConsent: recording.length > 0,
    confirmedTitles: enriched.filter((c) => c.accepted).map((c) => c.title),
  };
}

/**
 * Append-only Korrektur: markiert eine frühere Erklärung als überholt, indem
 * ein Folgeevent geschrieben wird. Das Original bleibt unverändert erhalten.
 */
export async function appendConsentCorrection(input: {
  originalEventId: string;
  accepted: boolean;
  reason: string;
  actorId: string;
}): Promise<{ ok: true; eventId: string } | { ok: false; error: string }> {
  const original = await db.consentAuditEvent.findUnique({
    where: { id: input.originalEventId },
  });
  if (!original) return { ok: false, error: "Audit Event nicht gefunden." };
  if (!input.reason.trim()) return { ok: false, error: "Begründung ist erforderlich." };

  const created = await db.consentAuditEvent.create({
    data: {
      closingSessionId: original.closingSessionId,
      contractSnapshotId: original.contractSnapshotId,
      companyId: original.companyId,
      consentDefinitionId: original.consentDefinitionId,
      consentDefinitionVersion: original.consentDefinitionVersion,
      consentType: original.consentType,
      checkboxText: original.checkboxText,
      accepted: input.accepted,
      timezone: original.timezone,
      documentId: original.documentId,
      documentVersionId: original.documentVersionId,
      documentName: original.documentName,
      documentVersionLabel: original.documentVersionLabel,
      documentSha256: original.documentSha256,
      organizationName: original.organizationName,
      actingPersonName: original.actingPersonName,
      actingPersonEmail: original.actingPersonEmail,
      supersedesEventId: original.id,
      correctionReason: input.reason.trim(),
      idempotencyKey: `correction:${original.id}:${Date.now()}`,
    },
    select: { id: true },
  });

  await db.closingEvent.create({
    data: {
      closingSessionId: original.closingSessionId,
      companyId: original.companyId,
      actorId: input.actorId,
      eventType: "consent_corrected",
      reason: input.reason.trim(),
      metadata: JSON.stringify({
        originalEventId: original.id,
        correctionEventId: created.id,
        accepted: input.accepted,
      }),
    },
  });

  return { ok: true, eventId: created.id };
}
