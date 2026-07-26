import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ADVISOR_INTRO_MESSAGE } from "@/lib/engines/advisor-prompt";
import AdvisorChat from "./AdvisorChat";

export default async function AnalysePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  // If already completed, redirect to results
  const completedSession = await db.analysisSession.findFirst({
    where: { companyId, status: "COMPLETED" },
    select: { id: true },
  });
  if (completedSession) redirect("/analyse/ergebnis");

  // Find or create active analysis session
  let analysisSession = await db.analysisSession.findFirst({
    where: { companyId, status: { in: ["ACTIVE", "PAUSED"] } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!analysisSession) {
    analysisSession = await db.analysisSession.create({
      data: {
        companyId,
        status: "ACTIVE",
        phase: "INTRO",
        currentArea: "unternehmensstruktur",
        messages: {
          create: {
            role: "assistant",
            content: ADVISOR_INTRO_MESSAGE.message,
            internalNotes: JSON.stringify(ADVISOR_INTRO_MESSAGE.internalNotes),
            memoryUpdates: JSON.stringify(ADVISOR_INTRO_MESSAGE.memoryUpdates),
          },
        },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  const initialSession = {
    id: analysisSession.id,
    phase: analysisSession.phase,
    currentArea: analysisSession.currentArea,
    status: analysisSession.status,
    totalMessages: analysisSession.totalMessages,
    questionsAsked: analysisSession.questionsAsked ?? 0,
    messages: analysisSession.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  return <AdvisorChat initialSession={initialSession} />;
}
