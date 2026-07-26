import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  sendAppointmentConfirmation,
  sendAppointmentNotificationToAdmin,
} from "@/lib/email";

const MIN_DAYS_AHEAD = 3;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user?.companyId || !user.company) {
    return NextResponse.json({ error: "No company" }, { status: 400 });
  }

  const { startTime: startTimeStr, message } = await req.json();
  if (!startTimeStr) return NextResponse.json({ error: "Missing startTime" }, { status: 400 });

  const startTime = new Date(startTimeStr);
  if (isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
  }

  // Enforce minimum 3 days ahead
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + MIN_DAYS_AHEAD);
  minDate.setHours(0, 0, 0, 0);
  if (startTime < minDate) {
    return NextResponse.json(
      { error: `Bitte wählen Sie einen Termin mindestens ${MIN_DAYS_AHEAD} Tage im Voraus` },
      { status: 400 }
    );
  }

  // Reject weekends
  const day = startTime.getDay();
  if (day === 0 || day === 6) {
    return NextResponse.json({ error: "Wochenenden sind nicht verfügbar" }, { status: 400 });
  }

  // Check if slot is still available
  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + 60);

  const conflict = await db.appointment.findFirst({
    where: {
      startTime,
      status: { not: "CANCELLED" },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "Dieser Zeitslot ist leider nicht mehr verfügbar" },
      { status: 409 }
    );
  }

  // Find the company's latest completed analysis session
  const analysisSession = await db.analysisSession.findFirst({
    where: { companyId: user.companyId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  const appointment = await db.appointment.create({
    data: {
      title: "Strategiegespräch – OKUN Blueprint™ Auswertung",
      type: "STRATEGY",
      description: message || null,
      startTime,
      endTime,
      status: "SCHEDULED",
      companyId: user.companyId,
      bookedByName: user.name ?? undefined,
      bookedByEmail: user.email ?? undefined,
      analysisSessionId: analysisSession?.id ?? undefined,
      attendees: { connect: [{ id: userId }] },
    },
  });

  // Send confirmation emails (non-blocking)
  const emailName = user.name ?? "Kunde";
  const emailAddress = user.email ?? "";

  sendAppointmentConfirmation({
    toEmail: emailAddress,
    toName: emailName,
    appointmentTitle: appointment.title,
    startTime: appointment.startTime,
    meetingUrl: appointment.meetingUrl,
  }).catch(console.error);

  sendAppointmentNotificationToAdmin({
    clientName: emailName,
    clientEmail: emailAddress,
    appointmentTitle: appointment.title,
    startTime: appointment.startTime,
    companyName: user.company.name,
  }).catch(console.error);

  return NextResponse.json({
    success: true,
    appointment: {
      id: appointment.id,
      title: appointment.title,
      startTime: appointment.startTime.toISOString(),
    },
  });
}
