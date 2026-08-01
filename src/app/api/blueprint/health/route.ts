import { db } from "@/lib/db";
import { NextResponse } from "next/server";

// Temporary diagnostic endpoint — shows DB state for Blueprint 2.0
export async function GET() {
  try {
    const [blueprintCount, allCount, sample] = await Promise.all([
      db.questionTemplate.count({
        where: { phase: { startsWith: "BLUEPRINT_" } },
      }),
      db.questionTemplate.count(),
      db.questionTemplate.findMany({
        where: { phase: { startsWith: "BLUEPRINT_" } },
        select: { externalId: true, phase: true, isActive: true },
        take: 3,
      }),
    ]);

    // Check if Blueprint 2.0 columns exist in the actual DB schema
    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'QuestionTemplate'
        AND column_name IN ('moduleNumber','groupCode','questionType','isGating','activationConds')
      ORDER BY column_name
    `;

    return NextResponse.json({
      blueprintQuestions: blueprintCount,
      totalQuestions: allCount,
      sampleRows: sample,
      blueprint20Columns: columns.map((c) => c.column_name),
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
