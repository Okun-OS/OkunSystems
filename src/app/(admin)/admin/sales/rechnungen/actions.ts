"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireAdmin, requireInvoiceAccess } from "@/lib/auth-guards";
import { sendInvoiceEmail } from "@/lib/email";
import { confirmInvoicePayment } from "@/lib/closing/payments";

/**
 * Aktionen der Rechnungsübersicht.
 *
 * Erstellen und Ändern laufen ausschließlich über den Rechnungseditor
 * (invoice-actions.ts), damit Beträge und Nummern serverseitig entstehen.
 * Hier liegen nur noch Versand und Statusaktionen.
 */

const PATH = "/admin/sales/rechnungen";

/** Zahlungseingänge bestätigt ausschließlich ein Administrator (§ 19 B). */
export async function markInvoicePaid(invoiceId: string, note?: string) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const result = await confirmInvoicePayment({
      invoiceId,
      actorId: actor.id,
      note: note ?? null,
    });
    revalidatePath(PATH);
    revalidatePath("/admin/sales");
    return result.ok
      ? { ok: true, alreadyPaid: result.alreadyPaid, activated: result.activated }
      : { error: result.error ?? "Zahlung konnte nicht bestätigt werden." };
  });
}

export async function cancelInvoice(invoiceId: string, reason: string) {
  return guarded(async () => {
    const { actor } = await requireInvoiceAccess(invoiceId);
    if (!reason?.trim()) return { error: "Eine Begründung ist erforderlich." };

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true },
    });
    if (!invoice) return { error: "Rechnung nicht gefunden." };
    if (invoice.status === "paid") {
      return { error: "Eine bezahlte Rechnung kann nicht storniert werden." };
    }

    await db.$transaction([
      db.invoice.update({ where: { id: invoiceId }, data: { status: "cancelled" } }),
      db.invoicePaymentEvent.create({
        data: {
          invoiceId,
          previousStatus: invoice.status,
          newStatus: "cancelled",
          source: "admin",
          actorId: actor.id,
          note: reason.trim(),
          idempotencyKey: `invoice_cancelled:${invoiceId}`,
        },
      }),
    ]);

    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function sendInvoice(invoiceId: string) {
  return guarded(async () => {
    await requireInvoiceAccess(invoiceId);

    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: {
          select: {
            name: true,
            contactEmail: true,
            contactFirstName: true,
            contactLastName: true,
            billingEmail: true,
            billingDiffers: true,
            users: { select: { email: true, name: true }, take: 1 },
            appointments: {
              select: { bookedByEmail: true, bookedByName: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    if (!invoice) return { error: "Rechnung nicht gefunden." };
    if (!invoice.finalizedAt) {
      return { error: "Die Rechnung ist noch nicht final erstellt." };
    }

    const toEmail =
      (invoice.company.billingDiffers ? invoice.company.billingEmail : null) ??
      invoice.company.contactEmail ??
      invoice.company.users[0]?.email ??
      invoice.company.appointments[0]?.bookedByEmail;
    if (!toEmail) return { error: "Es ist keine E-Mail-Adresse hinterlegt." };

    const toName =
      [invoice.company.contactFirstName, invoice.company.contactLastName]
        .filter(Boolean)
        .join(" ") ||
      invoice.company.users[0]?.name ||
      invoice.billingName ||
      invoice.company.name;

    const appUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
    await sendInvoiceEmail({
      toEmail,
      toName,
      companyName: invoice.company.name,
      invoiceNumber: invoice.invoiceNumber,
      grossAmount: invoice.grossTotalCents ?? invoice.grossAmount,
      dueDate: invoice.dueDate,
      portalUrl: `${appUrl}/portal/dokumente`,
    });

    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: invoice.status === "paid" ? "paid" : "sent", issuedAt: invoice.issuedAt ?? new Date() },
    });

    revalidatePath(PATH);
    return { ok: true };
  });
}
