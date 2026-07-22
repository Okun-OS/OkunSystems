import { db } from "@/lib/db";

const WEIGHTS = {
  prozesse: 0.25,
  vertrieb: 0.20,
  geschaeftsfuehrung: 0.15,
  automatisierung: 0.15,
  struktur: 0.10,
  kommunikation: 0.10,
  personal: 0.05,
};

const BASE_SCORE = 40;

interface EvidenceInput {
  category: string;
  signal: "POSITIVE" | "NEGATIVE";
  weight: number;
  description: string;
  messageId?: string;
}

function severityPenalty(severity: string): number {
  switch (severity) {
    case "CRITICAL": return -15;
    case "HIGH":     return -10;
    case "MEDIUM":   return -5;
    case "LOW":      return -2;
    default:         return 0;
  }
}

function maturityLabel(score: number): { level: string; label: string } {
  if (score >= 80) return { level: "OPTIMIZED",   label: "Professionell strukturiert" };
  if (score >= 65) return { level: "MANAGED",     label: "Gut geführt, Potenzial erkannt" };
  if (score >= 50) return { level: "DEFINED",     label: "Grundstruktur vorhanden" };
  if (score >= 35) return { level: "DEVELOPING",  label: "Im Aufbau, erhebliches Potenzial" };
  return              { level: "INITIAL",      label: "Handlungsbedarf in Grundstrukturen" };
}

export async function calculateOkunScore(sessionId: string, companyId: string) {
  const [processes, problems, opportunities, session] = await Promise.all([
    db.processProfile.findMany({ where: { sessionId } }),
    db.detectedProblem.findMany({ where: { sessionId } }),
    db.opportunity.findMany({ where: { sessionId } }),
    db.analysisSession.findUnique({
      where: { id: sessionId },
      include: {
        progress: { include: { question: { select: { isRequired: true } } } },
      },
    }),
  ]);

  // ── Category scores (base = 40) ─────────────────────────────────────────
  const categoryScores: Record<string, number> = {
    prozesse: BASE_SCORE,
    vertrieb: BASE_SCORE,
    geschaeftsfuehrung: BASE_SCORE,
    automatisierung: BASE_SCORE,
    struktur: BASE_SCORE,
    kommunikation: BASE_SCORE,
    personal: BASE_SCORE,
  };

  const evidenceToSave: EvidenceInput[] = [];

  // ── Positive signals ─────────────────────────────────────────────────────
  // Documented processes with structured data
  const wellDocumentedCount = processes.filter(
    (p) => p.trigger && p.roles !== "[]" && p.steps !== "[]"
  ).length;
  if (wellDocumentedCount > 0) {
    const w = Math.min(wellDocumentedCount * 5, 20);
    categoryScores.prozesse += w;
    evidenceToSave.push({ category: "prozesse", signal: "POSITIVE", weight: w, description: `${wellDocumentedCount} gut dokumentierte Prozesse mit Auslöser, Rollen und Schritten` });
  }

  // Process maturity average
  const processesWithMaturity = processes.filter((p) => p.maturityScore !== null);
  if (processesWithMaturity.length > 0) {
    const avg = processesWithMaturity.reduce((s, p) => s + (p.maturityScore ?? 50), 0) / processesWithMaturity.length;
    const boost = Math.round((avg - 50) / 5);
    if (boost !== 0) {
      categoryScores.prozesse = Math.max(0, Math.min(100, categoryScores.prozesse + boost));
      evidenceToSave.push({ category: "prozesse", signal: boost > 0 ? "POSITIVE" : "NEGATIVE", weight: boost, description: `Durchschnittliche Prozessreife: ${Math.round(avg)}/100` });
    }
  }

  // Systems / automation: penalize if no systems detected
  if (processes.some((p) => p.systems !== "[]")) {
    categoryScores.automatisierung += 10;
    evidenceToSave.push({ category: "automatisierung", signal: "POSITIVE", weight: 10, description: "Systemnutzung in Prozessen dokumentiert" });
  }

  // ── Negative signals from problems ──────────────────────────────────────
  for (const prob of problems) {
    const penalty = severityPenalty(prob.severity);
    const cat = prob.category;
    const catKey =
      cat === "process" ? "prozesse" :
      cat === "sales" ? "vertrieb" :
      cat === "leadership" ? "geschaeftsfuehrung" :
      cat === "automation" ? "automatisierung" :
      cat === "structure" ? "struktur" :
      cat === "communication" ? "kommunikation" :
      cat === "hr" ? "personal" : null;

    if (catKey && penalty !== 0) {
      categoryScores[catKey] = Math.max(0, categoryScores[catKey] + penalty);
      evidenceToSave.push({
        category: catKey,
        signal: "NEGATIVE",
        weight: penalty,
        description: `Problem (${prob.severity}): ${prob.operativeProblem}`,
      });
    }
  }

  // ── Clamp all to 0–100 ───────────────────────────────────────────────────
  for (const k of Object.keys(categoryScores)) {
    categoryScores[k] = Math.max(0, Math.min(100, categoryScores[k]));
  }

  // ── Weighted total ────────────────────────────────────────────────────────
  let total = Math.round(
    categoryScores.prozesse         * WEIGHTS.prozesse +
    categoryScores.vertrieb         * WEIGHTS.vertrieb +
    categoryScores.geschaeftsfuehrung * WEIGHTS.geschaeftsfuehrung +
    categoryScores.automatisierung  * WEIGHTS.automatisierung +
    categoryScores.struktur         * WEIGHTS.struktur +
    categoryScores.kommunikation    * WEIGHTS.kommunikation +
    categoryScores.personal         * WEIGHTS.personal
  );

  // ── Bonuses ───────────────────────────────────────────────────────────────
  const criticalHighCount = problems.filter((p) => ["CRITICAL", "HIGH"].includes(p.severity)).length;
  if (criticalHighCount < 3) {
    total = Math.min(100, total + 5);
    evidenceToSave.push({ category: "prozesse", signal: "POSITIVE", weight: 5, description: "Weniger als 3 kritische/hohe Probleme erkannt" });
  }

  // Question coverage bonus
  if (session) {
    const requiredTotal = session.progress.filter((p) => p.question.isRequired).length;
    const totalRequired = 17; // Q1–Q17 are required
    const coverage = requiredTotal / totalRequired;
    if (coverage >= 0.8) {
      total = Math.min(100, total + 10);
      evidenceToSave.push({ category: "struktur", signal: "POSITIVE", weight: 10, description: `${Math.round(coverage * 100)}% der Pflichtfragen beantwortet` });
    }
  }

  total = Math.max(0, Math.min(100, total));

  const { level, label } = maturityLabel(total);

  // ── Strengths and potentials ─────────────────────────────────────────────
  const areaLabels: Record<string, string> = {
    prozesse: "Prozessqualität",
    vertrieb: "Vertriebsstruktur",
    geschaeftsfuehrung: "Führungsstruktur",
    automatisierung: "Automatisierungsgrad",
    struktur: "Unternehmensstruktur",
    kommunikation: "Kommunikation",
    personal: "Personalmanagement",
  };

  const potentialDescs: Record<string, string> = {
    prozesse: "Prozessdokumentation und -standardisierung",
    vertrieb: "Vertriebsautomatisierung und Pipeline",
    geschaeftsfuehrung: "Delegation und Entscheidungsstrukturen",
    automatisierung: "Automatisierung wiederkehrender Aufgaben",
    struktur: "Rollenklarheit und Verantwortlichkeiten",
    kommunikation: "Informationsfluss und Kommunikationskanäle",
    personal: "Recruiting- und Onboarding-Prozesse",
  };

  const sorted = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
  const strengths = sorted.filter(([, s]) => s >= 65).slice(0, 3).map(([a]) => areaLabels[a] ?? a);
  const potentials = sorted.filter(([, s]) => s < 60).slice(-3).reverse().map(([a]) => potentialDescs[a] ?? a);

  // ── Persist evidence ─────────────────────────────────────────────────────
  await db.scoringEvidence.deleteMany({ where: { sessionId } });
  if (evidenceToSave.length > 0) {
    await db.scoringEvidence.createMany({
      data: evidenceToSave.map((e) => ({ ...e, sessionId })),
    });
  }

  // ── Save score ────────────────────────────────────────────────────────────
  await db.okunScore.upsert({
    where: { sessionId },
    create: {
      sessionId,
      companyId,
      totalScore: total,
      maturityLevel: level,
      maturityLabel: label,
      scoreProcesses: categoryScores.prozesse,
      scoreSales: categoryScores.vertrieb,
      scoreLeadership: categoryScores.geschaeftsfuehrung,
      scoreAutomation: categoryScores.automatisierung,
      scoreStructure: categoryScores.struktur,
      scoreCommunication: categoryScores.kommunikation,
      scoreHr: categoryScores.personal,
      strengths: JSON.stringify(strengths),
      potentials: JSON.stringify(potentials),
      evidence: JSON.stringify(categoryScores),
    },
    update: {
      totalScore: total,
      maturityLevel: level,
      maturityLabel: label,
      scoreProcesses: categoryScores.prozesse,
      scoreSales: categoryScores.vertrieb,
      scoreLeadership: categoryScores.geschaeftsfuehrung,
      scoreAutomation: categoryScores.automatisierung,
      scoreStructure: categoryScores.struktur,
      scoreCommunication: categoryScores.kommunikation,
      scoreHr: categoryScores.personal,
      strengths: JSON.stringify(strengths),
      potentials: JSON.stringify(potentials),
      evidence: JSON.stringify(categoryScores),
    },
  });

  // Update company assessment
  const assessment = await db.assessment.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  if (assessment) {
    await db.assessment.update({
      where: { id: assessment.id },
      data: { score: total, status: "COMPLETED", completedAt: new Date() },
    });
  }

  return { total, level, label, scores: categoryScores, strengths, potentials };
}
