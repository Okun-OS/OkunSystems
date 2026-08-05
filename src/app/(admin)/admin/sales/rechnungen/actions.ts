"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function getAdminUser() {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") return null;
  return { userId, user };
}

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `RE-${year}${month}-${rand}`;
}

export async function createInvoiceFromOffer(offerId: string) {
  const auth_ = await getAdminUser();
  if (!auth_) return { error: "Keine Berechtigung" };

  const offer = await db.offer.findUnique({
    where: { id: offerId },
    include: {
      company: { select: { id: true, name: true } },
      closingSession: { select: { id: true } },
      template: { select: { name: true } },
    },
  });
  if (!offer) return { error: "Angebot nicht gefunden" };

  const grossAmount = Math.round(offer.priceNet * 1.19);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      netAmount: offer.priceNet,
      grossAmount,
      dueDate,
      billingName: offer.company.name,
      status: "draft",
      companyId: offer.company.id,
      offerId,
      closingSessionId: offer.closingSession?.id ?? null,
      createdById: auth_.userId,
    },
  });

  revalidatePath("/admin/sales/rechnungen");
  return { invoiceId: invoice.id };
}

export async function createManualInvoice(formData: FormData) {
  const auth_ = await getAdminUser();
  if (!auth_) return { error: "Keine Berechtigung" };

  const companyId = (formData.get("companyId") as string)?.trim();
  if (!companyId) return { error: "Unternehmen ist Pflichtfeld" };

  const netAmountEur = parseFloat(formData.get("netAmount") as string);
  if (isNaN(netAmountEur) || netAmountEur <= 0) return { error: "Ungültiger Betrag" };

  const netAmount = Math.round(netAmountEur * 100);
  const taxRate = parseFloat(formData.get("taxRate") as string) || 0.19;
  const grossAmount = Math.round(netAmount * (1 + taxRate));

  const dueDays = parseInt(formData.get("dueDays") as string) || 14;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);

  const invoice = await db.invoice.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      netAmount,
      taxRate,
      grossAmount,
      dueDate,
      billingName: (formData.get("billingName") as string)?.trim() || null,
      billingAddress: (formData.get("billingAddress") as string)?.trim() || null,
      status: "draft",
      companyId,
      createdById: auth_.userId,
    },
  });

  revalidatePath("/admin/sales/rechnungen");
  return { invoiceId: invoice.id };
}

export async function markInvoiceSent(invoiceId: string) {
  const auth_ = await getAdminUser();
  if (!auth_) return { error: "Keine Berechtigung" };

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent", issuedAt: new Date() },
  });

  revalidatePath("/admin/sales/rechnungen");
  return { ok: true };
}

export async function markInvoicePaid(invoiceId: string, paidBy?: string) {
  const auth_ = await getAdminUser();
  if (!auth_) return { error: "Keine Berechtigung" };

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "paid",
      paidAt: new Date(),
      paidBy: paidBy || null,
      confirmedById: auth_.userId,
    },
  });

  revalidatePath("/admin/sales/rechnungen");
  return { ok: true };
}

export async function cancelInvoice(invoiceId: string) {
  const auth_ = await getAdminUser();
  if (!auth_) return { error: "Keine Berechtigung" };

  await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "cancelled" },
  });

  revalidatePath("/admin/sales/rechnungen");
  return { ok: true };
}
