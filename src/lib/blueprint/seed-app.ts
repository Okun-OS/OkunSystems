// @ts-nocheck
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { QUESTIONS, SOLUTIONS } from "./catalog";

const CATALOG_FINGERPRINT_KEY = "blueprint.catalogFingerprint";

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
          solutionRefs: JSON.stringify(opt.solutionRefs ?? []),
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
          solutionRefs: JSON.stringify(opt.solutionRefs ?? []),
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
 * Gleicht den Katalog mit der Datenbank ab, sobald er sich geändert hat.
 *
 * Vorher wurde der Abgleich übersprungen, sobald irgendeine Blueprint-Frage in
 * der Datenbank stand. Damit erreichten Änderungen am Katalog — neue Lösungen,
 * geänderte Antworttexte, die Zuordnung von Antworten zu Lösungen — eine
 * bestehende Installation nie. Jetzt entscheidet ein Fingerabdruck des
 * Katalogs: ist er unverändert, passiert nichts; sonst läuft der Abgleich.
 * Alle Schreibvorgänge sind Upserts, ein erneuter Lauf ist also folgenlos.
 */
export async function seedBlueprintIfEmpty(): Promise<void> {
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ questions: QUESTIONS, solutions: SOLUTIONS }))
    .digest("hex");

  const stored = await db.systemSetting.findUnique({
    where: { key: CATALOG_FINGERPRINT_KEY },
  });

  if (stored?.value === fingerprint) {
    console.log("[blueprint] Katalog unverändert — Abgleich übersprungen");
    return;
  }

  console.log("[blueprint] Katalog hat sich geändert — gleiche ab...");
  const result = await seedBlueprintCatalog();

  await db.systemSetting.upsert({
    where: { key: CATALOG_FINGERPRINT_KEY },
    create: {
      key: CATALOG_FINGERPRINT_KEY,
      value: fingerprint,
      label: "Blueprint-Katalog: Stand des letzten Abgleichs",
    },
    update: { value: fingerprint },
  });

  console.log(
    `[blueprint] Abgleich fertig: ${result.questions} Fragen, ${result.options} Optionen, ${result.solutions} Lösungen`
  );
}
