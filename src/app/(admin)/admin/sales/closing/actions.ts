"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireSessionAccess } from "@/lib/auth-guards";
import { forwardPath, normalizeStatus, type ClosingStatus } from "@/lib/closing/state-machine";
import { issueClosingToken } from "@/lib/closing/token";
import { reserveOfferNumber } from "@/lib/invoicing/numbering";
import { multiplyQuantity } from "@/lib/money";
import { sendClosingInvitationEmail, sendOfferEmail } from "@/lib/email";
import { loadOfferPdf } from "@/lib/closing/offer-document";

/**
 * Ereignisgesteuerte Statusübergänge des Closings.
 *
 * Reguläre Status entstehen ausschließlich aus echten Ereignissen. Ein freies
 * Setzen über ein Dropdown gibt es nicht mehr — Sonderstatus (verloren,
 * storniert) laufen über `setSpecialStatus` in portal-actions.ts und verlangen
 * eine Begründung.
 */

function revalidateSession(sessionId: string, companyId: string) {
  revalidatePath(`/admin/sales/closing/${sessionId}`);
  revalidatePath(`/admin/sales/closing/${sessionId}/audit`);
  revalidatePath(`/admin/sales/leads/${companyId}`);
  revalidatePath("/admin/sales");
}

/** Führt einen Statusübergang aus, wenn er die Statusmaschine passiert. */
async function advance(
  sessionId: string,
  companyId: string,
  actorId: string,
  target: ClosingStatus,
  eventType: string,
  metadata: Record<string, unknown> = {}
): Promise<{ ok: true } | { error: string }> {
  const session = await db.closingSession.findUnique({
    where: { id: sessionId },
    select: { status: true, startedAt: true },
  });
  if (!session) return { error: "Closing Session nicht gefunden." };

  const current = normalizeStatus(session.status);
  if (current === target) return { ok: true };
  if (!forwardPath(current, target)) {
    return {
      error: `Der Übergang von „${current}" nach „${target}" ist nicht zulässig.`,
    };
  }

  const now = new Date();
  await db.$transaction([
    db.closingSession.update({
      where: { id: sessionId },
      data: {
        status: target,
        startedAt:
          target === "closing_in_progress" ? (session.startedAt ?? now) : session.startedAt,
      },
    }),
    db.company.update({ where: { id: companyId }, data: { leadStatus: target } }),
    db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId,
        eventType,
        metadata: JSON.stringify(metadata),
      },
    }),
  ]);
  return { ok: true };
}

export async function startClosingConversation(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await advance(
      sessionId,
      companyId,
      actor.id,
      "closing_in_progress",
      "closing_started"
    );
    revalidateSession(sessionId, companyId);
    return result;
  });
}

export async function markAgreementReached(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);
    const result = await advance(
      sessionId,
      companyId,
      actor.id,
      "agreement_reached",
      "agreement_reached"
    );
    revalidateSession(sessionId, companyId);
    return result;
  });
}

/**
 * Erzeugt ein Angebot aus einer Vorlage und materialisiert dabei die
 * Positionen — damit stehen im Snapshot und in der Rechnung echte Line Items.
 */
export async function createOfferForSession(sessionId: string, templateId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);

    const template = await db.offerTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Angebotsvorlage nicht gefunden." };

    const snapshot = await db.contractSnapshot.findUnique({
      where: { closingSessionId: sessionId },
      select: { id: true },
    });
    if (snapshot) {
      return {
        error:
          "Die Vertragsdaten sind bereits eingefroren. Ein Angebotswechsel würde den Abschluss verändern.",
      };
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + template.validDays);
    const offerNumber = await reserveOfferNumber();

    type TemplateLineItem = {
      description?: string;
      quantity?: number;
      unit?: string;
      unitPriceCents?: number;
      kind?: string;
      isExtra?: boolean;
      note?: string;
    };
    let templateItems: TemplateLineItem[] = [];
    try {
      const parsed = JSON.parse(template.lineItems || "[]");
      if (Array.isArray(parsed)) templateItems = parsed as TemplateLineItem[];
    } catch {
      templateItems = [];
    }

    const lineItems = templateItems
      .filter((item) => item.description && Number.isInteger(item.unitPriceCents))
      .map((item, index) => {
        const quantityMilli = Math.round((item.quantity ?? 1) * 1000);
        return {
          position: index + 1,
          description: item.description!,
          quantity: quantityMilli / 1000,
          quantityMilli,
          unit: item.unit ?? null,
          unitPriceCents: item.unitPriceCents!,
          totalCents: multiplyQuantity(item.unitPriceCents!, quantityMilli),
          kind: item.kind ?? "one_time",
          isExtra: item.isExtra ?? false,
          note: item.note ?? null,
          vatRateBp: template.vatRateBp ?? null,
        };
      });

    // Ohne konfigurierte Positionen entsteht eine einzelne Paketposition.
    if (lineItems.length === 0) {
      lineItems.push({
        position: 1,
        description: `${template.name} — einmalige Investition`,
        quantity: 1,
        quantityMilli: 1000,
        unit: null,
        unitPriceCents: template.priceNet,
        totalCents: template.priceNet,
        kind: "one_time",
        isExtra: false,
        note: null,
        vatRateBp: template.vatRateBp ?? null,
      });
    }

    const offer = await db.offer.create({
      data: {
        offerNumber,
        priceNet: template.priceNet,
        currency: template.currency,
        validUntil,
        companyId,
        templateId,
        closingSessionId: sessionId,
        createdById: actor.id,
        packageType: template.packageType,
        recurringNetCents: template.recurringNetCents,
        recurringInterval: template.recurringInterval,
        minimumTermMonths: template.minimumTermMonths,
        paymentTerms: template.paymentTerms,
        vatRateBp: template.vatRateBp,
        workforceIncluded: template.workforceIncluded,
        careIncluded: template.careIncluded,
        lineItems: { create: lineItems },
      },
      select: { id: true },
    });

    await db.closingSession.update({
      where: { id: sessionId },
      data: { activeOfferId: offer.id },
    });
    await db.company.update({
      where: { id: companyId },
      data: { contractPackage: template.packageType, contractValue: template.priceNet },
    });
    await db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId: actor.id,
        eventType: "offer_created",
        metadata: JSON.stringify({
          offerId: offer.id,
          offerNumber,
          templateName: template.name,
        }),
      },
    });

    revalidateSession(sessionId, companyId);
    return { ok: true, offerId: offer.id, offerNumber };
  });
}

export async function presentOffer(sessionId: string, offerId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);

    const offer = await db.offer.findUnique({
      where: { id: offerId },
      select: { closingSessionId: true },
    });
    if (!offer || offer.closingSessionId !== sessionId) {
      return { error: "Angebot gehört nicht zu dieser Closing Session." };
    }

    await db.offer.update({
      where: { id: offerId },
      data: { status: "presented", presentedAt: new Date() },
    });
    await db.closingSession.update({
      where: { id: sessionId },
      data: { activeOfferId: offerId },
    });

    const result = await advance(
      sessionId,
      companyId,
      actor.id,
      "offer_presented",
      "offer_presented",
      { offerId }
    );

    // Ein Wechsel des gezeigten Angebots ist auch später noch erlaubt — etwa
    // wenn im Gespräch eine zweite Variante auf den Tisch kommt. Der Ablauf
    // ist dann schon weiter, der Statusübergang also nicht mehr möglich; das
    // gezeigte Angebot hat trotzdem gewechselt und wird nur protokolliert.
    if ("error" in result) {
      await db.closingEvent.create({
        data: {
          closingSessionId: sessionId,
          companyId,
          actorId: actor.id,
          eventType: "offer_presented",
          metadata: JSON.stringify({ offerId, switched: true }),
        },
      });
      revalidateSession(sessionId, companyId);
      return { ok: true as const };
    }

    revalidateSession(sessionId, companyId);
    return result;
  });
}

/**
 * Schickt dem Kunden das aktive Angebot als PDF per E-Mail.
 *
 * Derselbe Inhalt, der im Gespräch gezeigt wird: erst das hinterlegte
 * Paket-PDF, sonst das gerenderte Angebot.
 */
export async function emailOfferToClient(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);

    const session = await db.closingSession.findUnique({
      where: { id: sessionId },
      select: {
        activeOfferId: true,
        company: { select: { name: true, contactPerson: true } },
        closer: { select: { name: true } },
        appointment: { select: { bookedByName: true, bookedByEmail: true } },
      },
    });
    if (!session) return { error: "Closing Session nicht gefunden." };
    if (!session.activeOfferId) {
      return { error: "Es ist kein Angebot aktiv. Bitte zuerst ein Angebot präsentieren." };
    }

    const toEmail = session.appointment?.bookedByEmail?.trim();
    if (!toEmail) {
      return { error: "Für diesen Kunden ist keine E-Mail-Adresse hinterlegt." };
    }

    const offer = await db.offer.findUnique({
      where: { id: session.activeOfferId },
      select: { offerNumber: true },
    });

    let pdf;
    try {
      pdf = await loadOfferPdf(sessionId);
    } catch (error) {
      console.error("[closing] Angebots-PDF für den Versand fehlgeschlagen:", error);
      return { error: "Das Angebots-PDF konnte nicht erzeugt werden." };
    }
    if (!pdf) return { error: "Das Angebots-PDF konnte nicht erzeugt werden." };

    const sent = await sendOfferEmail({
      toEmail,
      toName:
        session.appointment?.bookedByName ??
        session.company?.contactPerson ??
        session.company?.name ??
        "",
      companyName: session.company?.name ?? "",
      offerNumber: offer?.offerNumber ?? null,
      closerName: session.closer?.name ?? null,
      portalUrl: null,
      attachment: { filename: pdf.fileName, content: pdf.buffer },
    });
    if (!sent.ok) return { error: sent.error };

    await db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId: actor.id,
        eventType: "offer_emailed",
        metadata: JSON.stringify({
          offerId: session.activeOfferId,
          offerNumber: offer?.offerNumber ?? null,
          toEmail,
        }),
      },
    });

    revalidateSession(sessionId, companyId);
    return { ok: true as const, toEmail };
  });
}

export async function resendClientInvitation(sessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(sessionId);

    const session = await db.closingSession.findUnique({
      where: { id: sessionId },
      include: {
        company: {
          select: {
            name: true,
            contactEmail: true,
            contactFirstName: true,
            contactLastName: true,
          },
        },
        closer: { select: { name: true } },
        appointment: {
          select: { startTime: true, bookedByEmail: true, bookedByName: true },
        },
      },
    });
    if (!session) return { error: "Closing Session nicht gefunden." };

    const toEmail = session.company.contactEmail ?? session.appointment?.bookedByEmail;
    if (!toEmail) {
      return { error: "Es ist keine E-Mail-Adresse für den Kunden hinterlegt." };
    }

    const issued = await issueClosingToken(sessionId);
    await sendClosingInvitationEmail({
      toEmail,
      toName:
        [session.company.contactFirstName, session.company.contactLastName]
          .filter(Boolean)
          .join(" ") ||
        session.appointment?.bookedByName ||
        session.company.name,
      companyName: session.company.name,
      closingUrl: issued.url,
      scheduledAt: session.appointment?.startTime ?? new Date(),
      closerName: session.closer.name ?? "Ihr Berater",
    });

    await db.closingEvent.create({
      data: {
        closingSessionId: sessionId,
        companyId,
        actorId: actor.id,
        eventType: "client_invitation_sent",
        metadata: JSON.stringify({ expiresAt: issued.expiresAt.toISOString() }),
      },
    });

    revalidateSession(sessionId, companyId);
    return { ok: true, closingUrl: issued.url };
  });
}

export async function saveChecklistState(
  sessionId: string,
  checklist: Record<string, boolean>
) {
  return guarded(async () => {
    await requireSessionAccess(sessionId);
    await db.closingSession.update({
      where: { id: sessionId },
      data: { currentStep: JSON.stringify(checklist) },
    });
    return { ok: true };
  });
}

export async function saveClosingNotes(sessionId: string, notes: string) {
  return guarded(async () => {
    const { companyId } = await requireSessionAccess(sessionId);
    await db.company.update({ where: { id: companyId }, data: { closingNotes: notes } });
    return { ok: true };
  });
}
