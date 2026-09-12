import { db } from "@/lib/db";
import { evaluateSession } from "./branching-engine";
import { computeBlueprintScores } from "./scoring-engine";
import {
  aggregateSignals,
  aggregateSolutionRefs,
  matchSolutions,
} from "./recommendation-engine";
import { buildRoadmap } from "./roadmap-engine";
import { loadBlueprintQuestions, loadSessionAnswers, loadSolutions } from "./loader";
import { evaluatePillar3, type Pillar3Result } from "./pillar3-engine";
import type {
  BlueprintScores,
  RoadmapPhase,
  SignalTotals,
  SolutionRecommendation,
} from "./types";

export interface ModuleScoreEntry {
  moduleNumber: number;
  label: string;
  score: number;
  /** Anteil dieses Moduls am Gesamtwert, bezogen auf die tatsächlich bewerteten Module. */
  weight: number;
  /** score × weight — die Summe aller Beiträge ergibt den Gesamtwert. */
  contribution: number;
}

/**
 * Gewichtung der Module am Gesamtwert.
 *
 * Nicht jedes Modul wiegt gleich schwer: Prozessqualität bestimmt den Alltag
 * eines Betriebs stärker als Personalmanagement. Die Verteilung stammt aus dem
 * Fragenkatalog und ist dieselbe, die im Datenmodell (`OkunScore`) hinterlegt
 * ist. Modul 1 ist reines Unternehmensprofil und wird nicht bewertet.
 *
 * Module ohne Bewertung — etwa weil der Bereich den Betrieb nicht betrifft —
 * werden aus der Rechnung genommen und ihr Gewicht auf die übrigen verteilt.
 * Dasselbe Prinzip greift schon innerhalb von Modul 5 auf Gruppenebene: es
 * wird niemand an Dingen gemessen, die ihn nicht betreffen.
 */
export const MODULE_WEIGHTS: Record<number, number> = {
  2: 0.25, // Prozessqualität
  3: 0.20, // Vertriebsstruktur
  4: 0.15, // Führungsstruktur
  5: 0.15, // Automatisierungsgrad
  6: 0.10, // Unternehmensstruktur
  7: 0.10, // Kommunikation
  8: 0.05, // Personalmanagement
};

export interface CompanyContextData {
  summary: string | null;
  entries: Array<{ role: string; content: string }>;
}

export interface BlueprintReportData {
  sessionId: string;
  company: {
    name: string;
    industry: string | null;
  };
  completedAt: Date | null;
  packageType: string | null;
  moduleScores: ModuleScoreEntry[];
  /** Gewichteter Gesamtwert 0–100. Summe der Modulbeiträge. */
  totalScore: number;
  m5NormalizedScore: number;
  m5GroupScores: BlueprintScores["m5GroupScores"];
  signals: SignalTotals;
  recommendations: SolutionRecommendation[];
  roadmap: RoadmapPhase[];
  totalAnswered: number;
  totalActive: number;
  companyContext: CompanyContextData | null;
  /** Dritte Säule — null, solange sie nicht durchlaufen wurde. */
  pillar3: Pillar3Result | null;
  /** Modul-5-Gruppen, die den Betrieb nicht betreffen. */
  skippedGroups: string[];
}

const MODULE_LABELS: Record<number, string> = {
  1: "Unternehmensprofil",
  2: "Prozessqualität",
  3: "Vertriebsstruktur",
  4: "Führungsstruktur",
  5: "Automatisierungsgrad",
  6: "Unternehmensstruktur",
  7: "Kommunikation",
  8: "Personalmanagement",
};

export async function assembleBlueprintReport(
  sessionId: string
): Promise<BlueprintReportData> {
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    include: { company: { select: { name: true, industry: true } } },
  });

  if (!analysisSession) throw new Error(`Session not found: ${sessionId}`);

  const [questions, sessionAnswers, solutions, contextSession] = await Promise.all([
    loadBlueprintQuestions(),
    loadSessionAnswers(sessionId),
    loadSolutions(),
    db.companyContextSession.findFirst({
      where: { companyId: analysisSession.companyId, status: "COMPLETED" },
      include: { entries: { orderBy: { order: "asc" } } },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const [systems, tasks, flows] = await Promise.all([
    db.blueprintSystem.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } }),
    db.blueprintTask.findMany({ where: { sessionId }, orderBy: { position: "asc" } }),
    db.blueprintFlow.findMany({
      where: { sessionId },
      include: { stations: { orderBy: { position: "asc" } } },
      orderBy: { position: "asc" },
    }),
  ]);

  const evaluated = evaluateSession(questions, sessionAnswers);
  const scores = computeBlueprintScores(evaluated);
  const signals = aggregateSignals(evaluated);
  const recommendations = matchSolutions(
    signals,
    solutions,
    analysisSession.packageType,
    aggregateSolutionRefs(evaluated)
  );
  const roadmap = buildRoadmap(recommendations, analysisSession.packageType);

  const activeQuestions = evaluated.filter((q) => q.isActive);
  const totalActive = activeQuestions.length;
  const totalAnswered = activeQuestions.filter((q) => q.status === "ANSWERED").length;

  // Gewichte auf die tatsächlich bewerteten Module normieren, damit die
  // Beiträge in Summe exakt den Gesamtwert ergeben.
  const weightSum = scores.moduleScores.reduce(
    (sum, m) => sum + (MODULE_WEIGHTS[m.moduleNumber] ?? 0),
    0
  );

  const moduleScores: ModuleScoreEntry[] = scores.moduleScores.map((m) => {
    const weight =
      weightSum > 0 ? (MODULE_WEIGHTS[m.moduleNumber] ?? 0) / weightSum : 0;
    return {
      moduleNumber: m.moduleNumber,
      label: MODULE_LABELS[m.moduleNumber] ?? `Modul ${m.moduleNumber}`,
      score: m.score,
      weight,
      contribution: m.score * weight,
    };
  });

  const totalScore = Math.round(
    moduleScores.reduce((sum, m) => sum + m.contribution, 0)
  );

  const parseList = (raw: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  };

  const pillar3 =
    systems.length > 0 || tasks.length > 0 || flows.length > 0
      ? evaluatePillar3({
          systems: systems.map((system) => ({
            id: system.id,
            catalogKey: system.catalogKey,
            name: system.name,
            category: system.category,
            purposes: parseList(system.purposes),
            isCustom: system.isCustom,
          })),
          tasks: tasks.map((task) => ({
            id: task.id,
            catalogKey: task.catalogKey,
            label: task.label,
            area: task.area,
            frequencyBand: task.frequencyBand,
            durationBand: task.durationBand,
            systemIds: parseList(task.systemIds),
            minutesPerMonth: task.minutesPerMonth,
          })),
          flows: flows.map((flow) => ({
            id: flow.id,
            catalogKey: flow.catalogKey,
            title: flow.title,
            position: flow.position,
            stations: flow.stations.map((station) => ({
              stationKey: station.stationKey,
              position: station.position,
              role: station.role,
              systemId: station.systemId,
              systemLabel: station.systemLabel,
              mode: station.mode,
            })),
          })),
        })
      : null;

  // Modul-5-Gruppen, die gar nicht erst gestellt wurden: Bereiche, die den
  // Betrieb nicht betreffen. Dass daran nicht gemessen wurde, gehört in den
  // Bericht — es ist eine Stärke der Auswertung, die bisher niemand sah.
  const askedGroups = new Set(
    evaluated
      .filter((q) => q.moduleNumber === 5 && q.isActive && q.groupCode)
      .map((q) => q.groupCode!)
  );
  const skippedGroups = [
    ...new Set(
      evaluated
        .filter((q) => q.moduleNumber === 5 && !q.isActive && q.groupCode)
        .map((q) => q.groupCode!)
    ),
  ]
    .filter((code) => !askedGroups.has(code))
    .sort();

  return {
    sessionId,
    company: {
      name: analysisSession.company.name,
      industry: analysisSession.company.industry,
    },
    completedAt: analysisSession.completedAt,
    packageType: analysisSession.packageType,
    moduleScores,
    totalScore,
    m5NormalizedScore: scores.m5NormalizedScore,
    m5GroupScores: scores.m5GroupScores,
    signals,
    recommendations,
    roadmap,
    totalAnswered,
    totalActive,
    pillar3,
    skippedGroups,
    companyContext: contextSession
      ? {
          summary: contextSession.summary,
          entries: (contextSession.entries as Array<{ role: string; content: string }>).map((e) => ({ role: e.role, content: e.content })),
        }
      : null,
  };
}
