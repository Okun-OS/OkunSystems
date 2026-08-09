"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht authentifiziert");
  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN") throw new Error("Keine Berechtigung");
  return userId;
}

export async function createLegalDocument(formData: FormData) {
  let createdById: string;
  try { createdById = await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string)?.trim();
  const version = (formData.get("version") as string)?.trim() || "1.0";
  const content = (formData.get("content") as string)?.trim();
  const checkboxLabel = (formData.get("checkboxLabel") as string)?.trim() || "";
  const isRequired = formData.get("isRequired") === "true";
  const displayOrder = parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0;

  if (!title || !type || !content) return { error: "Titel, Typ und Inhalt sind Pflichtfelder" };

  await db.legalDocument.create({
    data: {
      title,
      type,
      version,
      content,
      checkboxLabel,
      isRequired,
      displayOrder,
      isActive: true,
      createdById,
    },
  });

  revalidatePath("/admin/einstellungen/rechtliches");
  return { ok: true };
}

export async function updateLegalDocument(id: string, formData: FormData) {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string)?.trim();
  const version = (formData.get("version") as string)?.trim() || "1.0";
  const content = (formData.get("content") as string)?.trim();
  const checkboxLabel = (formData.get("checkboxLabel") as string)?.trim() || "";
  const isRequired = formData.get("isRequired") === "true";
  const displayOrder = parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0;

  if (!title || !type || !content) return { error: "Titel, Typ und Inhalt sind Pflichtfelder" };

  await db.legalDocument.update({
    where: { id },
    data: { title, type, version, content, checkboxLabel, isRequired, displayOrder },
  });

  revalidatePath("/admin/einstellungen/rechtliches");
  return { ok: true };
}

export async function toggleLegalDocumentActive(id: string, isActive: boolean) {
  try { await requireAdmin(); } catch (e) { return { error: (e as Error).message }; }

  await db.legalDocument.update({ where: { id }, data: { isActive } });

  revalidatePath("/admin/einstellungen/rechtliches");
  return { ok: true };
}
