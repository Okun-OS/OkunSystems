import { db } from "@/lib/db";

interface ProcessData {
  name: string;
  category: string;
  trigger?: string;
  goal?: string;
  roles?: string[];
  steps?: string[];
  systems?: string[];
  handoffs?: string[];
  decisions?: string[];
  documentation?: string;
  frequency?: string;
  problems?: string[];
  maturityScore?: number;
  isNew?: boolean;
}

interface ProblemData {
  symptom: string;
  operativeProblem: string;
  rootCause?: string;
  category: string;
  severity?: string;
  confidence?: number;
  evidence?: string[];
  isNew?: boolean;
}

interface OpportunityData {
  title: string;
  type: string;
  description: string;
  impact?: string;
  effort?: string;
  priority?: number;
  evidence?: string[];
  okunSystem?: string;
}

interface MemoryUpdates {
  processes?: ProcessData[];
  detectedProblems?: ProblemData[];
  opportunities?: OpportunityData[];
  companyProfile?: Record<string, string>;
  roles?: string[];
  systems?: string[];
  challenges?: string[];
}

export async function persistMemoryUpdates(
  sessionId: string,
  companyId: string,
  updates: MemoryUpdates
) {
  const tasks: Promise<unknown>[] = [];

  if (updates.processes && updates.processes.length > 0) {
    for (const proc of updates.processes) {
      if (!proc.name || !proc.category) continue;
      tasks.push(
        db.processProfile.create({
          data: {
            sessionId,
            companyId,
            name: proc.name,
            category: proc.category,
            trigger: proc.trigger,
            goal: proc.goal,
            roles: JSON.stringify(proc.roles ?? []),
            steps: JSON.stringify(proc.steps ?? []),
            systems: JSON.stringify(proc.systems ?? []),
            handoffs: JSON.stringify(proc.handoffs ?? []),
            decisions: JSON.stringify(proc.decisions ?? []),
            documentation: proc.documentation,
            frequency: proc.frequency,
            problems: JSON.stringify(proc.problems ?? []),
            maturityScore: proc.maturityScore,
            isNew: proc.isNew ?? false,
          },
        }).then(async (created) => {
          if (proc.isNew) {
            await db.learningProposal.create({
              data: {
                type: "NEW_PROCESS",
                title: `Neuer Prozess: ${proc.name}`,
                description: `Unbekannter Prozess erkannt in Kategorie "${proc.category}"`,
                proposedData: JSON.stringify(proc),
                sourceSessionId: sessionId,
                sourceCompanyId: companyId,
                evidence: JSON.stringify(proc.problems ?? []),
              },
            });
          }
          return created;
        })
      );
    }
  }

  if (updates.detectedProblems && updates.detectedProblems.length > 0) {
    for (const prob of updates.detectedProblems) {
      if (!prob.symptom) continue;
      tasks.push(
        db.detectedProblem.create({
          data: {
            sessionId,
            companyId,
            symptom: prob.symptom,
            operativeProblem: prob.operativeProblem,
            rootCause: prob.rootCause,
            category: prob.category,
            severity: prob.severity ?? "MEDIUM",
            confidence: prob.confidence ?? 50,
            evidence: JSON.stringify(prob.evidence ?? []),
            isNew: prob.isNew ?? false,
          },
        }).then(async (created) => {
          if (prob.isNew) {
            await db.learningProposal.create({
              data: {
                type: "NEW_PROBLEM",
                title: `Neues Muster: ${prob.operativeProblem}`,
                description: `Unbekanntes Problemmuster erkannt`,
                proposedData: JSON.stringify(prob),
                sourceSessionId: sessionId,
                sourceCompanyId: companyId,
                evidence: JSON.stringify(prob.evidence ?? []),
              },
            });
          }
          return created;
        })
      );
    }
  }

  if (updates.opportunities && updates.opportunities.length > 0) {
    for (const opp of updates.opportunities) {
      if (!opp.title || !opp.type) continue;
      tasks.push(
        db.opportunity.create({
          data: {
            sessionId,
            companyId,
            title: opp.title,
            type: opp.type,
            description: opp.description,
            impact: opp.impact ?? "MEDIUM",
            effort: opp.effort ?? "MEDIUM",
            priority: opp.priority ?? 2,
            evidence: JSON.stringify(opp.evidence ?? []),
            okunSystem: opp.okunSystem,
          },
        })
      );
    }
  }

  // Update or create company memory
  const profileFields = updates.companyProfile ?? {};
  const memoryUpdate: Record<string, unknown> = { updatedAt: new Date() };
  if (Object.keys(profileFields).length > 0) {
    memoryUpdate.profile = JSON.stringify(profileFields);
  }
  if (updates.roles && updates.roles.length > 0) {
    memoryUpdate.roles = JSON.stringify(updates.roles);
  }
  if (updates.systems && updates.systems.length > 0) {
    memoryUpdate.systems = JSON.stringify(updates.systems);
  }
  if (updates.challenges && updates.challenges.length > 0) {
    memoryUpdate.challenges = JSON.stringify(updates.challenges);
  }

  if (Object.keys(memoryUpdate).length > 1) {
    tasks.push(
      db.companyMemory.upsert({
        where: { companyId },
        create: { companyId, ...memoryUpdate },
        update: memoryUpdate,
      })
    );
  }

  await Promise.allSettled(tasks);
}
