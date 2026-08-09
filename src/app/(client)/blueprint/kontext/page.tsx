import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ContextChatClient } from "./ContextChatClient";

export default async function BlueprintKontextPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  // If Blueprint is already running or done, skip context
  const activeBP = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: { in: ["ACTIVE", "PAUSED"] } },
    select: { id: true },
  });
  if (activeBP) redirect(`/blueprint/${activeBP.id}`);

  const completedBP = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: "COMPLETED" },
    select: { id: true, _count: { select: { sessionAnswers: true } } },
  });
  if (completedBP && completedBP._count.sessionAnswers > 0) {
    redirect(`/blueprint/${completedBP.id}/abgeschlossen`);
  }

  // Get or create active context session
  let ctxSession = await db.companyContextSession.findFirst({
    where: { companyId, status: "ACTIVE" },
    include: { entries: { orderBy: { order: "asc" } } },
    orderBy: { startedAt: "desc" },
  });

  if (!ctxSession) {
    ctxSession = await db.companyContextSession.create({
      data: { companyId, status: "ACTIVE" },
      include: { entries: true },
    });
  }

  const existingAnswers: Record<number, string> = {};
  type CtxEntry = { role: string; content: string; order: number };
  const userEntries = (ctxSession.entries as CtxEntry[]).filter((e) => e.role === "user");
  for (const entry of userEntries) {
    const order = Math.floor(entry.order / 2);
    existingAnswers[order] = entry.content;
  }

  return (
    <ContextChatClient
      contextSessionId={ctxSession.id}
      existingAnswers={existingAnswers}
    />
  );
}
