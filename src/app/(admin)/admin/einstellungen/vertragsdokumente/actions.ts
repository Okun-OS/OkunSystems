"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, guarded } from "@/lib/auth-guards";
import { ensureVersionHash, sha256String } from "@/lib/documents/hash";

const PATH = "/admin/einstellungen/vertragsdokumente";

export async function createContractDocument(formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    if (!name || !type) return { error: "Name und Typ sind Pflichtfelder." };

    const created = await db.contractDocument.create({
      data: {
        name,
        type,
        description: (formData.get("description") as string)?.trim() || null,
        displayOrder: Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
        isActive: true,
        createdById: actor.id,
      },
      select: { id: true },
    });
    revalidatePath(PATH);
    return { ok: true, id: created.id };
  });
}

export async function updateContractDocument(id: string, formData: FormData) {
  return guarded(async () => {
    await requireAdmin();
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    if (!name || !type) return { error: "Name und Typ sind Pflichtfelder." };

    await db.contractDocument.update({
      where: { id },
      data: {
        name,
        type,
        description: (formData.get("description") as string)?.trim() || null,
        displayOrder: Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
      },
    });
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function toggleContractDocument(id: string, isActive: boolean) {
  return guarded(async () => {
    await requireAdmin();
    await db.contractDocument.update({ where: { id }, data: { isActive } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

/**
 * Legt eine neue Version an. Bestehende Versionen bleiben unverändert
 * erhalten — eine hochgeladene Datei wird niemals überschrieben.
 */
export async function createDocumentVersion(documentId: string, formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const document = await db.contractDocument.findUnique({
      where: { id: documentId },
      select: { id: true, type: true, name: true },
    });
    if (!document) return { error: "Vertragsdokument nicht gefunden." };

    const versionLabel = (formData.get("version") as string)?.trim();
    if (!versionLabel) return { error: "Versionsnummer ist Pflichtfeld." };

    const r2Key = (formData.get("r2Key") as string)?.trim() || null;
    const content = (formData.get("content") as string)?.trim() || null;
    if (!r2Key && !content) {
      return { error: "Bitte eine PDF-Datei hochladen oder einen Textinhalt hinterlegen." };
    }

    const duplicate = await db.legalDocument.findFirst({
      where: { contractDocumentId: documentId, version: versionLabel },
      select: { id: true },
    });
    if (duplicate) {
      return { error: `Version „${versionLabel}" existiert bereits.` };
    }

    const uploadedSha = (formData.get("sha256") as string)?.trim() || null;
    const fileSize = Number.parseInt((formData.get("fileSize") as string) ?? "", 10);
    const activate = formData.get("activate") === "true";
    const validFromRaw = (formData.get("validFrom") as string)?.trim();
    const packageScopeRaw = (formData.get("packageScope") as string)?.trim();
    const packageScope = packageScopeRaw
      ? packageScopeRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : null;

    const previousActive = await db.legalDocument.findFirst({
      where: { contractDocumentId: documentId, isActive: true },
      select: { id: true },
    });

    const created = await db.$transaction(async (tx) => {
      if (activate && previousActive) {
        // Die alte Version wird nur deaktiviert, niemals verändert oder gelöscht.
        await tx.legalDocument.update({
          where: { id: previousActive.id },
          data: { isActive: false, validUntil: new Date() },
        });
      }
      return tx.legalDocument.create({
        data: {
          contractDocumentId: documentId,
          type: document.type,
          title: (formData.get("title") as string)?.trim() || document.name,
          version: versionLabel,
          description: (formData.get("description") as string)?.trim() || null,
          content,
          r2Key,
          fileName: (formData.get("fileName") as string)?.trim() || null,
          fileSize: Number.isInteger(fileSize) ? fileSize : null,
          sha256: uploadedSha ?? (content ? sha256String(content) : null),
          mimeType: r2Key ? "application/pdf" : "text/plain",
          isActive: activate,
          isRequired: true,
          validFrom: validFromRaw ? new Date(validFromRaw) : new Date(),
          supersedesId: previousActive?.id ?? null,
          packageScope: packageScope ?? undefined,
          createdById: actor.id,
        },
        select: { id: true },
      });
    });

    await ensureVersionHash(created.id);
    revalidatePath(PATH);
    return { ok: true, versionId: created.id };
  });
}

/** Aktiviert eine Version und deaktiviert die bisher aktive desselben Dokuments. */
export async function activateDocumentVersion(versionId: string) {
  return guarded(async () => {
    await requireAdmin();
    const version = await db.legalDocument.findUnique({
      where: { id: versionId },
      select: { id: true, contractDocumentId: true },
    });
    if (!version?.contractDocumentId) return { error: "Version nicht gefunden." };

    await db.$transaction([
      db.legalDocument.updateMany({
        where: { contractDocumentId: version.contractDocumentId, isActive: true },
        data: { isActive: false, validUntil: new Date() },
      }),
      db.legalDocument.update({
        where: { id: versionId },
        data: { isActive: true, validUntil: null },
      }),
    ]);
    await ensureVersionHash(versionId);
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function deactivateDocumentVersion(versionId: string) {
  return guarded(async () => {
    await requireAdmin();
    await db.legalDocument.update({
      where: { id: versionId },
      data: { isActive: false, validUntil: new Date() },
    });
    revalidatePath(PATH);
    return { ok: true };
  });
}

/** Berechnet fehlende Hashes nach (z. B. für migrierte Altbestände). */
export async function backfillDocumentHashes() {
  return guarded(async () => {
    await requireAdmin();
    const versions = await db.legalDocument.findMany({
      where: { sha256: null },
      select: { id: true },
    });
    let done = 0;
    for (const version of versions) {
      if (await ensureVersionHash(version.id)) done++;
    }
    revalidatePath(PATH);
    return { ok: true, done, total: versions.length };
  });
}
