import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { ADVISOR_INTRO_MESSAGE } from "@/lib/engines/advisor-prompt";

// GET /api/advisor/session – get or create the active analysis session for the current client
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id as string;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

  const companyId = user.companyId;

  // Find active or paused session
  let analysisSession = await db.analysisSession.findFirst({
    where: { companyId, status: { in: ["ACTIVE", "PAUSED"] } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!analysisSession) {
    // Create new session with intro message
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

  return NextResponse.json({ session: analysisSession });
}
