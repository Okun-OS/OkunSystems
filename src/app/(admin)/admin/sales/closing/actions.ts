"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { sendClosingInvitationEmail } from "@/lib/email";

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

export async function recordConsent(
  sessionId: string,
  data: {
    offerId: string;
    legalDocumentId: string;
    consentType: string;
    displayedPriceCents: number;
    sessionTokenHash: string;
  }
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

  const legalDoc = await db.legalDocument.findUnique({
    where: { id: data.legalDocumentId },
    select: { isRequired: true },
  });

  await db.consentRecord.create({
    data: {
      consentType: data.consentType,
      isRequired: legalDoc?.isRequired ?? true,
      displayedPriceCents: data.displayedPriceCents,
      agreementAt: new Date(),
      result: "granted",
      sessionTokenHash: data.sessionTokenHash,
      companyId: closingSession.companyId,
      closingSessionId: sessionId,
      offerId: data.offerId,
      legalDocumentId: data.legalDocumentId,
    },
  });

  await db.closingEvent.create({
    data: {
      closingSessionId: sessionId,
      companyId: closingSession.companyId,
      eventType: "consent_recorded",
      metadata: JSON.stringify({ consentType: data.consentType, legalDocumentId: data.legalDocumentId }),
      actorId: userId,
    },
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  return { ok: true };
}

export async function closeContract(
  sessionId: string,
  data: {
    offerId: string;
    packageType: string;
    agbVersion: string;
    privacyVersion: string;
    closerName: string;
    companyName: string;
  }
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

  const offer = await db.offer.findUnique({
    where: { id: data.offerId },
    select: { priceNet: true },
  });
  if (!offer) return { error: "Angebot nicht gefunden" };

  const now = new Date();

  await db.contractSnapshot.create({
    data: {
      packageType: data.packageType,
      totalNetCents: offer.priceNet,
      agbVersion: data.agbVersion,
      privacyVersion: data.privacyVersion,
      offerDate: now,
      closedAt: now,
      closerName: data.closerName,
      companyName: data.companyName,
      fullSnapshot: JSON.stringify({ offerId: data.offerId, sessionId }),
      closingSession: { connect: { id: sessionId } },
      offerId: data.offerId,
      closerId: closingSession.closerId,
      companyId: closingSession.companyId,
    },
  });

  await db.offer.update({
    where: { id: data.offerId },
    data: { status: "accepted", acceptedAt: now },
  });
  await db.closingSession.update({
    where: { id: sessionId },
    data: { status: "contract_closed", closedAt: now },
  });
  await db.company.update({
    where: { id: closingSession.companyId },
    data: { leadStatus: "contract_closed" },
  });
  await db.closingEvent.create({
    data: {
      closingSessionId: sessionId,
      companyId: closingSession.companyId,
      eventType: "contract_closed",
      metadata: JSON.stringify({ offerId: data.offerId }),
      actorId: userId,
    },
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  revalidatePath(`/admin/sales/leads/${closingSession.companyId}`);
  revalidatePath("/admin/sales");
  return { ok: true };
}

export async function resendClientInvitation(sessionId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return { error: "Keine Berechtigung" };
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    include: {
      company: { select: { name: true } },
      closer: { select: { name: true } },
      appointment: { select: { startTime: true, bookedByEmail: true, bookedByName: true } },
    },
  });
  if (!closingSession) return { error: "Session nicht gefunden" };
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    return { error: "Keine Berechtigung" };
  }
  if (!closingSession.appointment?.bookedByEmail) {
    return { error: "Keine Kunden-E-Mail gespeichert" };
  }

  const token = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.closingSession.update({
    where: { id: sessionId },
    data: { clientTokenHash: tokenHash, tokenExpiresAt },
  });

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
  const closingUrl = `${appUrl}/closing/${token}`;

  await sendClosingInvitationEmail({
    toEmail: closingSession.appointment.bookedByEmail,
    toName: closingSession.appointment.bookedByName ?? closingSession.company.name,
    companyName: closingSession.company.name,
    closingUrl,
    scheduledAt: closingSession.appointment.startTime,
    closerName: closingSession.closer.name ?? "Ihr Berater",
  });

  revalidatePath(`/admin/sales/closing/${sessionId}`);
  return { closingUrl };
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
