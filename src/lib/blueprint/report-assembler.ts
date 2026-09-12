import { db } from "@/lib/db";
import { evaluateSession } from "./branching-engine";
import { computeBlueprintScores } from "./scoring-engine";
import { aggregateSignals, matchSolutions } from "./recommendation-engine";
import { buildRoadmap } from "./roadmap-engine";
import { loadBlueprintQuestions, loadSessionAnswers, loadSolutions } from "./loader";
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

  const evaluated = evaluateSession(questions, sessionAnswers);
  const scores = computeBlueprintScores(evaluated);
  const signals = aggregateSignals(evaluated);
  const recommendations = matchSolutions(signals, solutions, analysisSession.packageType);
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
    companyContext: contextSession
      ? {
          summary: contextSession.summary,
          entries: (contextSession.entries as Array<{ role: string; content: string }>).map((e) => ({ role: e.role, content: e.content })),
        }
      : null,
  };
}
