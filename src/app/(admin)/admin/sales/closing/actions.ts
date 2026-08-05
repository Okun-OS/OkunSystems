"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

const VALID_SESSION_STATUSES = [
  "closing_scheduled",
  "in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_given",
  "contract_closed",
  "verloren",
];

export async function updateClosingSessionStatus(
  sessionId: string,
  newStatus: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }
  if (!VALID_SESSION_STATUSES.includes(newStatus)) return { error: "Ungültiger Status" };

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    select: { closerId: true, companyId: true },
  });
  if (!closingSession) return { error: "Session nicht gefunden" };
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    return { error: "Keine Berechtigung" };
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "in_progress") updateData.startedAt = new Date();
  if (newStatus === "contract_closed") updateData.closedAt = new Date();

  await db.closingSession.update({ where: { id: sessionId }, data: updateData });
  await db.company.update({
    where: { id: closingSession.companyId },
    data: { leadStatus: newStatus },
  });
  await db.closingEvent.create({
    data: {
      closingSessionId: sessionId,
      companyId: closingSession.companyId,
      eventType: "status_change",
      metadata: JSON.stringify({ newStatus }),
      actorId: userId,
    },
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  revalidatePath(`/admin/sales/leads/${closingSession.companyId}`);
  revalidatePath("/admin/sales");
  return { ok: true };
}

export async function createOfferForSession(
  sessionId: string,
  templateId: string
) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    select: { closerId: true, companyId: true },
  });
  if (!closingSession) return { error: "Session nicht gefunden" };
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    return { error: "Keine Berechtigung" };
  }

  const template = await db.offerTemplate.findUnique({ where: { id: templateId } });
  if (!template) return { error: "Template nicht gefunden" };

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + template.validDays);

  const offer = await db.offer.create({
    data: {
      priceNet: template.priceNet,
      validUntil,
      companyId: closingSession.companyId,
      templateId,
      closingSessionId: sessionId,
      createdById: userId,
    },
  });

  await db.closingSession.update({
    where: { id: sessionId },
    data: { activeOfferId: offer.id },
  });
  await db.closingEvent.create({
    data: {
      closingSessionId: sessionId,
      companyId: closingSession.companyId,
      eventType: "offer_created",
      metadata: JSON.stringify({ offerId: offer.id, templateName: template.name }),
      actorId: userId,
    },
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  return { offerId: offer.id };
}

export async function presentOffer(sessionId: string, offerId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    select: { closerId: true, companyId: true },
  });
  if (!closingSession) return { error: "Session nicht gefunden" };

  await db.offer.update({
    where: { id: offerId },
    data: { status: "presented", presentedAt: new Date() },
  });
  await db.closingSession.update({
    where: { id: sessionId },
    data: { status: "offer_presented", activeOfferId: offerId },
  });
  await db.company.update({
    where: { id: closingSession.companyId },
    data: { leadStatus: "offer_presented" },
  });
  await db.closingEvent.create({
    data: {
      closingSessionId: sessionId,
      companyId: closingSession.companyId,
      eventType: "offer_presented",
      metadata: JSON.stringify({ offerId }),
      actorId: userId,
    },
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  return { ok: true };
}
