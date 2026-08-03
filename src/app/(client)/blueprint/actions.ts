"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSuggestedChaptersForSession, suggestAssignment } from "@/lib/learning/actions";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { generateReportTexts } from "@/lib/blueprint/report-text-engine";
import { renderReportHtml } from "@/lib/blueprint/report-html";
import { renderHtmlToPdf } from "@/lib/blueprint/pdf-generator";
import { uploadPdfToR2, buildReportKey } from "@/lib/blueprint/storage";

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

  // Advance project phase to blueprint
  await db.company.updateMany({
    where: { id: companyId, projectPhase: "onboarding" },
    data: { projectPhase: "blueprint" },
  });

  redirect(`/blueprint/${created.id}`);
}

// ─── Submit a single answer ───────────────────────────────────────────────────

export async function submitBlueprintAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionIds: string[],
  freeText?: string
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
      freeText: freeText ?? null,
      computedScore,
      computedSignals: JSON.stringify(signals),
      status: "ANSWERED",
    },
    update: {
      selectedOptionIds: JSON.stringify(selectedOptionIds),
      freeText: freeText ?? null,
      computedScore,
      computedSignals: JSON.stringify(signals),
      status: "ANSWERED",
      answeredAt: new Date(),
    },
  });

  revalidatePath(`/blueprint/${sessionId}`);
}

// ─── Undo the last answered question ─────────────────────────────────────────

export async function undoBlueprintAnswer(sessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true },
  });
  if (analysisSession?.companyId !== user.companyId) throw new Error("Unauthorized");
  if (analysisSession.status === "COMPLETED") redirect(`/blueprint/${sessionId}/abgeschlossen`);

  const lastAnswer = await db.sessionAnswer.findFirst({
    where: { sessionId, status: "ANSWERED" },
    orderBy: { answeredAt: "desc" },
    select: { id: true },
  });

  if (lastAnswer) {
    await db.sessionAnswer.delete({ where: { id: lastAnswer.id } });
  }

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

  // Advance project phase to internal_review
  await db.company.updateMany({
    where: { id: user.companyId!, projectPhase: "blueprint" },
    data: { projectPhase: "internal_review" },
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

  // Auto-generate Blueprint PDF report in background after response is sent
  const capturedCompanyId = user.companyId!;
  const capturedUserId = userId;
  after(async () => {
    try {
      const reportData = await assembleBlueprintReport(sessionId);
      const texts = await generateReportTexts(reportData);
      const html = renderReportHtml(reportData, texts);
      const pdfBuffer = await renderHtmlToPdf(html);
      const key = buildReportKey(sessionId);
      const reportUrl = await uploadPdfToR2(pdfBuffer, key);

      await db.analysisSession.update({
        where: { id: sessionId },
        data: { reportUrl },
      });

      try {
        const existingDoc = await db.document.findFirst({
          where: { r2Key: key, companyId: capturedCompanyId },
        });
        if (existingDoc) {
          await db.document.update({ where: { id: existingDoc.id }, data: { fileUrl: reportUrl } });
        } else {
          await db.document.create({
            data: {
              title: "Blueprint-Bericht",
              category: "BLUEPRINT",
              fileUrl: reportUrl,
              r2Key: key,
              mimeType: "application/pdf",
              visibility: "internal",
              companyId: capturedCompanyId,
              uploadedById: capturedUserId,
            },
          });
        }
      } catch (docErr) {
        console.error("[completeBlueprintSession] Document record failed:", docErr);
      }
    } catch (err) {
      console.error("[completeBlueprintSession] PDF auto-generation failed:", err);
    }
  });

  redirect(`/blueprint/${sessionId}/abgeschlossen`);
}
