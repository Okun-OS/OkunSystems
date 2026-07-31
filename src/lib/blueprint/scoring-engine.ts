import type {
  BlueprintScores,
  EvaluatedQuestion,
  GroupScore,
  ModuleScore,
} from "./types";

/**
 * computeBlueprintScores derives per-module and M5 group scores from an
 * evaluated session.
 *
 * M5 uses weighted group normalization:
 *   M5Score = Σ(groupScore_i × weight_i) / Σ(weight_j for active groups j)
 *
 * This prevents inapplicable groups (e.g. 5.1 Einsatzplanung when the company
 * has no field service) from penalizing the overall M5 score.
 *
 * Only type-B, non-gating, answered, active questions contribute to scores.
 */
export function computeBlueprintScores(
  evaluated: EvaluatedQuestion[]
): BlueprintScores {
  const scorable = evaluated.filter(
    (q) =>
      q.isActive &&
      q.status === "ANSWERED" &&
      q.questionType === "B" &&
      !q.isGating &&
      q.computedScore !== null
  );

  // ── M5 group scores ────────────────────────────────────────────────────────
  const groupMap = new Map<string, { scores: number[]; weight: number }>();

  for (const q of scorable) {
    if (q.moduleNumber !== 5 || !q.groupCode) continue;
    if (!groupMap.has(q.groupCode)) {
      groupMap.set(q.groupCode, { scores: [], weight: q.internalWeight ?? 0 });
    }
    groupMap.get(q.groupCode)!.scores.push(q.computedScore!);
  }

  const m5GroupScores: GroupScore[] = [];
  for (const [groupCode, { scores, weight }] of groupMap) {
    const avg =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    m5GroupScores.push({
      groupCode,
      score: Math.round(avg),
      weight,
      activeScoredCount: scores.length,
    });
  }
  m5GroupScores.sort((a, b) => a.groupCode.localeCompare(b.groupCode));

  // M5 normalized score
  const activeGroups = m5GroupScores.filter((g) => g.activeScoredCount > 0);
  const weightSum = activeGroups.reduce((s, g) => s + g.weight, 0);
  const m5NormalizedScore =
    weightSum > 0
      ? Math.round(
          activeGroups.reduce((s, g) => s + g.score * g.weight, 0) / weightSum
        )
      : 0;

  // ── Per-module scores (all modules) ───────────────────────────────────────
  const moduleMap = new Map<number, number[]>();

  for (const q of scorable) {
    if (q.moduleNumber === null) continue;
    if (!moduleMap.has(q.moduleNumber)) moduleMap.set(q.moduleNumber, []);
    moduleMap.get(q.moduleNumber)!.push(q.computedScore!);
  }

  const moduleScores: ModuleScore[] = [];
  for (const [moduleNumber, scores] of moduleMap) {
    if (moduleNumber === 5) {
      // M5 uses the normalized score, not a raw average
      moduleScores.push({
        moduleNumber: 5,
        score: m5NormalizedScore,
        activeQuestionCount: scores.length,
      });
    } else {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      moduleScores.push({
        moduleNumber,
        score: Math.round(avg),
        activeQuestionCount: scores.length,
      });
    }
  }
  moduleScores.sort((a, b) => a.moduleNumber - b.moduleNumber);

  return { m5GroupScores, m5NormalizedScore, moduleScores };
}

/**
 * getModuleScore returns the score for a single module number, or null if the
 * module has no active scored questions.
 */
export function getModuleScore(
  scores: BlueprintScores,
  moduleNumber: number
): number | null {
  return scores.moduleScores.find((m) => m.moduleNumber === moduleNumber)?.score ?? null;
}
