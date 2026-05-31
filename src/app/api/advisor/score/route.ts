import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { calculateOkunScore } from "@/lib/engines/scoring-engine";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

  const analysisSession = await db.analysisSession.findUnique({ where: { id: sessionId } });
  if (!analysisSession || analysisSession.companyId !== user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await calculateOkunScore(sessionId, user.companyId);
  return NextResponse.json(result);
}
