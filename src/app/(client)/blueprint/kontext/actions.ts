"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Start or resume a context session ────────────────────────────────────────

export async function startContextSession(): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  // If Blueprint session already active, skip context
  const activeBP = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (activeBP) redirect(`/blueprint/${activeBP.id}`);

  // If Blueprint already completed
  const completedBP = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: "COMPLETED" },
    select: { id: true, _count: { select: { sessionAnswers: true } } },
  });
  if (completedBP && completedBP._count.sessionAnswers > 0) {
    redirect(`/blueprint/${completedBP.id}/abgeschlossen`);
  }

  // Resume active context session
  const activeCtx = await db.companyContextSession.findFirst({
    where: { companyId, status: "ACTIVE" },
    select: { id: true },
  });
  if (activeCtx) redirect("/blueprint/kontext");

  // If context already completed, create Blueprint session directly
  const completedCtx = await db.companyContextSession.findFirst({
    where: { companyId, status: "COMPLETED" },
    select: { id: true },
    orderBy: { completedAt: "desc" },
  });
  if (completedCtx) {
    await _createBlueprintSession(companyId, completedCtx.id);
  }

  // Create new context session
  await db.companyContextSession.create({
    data: { companyId, status: "ACTIVE" },
  });

  await db.company.updateMany({
    where: { id: companyId, projectPhase: "onboarding" },
    data: { projectPhase: "blueprint" },
  });

  redirect("/blueprint/kontext");
}

// ── Save a single user answer ─────────────────────────────────────────────────

export async function saveContextAnswer(
  contextSessionId: string,
  questionText: string,
  answer: string,
  order: number
): Promise<{ ok: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) return { error: "Kein Unternehmen" };

  const ctx = await db.companyContextSession.findUnique({
    where: { id: contextSessionId },
    select: { companyId: true, status: true },
  });
  if (!ctx || ctx.companyId !== user.companyId) return { error: "Nicht gefunden" };
  if (ctx.status !== "ACTIVE") return { error: "Session bereits abgeschlossen" };

  // Remove any existing entry at this order (re-answer support)
  await db.companyContextEntry.deleteMany({
    where: { sessionId: contextSessionId, order },
  });

  // Save assistant question
  await db.companyContextEntry.create({
    data: { sessionId: contextSessionId, role: "assistant", content: questionText, order: order * 2 },
  });

  // Save user answer
  await db.companyContextEntry.create({
    data: { sessionId: contextSessionId, role: "user", content: answer.trim(), order: order * 2 + 1 },
  });

  return { ok: true };
}

// ── Complete the context session and launch the Blueprint ─────────────────────

export async function completeContextSession(contextSessionId: string): Promise<void> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const ctx = await db.companyContextSession.findUnique({
    where: { id: contextSessionId },
    include: { entries: { orderBy: { order: "asc" } } },
  });
  if (!ctx || ctx.companyId !== user.companyId) redirect("/blueprint");

  type Entry = { role: string; content: string };
  // Generate AI summary for report use
  const entries = ctx.entries as Entry[];
  const qaPairs = entries.filter((e) => e.role === "user").map((e) => e.content).join("\n\n");
  let summary: string | null = null;
  if (qaPairs.trim()) {
    try {
      const entryPairs = entries
        .reduce<Array<{ q: string; a: string }>>((acc, e, i, arr) => {
          if (e.role === "assistant") {
            const next = arr[i + 1];
            if (next?.role === "user") acc.push({ q: e.content, a: next.content });
          }
          return acc;
        }, [])
        .map((p) => `F: ${p.q}\nA: ${p.a}`)
        .join("\n\n");

      const res = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Fasse die folgenden Antworten aus einem Unternehmenskontext-Gespräch in 3-5 gut formulierten Sätzen zusammen. Schreibe in der dritten Person über das Unternehmen ("Das Unternehmen...", "Der Betrieb..."). Keine Aufzählungen, nur Fließtext. Beziehe alle relevanten Informationen ein: Branche, Größe, Digitalisierungsstand, Herausforderungen, Motivation, Ziele.\n\n${entryPairs}`,
          },
        ],
      });
      summary = res.content[0].type === "text" ? res.content[0].text.trim() : null;
    } catch (e) {
      console.error("[completeContextSession] Summary generation failed:", e);
    }
  }

  await db.companyContextSession.update({
    where: { id: contextSessionId },
    data: { status: "COMPLETED", completedAt: new Date(), summary },
  });

  await _createBlueprintSession(user.companyId, contextSessionId);
}

// ── Internal: create Blueprint AnalysisSession ────────────────────────────────

async function _createBlueprintSession(companyId: string, contextSessionId: string): Promise<void> {
  const existing = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (existing) {
    await db.companyContextSession.updateMany({
      where: { id: contextSessionId },
      data: { analysisSessionId: existing.id },
    });
    redirect(`/blueprint/${existing.id}`);
  }

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

  await db.companyContextSession.update({
    where: { id: contextSessionId },
    data: { analysisSessionId: created.id },
  });

  revalidatePath("/blueprint");
  redirect(`/blueprint/${created.id}`);
}
