import { db } from "@/lib/db";
import type {
  QuestionInput,
  SessionAnswerInput,
  SolutionInput,
} from "./types";

/**
 * loadBlueprintQuestions returns all active Blueprint 2.0 questions with their
 * answer options, sorted by order.
 */
export async function loadBlueprintQuestions(): Promise<QuestionInput[]> {
  return db.questionTemplate.findMany({
    where: {
      isActive: true,
      phase: { startsWith: "BLUEPRINT_" },
    },
    include: {
      answerOptions: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  }) as Promise<QuestionInput[]>;
}

/**
 * loadSessionAnswers returns all current answers for a given session.
 */
export async function loadSessionAnswers(
  sessionId: string
): Promise<SessionAnswerInput[]> {
  return db.sessionAnswer.findMany({
    where: { sessionId },
    select: {
      questionId: true,
      selectedOptionIds: true,
      freeText: true,
      computedScore: true,
      status: true,
    },
  }) as Promise<SessionAnswerInput[]>;
}

/**
 * loadSolutions returns all active SolutionLibrary entries.
 */
export async function loadSolutions(): Promise<SolutionInput[]> {
  return db.solutionLibrary.findMany({
    where: { isActive: true },
    select: {
      id: true,
      externalId: true,
      name: true,
      category: true,
      description: true,
      packageTypes: true,
      isActive: true,
    },
  }) as Promise<SolutionInput[]>;
}

/**
 * loadSessionPackageType returns the packageType set on an AnalysisSession.
 */
export async function loadSessionPackageType(
  sessionId: string
): Promise<string | null> {
  const session = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { packageType: true },
  });
  return session?.packageType ?? null;
}
