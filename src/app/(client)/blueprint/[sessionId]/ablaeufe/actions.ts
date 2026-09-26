"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  CUSTOM_DURATION_KEY,
  CUSTOM_FREQUENCY_KEY,
  MAX_CUSTOM_TASKS,
  MAX_TASKS,
  OTHER_PURPOSE_KEY,
  OTHER_SYSTEM_PREFIX,
  PURPOSES,
  STATIONS,
  STATION_MODES,
  TASK_AREAS,
  customTaskKey,
  durationByKey,
  frequencyByKey,
  frequencyPerWeekFrom,
  isCustomTaskKey,
  nearestDurationBand,
  nearestFrequencyBand,
  systemByKey,
  taskByKey,
} from "@/lib/blueprint/pillar3-catalog";
import { WEEKS_PER_MONTH } from "@/lib/blueprint/pillar3-catalog";
import { minutesPerMonth } from "@/lib/blueprint/pillar3-engine";

/**
 * Speichern der dritten Blueprint-Säule.
 *
 * Alle Eingaben werden serverseitig gegen den Katalog geprüft. Was dort nicht
 * steht, wird verworfen — der Browser bestimmt nicht, was in der Auswertung
 * landet.
 *
 * Ergänzungen des Kunden sind entweder Bezeichnung (eigener Programmname,
 * eigener Zweck, eigene Aufgabenbezeichnung) oder eine Zahl mit fester Einheit
 * (eigene Häufigkeit, eigene Dauer). Freier Text fließt nie in die Rechnung;
 * die Zahlen schon, und sie werden zusätzlich dem nächstgelegenen Band
 * zugeordnet, damit Auswertung und Bericht eine bekannte Einstufung haben.
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
  /** Eigener Zweck, wenn „Sonstiges" gewählt wurde. */
  customPurpose?: string;
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
    customPurpose: string | null;
  }> = [];

  for (const selection of selections) {
    const entry = systemByKey(selection.catalogKey);
    // Unbekannte Schlüssel und „wir haben dafür nichts" sind keine Programme.
    if (!entry || entry.isNone) continue;

    const customName = selection.customName?.trim().slice(0, 120);
    const purposes = [...new Set(selection.purposes.filter((p) => validPurposes.has(p)))];
    const customPurpose = selection.customPurpose?.trim().slice(0, 120) || null;

    rows.push({
      catalogKey: entry.key,
      name: entry.needsName && customName ? customName : entry.label,
      category: entry.category,
      purposes,
      isCustom: Boolean(entry.needsName && customName),
      // Die Bezeichnung steht nur, wenn „Sonstiges" auch angehakt ist.
      customPurpose: purposes.includes(OTHER_PURPOSE_KEY) ? customPurpose : null,
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
          customPurpose: row.customPurpose,
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
  /** Bezeichnung und Bereich einer selbst ergänzten Aufgabe. */
  customLabel?: string;
  customArea?: string;
  /** Eigene Häufigkeit: Anzahl je Einheit, wenn kein Band gepasst hat. */
  frequencyCount?: number;
  frequencyUnit?: string;
  /** Eigene Dauer je Vorgang in Minuten. */
  durationMinutes?: number;
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

  const validAreas = new Set<string>(TASK_AREAS);
  let customCount = 0;

  const rows = selections
    .slice(0, MAX_TASKS)
    .map((selection, index) => {
      const isCustom = isCustomTaskKey(selection.catalogKey);
      const entry = isCustom ? undefined : taskByKey(selection.catalogKey);

      let label: string;
      let area: string;
      let catalogKey: string;

      if (isCustom) {
        const customLabel = selection.customLabel?.trim().slice(0, 120);
        // Eine eigene Aufgabe ohne Bezeichnung ist keine Aufgabe.
        if (!customLabel) return null;
        if (customCount >= MAX_CUSTOM_TASKS) return null;
        catalogKey = customTaskKey(customCount);
        customCount += 1;
        label = customLabel;
        area = selection.customArea && validAreas.has(selection.customArea)
          ? selection.customArea
          : TASK_AREAS[0];
      } else {
        if (!entry) return null;
        catalogKey = entry.key;
        label = entry.label;
        area = entry.area;
      }

      // Häufigkeit: entweder ein Band oder eine eigene Angabe, die zusätzlich
      // dem nächstgelegenen Band zugeordnet wird.
      let frequencyBand = selection.frequencyBand;
      let frequencyPerWeek: number | null = null;
      if (frequencyBand === CUSTOM_FREQUENCY_KEY) {
        const perWeek = frequencyPerWeekFrom(
          Number(selection.frequencyCount),
          selection.frequencyUnit ?? ""
        );
        if (perWeek === null) return null;
        frequencyPerWeek = perWeek;
        frequencyBand = nearestFrequencyBand(perWeek).key;
      } else if (!frequencyByKey(frequencyBand)) {
        return null;
      }

      let durationBand = selection.durationBand;
      let durationMinutes: number | null = null;
      if (durationBand === CUSTOM_DURATION_KEY) {
        const minutes = Math.round(Number(selection.durationMinutes));
        if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 8 * 60) return null;
        durationMinutes = minutes;
        durationBand = nearestDurationBand(minutes).key;
      } else if (!durationByKey(durationBand)) {
        return null;
      }

      // Gerechnet wird mit den genauen Angaben, wo es welche gibt.
      const perWeek = frequencyPerWeek ?? frequencyByKey(frequencyBand)!.value;
      const minutes = durationMinutes ?? durationByKey(durationBand)!.value;

      return {
        catalogKey,
        label,
        area,
        frequencyBand,
        durationBand,
        // Nur Programme, die zu dieser Sitzung gehören.
        systemIds: selection.systemIds.filter((id) => ownSystemIds.has(id)),
        isCustom,
        frequencyPerWeek,
        durationMinutes,
        minutesPerMonth:
          frequencyPerWeek !== null || durationMinutes !== null
            ? Math.round(perWeek * minutes * WEEKS_PER_MONTH)
            : minutesPerMonth(frequencyBand, durationBand) ?? 0,
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
      // „other:Bezeichnung" — etwas, das oben nicht als Programm stand.
      const isOther = station.system?.startsWith(OTHER_SYSTEM_PREFIX) ?? false;
      const otherLabel = isOther
        ? station.system!.slice(OTHER_SYSTEM_PREFIX.length).trim().slice(0, 120)
        : "";

      return {
        stationKey: station.stationKey,
        position: validStations.get(station.stationKey)!,
        role: station.role?.trim().slice(0, 80) || null,
        systemId: isOwnSystem ? station.system! : null,
        systemLabel: isOther
          ? otherLabel || "anderes Programm"
          : station.system && !isOwnSystem
            ? station.system
            : null,
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
