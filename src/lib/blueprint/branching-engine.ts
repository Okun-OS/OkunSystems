import type {
  ActivationCond,
  AnswerOptionInput,
  AnswerStatus,
  EvaluatedQuestion,
  QuestionInput,
  QuestionType,
  SessionAnswerInput,
  SignalEntry,
} from "./types";
import { DIRECTIVE_TYPES } from "./types";

function parseActivationConds(raw: string): ActivationCond[] {
  try {
    return JSON.parse(raw) as ActivationCond[];
  } catch {
    return [];
  }
}

function evaluateCondition(
  cond: ActivationCond,
  stateByExternalId: Map<string, EvaluatedQuestion>
): boolean {
  if (DIRECTIVE_TYPES.has(cond.type)) return true;

  const ref = cond.ref;
  if (!ref) return true;

  const s = stateByExternalId.get(ref);

  switch (cond.type) {
    case "M1_OPTION_IN":
    case "ANSWER_IS": {
      if (!s || !s.isActive || s.status !== "ANSWERED") return false;
      const ids = cond.optionExternalIds ?? [];
      return s.selectedOptionExternalIds.some((id) => ids.includes(id));
    }
    case "M1_OPTION_NOT_IN":
    case "ANSWER_NOT_IS": {
      if (!s || !s.isActive || s.status !== "ANSWERED") return false;
      const ids = cond.optionExternalIds ?? [];
      return !s.selectedOptionExternalIds.some((id) => ids.includes(id));
    }
    case "SCORE_GT": {
      if (!s || !s.isActive || s.computedScore === null) return false;
      return s.computedScore > (cond.threshold ?? 0);
    }
    case "SCORE_LTE": {
      if (!s || !s.isActive || s.computedScore === null) return false;
      return s.computedScore <= (cond.threshold ?? 0);
    }
    case "QUESTION_ASKED": {
      return s?.isActive === true;
    }
    default:
      return true;
  }
}

function computeQuestionScore(
  question: QuestionInput,
  selectedOptions: AnswerOptionInput[]
): number {
  if (selectedOptions.length === 0) return 0;

  const conds = parseActivationConds(question.activationConds);
  const scoreMode = conds.find((c) => c.type === "SCORE_MODE")?.mode ?? "SINGLE";
  const scoreCap = conds.find((c) => c.type === "SCORE_CAP")?.cap ?? null;

  let score: number;
  if (scoreMode === "MULTI_SELECT") {
    score = selectedOptions.reduce((sum, opt) => sum + opt.points, 0);
  } else if (scoreMode === "MAX") {
    score = Math.max(...selectedOptions.map((opt) => opt.points));
  } else {
    score = selectedOptions[0]?.points ?? 0;
  }

  return scoreCap !== null ? Math.min(score, scoreCap) : score;
}

/**
 * evaluateSession is the core engine function.
 *
 * It processes questions in order (ascending `order` field), evaluating each
 * question's activation conditions against already-processed state. Because all
 * activation conditions reference questions with a lower order value, a single
 * sequential pass is sufficient — no iteration required.
 *
 * Returns one EvaluatedQuestion per input question, in the same order.
 */
/** Lösungsverweise einer Antwortoption. Fehlt das Feld, greift die Kategorie. */
function parseSolutionRefs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function evaluateSession(
  questions: QuestionInput[],
  sessionAnswers: SessionAnswerInput[]
): EvaluatedQuestion[] {
  const answerByQuestionId = new Map<string, SessionAnswerInput>();
  for (const sa of sessionAnswers) {
    answerByQuestionId.set(sa.questionId, sa);
  }

  // Option lookup: questionId → optionDbId → AnswerOptionInput
  const optionsByQuestionId = new Map<string, Map<string, AnswerOptionInput>>();
  for (const q of questions) {
    const map = new Map<string, AnswerOptionInput>();
    for (const opt of q.answerOptions) map.set(opt.id, opt);
    optionsByQuestionId.set(q.id, map);
  }

  const stateByExtId = new Map<string, EvaluatedQuestion>();
  const results: EvaluatedQuestion[] = [];

  for (const q of questions) {
    const conds = parseActivationConds(q.activationConds);
    const filterConds = conds.filter((c) => !DIRECTIVE_TYPES.has(c.type));
    const isActive = filterConds.every((c) => evaluateCondition(c, stateByExtId));

    const sa = answerByQuestionId.get(q.id);

    let status: AnswerStatus = "NOT_APPLICABLE";
    let selectedOptionExternalIds: string[] = [];
    let computedScore: number | null = null;
    let signals: SignalEntry[] = [];

    if (isActive) {
      if (!sa || sa.status === "NOT_APPLICABLE") {
        status = "PENDING";
      } else if (sa.status === "SKIPPED") {
        status = "SKIPPED";
        // No score, no selected options, no signals — skipped questions are inert
      } else {
        status = "ANSWERED";

        const selectedIds: string[] = (() => {
          try { return JSON.parse(sa.selectedOptionIds || "[]"); }
          catch { return []; }
        })();

        const optMap = optionsByQuestionId.get(q.id) ?? new Map();
        const selectedOpts = selectedIds
          .map((id) => optMap.get(id))
          .filter((opt): opt is AnswerOptionInput => opt !== undefined);

        selectedOptionExternalIds = selectedOpts.map((opt) => opt.externalId);

        if (q.questionType === "B" && !q.isGating) {
          computedScore = computeQuestionScore(q, selectedOpts);
        }

        signals = selectedOpts
          .filter((opt) => opt.signalCategory !== null && opt.signalValue > 0)
          .map((opt) => ({
            category: opt.signalCategory!,
            value: opt.signalValue,
            solutionRefs: parseSolutionRefs(opt.solutionRefs),
          }));
      }
    }

    const evaluated: EvaluatedQuestion = {
      questionId: q.id,
      externalId: q.externalId,
      moduleNumber: q.moduleNumber,
      groupCode: q.groupCode,
      questionType: q.questionType as QuestionType,
      isGating: q.isGating,
      isFollowUp: q.isFollowUp,
      internalWeight: q.internalWeight,
      order: q.order,
      isActive,
      status,
      selectedOptionExternalIds,
      computedScore,
      signals,
    };

    stateByExtId.set(q.externalId, evaluated);
    results.push(evaluated);
  }

  return results;
}

/** Returns only questions that should be shown to the user in the current state. */
export function getActiveQuestions(evaluated: EvaluatedQuestion[]): EvaluatedQuestion[] {
  return evaluated.filter((q) => q.isActive);
}

/** Returns the next unanswered active question in order, or null if all are answered. */
export function getNextPendingQuestion(
  evaluated: EvaluatedQuestion[]
): EvaluatedQuestion | null {
  return evaluated.find((q) => q.isActive && q.status === "PENDING") ?? null;
}
