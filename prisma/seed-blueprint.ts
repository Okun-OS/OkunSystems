// @ts-nocheck
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { QUESTIONS, SOLUTIONS } from "../src/lib/blueprint/catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── MAIN SEED FUNCTION ──────────────────────────────────────────────────────

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl
    ? dbUrl.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@")
    : "(DATABASE_URL not set)";
  console.log(`🌱 Starte Blueprint 2.0 Seed...`);
  console.log(`   DATABASE_URL: ${maskedUrl}`);
  console.log(`   Fragen im Katalog: ${QUESTIONS.length}`);
  console.log(`   Lösungen im Katalog: ${SOLUTIONS.length}\n`);

  if (!dbUrl) {
    throw new Error("DATABASE_URL ist nicht gesetzt");
  }

  await prisma.$connect();
  console.log("✅ Datenbankverbindung hergestellt\n");

  // ── Schritt 1: Fragen upserten und ID-Map aufbauen ───────────────────────
  const questionIdMap = new Map<string, string>();
  let questionErrors = 0;

  console.log(`📋 Upserte ${QUESTIONS.length} Fragen...`);
  for (const q of QUESTIONS) {
    const { options, ...qData } = q;
    try {
      const record = await prisma.questionTemplate.upsert({
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
    } catch (e) {
      console.error(`  ✗ Fehler bei Frage ${q.externalId}:`, e instanceof Error ? e.message : e);
      questionErrors++;
    }
  }

  if (questionErrors > 0) {
    throw new Error(`${questionErrors} von ${QUESTIONS.length} Fragen fehlgeschlagen`);
  }
  console.log(`✅ ${QUESTIONS.length} Fragen gespeichert\n`);

  // ── DB-Verifikation nach Schritt 1 ────────────────────────────────────────
  const blueprintCount = await prisma.questionTemplate.count({
    where: { phase: { startsWith: "BLUEPRINT_" } },
  });
  console.log(`🔍 DB-Check: ${blueprintCount} Blueprint-Fragen in DB\n`);
  if (blueprintCount === 0) {
    throw new Error("DB-Verifikation fehlgeschlagen: 0 Blueprint-Fragen nach Upsert");
  }

  // ── Schritt 2: Antwortoptionen upserten ──────────────────────────────────
  let totalOptions = 0;
  let optionErrors = 0;
  for (const q of QUESTIONS) {
    if (!q.options.length) continue;
    const questionId = questionIdMap.get(q.externalId)!;
    for (const opt of q.options) {
      try {
        await prisma.answerOption.upsert({
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
      } catch (e) {
        console.error(`  ✗ Fehler bei Option ${opt.externalId}:`, e instanceof Error ? e.message : e);
        optionErrors++;
      }
    }
  }

  if (optionErrors > 0) {
    throw new Error(`${optionErrors} Antwortoptionen fehlgeschlagen`);
  }
  console.log(`✅ ${totalOptions} Antwortoptionen gespeichert\n`);

  // ── Schritt 3: SolutionLibrary upserten ──────────────────────────────────
  console.log(`📚 Upserte ${SOLUTIONS.length} Lösungen in SolutionLibrary...`);
  let solErrors = 0;
  for (const sol of SOLUTIONS) {
    try {
      await prisma.solutionLibrary.upsert({
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
    } catch (e) {
      console.error(`  ✗ Fehler bei Lösung ${sol.externalId}:`, e instanceof Error ? e.message : e);
      solErrors++;
    }
  }

  if (solErrors > 0) {
    throw new Error(`${solErrors} Lösungen fehlgeschlagen`);
  }
  console.log(`✅ ${SOLUTIONS.length} Lösungen gespeichert\n`);

  // ── Zusammenfassung ───────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("✅ Blueprint 2.0 Seed abgeschlossen");
  console.log(`   Fragen:           ${QUESTIONS.length}`);
  console.log(`   Antwortoptionen:  ${totalOptions}`);
  console.log(`   Lösungen:         ${SOLUTIONS.length}`);
  console.log("═══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error("❌ Blueprint Seed fehlgeschlagen:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
