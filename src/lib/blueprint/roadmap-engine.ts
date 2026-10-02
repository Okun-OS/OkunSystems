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
 * Ordnet jede empfohlene Lösung der frühesten Stufe zu, auf der es sie gibt,
 * und gibt die Phasen in der Reihenfolge foundation → operations → custom
 * zurück. Leere Phasen fallen weg.
 *
 * Ist ein Paket gebucht, werden die Stufen darüber **nicht** mehr
 * weggelassen, sondern als eigene Phase geführt und mit `beyondPackage`
 * gekennzeichnet. Vorher endete die Roadmap am gebuchten Paket, und ein
 * Betrieb mit erkanntem Bedarf an Individualentwicklung sah davon nichts —
 * weder er noch der Kollege, der das Strategiegespräch führt. Was davon im
 * Kundenbericht erscheint, entscheidet der Bericht.
 */
export function buildRoadmap(
  recommendations: SolutionRecommendation[],
  packageType: string | null
): RoadmapPhase[] {
  const bookedIndex = packageType !== null ? TIER_ORDER.indexOf(packageType as PackageTier) : -1;

  const phases = new Map<PackageTier, SolutionRecommendation[]>(
    TIER_ORDER.map((t) => [t, []])
  );

  for (const rec of recommendations) {
    // Die früheste Stufe, auf der es die Lösung gibt — unabhängig davon, was
    // gebucht ist. Sonst rutschte eine Custom-Lösung in eine frühere Phase.
    const firstTier = TIER_ORDER.find((t) => rec.packageTypes.includes(t));
    if (firstTier) {
      phases.get(firstTier)!.push(rec);
    }
  }

  return TIER_ORDER.map((tier, index): RoadmapPhase => {
    const beyond = bookedIndex >= 0 && index > bookedIndex;
    return {
      phaseLabel: beyond ? `Über Ihr Paket hinaus – ${TIER_LABELS[tier].split("– ")[1]}` : TIER_LABELS[tier],
      packageTier: tier,
      solutions: phases.get(tier)!,
      beyondPackage: beyond,
    };
  }).filter((p) => p.solutions.length > 0);
}
