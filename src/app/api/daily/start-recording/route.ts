import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const userRecord = await db.user.findUnique({ where: { id: userId } });
    if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const { closingSessionId } = (await req.json()) as { closingSessionId: string };
    if (!closingSessionId) return NextResponse.json({ error: "closingSessionId fehlt" }, { status: 400 });

    const closingSession = await db.closingSession.findUnique({
      where: { id: closingSessionId },
      include: { appointment: { select: { meetingUrl: true } } },
    });
    if (!closingSession) return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });
    if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
      return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    }

    const apiKey = process.env.DAILY_API_KEY;
    let dailyRecordingId: string | null = null;

    if (apiKey && closingSession.appointment?.meetingUrl) {
      const roomName = closingSession.appointment.meetingUrl.split("/").pop();
      if (roomName) {
        const dailyRes = await fetch(`https://api.daily.co/v1/rooms/${roomName}/recordings`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (dailyRes.ok) {
          const data = (await dailyRes.json()) as { id?: string };
          dailyRecordingId = data.id ?? null;
        } else {
          const err = await dailyRes.text();
          console.warn("[start-recording] Daily.co error:", err);
        }
      }
    }

    await db.closingSession.update({
      where: { id: closingSessionId },
      data: {
        recordingStatus: "recording",
        dailyRecordingId: dailyRecordingId ?? undefined,
      },
    });

    return NextResponse.json({ ok: true, recordingStatus: "recording", dailyRecordingId });
  } catch (error) {
    console.error("start-recording error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
