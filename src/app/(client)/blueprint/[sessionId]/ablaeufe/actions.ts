"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  MAX_TASKS,
  PURPOSES,
  STATIONS,
  STATION_MODES,
  durationByKey,
  frequencyByKey,
  systemByKey,
  taskByKey,
} from "@/lib/blueprint/pillar3-catalog";
import { minutesPerMonth } from "@/lib/blueprint/pillar3-engine";

/**
 * Speichern der dritten Blueprint-Säule.
 *
 * Alle Eingaben werden serverseitig gegen den Katalog geprüft. Was dort nicht
 * steht, wird verworfen — der Browser bestimmt nicht, was in der Auswertung
 * landet. Nur der selbst eingetragene Programmname ist freier Text, und der
 * geht nicht in die Rechnung, sondern als Vorschlag zur Prüfung.
 */

/** Sitzung des angemeldeten Kunden — oder Umleitung. */
async function requireOwnSession(sessionId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { id: true, companyId: true, pillar3CompletedAt: true },
  });
  if (!analysisSession || analysisSession.companyId !== user.companyId) {
    redirect("/blueprint");
  }

  return { analysisSession, companyId: user.companyId, userId };
}

function pathFor(sessionId: string): string {
  return `/blueprint/${sessionId}/ablaeufe`;
}

// ─── Block 1: Programme ──────────────────────────────────────────────────────

export type SystemSelection = {
  catalogKey: string;
  /** Eigene Bezeichnung, wenn der Katalogeintrag danach fragt. */
  customName?: string;
  purposes: string[];
};

export async function saveSystems(
  sessionId: string,
  selections: SystemSelection[]
): Promise<{ ok: true } | { error: string }> {
  await requireOwnSession(sessionId);

  const validPurposes = new Set(PURPOSES.map((p) => p.key));
  const rows: Array<{
    catalogKey: string;
    name: string;
    category: string;
    purposes: string[];
    isCustom: boolean;
  }> = [];

  for (const selection of selections) {
    const entry = systemByKey(selection.catalogKey);
    // Unbekannte Schlüssel und „wir haben dafür nichts" sind keine Programme.
    if (!entry || entry.isNone) continue;

    const customName = selection.customName?.trim().slice(0, 120);
    rows.push({
      catalogKey: entry.key,
      name: entry.needsName && customName ? customName : entry.label,
      category: entry.category,
      purposes: [...new Set(selection.purposes.filter((p) => validPurposes.has(p)))],
      isCustom: Boolean(entry.needsName && customName),
    });
  }

  await db.$transaction(async (tx) => {
    await tx.blueprintSystem.deleteMany({ where: { sessionId } });
    for (const row of rows) {
      await tx.blueprintSystem.create({
        data: {
          sessionId,
          catalogKey: row.catalogKey,
          name: row.name,
          category: row.category,
          purposes: JSON.stringify(row.purposes),
          isCustom: row.isCustom,
        },
      });
    }
  });

  revalidatePath(pathFor(sessionId));
  return { ok: true };
}

// ─── Block 2: Wiederkehrende Aufgaben ────────────────────────────────────────

export type TaskSelection = {
  catalogKey: string;
  frequencyBand: string;
  durationBand: string;
  systemIds: string[];
};

export async function saveTasks(
  sessionId: string,
  selections: TaskSelection[]
): Promise<{ ok: true } | { error: string }> {
  await requireOwnSession(sessionId);

  const ownSystems = await db.blueprintSystem.findMany({
    where: { sessionId },
    select: { id: true },
  });
  const ownSystemIds = new Set(ownSystems.map((s) => s.id));

  const rows = selections
    .slice(0, MAX_TASKS)
    .map((selection, index) => {
      const entry = taskByKey(selection.catalogKey);
      if (!entry) return null;
      if (!frequencyByKey(selection.frequencyBand)) return null;
      if (!durationByKey(selection.durationBand)) return null;

      return {
        catalogKey: entry.key,
        label: entry.label,
        area: entry.area,
        frequencyBand: selection.frequencyBand,
        durationBand: selection.durationBand,
        // Nur Programme, die zu dieser Sitzung gehören.
        systemIds: selection.systemIds.filter((id) => ownSystemIds.has(id)),
        minutesPerMonth:
          minutesPerMonth(selection.frequencyBand, selection.durationBand) ?? 0,
        position: index,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  await db.$transaction(async (tx) => {
    await tx.blueprintTask.deleteMany({ where: { sessionId } });
    for (const row of rows) {
      await tx.blueprintTask.create({
        data: { sessionId, ...row, systemIds: JSON.stringify(row.systemIds) },
      });
    }
  });

  revalidatePath(pathFor(sessionId));
  return { ok: true };
}

// ─── Block 3: Abläufe ────────────────────────────────────────────────────────

export type StationSelection = {
  stationKey: string;
  role?: string;
  /** BlueprintSystem-ID, oder ein Schlüssel aus NON_SYSTEM_OPTIONS. */
  system?: string;
  mode: string;
};

export async function saveFlow(
  sessionId: string,
  input: { catalogKey: string; title: string; position: number; stations: StationSelection[] }
): Promise<{ ok: true } | { error: string }> {
  await requireOwnSession(sessionId);

  const ownSystems = await db.blueprintSystem.findMany({
    where: { sessionId },
    select: { id: true },
  });
  const ownSystemIds = new Set(ownSystems.map((s) => s.id));
  const validModes = new Set(STATION_MODES.map((m) => m.key as string));
  const validStations = new Map(STATIONS.map((s, index) => [s.key, index]));

  const stations = input.stations
    .filter((station) => validStations.has(station.stationKey))
    .map((station) => {
      const isOwnSystem = station.system ? ownSystemIds.has(station.system) : false;
      return {
        stationKey: station.stationKey,
        position: validStations.get(station.stationKey)!,
        role: station.role?.trim().slice(0, 80) || null,
        systemId: isOwnSystem ? station.system! : null,
        systemLabel: station.system && !isOwnSystem ? station.system : null,
        mode: validModes.has(station.mode) ? station.mode : "manual",
      };
    });

  await db.$transaction(async (tx) => {
    await tx.blueprintFlow.deleteMany({
      where: { sessionId, catalogKey: input.catalogKey },
    });
    await tx.blueprintFlow.create({
      data: {
        sessionId,
        catalogKey: input.catalogKey,
        title: input.title.slice(0, 160),
        position: input.position,
        stations: { create: stations },
      },
    });
  });

  revalidatePath(pathFor(sessionId));
  return { ok: true };
}

// ─── Abschluss ───────────────────────────────────────────────────────────────

export async function completePillar3(sessionId: string): Promise<void> {
  const { analysisSession } = await requireOwnSession(sessionId);
  if (!analysisSession.pillar3CompletedAt) {
    await db.analysisSession.update({
      where: { id: sessionId },
      data: { pillar3CompletedAt: new Date() },
    });
  }
  redirect(`/blueprint/${sessionId}`);
}
