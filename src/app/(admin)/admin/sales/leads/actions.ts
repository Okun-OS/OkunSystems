"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendClosingInvitationEmail } from "@/lib/email";
import { validateCompanyMasterData } from "@/lib/closing/master-data";
import { hashToken, generateToken, CLOSING_TOKEN_TTL_HOURS, appUrl } from "@/lib/closing/token";

export async function createLead(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Firmenname ist Pflichtfeld" };

  const contractValueEur = parseFloat(formData.get("contractValue") as string);
  const contractValueCents =
    !isNaN(contractValueEur) && contractValueEur > 0
      ? Math.round(contractValueEur * 100)
      : null;

  const company = await db.company.create({
    data: {
      name,
      industry: (formData.get("industry") as string)?.trim() || null,
      contactPerson: (formData.get("contactPerson") as string)?.trim() || null,
      website: (formData.get("website") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      leadStatus: "lead",
      leadSource: (formData.get("leadSource") as string)?.trim() || null,
      contractPackage: (formData.get("contractPackage") as string)?.trim() || null,
      contractValue: contractValueCents,
      closingNotes: (formData.get("closingNotes") as string)?.trim() || null,
      assignedCloserId:
        userRecord.role === "CLOSER" ? userId : null,
      status: "ONBOARDING",
    },
  });

  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
  return { id: company.id };
}

export async function updateLeadStatus(
  companyId: string,
  newStatus: string,
  reason?: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const MANUAL_STATUSES = ["lost", "cancelled", "verloren", "storniert", "abgesagt"];
  if (MANUAL_STATUSES.includes(newStatus) && !reason?.trim()) {
    return { error: "Grund ist Pflichtfeld bei diesem Status" };
  }

  await db.company.update({
    where: { id: companyId },
    data: { leadStatus: newStatus },
  });

  revalidatePath(`/admin/sales/leads/${companyId}`);
  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
  return { ok: true };
}

export async function updateLeadDetails(companyId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const contractValueEur = parseFloat(formData.get("contractValue") as string);
  const contractValueCents =
    !isNaN(contractValueEur) && contractValueEur > 0
      ? Math.round(contractValueEur * 100)
      : null;

  const assignedCloserId =
    (formData.get("assignedCloserId") as string)?.trim() || null;

  await db.company.update({
    where: { id: companyId },
    data: {
      industry: (formData.get("industry") as string)?.trim() || null,
      contactPerson: (formData.get("contactPerson") as string)?.trim() || null,
      website: (formData.get("website") as string)?.trim() || null,
      phone: (formData.get("phone") as string)?.trim() || null,
      leadSource: (formData.get("leadSource") as string)?.trim() || null,
      contractPackage: (formData.get("contractPackage") as string)?.trim() || null,
      contractValue: contractValueCents,
      paymentMethod: (formData.get("paymentMethod") as string)?.trim() || null,
      closingNotes: (formData.get("closingNotes") as string)?.trim() || null,
      assignedCloserId: assignedCloserId || null,
    },
  });

  revalidatePath(`/admin/sales/leads/${companyId}`);
  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
  return { ok: true };
}

export async function createClosingSession(
  companyId: string,
  data: {
    scheduledAt: string;
    durationMinutes: number;
    clientEmail: string;
    clientName: string;
  }
) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) return { error: "Lead nicht gefunden" };
  if (userRecord.role === "CLOSER" && company.assignedCloserId !== userId) {
    return { error: "Keine Berechtigung" };
  }

  // Ohne vollständige Vertragsstammdaten wird kein Closing Meeting angelegt.
  const validation = await validateCompanyMasterData(company);
  if (!validation.complete) {
    return {
      error: `Für den Vertragsabschluss fehlen noch folgende Angaben: ${validation.missing
        .map((m) => m.label)
        .join(", ")}`,
      missing: validation.missing,
    };
  }

  const scheduledAt = new Date(data.scheduledAt);
  if (isNaN(scheduledAt.getTime())) return { error: "Ungültiges Datum" };

  const endTime = new Date(scheduledAt.getTime() + data.durationMinutes * 60 * 1000);

  const token = generateToken();
  const tokenHash = hashToken(token);
  const tokenExpiresAt = new Date(Date.now() + CLOSING_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  const closerId = company.assignedCloserId ?? userId;

  const appointment = await db.appointment.create({
    data: {
      title: `Closing-Gespräch · ${company.name}`,
      type: "CLOSING_CALL",
      startTime: scheduledAt,
      endTime,
      bookedByName: data.clientName,
      bookedByEmail: data.clientEmail,
      companyId,
    },
  });

  // Auto-create Daily.co video room
  const dailyApiKey = process.env.DAILY_API_KEY;
  if (dailyApiKey) {
    try {
      const roomName = `closing-${appointment.id.slice(-8)}`;
      const exp = Math.floor(endTime.getTime() / 1000) + 7200;
      const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${dailyApiKey}`,
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
      if (dailyRes.ok) {
        const room = (await dailyRes.json()) as { url?: string };
        if (room.url) {
          await db.appointment.update({
            where: { id: appointment.id },
            data: { meetingUrl: room.url },
          });
        }
      } else {
        console.warn("[createClosingSession] Daily.co room creation failed:", await dailyRes.text());
      }
    } catch (e) {
      console.error("[createClosingSession] Daily.co error:", e);
    }
  }

  const closingSession = await db.closingSession.create({
    data: {
      clientTokenHash: tokenHash,
      tokenExpiresAt,
      tokenIssuedAt: new Date(),
      appointmentId: appointment.id,
      companyId,
      closerId,
      status: "closing_scheduled",
    },
  });

  await db.company.update({
    where: { id: companyId },
    data: { leadStatus: "closing_scheduled" },
  });

  const closingUrl = `${appUrl()}/closing/${token}`;

  const closer = await db.user.findUnique({ where: { id: closerId }, select: { name: true } });

  await sendClosingInvitationEmail({
    toEmail: data.clientEmail,
    toName: data.clientName,
    companyName: company.name,
    closingUrl,
    scheduledAt,
    closerName: closer?.name ?? "Ihr Berater",
  });

  revalidatePath(`/admin/sales/leads/${companyId}`);
  revalidatePath("/admin/sales");
  revalidatePath("/admin/sales/leads");
  return { sessionId: closingSession.id, token, closingUrl };
}

export async function addLeadNote(companyId: string, content: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }
  if (!content.trim()) return { error: "Notiz darf nicht leer sein" };

  await db.note.create({
    data: { content: content.trim(), companyId, authorId: userId, isInternal: true },
  });

  revalidatePath(`/admin/sales/leads/${companyId}`);
  return { ok: true };
}
