import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { OKUN_ADVISOR_SYSTEM_PROMPT } from "@/lib/engines/advisor-prompt";
import { persistMemoryUpdates } from "@/lib/engines/memory-engine";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  // Verify session belongs to company
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 40 } },
  });

  if (!analysisSession || analysisSession.companyId !== companyId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (analysisSession.status === "COMPLETED") {
    return NextResponse.json({ error: "Session completed" }, { status: 400 });
  }

  // Save user message
  await db.conversationMessage.create({
    data: { sessionId, role: "user", content: message },
  });

  // Build message history for Claude
  const history = analysisSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.role === "assistant"
      ? (() => {
          // For assistant messages, extract only the visible message part
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

  // Add context about the company
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { name: true, industry: true },
  });

  const systemPromptWithContext = `${OKUN_ADVISOR_SYSTEM_PROMPT}

AKTUELLER KONTEXT:
- Unternehmensname: ${company?.name ?? "Unbekannt"}
- Branche: ${company?.industry ?? "Unbekannt"}
- Gesprächsphase: ${analysisSession.phase}
- Analysierter Bereich: ${analysisSession.currentArea ?? "Noch nicht begonnen"}
- Abgeschlossene Bereiche: ${analysisSession.completedAreas}
- Nachrichten bisher: ${analysisSession.totalMessages}`;

  let responseContent = "";
  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system: systemPromptWithContext,
      messages: history,
    });
    responseContent = response.content[0].type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("Anthropic error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }

  // Parse the JSON response from the advisor
  let parsed: {
    message: string;
    internalNotes?: {
      hypotheses?: string[];
      detectedSignals?: string[];
      phase?: string;
      currentArea?: string;
      completedAreas?: string[];
      analysisComplete?: boolean;
    };
    memoryUpdates?: {
      processes?: unknown[];
      detectedProblems?: unknown[];
      opportunities?: unknown[];
      companyProfile?: Record<string, string>;
      roles?: string[];
      systems?: string[];
      challenges?: string[];
    };
  };

  try {
    // Extract JSON from response (handle cases where model adds text before/after)
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    // Fallback: treat entire response as message
    parsed = {
      message: responseContent,
      internalNotes: { phase: analysisSession.phase, currentArea: analysisSession.currentArea ?? undefined },
      memoryUpdates: {},
    };
  }

  const visibleMessage = parsed.message || responseContent;
  const internalNotes = parsed.internalNotes ?? {};
  const memoryUpdates = parsed.memoryUpdates ?? {};

  // Save assistant message
  await db.conversationMessage.create({
    data: {
      sessionId,
      role: "assistant",
      content: visibleMessage,
      internalNotes: JSON.stringify(internalNotes),
      memoryUpdates: JSON.stringify(memoryUpdates),
    },
  });

  // Persist structured memory updates
  await persistMemoryUpdates(sessionId, companyId, memoryUpdates as Parameters<typeof persistMemoryUpdates>[2]);

  // Update session state
  const updateData: Record<string, unknown> = {
    totalMessages: { increment: 2 },
    updatedAt: new Date(),
  };
  if (internalNotes.phase) updateData.phase = internalNotes.phase;
  if (internalNotes.currentArea) updateData.currentArea = internalNotes.currentArea;
  if (internalNotes.completedAreas) {
    updateData.completedAreas = JSON.stringify(internalNotes.completedAreas);
  }
  if (internalNotes.hypotheses) {
    updateData.hypotheses = JSON.stringify(internalNotes.hypotheses);
  }
  if (internalNotes.analysisComplete) {
    updateData.status = "COMPLETED";
    updateData.completedAt = new Date();
  }

  await db.analysisSession.update({ where: { id: sessionId }, data: updateData as never });

  return NextResponse.json({
    message: visibleMessage,
    phase: internalNotes.phase ?? analysisSession.phase,
    currentArea: internalNotes.currentArea ?? analysisSession.currentArea,
    analysisComplete: internalNotes.analysisComplete ?? false,
  });
}
