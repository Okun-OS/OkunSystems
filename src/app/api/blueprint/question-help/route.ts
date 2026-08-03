import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODULE_LABELS: Record<number, string> = {
  1: "Unternehmensprofil",
  2: "Prozessqualität",
  3: "Vertriebsstruktur",
  4: "Führungsstruktur",
  5: "Automatisierungsgrad",
  6: "Unternehmensstruktur",
  7: "Kommunikation",
  8: "Personalmanagement",
};

/**
 * POST /api/blueprint/question-help
 *
 * Client-accessible. Returns an AI-generated explanation for a Blueprint question.
 * Supports multi-turn conversation via conversationHistory.
 *
 * Body: {
 *   questionId: string,
 *   sessionId: string,
 *   userMessage?: string,
 *   conversationHistory?: Array<{ role: "user" | "assistant", content: string }>
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    questionId?: string;
    sessionId?: string;
    userMessage?: string;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  const { questionId, sessionId, userMessage, conversationHistory = [] } = body;

  if (!questionId || !sessionId) {
    return NextResponse.json({ error: "Missing questionId or sessionId" }, { status: 400 });
  }

  // Verify the session belongs to the requesting user's company
  const userId = (session.user as any).id as string;
  const role = (session.user as any).role as string;

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true },
  });

  if (!analysisSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Non-admins can only access their own company's sessions
  if (role !== "ADMIN") {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (user?.companyId !== analysisSession.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Load question with answer options
  const question = await db.questionTemplate.findUnique({
    where: { id: questionId },
    select: {
      questionDe: true,
      externalId: true,
      moduleNumber: true,
      intent: true,
      questionType: true,
      answerOptions: {
        where: { isActive: true },
        select: { textDe: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const moduleLabel = question.moduleNumber ? (MODULE_LABELS[question.moduleNumber] ?? `Modul ${question.moduleNumber}`) : "";

  const optionsList = question.answerOptions.length > 0
    ? question.answerOptions.map((o: { textDe: string; order: number }, i: number) => `  ${i + 1}. ${o.textDe}`).join("\n")
    : null;

  const systemPrompt = `Du bist ein freundlicher Unternehmensberater, der KMU-Inhaber beim Ausfüllen des OKUN Blueprint™-Fragebogens unterstützt.

Der OKUN Blueprint™ ist eine strukturierte Unternehmensanalyse, die 8 Bereiche bewertet: Unternehmensprofil, Prozessqualität, Vertriebsstruktur, Führungsstruktur, Automatisierungsgrad, Unternehmensstruktur, Kommunikation und Personalmanagement.

Du hilfst dem Nutzer, die aktuelle Frage zu verstehen und die für sein Unternehmen passende Antwort zu finden.

**Aktuelle Frage:**
Bereich: ${moduleLabel}
Frage-ID: ${question.externalId}
Fragetext: "${question.questionDe}"
${optionsList ? `\nAntwortoptionen:\n${optionsList}` : "\n(Freitextfrage — der Nutzer gibt seine Antwort selbst ein.)"}

**Deine Aufgaben:**
- Erkläre die Frage verständlich und praxisnah
- Hilf dem Nutzer einzuordnen, welche Option zu seiner Situation passt
- Antworte präzise und auf Deutsch
- Bleib beim Thema der aktuellen Frage
- Halte deine Antworten kurz (2–4 Absätze maximal)
- Es gibt kein Richtig oder Falsch — der Nutzer soll seine tatsächliche Situation beschreiben`;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...conversationHistory,
  ];

  if (!userMessage && conversationHistory.length === 0) {
    // Initial load — generate explanation automatically
    messages.push({
      role: "user",
      content: "Bitte erkläre mir diese Frage und hilf mir zu verstehen, wie ich sie beantworten soll.",
    });
  } else if (userMessage) {
    messages.push({ role: "user", content: userMessage });
  } else {
    return NextResponse.json({ error: "Nothing to respond to" }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ explanation: text });
  } catch (err) {
    console.error("[question-help] Claude error:", err);
    return NextResponse.json({ error: "AI-Anfrage fehlgeschlagen" }, { status: 500 });
  }
}
