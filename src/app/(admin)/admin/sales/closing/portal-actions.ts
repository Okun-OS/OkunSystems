"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireLeadAccess, requireSales, requireSessionAccess } from "@/lib/auth-guards";
import { createContractSnapshot } from "@/lib/closing/snapshot";
import { renderAndFreezeScript } from "@/lib/closing/script-service";
import { evaluateConsentState, appendConsentCorrection } from "@/lib/closing/consent";
import {
  checkRecordingRelease,
  migrateRecording,
  startRecording,
  stopRecording,
  deleteDailyCopyIfDue,
} from "@/lib/closing/recording";
import { closeContractAndCertify, generateClosingCertificate } from "@/lib/closing/certificate";
import { confirmInvoicePayment, markPaymentPending } from "@/lib/closing/payments";
import { issueClosingToken, revokeClosingToken } from "@/lib/closing/token";
import {
  ADMIN_SETTABLE_STATUSES,
  normalizeStatus,
  type ClosingStatus,
} from "@/lib/closing/state-machine";
import {
  getMasterDataRequirements,
  validateMasterData,
  LEGAL_FORMS,
  MASTER_DATA_FIELDS,
} from "@/lib/closing/master-data";
import { sendClosingInvitationEmail } from "@/lib/email";

/** Server Actions des Closing Portals (Admin/Closer). */

function revalidateSession(sessionId: string, companyId: string) {
  revalidatePath(`/admin/sales/closing/${sessionId}`);
  revalidatePath(`/admin/sales/closing/${sessionId}/audit`);
  revalidatePath(`/admin/sales/leads/${companyId}`);
  revalidatePath("/admin/sales");
}

// ─── Stammdaten ──────────────────────────────────────────────────────────────

const TEXT_FIELDS = MASTER_DATA_FIELDS.map((f) => f.key).filter((k) => k !== "name");

export async function saveCompanyMasterData(companyId: string, formData: FormData) {
  return guarded(async () => {
    await requireLeadAccess(companyId);

    const legalForm = (formData.get("legalForm") as string)?.trim() || null;
    if (legalForm && !LEGAL_FORMS.some((f) => f.value === legalForm)) {
      return { error: "Ungültige Rechtsform." };
    }

    const data: Record<string, unknown> = {
      billingDiffers: formData.get("billingDiffers") === "true",
    };
    const name = (formData.get("name") as string)?.trim();
    if (name) data.name = name;
    for (const key of TEXT_FIELDS) {
      const raw = formData.get(key);
      if (typeof raw === "string") data[key] = raw.trim() || null;
    }
    // Legacy-Felder mitpflegen, damit bestehende Ansichten korrekt bleiben.
    const contactName = [data.contactFirstName, data.contactLastName]
      .filter((v) => typeof v === "string" && v)
      .join(" ")
      .trim();
    if (contactName) data.contactPerson = contactName;
    if (data.contactPhone) data.phone = data.contactPhone;

    await db.company.update({ where: { id: companyId }, data });

    const company = await db.company.findUnique({ where: { id: companyId } });
    const requirements = await getMasterDataRequirements();
    const validation = validateMasterData(company!, requirements);

    revalidatePath(`/admin/sales/leads/${companyId}`);
    revalidatePath(`/admin/kunden/${companyId}`);
    return { ok: true, complete: validation.complete, missing: validation.missing };
  });
}

export async function checkMasterDataCompleteness(companyId: string) {
  return guarded(async () => {
    await requireLeadAccess(companyId);
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) return { error: "Lead nicht gefunden." };
    const requirements = await getMasterDataRequirements();
    const validation = validateMasterData(company, requirements);
    return { ok: true, complete: validation.complete, missing: validation.missing };
  });
}

// ─── Vertragsabschluss starten ───────────────────────────────────────────────

export async function startContractClosure(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await createContractSnapshot(sessionId, actor.id);
    if (!result.ok) {
      return { error: result.error, missing: result.missing };
    }
    // Script direkt mit den eingefrorenen Daten rendern und mitspeichern.
    const script = await renderAndFreezeScript(sessionId);
    revalidateSession(sessionId, companyId);
    return {
      ok: true,
      snapshotId: result.snapshotId,
      created: result.created,
      scriptError: script.ok ? undefined : script.error,
      unresolvedPlaceholders: script.ok ? script.unresolved : [],
    };
  });
}

export async function refreshRenderedScript(sessionId: string) {
  return guarded(async () => {
    const { companyId } = await requireSessionAccess(sessionId);
    const result = await renderAndFreezeScript(sessionId, { force: true });
    revalidateSession(sessionId, companyId);
    return result.ok
      ? { ok: true, unresolved: result.unresolved }
      : { error: result.error };
  });
}

export async function getConsentStatus(sessionId: string) {
  return guarded(async () => {
    await requireSessionAccess(sessionId);
    const state = await evaluateConsentState(sessionId);
    return {
      ok: true,
      allRequiredConfirmed: state.allRequiredConfirmed,
      recordingConsentConfirmed: state.recordingConsentConfirmed,
      consents: state.consents.map((c) => ({
        definitionId: c.definitionId,
        title: c.title,
        checkboxText: c.checkboxText,
        consentType: c.consentType,
        isRequired: c.isRequired,
        accepted: c.accepted,
        acceptedAt: c.acceptedAt,
        documentName: c.document?.name ?? null,
        documentVersion: c.document?.versionLabel ?? null,
      })),
    };
  });
}

// ─── Aufzeichnung ────────────────────────────────────────────────────────────

export async function getRecordingRelease(sessionId: string) {
  return guarded(async () => {
    await requireSessionAccess(sessionId);
    return { ok: true, ...(await checkRecordingRelease(sessionId)) };
  });
}

export async function startContractRecording(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await startRecording({ closingSessionId: sessionId, actorId: actor.id });
    revalidateSession(sessionId, companyId);
    return result.ok
      ? { ok: true, recordingId: result.recordingId, alreadyRunning: result.alreadyRunning }
      : { error: result.error, reasons: result.reasons };
  });
}

export async function stopContractRecording(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await stopRecording({ closingSessionId: sessionId, actorId: actor.id });
    revalidateSession(sessionId, companyId);
    return result.ok
      ? { ok: true, migrated: result.migrated, migrationError: result.migrationError }
      : { error: result.error };
  });
}

export async function retryRecordingMigration(recordingId: string) {
  return guarded(async () => {
    const recording = await db.closingRecording.findUnique({
      where: { id: recordingId },
      select: { closingSessionId: true },
    });
    if (!recording) return { error: "Aufzeichnung nicht gefunden." };
    const { companyId } = await requireSessionAccess(recording.closingSessionId);
    const result = await migrateRecording(recordingId);
    revalidateSession(recording.closingSessionId, companyId);
    return result.ok ? { ok: true, r2Key: result.r2Key } : { error: result.error };
  });
}

export async function releaseDailyCopy(recordingId: string) {
  return guarded(async () => {
    const recording = await db.closingRecording.findUnique({
      where: { id: recordingId },
      select: { closingSessionId: true },
    });
    if (!recording) return { error: "Aufzeichnung nicht gefunden." };
    await requireSessionAccess(recording.closingSessionId);
    const result = await deleteDailyCopyIfDue(recordingId);
    return result.deleted ? { ok: true } : { error: result.reason ?? "Löschung nicht möglich." };
  });
}

// ─── Abschluss & Protokoll ───────────────────────────────────────────────────

export async function finishContract(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await closeContractAndCertify({ closingSessionId: sessionId, actorId: actor.id });
    revalidateSession(sessionId, companyId);
    revalidatePath("/portal/dokumente");
    return result.ok
      ? {
          ok: true,
          certificateNumber: result.certificateNumber,
          certificateError: result.certificateError,
        }
      : { error: result.error };
  });
}

export async function regenerateCertificate(sessionId: string, reason: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    if (!reason.trim()) return { error: "Eine Begründung ist erforderlich." };
    const result = await generateClosingCertificate({
      closingSessionId: sessionId,
      actorId: actor.id,
      asNewVersion: true,
      correctionReason: reason.trim(),
    });
    revalidateSession(sessionId, companyId);
    return result.ok
      ? { ok: true, certificateNumber: result.certificateNumber, version: result.version }
      : { error: result.error };
  });
}

// ─── Zahlung ─────────────────────────────────────────────────────────────────

export async function selectPaymentMethod(sessionId: string, method: "stripe" | "invoice") {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    await markPaymentPending(sessionId, companyId, method, actor.id);
    revalidateSession(sessionId, companyId);
    return { ok: true };
  });
}

export async function confirmPaymentReceived(invoiceId: string, note: string) {
  return guarded(async () => {
    const actor = await requireSales();
    const result = await confirmInvoicePayment({ invoiceId, actorId: actor.id, note });
    revalidatePath("/admin/sales/rechnungen");
    revalidatePath("/admin/sales");
    return result.ok
      ? { ok: true, alreadyPaid: result.alreadyPaid, activated: result.activated }
      : { error: result.error };
  });
}

// ─── Status & Zugang ─────────────────────────────────────────────────────────

export async function setSpecialStatus(
  sessionId: string,
  status: ClosingStatus,
  reason: string
) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    if (!ADMIN_SETTABLE_STATUSES.includes(status) && status !== "lead") {
      return {
        error:
          "Reguläre Status entstehen ausschließlich aus echten Ereignissen und können nicht manuell gesetzt werden.",
      };
    }
    if (!reason.trim()) return { error: "Eine Begründung ist erforderlich." };

    const session = await db.closingSession.findUnique({
      where: { id: sessionId },
      select: { status: true },
    });
    if (!session) return { error: "Closing Session nicht gefunden." };

    const { canTransition } = await import("@/lib/closing/state-machine");
    const current = normalizeStatus(session.status);
    if (!canTransition(current, status)) {
      return { error: `Der Übergang von „${current}" nach „${status}" ist nicht zulässig.` };
    }

    await db.$transaction([
      db.closingSession.update({
        where: { id: sessionId },
        data: { status, statusReason: reason.trim() },
      }),
      db.company.update({ where: { id: companyId }, data: { leadStatus: status } }),
      db.closingEvent.create({
        data: {
          closingSessionId: sessionId,
          companyId,
          actorId: actor.id,
          eventType: "status_changed_manually",
          reason: reason.trim(),
          metadata: JSON.stringify({ from: current, to: status }),
        },
      }),
    ]);

    revalidateSession(sessionId, companyId);
    return { ok: true };
  });
}

export async function regenerateClientAccess(sessionId: string, sendEmail: boolean) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const session = await db.closingSession.findUnique({
      where: { id: sessionId },
      include: {
        company: { select: { name: true, contactEmail: true, contactFirstName: true, contactLastName: true } },
        closer: { select: { name: true } },
        appointment: { select: { startTime: true, bookedByEmail: true, bookedByName: true } },
      },
    });
    if (!session) return { error: "Closing Session nicht gefunden." };

    const issued = await issueClosingToken(sessionId);

    await db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId: actor.id,
        eventType: "client_token_reissued",
        metadata: JSON.stringify({ expiresAt: issued.expiresAt.toISOString() }),
      },
    });

    let emailed = false;
    const toEmail =
      session.company.contactEmail ?? session.appointment?.bookedByEmail ?? null;
    if (sendEmail && toEmail) {
      try {
        await sendClosingInvitationEmail({
          toEmail,
          toName:
            [session.company.contactFirstName, session.company.contactLastName]
              .filter(Boolean)
              .join(" ") ||
            session.appointment?.bookedByName ||
            session.company.name,
          companyName: session.company.name,
          closingUrl: issued.url,
          scheduledAt: session.appointment?.startTime ?? new Date(),
          closerName: session.closer.name ?? "Ihr Berater",
        });
        emailed = true;
      } catch (err) {
        console.error("[closing] Einladungs-E-Mail fehlgeschlagen:", err);
      }
    }

    revalidateSession(sessionId, companyId);
    return { ok: true, url: issued.url, expiresAt: issued.expiresAt, emailed };
  });
}

export async function revokeClientAccess(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    await revokeClosingToken(sessionId);
    await db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId: actor.id,
        eventType: "client_token_revoked",
        metadata: "{}",
      },
    });
    revalidateSession(sessionId, companyId);
    return { ok: true };
  });
}

// ─── Audit-Korrektur (append-only) ───────────────────────────────────────────

export async function correctConsentEvent(
  eventId: string,
  accepted: boolean,
  reason: string
) {
  return guarded(async () => {
    const actor = await requireSales();
    const event = await db.consentAuditEvent.findUnique({
      where: { id: eventId },
      select: { closingSessionId: true },
    });
    if (!event) return { error: "Audit Event nicht gefunden." };
    const { companyId } = await requireSessionAccess(event.closingSessionId);
    const result = await appendConsentCorrection({
      originalEventId: eventId,
      accepted,
      reason,
      actorId: actor.id,
    });
    revalidateSession(event.closingSessionId, companyId);
    return result.ok ? { ok: true } : { error: result.error };
  });
}
