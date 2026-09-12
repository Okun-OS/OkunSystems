import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  DURATION_BANDS,
  FREQUENCY_BANDS,
  MAX_TASKS,
  NON_SYSTEM_OPTIONS,
  PURPOSES,
  STATIONS,
  STATION_MODES,
  SYSTEM_CATALOG,
  SYSTEM_CATEGORIES,
  TASK_AREAS,
  TASK_CATALOG,
  flowByKey,
} from "@/lib/blueprint/pillar3-catalog";
import { selectFlows, type TaskRecord } from "@/lib/blueprint/pillar3-engine";
import Pillar3Client from "./Pillar3Client";

/**
 * Die dritte Blueprint-Säule: Programme, wiederkehrende Aufgaben, Abläufe.
 *
 * Der Schritt ergibt sich aus dem, was schon gespeichert ist — niemand kann
 * einen Block überspringen, indem er die Adresse ändert. Welche Abläufe
 * durchgegangen werden, entscheidet die Regel aus den Aufgaben, nicht der
 * Kunde.
 */
export default async function Pillar3Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true, pillar3CompletedAt: true },
  });
  if (!analysisSession || analysisSession.companyId !== user.companyId) {
    redirect("/blueprint");
  }
  if (analysisSession.status === "COMPLETED") {
    redirect(`/blueprint/${sessionId}/abgeschlossen`);
  }
  if (analysisSession.pillar3CompletedAt) {
    redirect(`/blueprint/${sessionId}`);
  }

  const [systems, tasks, flows, industryAnswer] = await Promise.all([
    db.blueprintSystem.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    }),
    db.blueprintTask.findMany({
      where: { sessionId },
      orderBy: { position: "asc" },
    }),
    db.blueprintFlow.findMany({
      where: { sessionId },
      include: { stations: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    }),
    // Branche aus Modul 1 — bestimmt den Standardablauf, falls die Aufgaben
    // nicht genug hergeben.
    db.sessionAnswer.findFirst({
      where: { sessionId, question: { externalId: "M1.1" } },
      select: { selectedOptionIds: true },
    }),
  ]);

  const industryOptionId = await resolveIndustryOption(industryAnswer?.selectedOptionIds);

  const taskRecords: TaskRecord[] = tasks.map((task) => ({
    id: task.id,
    catalogKey: task.catalogKey,
    label: task.label,
    area: task.area,
    frequencyBand: task.frequencyBand,
    durationBand: task.durationBand,
    systemIds: parseList(task.systemIds),
    minutesPerMonth: task.minutesPerMonth,
  }));

  const plannedFlowKeys = selectFlows(taskRecords, industryOptionId);

  return (
    <div className="max-w-2xl mx-auto pt-4 px-4">
      <Pillar3Client
        sessionId={sessionId}
        catalog={{
          systemCategories: [...SYSTEM_CATEGORIES],
          systems: SYSTEM_CATALOG,
          purposes: PURPOSES,
          taskAreas: [...TASK_AREAS],
          tasks: TASK_CATALOG,
          frequencyBands: FREQUENCY_BANDS,
          durationBands: DURATION_BANDS,
          stations: STATIONS,
          stationModes: STATION_MODES,
          nonSystemOptions: NON_SYSTEM_OPTIONS,
          maxTasks: MAX_TASKS,
        }}
        saved={{
          systems: systems.map((system) => ({
            id: system.id,
            catalogKey: system.catalogKey,
            name: system.name,
            purposes: parseList(system.purposes),
            isCustom: system.isCustom,
          })),
          tasks: taskRecords.map((task) => ({
            catalogKey: task.catalogKey,
            frequencyBand: task.frequencyBand,
            durationBand: task.durationBand,
            systemIds: task.systemIds,
          })),
          flows: flows.map((flow) => ({
            catalogKey: flow.catalogKey,
            stations: flow.stations.map((station) => ({
              stationKey: station.stationKey,
              role: station.role ?? "",
              system: station.systemId ?? station.systemLabel ?? "",
              mode: station.mode,
            })),
          })),
        }}
        plannedFlows={plannedFlowKeys.map((key, index) => ({
          catalogKey: key,
          title: flowByKey(key)?.title ?? key,
          position: index,
        }))}
      />
    </div>
  );
}

function parseList(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Die gewählte Branchenoption aus M1.1 als externalId. */
async function resolveIndustryOption(raw: string | undefined): Promise<string | null> {
  const ids = parseList(raw ?? "[]");
  if (ids.length === 0) return null;
  const option = await db.answerOption.findUnique({
    where: { id: ids[0] },
    select: { externalId: true },
  });
  return option?.externalId ?? null;
}
