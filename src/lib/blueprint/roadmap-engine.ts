import type {
  PackageTier,
  RoadmapPhase,
  SolutionRecommendation,
} from "./types";

const TIER_ORDER: PackageTier[] = ["foundation", "operations", "custom"];

const TIER_LABELS: Record<PackageTier, string> = {
  foundation: "Phase 1 – Grundlagen schaffen",
  operations: "Phase 2 – Betrieb optimieren",
  custom: "Phase 3 – Individuelle Lösungen",
};

/**
 * buildRoadmap assigns each recommended solution to its earliest applicable
 * package tier, then returns phases ordered foundation → operations → custom.
 *
 * If packageType is set on the session, only tiers up to and including that
 * tier are included (a "foundation" session does not show "custom" solutions).
 *
 * Empty phases are omitted from the result.
 */
export function buildRoadmap(
  recommendations: SolutionRecommendation[],
  packageType: string | null
): RoadmapPhase[] {
  const maxTierIndex =
    packageType !== null
      ? TIER_ORDER.indexOf(packageType as PackageTier)
      : TIER_ORDER.length - 1;

  const activeTiers =
    maxTierIndex >= 0 ? TIER_ORDER.slice(0, maxTierIndex + 1) : TIER_ORDER;

  const phases = new Map<PackageTier, SolutionRecommendation[]>(
    activeTiers.map((t) => [t, []])
  );

  for (const rec of recommendations) {
    const firstTier = activeTiers.find((t) => rec.packageTypes.includes(t));
    if (firstTier) {
      phases.get(firstTier)!.push(rec);
    }
  }

  return activeTiers
    .map((tier): RoadmapPhase => ({
      phaseLabel: TIER_LABELS[tier],
      packageTier: tier,
      solutions: phases.get(tier)!,
    }))
    .filter((p) => p.solutions.length > 0);
}
