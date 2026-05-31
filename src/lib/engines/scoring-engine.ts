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

function severityToScore(severity: string): number {
  switch (severity) {
    case "CRITICAL": return -20;
    case "HIGH": return -12;
    case "MEDIUM": return -6;
    case "LOW": return -2;
    default: return 0;
  }
}

function maturityLabel(score: number): { level: string; label: string } {
  if (score >= 80) return { level: "OPTIMIZED", label: "Optimiert" };
  if (score >= 65) return { level: "MANAGED", label: "Gesteuert" };
  if (score >= 50) return { level: "DEFINED", label: "Definiert" };
  if (score >= 35) return { level: "DEVELOPING", label: "In Entwicklung" };
  return { level: "INITIAL", label: "Initial" };
}

export async function calculateOkunScore(sessionId: string, companyId: string) {
  const [processes, problems, opportunities] = await Promise.all([
    db.processProfile.findMany({ where: { sessionId } }),
    db.detectedProblem.findMany({ where: { sessionId } }),
    db.opportunity.findMany({ where: { sessionId } }),
  ]);

  // Base score starts at 70 (average company)
  let baseScore = 70;

  // Category scores (0-100)
  const scores: Record<string, number> = {
    prozesse: 70,
    vertrieb: 70,
    geschaeftsfuehrung: 70,
    automatisierung: 50,
    struktur: 70,
    kommunikation: 70,
    personal: 70,
  };

  // Apply process maturity
  if (processes.length > 0) {
    const avgMaturity = processes.reduce((sum, p) => sum + (p.maturityScore ?? 50), 0) / processes.length;
    scores.prozesse = Math.round(avgMaturity);
  } else {
    scores.prozesse = 40; // penalty for no documented processes
  }

  // Apply problem penalties per category
  for (const prob of problems) {
    const penalty = severityToScore(prob.severity);
    const cat = prob.category;
    if (cat === "process") scores.prozesse = Math.max(0, scores.prozesse + penalty);
    else if (cat === "sales") scores.vertrieb = Math.max(0, scores.vertrieb + penalty);
    else if (cat === "leadership") scores.geschaeftsfuehrung = Math.max(0, scores.geschaeftsfuehrung + penalty);
    else if (cat === "automation") scores.automatisierung = Math.max(0, scores.automatisierung + penalty);
    else if (cat === "structure") scores.struktur = Math.max(0, scores.struktur + penalty);
    else if (cat === "communication") scores.kommunikation = Math.max(0, scores.kommunikation + penalty);
    else if (cat === "hr") scores.personal = Math.max(0, scores.personal + penalty);
  }

  // Automation bonus for identified opportunities
  const automationOpps = opportunities.filter((o) => o.type === "AUTOMATION").length;
  scores.automatisierung = Math.max(20, Math.min(100, scores.automatisierung - automationOpps * 5));

  // Calculate weighted total
  const total = Math.round(
    scores.prozesse * WEIGHTS.prozesse +
    scores.vertrieb * WEIGHTS.vertrieb +
    scores.geschaeftsfuehrung * WEIGHTS.geschaeftsfuehrung +
    scores.automatisierung * WEIGHTS.automatisierung +
    scores.struktur * WEIGHTS.struktur +
    scores.kommunikation * WEIGHTS.kommunikation +
    scores.personal * WEIGHTS.personal
  );

  const { level, label } = maturityLabel(total);

  // Generate strengths and potentials
  const strengths: string[] = [];
  const potentials: string[] = [];

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  for (const [area, score] of sorted.slice(0, 3)) {
    if (score >= 65) {
      const areaLabel: Record<string, string> = {
        prozesse: "Prozessqualität",
        vertrieb: "Vertriebsstruktur",
        geschaeftsfuehrung: "Führungsstruktur",
        automatisierung: "Automatisierungsgrad",
        struktur: "Unternehmensstruktur",
        kommunikation: "Kommunikation",
        personal: "Personalmanagement",
      };
      strengths.push(areaLabel[area] ?? area);
    }
  }

  for (const [area, score] of sorted.slice(-3).reverse()) {
    if (score < 65) {
      const potential: Record<string, string> = {
        prozesse: "Prozessdokumentation und -standardisierung",
        vertrieb: "Vertriebsautomatisierung und Pipeline",
        geschaeftsfuehrung: "Delegation und Entscheidungsstrukturen",
        automatisierung: "Automatisierung wiederkehrender Aufgaben",
        struktur: "Rollenklarheit und Verantwortlichkeiten",
        kommunikation: "Informationsfluss und Kommunikationskanäle",
        personal: "Recruiting- und Onboarding-Prozesse",
      };
      potentials.push(potential[area] ?? area);
    }
  }

  // Save score
  await db.okunScore.upsert({
    where: { sessionId },
    create: {
      sessionId,
      companyId,
      totalScore: total,
      maturityLevel: level,
      maturityLabel: label,
      scoreProcesses: scores.prozesse,
      scoreSales: scores.vertrieb,
      scoreLeadership: scores.geschaeftsfuehrung,
      scoreAutomation: scores.automatisierung,
      scoreStructure: scores.struktur,
      scoreCommunication: scores.kommunikation,
      scoreHr: scores.personal,
      strengths: JSON.stringify(strengths),
      potentials: JSON.stringify(potentials),
      evidence: JSON.stringify(scores),
    },
    update: {
      totalScore: total,
      maturityLevel: level,
      maturityLabel: label,
      scoreProcesses: scores.prozesse,
      scoreSales: scores.vertrieb,
      scoreLeadership: scores.geschaeftsfuehrung,
      scoreAutomation: scores.automatisierung,
      scoreStructure: scores.struktur,
      scoreCommunication: scores.kommunikation,
      scoreHr: scores.personal,
      strengths: JSON.stringify(strengths),
      potentials: JSON.stringify(potentials),
      evidence: JSON.stringify(scores),
    },
  });

  // Also update the company's assessment score
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

  return { total, level, label, scores, strengths, potentials };
}
