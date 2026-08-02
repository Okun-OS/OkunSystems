import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return NextResponse.json({ error: "appointmentId fehlt" }, { status: 400 });
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Daily.co nicht konfiguriert (DAILY_API_KEY fehlt)" }, { status: 503 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, startTime: true, endTime: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Termin nicht gefunden" }, { status: 404 });
    }

    const roomName = `strategiegespraech-${appointmentId.slice(-8)}`;
    const exp = Math.floor(new Date(appointment.endTime).getTime() / 1000) + 3600;

    const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!dailyRes.ok) {
      const err = await dailyRes.text();
      console.error("Daily.co error:", err);
      return NextResponse.json({ error: "Daily.co Raum konnte nicht erstellt werden" }, { status: 502 });
    }

    const room = await dailyRes.json();
    const meetingUrl = room.url as string;

    await db.appointment.update({
      where: { id: appointmentId },
      data: { meetingUrl },
    });

    return NextResponse.json({ meetingUrl });
  } catch (error) {
    console.error("create-room error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
