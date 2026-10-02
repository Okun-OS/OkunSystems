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
 * Sammelt je konkreter Lösung, wie stark sie durch die gegebenen Antworten
 * ausgelöst wurde.
 *
 * Eine Antwort wie „Kundenanfragen bearbeiten und intern weiterleiten" verweist
 * unmittelbar auf die Lösungen, die genau das abnehmen. Ohne diese Verweise
 * blieb nur die Kategorie — und dann wurde alles empfohlen, was in derselben
 * Schublade lag, vom Wiki bis zum Chat-Werkzeug.
 */
export function aggregateSolutionRefs(
  evaluated: EvaluatedQuestion[]
): Map<string, number> {
  const totals = new Map<string, number>();

  for (const q of evaluated) {
    if (!q.isActive || q.status !== "ANSWERED") continue;
    for (const signal of q.signals) {
      for (const ref of signal.solutionRefs) {
        totals.set(ref, (totals.get(ref) ?? 0) + signal.value);
      }
    }
  }

  return totals;
}

function packageTypesOf(solution: SolutionInput): string[] {
  try {
    const parsed: unknown = JSON.parse(solution.packageTypes || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Empfiehlt Lösungen zu den gegebenen Antworten.
 *
 * Vorrang haben die Lösungen, auf die einzelne Antworten unmittelbar verweisen.
 * Erst wenn keine einzige Antwort einen solchen Verweis trägt — etwa bei
 * Sitzungen aus der Zeit vor dieser Zuordnung — greift die gröbere Auswahl über
 * die Kategorie, damit alte Auswertungen nicht leer ausgehen.
 *
 * Lösungen oberhalb des gebuchten Pakets werden **nicht** mehr entfernt,
 * sondern mit `beyondPackage` versehen. Vorher fielen sie aus der Auswertung
 * heraus — und mit ihnen genau die Vorschläge, die dem Kunden über sein Paket
 * hinaus etwas bringen. Ob und wie sie erscheinen, entscheidet der Bericht.
 */
export function matchSolutions(
  signals: SignalTotals,
  solutions: SolutionInput[],
  packageType: string | null,
  solutionRefs?: Map<string, number>
): SolutionRecommendation[] {
  const active = solutions.filter((sol) => sol.isActive);

  const build = (
    sol: SolutionInput,
    signalScore: number,
    fromAnswers: boolean
  ): SolutionRecommendation => {
    const packageTypes = packageTypesOf(sol);
    return {
      solutionId: sol.id,
      externalId: sol.externalId,
      name: sol.name,
      category: sol.category,
      description: sol.description,
      packageTypes,
      signalScore,
      fromAnswers,
      // Ohne gebuchtes Paket gibt es kein "darüber hinaus".
      beyondPackage: packageType !== null && !packageTypes.includes(packageType),
    };
  };

  // Im Paket zuerst, darüber danach — sonst steht der Aufpreis oben.
  const byRank = (a: SolutionRecommendation, b: SolutionRecommendation) =>
    Number(a.beyondPackage) - Number(b.beyondPackage) ||
    b.signalScore - a.signalScore ||
    a.name.localeCompare(b.name, "de");

  if (solutionRefs && solutionRefs.size > 0) {
    return active
      .map((sol) => ({ sol, score: solutionRefs.get(sol.externalId) ?? 0 }))
      .filter((entry) => entry.score > 0)
      .map((entry) => build(entry.sol, entry.score, true))
      .sort(byRank);
  }

  return active
    .map((sol) => ({ sol, score: signals[sol.category as keyof SignalTotals] ?? 0 }))
    .filter((entry) => entry.score > 0)
    .map((entry) => build(entry.sol, entry.score, false))
    .sort(byRank);
}
