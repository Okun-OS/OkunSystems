"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createSalesContent(formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Titel ist Pflichtfeld" };
  const content = (formData.get("content") as string)?.trim();
  if (!content) return { error: "Inhalt ist Pflichtfeld" };

  await db.salesContent.create({
    data: {
      type: (formData.get("type") as string) || "closing_script",
      category: (formData.get("category") as string)?.trim() || null,
      title,
      content,
      order: parseInt(formData.get("order") as string) || 0,
      status: "published",
    },
  });

  revalidatePath("/admin/sales/bibliothek");
  return { ok: true };
}

export async function updateSalesContent(contentId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Titel ist Pflichtfeld" };

  await db.salesContent.update({
    where: { id: contentId },
    data: {
      type: (formData.get("type") as string) || "closing_script",
      category: (formData.get("category") as string)?.trim() || null,
      title,
      content: (formData.get("content") as string)?.trim() || "",
      order: parseInt(formData.get("order") as string) || 0,
    },
  });

  revalidatePath("/admin/sales/bibliothek");
  return { ok: true };
}

export async function deleteSalesContent(contentId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  await db.salesContent.delete({ where: { id: contentId } });
  revalidatePath("/admin/sales/bibliothek");
  return { ok: true };
}

export async function toggleSalesContentStatus(contentId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Nicht authentifiziert" };
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") return { error: "Keine Berechtigung" };

  const item = await db.salesContent.findUnique({ where: { id: contentId }, select: { status: true } });
  if (!item) return { error: "Nicht gefunden" };

  await db.salesContent.update({
    where: { id: contentId },
    data: { status: item.status === "published" ? "draft" : "published" },
  });

  revalidatePath("/admin/sales/bibliothek");
  return { ok: true };
}
