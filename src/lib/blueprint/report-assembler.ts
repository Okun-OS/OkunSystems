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
}

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

  const moduleScores: ModuleScoreEntry[] = scores.moduleScores.map((m) => ({
    moduleNumber: m.moduleNumber,
    label: MODULE_LABELS[m.moduleNumber] ?? `Modul ${m.moduleNumber}`,
    score: m.score,
  }));

  return {
    sessionId,
    company: {
      name: analysisSession.company.name,
      industry: analysisSession.company.industry,
    },
    completedAt: analysisSession.completedAt,
    packageType: analysisSession.packageType,
    moduleScores,
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
