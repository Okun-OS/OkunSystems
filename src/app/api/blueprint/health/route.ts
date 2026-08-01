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

    return NextResponse.json({
      blueprintQuestions: blueprintCount,
      totalQuestions: allCount,
      sampleRows: sample,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
