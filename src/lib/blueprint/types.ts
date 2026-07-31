// Shared types for the Blueprint 2.0 engine layer.
// All engine functions are pure — callers load DB data and pass it in.

// ─── Activation condition ──────────────────────────────────────────────────

export interface ActivationCond {
  type: string;
  ref?: string;
  optionExternalIds?: string[];
  threshold?: number;
  mode?: string;
  cap?: number;
  max?: number;
}

// Directive types that live inside activationConds but are NOT filter predicates.
// The branching engine skips them; the scoring engine reads them.
export const DIRECTIVE_TYPES = new Set(["SCORE_MODE", "SCORE_CAP", "MAX_SELECTIONS"]);

// ─── Input shapes (raw DB rows) ────────────────────────────────────────────

export interface AnswerOptionInput {
  id: string;
  externalId: string;
  questionId: string;
  points: number;
  isExclusive: boolean;
  signalCategory: string | null;
  signalValue: number;
  order: number;
}

export interface QuestionInput {
  id: string;
  externalId: string;
  moduleNumber: number | null;
  groupCode: string | null;
  questionType: string;
  isGating: boolean;
  isFollowUp: boolean;
  internalWeight: number | null;
  activationConds: string; // JSON string
  order: number;
  answerOptions: AnswerOptionInput[];
}

export interface SessionAnswerInput {
  questionId: string;        // DB id of the question
  selectedOptionIds: string; // JSON string of AnswerOption DB ids
  computedScore: number | null;
  status: string;
}

export interface SolutionInput {
  id: string;
  externalId: string;
  name: string;
  category: string;
  description: string;
  packageTypes: string; // JSON string
  isActive: boolean;
}

// ─── Engine output shapes ──────────────────────────────────────────────────

export type QuestionType = "A" | "B" | "C";
export type AnswerStatus = "ANSWERED" | "PENDING" | "NOT_APPLICABLE";

export interface SignalEntry {
  category: string;
  value: number;
}

export interface EvaluatedQuestion {
  questionId: string;
  externalId: string;
  moduleNumber: number | null;
  groupCode: string | null;
  questionType: QuestionType;
  isGating: boolean;
  isFollowUp: boolean;
  internalWeight: number | null;
  order: number;
  // Derived
  isActive: boolean;
  status: AnswerStatus;
  selectedOptionExternalIds: string[];
  computedScore: number | null;
  signals: SignalEntry[];
}

export interface SignalTotals {
  WORKFORCE: number;
  BEWAEHRTE_LOESUNG: number;
  CUSTOM_DEVELOPMENT: number;
}

export interface GroupScore {
  groupCode: string;
  score: number;         // 0–100, average of active type-B questions in group
  weight: number;        // internalWeight of the group
  activeScoredCount: number;
}

export interface ModuleScore {
  moduleNumber: number;
  score: number;          // 0–100
  activeQuestionCount: number;
}

export interface BlueprintScores {
  m5GroupScores: GroupScore[];
  m5NormalizedScore: number;
  moduleScores: ModuleScore[];
}

export interface SolutionRecommendation {
  solutionId: string;
  externalId: string;
  name: string;
  category: string;
  description: string;
  packageTypes: string[];
  signalScore: number;
}

export type PackageTier = "foundation" | "operations" | "custom";

export interface RoadmapPhase {
  phaseLabel: string;
  packageTier: PackageTier;
  solutions: SolutionRecommendation[];
}
