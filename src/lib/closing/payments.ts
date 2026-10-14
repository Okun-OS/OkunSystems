import { db } from "@/lib/db";
import { forwardPath, normalizeStatus } from "./state-machine";
import { activateCustomer } from "./activation";

/**
 * Zahlungsverarbeitung.
 *
 * Stripe-Zahlungen werden ausschließlich über den Webhook bestätigt — ein
 * Browser-Redirect setzt niemals `paid`. Rechnungszahlungen bestätigt der
 * Admin; auch diese Aktion wird als Audit Event protokolliert.
 */

export type PaymentConfirmation = {
  ok: boolean;
  alreadyPaid: boolean;
  activated: boolean;
  error?: string;
};

async function markSessionPaid(
  closingSessionId: string,
  companyId: string,
  actorId: string | null,
  source: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { status: true },
  });
  if (!session) return;

  const current = normalizeStatus(session.status);
  if (current === "paid" || current === "customer_activated") return;
  if (!forwardPath(current, "paid")) return;

  await db.$transaction([
    db.closingSession.update({
      where: { id: closingSessionId },
      data: { status: "paid" },
    }),
    db.company.update({ where: { id: companyId }, data: { leadStatus: "paid" } }),
    db.closingEvent.create({
      data: {
        closingSessionId,
        companyId,
        actorId,
        eventType: "payment_confirmed",
        idempotencyKey: `payment_confirmed:${closingSessionId}`,
        metadata: JSON.stringify({ source, ...metadata }),
      },
    }),
  ]);
}

/** Admin bestätigt den Zahlungseingang zu einer Rechnung. */
export async function confirmInvoicePayment(input: {
  invoiceId: string;
  actorId: string;
  note?: string | null;
  paidBy?: string | null;
  source?: "admin" | "stripe_webhook" | "system";
  externalRef?: string | null;
}): Promise<PaymentConfirmation> {
  const invoice = await db.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      status: true,
      companyId: true,
      closingSessionId: true,
      grossTotalCents: true,
      grossAmount: true,
      paidAt: true,
    },
  });
  if (!invoice) {
    return { ok: false, alreadyPaid: false, activated: false, error: "Rechnung nicht gefunden." };
  }
  if (invoice.status === "paid" || invoice.paidAt) {
    return { ok: true, alreadyPaid: true, activated: false };
  }
  if (invoice.status === "cancelled") {
    return {
      ok: false,
      alreadyPaid: false,
      activated: false,
      error: "Eine stornierte Rechnung kann nicht als bezahlt markiert werden.",
    };
  }

  const source = input.source ?? "admin";
  const now = new Date();

  try {
    await db.$transaction([
      db.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "paid",
          paidAt: now,
          paidBy: input.paidBy ?? null,
          confirmedById: source === "admin" ? input.actorId : null,
        },
      }),
      // Append-only Audit: Admin, Zeitpunkt, InvoiceID, vorheriger und neuer Status.
      db.invoicePaymentEvent.create({
        data: {
          invoiceId: invoice.id,
          previousStatus: invoice.status,
          newStatus: "paid",
          source,
          actorId: source === "admin" ? input.actorId : null,
          note: input.note?.trim() || null,
          externalRef: input.externalRef ?? null,
          amountCents: invoice.grossTotalCents ?? invoice.grossAmount,
          occurredAt: now,
          idempotencyKey: `invoice_paid:${invoice.id}`,
        },
      }),
    ]);
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      return { ok: true, alreadyPaid: true, activated: false };
    }
    console.error("[payments] Zahlungsbestätigung fehlgeschlagen:", err);
    return {
      ok: false,
      alreadyPaid: false,
      activated: false,
      error: "Zahlung konnte nicht bestätigt werden.",
    };
  }

  if (invoice.closingSessionId) {
    await markSessionPaid(invoice.closingSessionId, invoice.companyId, input.actorId, source, {
      invoiceId: invoice.id,
    });
  }

  const activation = await activateCustomer({
    companyId: invoice.companyId,
    closingSessionId: invoice.closingSessionId,
    actorId: source === "admin" ? input.actorId : null,
    source: source === "stripe_webhook" ? "stripe_webhook" : "admin",
  });

  return {
    ok: true,
    alreadyPaid: false,
    activated: activation.ok && !activation.alreadyActive,
  };
}

/** Wird ausschließlich aus dem verifizierten Stripe-Webhook aufgerufen. */
export async function handleStripePaymentSucceeded(input: {
  companyId: string;
  closingSessionId?: string | null;
  offerId?: string | null;
  invoiceId?: string | null;
  stripeSessionId: string;
  amountTotal?: number | null;
}): Promise<PaymentConfirmation> {
  if (input.invoiceId) {
    return confirmInvoicePayment({
      invoiceId: input.invoiceId,
      actorId: "",
      source: "stripe_webhook",
      externalRef: input.stripeSessionId,
    });
  }

  if (input.offerId) {
    await db.offer.updateMany({
      where: { id: input.offerId, acceptedAt: null },
      data: { status: "accepted", acceptedAt: new Date() },
    });
  }

  if (input.closingSessionId) {
    await markSessionPaid(input.closingSessionId, input.companyId, null, "stripe_webhook", {
      stripeSessionId: input.stripeSessionId,
      amountTotal: input.amountTotal ?? null,
      offerId: input.offerId ?? null,
    });
  }

  const activation = await activateCustomer({
    companyId: input.companyId,
    closingSessionId: input.closingSessionId,
    source: "stripe_webhook",
  });

  return {
    ok: true,
    alreadyPaid: false,
    activated: activation.ok && !activation.alreadyActive,
  };
}

/** Setzt eine Session nach Vertragsabschluss auf „Zahlung ausstehend". */
export async function markPaymentPending(
  closingSessionId: string,
  companyId: string,
  method: "stripe" | "invoice",
  actorId: string | null
): Promise<void> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { status: true },
  });
  if (!session) return;
  const current = normalizeStatus(session.status);
  if (!forwardPath(current, "payment_pending")) return;

  await db.$transaction([
    db.closingSession.update({
      where: { id: closingSessionId },
      data: { status: "payment_pending", paymentMethod: method },
    }),
    db.company.update({
      where: { id: companyId },
      data: { leadStatus: "payment_pending", paymentMethod: method },
    }),
    db.closingEvent.create({
      data: {
        closingSessionId,
        companyId,
        actorId,
        eventType: "payment_pending",
        idempotencyKey: `payment_pending:${closingSessionId}`,
        metadata: JSON.stringify({ method }),
      },
    }),
  ]);
}
