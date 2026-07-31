import type {
  EvaluatedQuestion,
  SignalTotals,
  SolutionInput,
  SolutionRecommendation,
} from "./types";

/**
 * aggregateSignals sums signalValues per category across all answered active
 * questions in the session.
 */
export function aggregateSignals(evaluated: EvaluatedQuestion[]): SignalTotals {
  const totals: SignalTotals = {
    WORKFORCE: 0,
    BEWAEHRTE_LOESUNG: 0,
    CUSTOM_DEVELOPMENT: 0,
  };

  for (const q of evaluated) {
    if (!q.isActive || q.status !== "ANSWERED") continue;
    for (const sig of q.signals) {
      const key = sig.category as keyof SignalTotals;
      if (key in totals) {
        totals[key] += sig.value;
      }
    }
  }

  return totals;
}

/**
 * matchSolutions filters the solution library by:
 *   1. packageType — solution must include the session's package tier (if set)
 *   2. signal presence — category must have a non-zero signal total
 *
 * Returns recommendations sorted by signal score (descending).
 */
export function matchSolutions(
  signals: SignalTotals,
  solutions: SolutionInput[],
  packageType: string | null
): SolutionRecommendation[] {
  const recommendations: SolutionRecommendation[] = [];

  for (const sol of solutions) {
    if (!sol.isActive) continue;

    const packageTypes: string[] = (() => {
      try { return JSON.parse(sol.packageTypes || "[]"); }
      catch { return []; }
    })();

    // Only include solutions available for the session's package tier
    if (packageType && !packageTypes.includes(packageType)) continue;

    const signalScore = signals[sol.category as keyof SignalTotals] ?? 0;
    if (signalScore === 0) continue;

    recommendations.push({
      solutionId: sol.id,
      externalId: sol.externalId,
      name: sol.name,
      category: sol.category,
      description: sol.description,
      packageTypes,
      signalScore,
    });
  }

  return recommendations.sort((a, b) => b.signalScore - a.signalScore);
}
