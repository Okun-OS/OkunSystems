// @ts-nocheck
import { db } from "@/lib/db";
import { QUESTIONS, SOLUTIONS } from "./catalog";

/**
 * Seeds Blueprint 2.0 questions and solutions using the app's own db client.
 * Safe to call multiple times — upserts on externalId.
 */
export async function seedBlueprintCatalog(): Promise<{
  questions: number;
  options: number;
  solutions: number;
}> {
  const questionIdMap = new Map<string, string>();

  // Schritt 1: Fragen upserten
  for (const q of QUESTIONS) {
    const { options, ...qData } = q;
    const record = await db.questionTemplate.upsert({
      where: { externalId: q.externalId },
      create: {
        externalId: qData.externalId,
        moduleNumber: qData.moduleNumber,
        groupCode: qData.groupCode ?? null,
        area: qData.area,
        phase: qData.phase,
        questionType: qData.questionType,
        isGating: qData.isGating ?? false,
        isFollowUp: qData.isFollowUp ?? false,
        parentExternalId: qData.parentExternalId ?? null,
        internalWeight: qData.internalWeight ?? null,
        activationConds: JSON.stringify(qData.activationConds ?? []),
        order: qData.order,
        isRequired: qData.isRequired,
        intent: qData.intent,
        questionDe: qData.questionDe,
        questionEn: qData.questionDe,
        followUpTriggers: "[]",
        maxFollowUps: 0,
        isActive: true,
      },
      update: {
        moduleNumber: qData.moduleNumber,
        groupCode: qData.groupCode ?? null,
        area: qData.area,
        phase: qData.phase,
        questionType: qData.questionType,
        isGating: qData.isGating ?? false,
        isFollowUp: qData.isFollowUp ?? false,
        parentExternalId: qData.parentExternalId ?? null,
        internalWeight: qData.internalWeight ?? null,
        activationConds: JSON.stringify(qData.activationConds ?? []),
        order: qData.order,
        isRequired: qData.isRequired,
        intent: qData.intent,
        questionDe: qData.questionDe,
        isActive: true,
      },
    });
    questionIdMap.set(q.externalId, record.id);
  }

  // Schritt 2: Antwortoptionen upserten
  let totalOptions = 0;
  for (const q of QUESTIONS) {
    if (!q.options?.length) continue;
    const questionId = questionIdMap.get(q.externalId);
    if (!questionId) continue;
    for (const opt of q.options) {
      await db.answerOption.upsert({
        where: { externalId: opt.externalId },
        create: {
          externalId: opt.externalId,
          questionId,
          textDe: opt.textDe,
          points: opt.points,
          isExclusive: opt.isExclusive ?? false,
          signalCategory: opt.signalCategory ?? null,
          signalValue: opt.signalValue ?? 0,
          order: opt.order,
          isActive: true,
        },
        update: {
          questionId,
          textDe: opt.textDe,
          points: opt.points,
          isExclusive: opt.isExclusive ?? false,
          signalCategory: opt.signalCategory ?? null,
          signalValue: opt.signalValue ?? 0,
          order: opt.order,
        },
      });
      totalOptions++;
    }
  }

  // Schritt 3: SolutionLibrary upserten
  for (const sol of SOLUTIONS) {
    await db.solutionLibrary.upsert({
      where: { externalId: sol.externalId },
      create: {
        externalId: sol.externalId,
        name: sol.name,
        category: sol.category,
        description: sol.description,
        packageTypes: JSON.stringify(sol.packageTypes),
        activationConditions: "[]",
        exclusionConditions: "[]",
        isActive: true,
      },
      update: {
        name: sol.name,
        category: sol.category,
        description: sol.description,
        packageTypes: JSON.stringify(sol.packageTypes),
      },
    });
  }

  return { questions: QUESTIONS.length, options: totalOptions, solutions: SOLUTIONS.length };
}

/**
 * Seeds Blueprint catalog only if no Blueprint questions exist yet.
 * Called from instrumentation.ts at server startup.
 */
export async function seedBlueprintIfEmpty(): Promise<void> {
  const count = await db.questionTemplate.count({
    where: { phase: { startsWith: "BLUEPRINT_" } },
  });
  if (count > 0) {
    console.log(`[blueprint] ${count} Fragen bereits in DB — Seed übersprungen`);
    return;
  }
  console.log("[blueprint] Keine Blueprint-Fragen gefunden — starte Seed...");
  const result = await seedBlueprintCatalog();
  console.log(
    `[blueprint] Seed abgeschlossen: ${result.questions} Fragen, ${result.options} Optionen, ${result.solutions} Lösungen`
  );
}
