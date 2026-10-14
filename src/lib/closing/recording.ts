import { db } from "@/lib/db";
import { uploadToR2 } from "@/lib/storage";
import { sha256Buffer, verifyR2Object } from "@/lib/documents/hash";
import { buildRecordingKey } from "@/lib/documents/render";
import { evaluateConsentState } from "./consent";
import { forwardPath, normalizeStatus } from "./state-machine";

/**
 * Vertragsaufzeichnung: Freigabe, Start/Stopp über Daily.co und Migration in
 * den privaten R2-Bucket.
 *
 * Die Daily-Kopie wird niemals sofort gelöscht. Erst nach verifiziertem
 * R2-Upload beginnt eine Schutzfrist (Standard 24 h), nach deren Ablauf die
 * Kopie bei Daily entfernt werden darf.
 */

export const RECORDING_STATUSES = [
  "pending",
  "recording",
  "stopped",
  "migrating",
  "archived",
  "migration_failed",
] as const;

export type RecordingStatus = (typeof RECORDING_STATUSES)[number];

export const RECORDING_STATUS_LABELS: Record<string, string> = {
  idle: "Nicht gestartet",
  pending: "Vorbereitet",
  recording: "Aufzeichnung läuft",
  stopped: "Beendet — Archivierung ausstehend",
  migrating: "Wird archiviert",
  archived: "Archiviert",
  migration_failed: "Archivierung fehlgeschlagen",
};

const DAILY_API = process.env.DAILY_API_BASE || "https://api.daily.co/v1";
const DELETE_PROTECTION_HOURS = Number(process.env.RECORDING_DAILY_DELETE_AFTER_HOURS ?? 24);

function dailyApiKey(): string | null {
  return process.env.DAILY_API_KEY ?? null;
}

export type ReleaseCheck = {
  released: boolean;
  reasons: string[];
};

/**
 * Prüft serverseitig, ob die Aufzeichnung gestartet werden darf.
 * Ohne protokollierte Einwilligung wird niemals aufgezeichnet.
 */
export async function checkRecordingRelease(closingSessionId: string): Promise<ReleaseCheck> {
  const reasons: string[] = [];

  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: {
      contractSnapshot: { select: { id: true, renderedScript: true } },
      appointment: { select: { meetingUrl: true } },
    },
  });
  if (!session) return { released: false, reasons: ["Closing Session nicht gefunden."] };

  const status = normalizeStatus(session.status);
  if (status === "lost" || status === "cancelled") {
    reasons.push("Die Closing Session ist abgebrochen.");
  }
  if (!session.contractSnapshot) {
    reasons.push("Es wurde noch kein Contract Snapshot erzeugt.");
  }

  const consentState = await evaluateConsentState(closingSessionId);
  if (!consentState.allRequiredConfirmed) {
    reasons.push("Es fehlen noch erforderliche Bestätigungen des Kunden.");
  }
  if (!consentState.hasRecordingConsent) {
    reasons.push(
      "Es ist keine Einwilligung zur Vertragsaufzeichnung konfiguriert (Consent-Typ RECORDING_CONSENT)."
    );
  } else if (!consentState.recordingConsentConfirmed) {
    reasons.push("Die Einwilligung zur Vertragsaufzeichnung wurde noch nicht erteilt.");
  }

  const script = session.contractSnapshot?.renderedScript as
    | { sections?: unknown[] }
    | null;
  if (!script || !Array.isArray(script.sections) || script.sections.length === 0) {
    reasons.push("Das Closing-Script wurde noch nicht gerendert.");
  }

  if (!session.appointment?.meetingUrl) {
    reasons.push("Für diese Session ist kein Videoraum hinterlegt.");
  }

  return { released: reasons.length === 0, reasons };
}

export type StartResult =
  | { ok: true; recordingId: string; alreadyRunning: boolean; dailyWarning?: string }
  | { ok: false; error: string; reasons?: string[] };

export async function startRecording(input: {
  closingSessionId: string;
  actorId: string;
}): Promise<StartResult> {
  const release = await checkRecordingRelease(input.closingSessionId);
  if (!release.released) {
    return {
      ok: false,
      error: "Die Aufzeichnung ist noch nicht freigegeben.",
      reasons: release.reasons,
    };
  }

  const running = await db.closingRecording.findFirst({
    where: { closingSessionId: input.closingSessionId, status: "recording" },
  });
  if (running) {
    return { ok: true, recordingId: running.id, alreadyRunning: true };
  }

  const session = await db.closingSession.findUnique({
    where: { id: input.closingSessionId },
    include: {
      appointment: { select: { meetingUrl: true } },
      contractSnapshot: { select: { id: true } },
    },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };

  const roomName = session.appointment?.meetingUrl?.split("/").pop() ?? null;
  const apiKey = dailyApiKey();
  let dailyRecordingId: string | null = null;
  let dailyWarning: string | undefined;

  if (apiKey && roomName) {
    try {
      const res = await fetch(`${DAILY_API}/rooms/${roomName}/recordings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        dailyRecordingId = data.id ?? null;
      } else {
        dailyWarning = `Daily.co meldete: ${await res.text()}`;
      }
    } catch (err) {
      dailyWarning = err instanceof Error ? err.message : "Daily.co nicht erreichbar.";
    }
  } else {
    dailyWarning = apiKey
      ? "Kein Videoraum hinterlegt — Aufzeichnung wurde nur protokolliert."
      : "DAILY_API_KEY ist nicht gesetzt — Aufzeichnung wurde nur protokolliert.";
  }

  if (dailyWarning && !dailyRecordingId) {
    // Ohne echte Aufzeichnung darf der Vorgang nicht als „läuft" markiert
    // werden — sonst entstünde ein Nachweis, den es nicht gibt.
    return {
      ok: false,
      error: `Die Aufzeichnung konnte nicht gestartet werden. ${dailyWarning}`,
    };
  }

  const now = new Date();
  const recording = await db.closingRecording.create({
    data: {
      closingSessionId: input.closingSessionId,
      contractSnapshotId: session.contractSnapshot?.id ?? null,
      status: "recording",
      dailyRecordingId,
      dailyRoomName: roomName,
      startedAt: now,
    },
  });

  const current = normalizeStatus(session.status);
  if (forwardPath(current, "recording")) {
    await db.$transaction([
      db.closingSession.update({
        where: { id: input.closingSessionId },
        data: {
          status: "recording",
          recordingStatus: "recording",
          dailyRecordingId,
          recordingReleasedAt: session.recordingReleasedAt ?? now,
        },
      }),
      db.company.update({
        where: { id: session.companyId },
        data: { leadStatus: "recording" },
      }),
    ]);
  } else {
    await db.closingSession.update({
      where: { id: input.closingSessionId },
      data: { recordingStatus: "recording", dailyRecordingId },
    });
  }

  await db.closingEvent.create({
    data: {
      closingSessionId: input.closingSessionId,
      companyId: session.companyId,
      actorId: input.actorId,
      eventType: "recording_started",
      metadata: JSON.stringify({ recordingId: recording.id, dailyRecordingId }),
    },
  });

  return { ok: true, recordingId: recording.id, alreadyRunning: false, dailyWarning };
}

export type StopResult =
  | { ok: true; recordingId: string; migrated: boolean; migrationError?: string }
  | { ok: false; error: string };

export async function stopRecording(input: {
  closingSessionId: string;
  actorId: string;
}): Promise<StopResult> {
  const recording = await db.closingRecording.findFirst({
    where: { closingSessionId: input.closingSessionId, status: "recording" },
    orderBy: { startedAt: "desc" },
  });
  if (!recording) {
    const archived = await db.closingRecording.findFirst({
      where: { closingSessionId: input.closingSessionId },
      orderBy: { createdAt: "desc" },
    });
    if (archived) {
      return { ok: true, recordingId: archived.id, migrated: archived.status === "archived" };
    }
    return { ok: false, error: "Es läuft keine Aufzeichnung." };
  }

  const session = await db.closingSession.findUnique({
    where: { id: input.closingSessionId },
    select: { companyId: true, status: true },
  });
  if (!session) return { ok: false, error: "Closing Session nicht gefunden." };

  const apiKey = dailyApiKey();
  if (apiKey && recording.dailyRoomName && recording.dailyRecordingId) {
    try {
      await fetch(
        `${DAILY_API}/rooms/${recording.dailyRoomName}/recordings/${recording.dailyRecordingId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}` } }
      );
    } catch (err) {
      console.warn("[recording] Stopp-Aufruf an Daily.co fehlgeschlagen:", err);
    }
  }

  const now = new Date();
  const durationSeconds = recording.startedAt
    ? Math.max(0, Math.round((now.getTime() - recording.startedAt.getTime()) / 1000))
    : null;

  await db.closingRecording.update({
    where: { id: recording.id },
    data: { status: "stopped", endedAt: now, durationSeconds },
  });

  const current = normalizeStatus(session.status);
  if (forwardPath(current, "recording_completed")) {
    await db.$transaction([
      db.closingSession.update({
        where: { id: input.closingSessionId },
        data: { status: "recording_completed", recordingStatus: "stopped" },
      }),
      db.company.update({
        where: { id: session.companyId },
        data: { leadStatus: "recording_completed" },
      }),
    ]);
  } else {
    await db.closingSession.update({
      where: { id: input.closingSessionId },
      data: { recordingStatus: "stopped" },
    });
  }

  await db.closingEvent.create({
    data: {
      closingSessionId: input.closingSessionId,
      companyId: session.companyId,
      actorId: input.actorId,
      eventType: "recording_stopped",
      metadata: JSON.stringify({ recordingId: recording.id, durationSeconds }),
    },
  });

  const migration = await migrateRecording(recording.id);
  return {
    ok: true,
    recordingId: recording.id,
    migrated: migration.ok,
    migrationError: migration.ok ? undefined : migration.error,
  };
}

type DailyRecordingInfo = {
  id: string;
  status?: string;
  duration?: number;
  mtgSessionId?: string;
};

async function fetchDailyRecording(recordingId: string): Promise<DailyRecordingInfo | null> {
  const apiKey = dailyApiKey();
  if (!apiKey) return null;
  const res = await fetch(`${DAILY_API}/recordings/${recordingId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as DailyRecordingInfo;
}

async function fetchDailyDownloadLink(recordingId: string): Promise<string | null> {
  const apiKey = dailyApiKey();
  if (!apiKey) return null;
  const res = await fetch(`${DAILY_API}/recordings/${recordingId}/access-link`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { download_link?: string; link?: string };
  return data.download_link ?? data.link ?? null;
}

export type MigrationResult = { ok: true; r2Key: string } | { ok: false; error: string };

/**
 * Migriert eine beendete Aufzeichnung nach R2.
 * Bei Fehlern bleibt der Status `migration_failed`; die Daily-Kopie wird
 * ausdrücklich NICHT gelöscht, damit ein Retry möglich bleibt.
 */
export async function migrateRecording(recordingId: string): Promise<MigrationResult> {
  const recording = await db.closingRecording.findUnique({ where: { id: recordingId } });
  if (!recording) return { ok: false, error: "Aufzeichnung nicht gefunden." };
  if (recording.status === "archived" && recording.r2Key) {
    return { ok: true, r2Key: recording.r2Key };
  }
  if (!recording.dailyRecordingId) {
    await failMigration(recordingId, "Es ist keine Daily.co-Aufzeichnungs-ID hinterlegt.");
    return { ok: false, error: "Es ist keine Daily.co-Aufzeichnungs-ID hinterlegt." };
  }

  await db.closingRecording.update({
    where: { id: recordingId },
    data: { status: "migrating", migrationAttempts: { increment: 1 }, lastError: null },
  });

  try {
    const info = await fetchDailyRecording(recording.dailyRecordingId);
    if (info && info.status && info.status !== "finished") {
      throw new Error(
        `Die Aufzeichnung ist bei Daily.co noch nicht bereit (Status: ${info.status}).`
      );
    }

    const downloadLink = await fetchDailyDownloadLink(recording.dailyRecordingId);
    if (!downloadLink) throw new Error("Daily.co lieferte keinen Download-Link.");

    const response = await fetch(downloadLink);
    if (!response.ok) {
      throw new Error(`Download fehlgeschlagen (HTTP ${response.status}).`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) throw new Error("Die heruntergeladene Datei ist leer.");

    const key = buildRecordingKey(
      recording.closingSessionId,
      `${recording.dailyRecordingId}.mp4`
    );
    await uploadToR2(buffer, key, "video/mp4");

    const verified = await verifyR2Object(key, buffer.byteLength);
    if (!verified.ok) {
      throw new Error(`R2-Upload konnte nicht verifiziert werden: ${verified.error ?? ""}`);
    }

    const now = new Date();
    await db.closingRecording.update({
      where: { id: recordingId },
      data: {
        status: "archived",
        r2Key: key,
        fileSize: buffer.byteLength,
        sha256: sha256Buffer(buffer),
        mimeType: "video/mp4",
        verifiedAt: now,
        durationSeconds: recording.durationSeconds ?? info?.duration ?? null,
        // Schutzfrist: erst danach darf die Daily-Kopie gelöscht werden.
        dailyDeleteAfter: new Date(now.getTime() + DELETE_PROTECTION_HOURS * 3600 * 1000),
        lastError: null,
      },
    });
    await db.closingSession.update({
      where: { id: recording.closingSessionId },
      data: { recordingStatus: "archived", recordingR2Key: key },
    });

    const session = await db.closingSession.findUnique({
      where: { id: recording.closingSessionId },
      select: { companyId: true },
    });
    if (session) {
      await db.closingEvent.create({
        data: {
          closingSessionId: recording.closingSessionId,
          companyId: session.companyId,
          eventType: "recording_archived",
          idempotencyKey: `recording_archived:${recordingId}`,
          metadata: JSON.stringify({ recordingId, r2Key: key, size: buffer.byteLength }),
        },
      });
    }

    return { ok: true, r2Key: key };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Migration fehlgeschlagen.";
    await failMigration(recordingId, message);
    return { ok: false, error: message };
  }
}

async function failMigration(recordingId: string, message: string): Promise<void> {
  const recording = await db.closingRecording.update({
    where: { id: recordingId },
    data: { status: "migration_failed", lastError: message },
  });
  await db.closingSession.update({
    where: { id: recording.closingSessionId },
    data: { recordingStatus: "migration_failed" },
  });
  const session = await db.closingSession.findUnique({
    where: { id: recording.closingSessionId },
    select: { companyId: true },
  });
  if (session) {
    // Erzeugt die Admin-Warnung in der Ereignisliste des Closings.
    await db.closingEvent.create({
      data: {
        closingSessionId: recording.closingSessionId,
        companyId: session.companyId,
        eventType: "recording_migration_failed",
        reason: message,
        metadata: JSON.stringify({ recordingId, attempts: recording.migrationAttempts }),
      },
    });
  }
  console.error(`[recording] Migration fehlgeschlagen (${recordingId}): ${message}`);
}

/**
 * Löscht die Daily.co-Kopie — ausschließlich nach verifizierter Archivierung
 * und abgelaufener Schutzfrist.
 */
export async function deleteDailyCopyIfDue(recordingId: string): Promise<{ deleted: boolean; reason?: string }> {
  const recording = await db.closingRecording.findUnique({ where: { id: recordingId } });
  if (!recording) return { deleted: false, reason: "Aufzeichnung nicht gefunden." };
  if (recording.dailyDeletedAt) return { deleted: false, reason: "Bereits gelöscht." };
  if (recording.status !== "archived" || !recording.verifiedAt) {
    return { deleted: false, reason: "Die Archivierung ist nicht verifiziert." };
  }
  if (!recording.dailyDeleteAfter || recording.dailyDeleteAfter > new Date()) {
    return { deleted: false, reason: "Die Schutzfrist ist noch nicht abgelaufen." };
  }
  const apiKey = dailyApiKey();
  if (!apiKey || !recording.dailyRecordingId) {
    return { deleted: false, reason: "Daily.co ist nicht konfiguriert." };
  }

  const res = await fetch(`${DAILY_API}/recordings/${recording.dailyRecordingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    return { deleted: false, reason: `Daily.co meldete HTTP ${res.status}.` };
  }
  await db.closingRecording.update({
    where: { id: recordingId },
    data: { dailyDeletedAt: new Date() },
  });
  return { deleted: true };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")} h`
    : `${m}:${String(s).padStart(2, "0")} min`;
}
