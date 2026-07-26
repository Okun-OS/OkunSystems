import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildLibrarySnippets } from "@/lib/engines/advisor-prompt";
import { persistMemoryUpdates } from "@/lib/engines/memory-engine";
import { calculateOkunScore } from "@/lib/engines/scoring-engine";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const META_MARKER = "\n[META]\n";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

  const { message, sessionId } = await req.json();
  if (!message?.trim() || !sessionId) {
    return NextResponse.json({ error: "Missing message or sessionId" }, { status: 400 });
  }

  const companyId = user.companyId;

  // ── Load analysis session ────────────────────────────────────────────────
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 60 },
      progress: { include: { question: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!analysisSession || analysisSession.companyId !== companyId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (analysisSession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session completed" }, { status: 400 });
  }

  // ── Save user message ────────────────────────────────────────────────────
  const savedUserMsg = await db.conversationMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  // ── Load question bank ───────────────────────────────────────────────────
  const allQuestions = await db.questionTemplate.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  const askedQuestionIds = new Set(
    analysisSession.progress.filter((p) => p.askedAt).map((p) => p.questionId)
  );

  // Current question (last asked, not yet fully followed up)
  const lastProgress = analysisSession.progress
    .filter((p) => p.askedAt)
    .sort((a, b) => (b.askedAt?.getTime() ?? 0) - (a.askedAt?.getTime() ?? 0))[0];

  let currentQuestion: (typeof allQuestions[0] & { followUpsUsed: number }) | null = null;
  if (lastProgress && lastProgress.followUpsUsed < lastProgress.question.maxFollowUps) {
    currentQuestion = { ...lastProgress.question, followUpsUsed: lastProgress.followUpsUsed };
  }

  // Next pending required question
  const pendingQuestions = allQuestions.filter((q) => !askedQuestionIds.has(q.id));
  const nextQuestion = pendingQuestions[0] ?? null;
  const pendingUpcoming = pendingQuestions.slice(1, 4);

  // ── Load libraries ────────────────────────────────────────────────────────
  const [processLibrary, problemLibrary, company] = await Promise.all([
    db.processLibraryItem.findMany({ where: { isActive: true } }),
    db.problemLibraryItem.findMany({ where: { isActive: true } }),
    db.company.findUnique({ where: { id: companyId }, select: { name: true, industry: true } }),
  ]);

  const { processSnippet, problemSnippet } = buildLibrarySnippets(
    processLibrary,
    problemLibrary,
    analysisSession.currentArea
  );

  // ── Build conversation history ────────────────────────────────────────────
  const history = analysisSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.role === "assistant"
      ? (() => {
          // Strip [META] section for history — only show visible message
          const metaIdx = m.content.indexOf("\n[META]\n");
          if (metaIdx !== -1) return m.content.slice(0, metaIdx).trim();
          try {
            const parsed = JSON.parse(m.content);
            return parsed.message ?? m.content;
          } catch {
            return m.content;
          }
        })()
      : m.content,
  }));
  history.push({ role: "user", content: message });

  let completedAreas: string[] = [];
  try {
    completedAreas = JSON.parse(analysisSession.completedAreas);
  } catch {}

  // ── Build system prompt ───────────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt({
    phase: analysisSession.phase,
    currentArea: analysisSession.currentArea,
    completedAreas,
    questionsAsked: analysisSession.questionsAsked,
    language: analysisSession.language,
    totalMessages: analysisSession.totalMessages,
    company: { name: company?.name ?? "Unbekannt", industry: company?.industry },
    nextQuestion: nextQuestion
      ? {
          externalId: nextQuestion.externalId,
          phase: nextQuestion.phase,
          area: nextQuestion.area,
          intent: nextQuestion.intent,
          questionDe: nextQuestion.questionDe,
          questionEn: nextQuestion.questionEn,
          maxFollowUps: nextQuestion.maxFollowUps,
        }
      : null,
    currentQuestion: currentQuestion
      ? {
          externalId: currentQuestion.externalId,
          phase: currentQuestion.phase,
          area: currentQuestion.area,
          intent: currentQuestion.intent,
          questionDe: currentQuestion.questionDe,
          questionEn: currentQuestion.questionEn,
          maxFollowUps: currentQuestion.maxFollowUps,
          followUpsUsed: currentQuestion.followUpsUsed,
        }
      : null,
    pendingUpcoming: pendingUpcoming.map((q) => ({
      externalId: q.externalId,
      phase: q.phase,
      area: q.area,
      intent: q.intent,
      questionDe: q.questionDe,
      questionEn: q.questionEn,
      maxFollowUps: q.maxFollowUps,
    })),
    processLibrarySnippet: processSnippet,
    problemLibrarySnippet: problemSnippet,
  });

  // ── Call Claude ───────────────────────────────────────────────────────────
  let responseContent = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: systemPrompt,
      messages: history,
    });
    responseContent = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("[/api/advisor] Anthropic error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  // ── Parse [META] delimiter ────────────────────────────────────────────────
  const metaIdx = responseContent.indexOf(META_MARKER);

  let visibleMessage: string;
  let internalNotes: Record<string, unknown> = {};
  let memoryUpdates: Record<string, unknown> = {};

  if (metaIdx !== -1) {
    visibleMessage = responseContent.slice(0, metaIdx).trim();
    const jsonStr = responseContent.slice(metaIdx + META_MARKER.length).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      internalNotes = parsed.internalNotes ?? {};
      memoryUpdates = parsed.memoryUpdates ?? {};
    } catch {
      console.warn("[/api/advisor] Failed to parse [META] JSON");
    }
  } else {
    // Fallback: try old JSON format
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        visibleMessage = parsed.message ?? responseContent;
        internalNotes = parsed.internalNotes ?? {};
        memoryUpdates = parsed.memoryUpdates ?? {};
      } else {
        visibleMessage = responseContent;
      }
    } catch {
      visibleMessage = responseContent;
    }
  }

  const notes = internalNotes as {
    phase?: string;
    currentArea?: string;
    completedAreas?: string[];
    analysisComplete?: boolean;
    lastQuestion?: string;
    followUpsUsed?: number;
    hypotheses?: string[];
  };

  // ── Update SessionProgress ────────────────────────────────────────────────
  const wasFollowUp = (notes.followUpsUsed ?? 0) > 0 || !notes.lastQuestion;

  if (notes.lastQuestion) {
    // A required question was just asked
    const qt = allQuestions.find((q) => q.externalId === notes.lastQuestion);
    if (qt) {
      await db.sessionProgress.upsert({
        where: { sessionId_questionId: { sessionId, questionId: qt.id } },
        create: { sessionId, questionId: qt.id, askedAt: new Date() },
        update: { askedAt: new Date() },
      });

      // Mark previous question as answered (we moved on)
      if (lastProgress && lastProgress.question.externalId !== notes.lastQuestion) {
        await db.sessionProgress.update({
          where: { id: lastProgress.id },
          data: { answeredAt: new Date() },
        });
      }
    }
  } else if (wasFollowUp && lastProgress) {
    // Increment follow-up counter on current question
    await db.sessionProgress.update({
      where: { id: lastProgress.id },
      data: { followUpsUsed: { increment: 1 } },
    });
  }

  // ── Save assistant message ────────────────────────────────────────────────
  await db.conversationMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: visibleMessage,
      internalNotes: JSON.stringify(internalNotes),
      memoryUpdates: JSON.stringify(memoryUpdates),
    },
  });

  // ── Persist memory updates ────────────────────────────────────────────────
  await persistMemoryUpdates(
    sessionId,
    companyId,
    memoryUpdates as Parameters<typeof persistMemoryUpdates>[2]
  );

  // ── Update session state ──────────────────────────────────────────────────
  const updateData: Record<string, unknown> = {
    totalMessages: { increment: 2 },
    lastActiveAt: new Date(),
  };
  if (notes.phase) updateData.phase = notes.phase;
  if (notes.currentArea) updateData.currentArea = notes.currentArea;
  if (notes.completedAreas) updateData.completedAreas = JSON.stringify(notes.completedAreas);
  if (notes.hypotheses) updateData.hypotheses = JSON.stringify(notes.hypotheses);
  if (notes.lastQuestion) updateData.questionsAsked = { increment: 1 };
  if (notes.analysisComplete) {
    updateData.status = "COMPLETED";
    updateData.completedAt = new Date();
  }

  await db.analysisSession.update({ where: { id: sessionId }, data: updateData as never });

  // Auto-calculate score when analysis completes
  let scoreResult: Awaited<ReturnType<typeof calculateOkunScore>> | null = null;
  if (notes.analysisComplete) {
    try {
      scoreResult = await calculateOkunScore(sessionId, companyId);
    } catch (err) {
      console.error("[/api/advisor] Score calculation failed:", err);
    }
  }

  const updatedQuestionsAsked = notes.lastQuestion
    ? (analysisSession.questionsAsked ?? 0) + 1
    : (analysisSession.questionsAsked ?? 0);

  return NextResponse.json({
    message: visibleMessage,
    phase: notes.phase ?? analysisSession.phase,
    currentArea: notes.currentArea ?? analysisSession.currentArea,
    completedAreas: notes.completedAreas ?? completedAreas,
    questionsAsked: updatedQuestionsAsked,
    analysisComplete: notes.analysisComplete ?? false,
    scoreReady: !!scoreResult,
    score: scoreResult ? { total: scoreResult.total, label: scoreResult.label } : null,
  });
}
