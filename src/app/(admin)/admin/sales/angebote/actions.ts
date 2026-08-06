"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createOfferTemplate(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name ist Pflichtfeld" };

  const priceNetEur = parseFloat(formData.get("priceNet") as string);
  if (isNaN(priceNetEur) || priceNetEur <= 0) return { error: "Ungültiger Preis" };

  await db.offerTemplate.create({
    data: {
      name,
      packageType: (formData.get("packageType") as string)?.trim() || "custom",
      description: (formData.get("description") as string)?.trim() || null,
      priceNet: Math.round(priceNetEur * 100),
      validDays: parseInt(formData.get("validDays") as string) || 30,
      status: "published",
      createdById: userId,
    },
  });

  revalidatePath("/admin/sales/angebote");
  return { ok: true };
}

export async function updateOfferTemplate(templateId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Name ist Pflichtfeld" };

  const priceNetEur = parseFloat(formData.get("priceNet") as string);
  if (isNaN(priceNetEur) || priceNetEur <= 0) return { error: "Ungültiger Preis" };

  await db.offerTemplate.update({
    where: { id: templateId },
    data: {
      name,
      packageType: (formData.get("packageType") as string)?.trim() || "custom",
      description: (formData.get("description") as string)?.trim() || null,
      priceNet: Math.round(priceNetEur * 100),
      validDays: parseInt(formData.get("validDays") as string) || 30,
    },
  });

  revalidatePath("/admin/sales/angebote");
  return { ok: true };
}

export async function archiveOfferTemplate(templateId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  await db.offerTemplate.update({
    where: { id: templateId },
    data: { status: "archived" },
  });

  revalidatePath("/admin/sales/angebote");
  return { ok: true };
}

export async function setOfferTemplateR2Key(templateId: string, r2Key: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  await db.offerTemplate.update({
    where: { id: templateId },
    data: { r2Key },
  });

  revalidatePath("/admin/sales/angebote");
  return { ok: true };
}
