"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSuggestedChaptersForSession, suggestAssignment } from "@/lib/learning/actions";

// ─── Start or resume Blueprint 2.0 session ────────────────────────────────────

export async function startBlueprintSession(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  // Return existing active Blueprint 2.0 session
  const existing = await db.analysisSession.findFirst({
    where: {
      companyId,
      blueprintVersion: "2.0",
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    redirect(`/blueprint/${existing.id}`);
  }

  // Create new session
  const created = await db.analysisSession.create({
    data: {
      companyId,
      status: "ACTIVE",
      phase: "BLUEPRINT_M1",
      blueprintVersion: "2.0",
      currentArea: "unternehmensprofil",
    },
    select: { id: true },
  });

  redirect(`/blueprint/${created.id}`);
}

// ─── Submit a single answer ───────────────────────────────────────────────────

export async function submitBlueprintAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionIds: string[]
): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  // Verify session ownership
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true },
  });
  if (analysisSession?.companyId !== user.companyId) {
    throw new Error("Unauthorized");
  }
  if (analysisSession.status === "COMPLETED") {
    redirect(`/blueprint/${sessionId}/abgeschlossen`);
  }

  // Load the question and selected options to compute score
  const [question, selectedOptions] = await Promise.all([
    db.questionTemplate.findUnique({
      where: { id: questionId },
      select: { questionType: true, activationConds: true },
    }),
    db.answerOption.findMany({
      where: { id: { in: selectedOptionIds } },
      select: { id: true, points: true, signalCategory: true, signalValue: true },
    }),
  ]);

  // Compute score (type B only, not gating)
  let computedScore: number | null = null;
  if (question?.questionType === "B") {
    const conds: Array<{ type: string; mode?: string; cap?: number }> = (() => {
      try { return JSON.parse(question.activationConds || "[]"); }
      catch { return []; }
    })();
    const mode = conds.find((c) => c.type === "SCORE_MODE")?.mode ?? "SINGLE";
    const cap = conds.find((c) => c.type === "SCORE_CAP")?.cap ?? null;

    let raw: number;
    if (mode === "MULTI_SELECT") {
      raw = selectedOptions.reduce((s: number, o: { points: number }) => s + o.points, 0);
    } else if (mode === "MAX") {
      raw = Math.max(...selectedOptions.map((o: { points: number }) => o.points), 0);
    } else {
      raw = selectedOptions[0]?.points ?? 0;
    }
    computedScore = cap !== null ? Math.min(raw, cap) : raw;
  }

  // Aggregate signals
  const signals: Record<string, number> = {};
  for (const opt of selectedOptions) {
    if (opt.signalCategory && opt.signalValue > 0) {
      signals[opt.signalCategory] = (signals[opt.signalCategory] ?? 0) + opt.signalValue;
    }
  }

  // Upsert session answer
  await db.sessionAnswer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      selectedOptionIds: JSON.stringify(selectedOptionIds),
      computedScore,
      computedSignals: JSON.stringify(signals),
      status: "ANSWERED",
    },
    update: {
      selectedOptionIds: JSON.stringify(selectedOptionIds),
      computedScore,
      computedSignals: JSON.stringify(signals),
      status: "ANSWERED",
      answeredAt: new Date(),
    },
  });

  revalidatePath(`/blueprint/${sessionId}`);
}

// ─── Mark session as completed ────────────────────────────────────────────────

export async function completeBlueprintSession(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  await db.analysisSession.updateMany({
    where: { id: sessionId, companyId: user.companyId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  try {
    const chapterIds = await getSuggestedChaptersForSession(sessionId, user.companyId);
    await Promise.allSettled(
      chapterIds.map((chapterId) =>
        suggestAssignment({ companyId: user.companyId!, chapterId, assignedById: userId, sessionId })
      )
    );
  } catch {
    // Auto-suggest failures must not prevent session completion
  }

  redirect(`/blueprint/${sessionId}/abgeschlossen`);
}
