import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16, 17];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const date = new Date(dateParam);
  if (isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return NextResponse.json({ slots: [] });
  }

  // Check already-booked slots on this day
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedAppointments = await db.appointment.findMany({
    where: {
      startTime: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: { startTime: true },
  });

  const bookedHours = new Set(
    bookedAppointments.map((a) => new Date(a.startTime).getHours())
  );

  const slots = SLOT_HOURS.filter((h) => !bookedHours.has(h)).map((h) => {
    const slotTime = new Date(date);
    slotTime.setHours(h, 0, 0, 0);
    return {
      time: slotTime.toISOString(),
      label: `${h.toString().padStart(2, "0")}:00 Uhr`,
    };
  });

  return NextResponse.json({ slots });
}
