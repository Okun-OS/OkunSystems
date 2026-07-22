export interface ProblemMatch {
  libraryItemId: string;
  libraryItemName: string;
  operativeProblem: string;
  rootCause: string;
  category: string;
  severity: string;
  matchedPattern: string;
  confidence: number;
}

export interface ProcessMatch {
  libraryItemId: string;
  libraryItemName: string;
  category: string;
  confidence: number;
}

export function matchProblems(
  text: string,
  libraryItems: Array<{
    id: string;
    name: string;
    symptomPatterns: string;
    operativeProblem: string;
    rootCause: string;
    category: string;
    severity: string;
  }>
): ProblemMatch[] {
  const results: ProblemMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const item of libraryItems) {
    let patterns: string[] = [];
    try {
      patterns = JSON.parse(item.symptomPatterns);
    } catch {
      continue;
    }

    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        results.push({
          libraryItemId: item.id,
          libraryItemName: item.name,
          operativeProblem: item.operativeProblem,
          rootCause: item.rootCause,
          category: item.category,
          severity: item.severity,
          matchedPattern: pattern,
          confidence: 75,
        });
        break;
      }
    }
  }

  return results;
}

export function matchProcesses(
  text: string,
  libraryItems: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
  }>
): ProcessMatch[] {
  const results: ProcessMatch[] = [];
  const lowerText = text.toLowerCase();

  for (const item of libraryItems) {
    const nameWords = item.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const matchCount = nameWords.filter((w) => lowerText.includes(w)).length;

    if (nameWords.length > 0 && matchCount >= Math.ceil(nameWords.length * 0.6)) {
      results.push({
        libraryItemId: item.id,
        libraryItemName: item.name,
        category: item.category,
        confidence: Math.min(90, 55 + matchCount * 10),
      });
    }
  }

  return results;
}
