"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

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
      leadStatus: "prospect",
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

  const MANUAL_STATUSES = ["verloren", "storniert", "abgesagt"];
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
