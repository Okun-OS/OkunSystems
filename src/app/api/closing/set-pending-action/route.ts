import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  let body: { closingSessionId?: string; action?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { closingSessionId, action } = body;
  if (!closingSessionId) {
    return NextResponse.json({ error: "closingSessionId fehlt" }, { status: 400 });
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { closerId: true },
  });
  if (!closingSession) return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  await db.closingSession.update({
    where: { id: closingSessionId },
    data: { clientPendingAction: action ?? null },
  });

  return NextResponse.json({ ok: true });
}
