"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, guarded } from "@/lib/auth-guards";
import { SCRIPT_KINDS } from "@/lib/closing/scripts";

/**
 * Closing Scripts.
 *
 * Die Texte schreibt und pflegt ausschließlich der Admin. Im Code sind keine
 * verbindlichen Formulierungen hinterlegt. Jede Textänderung erhöht die Version
 * und wird als Revision archiviert — bereits gerenderte Scripts in laufenden
 * oder abgeschlossenen Closings bleiben davon unberührt.
 */

const PATH = "/admin/einstellungen/closing-scripts";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export async function createClosingScript(formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const title = (formData.get("title") as string)?.trim();
    const body = (formData.get("body") as string)?.trim();
    const kind = (formData.get("kind") as string)?.trim();
    if (!title) return { error: "Titel ist Pflichtfeld." };
    if (!body) return { error: "Der Script-Text ist Pflichtfeld." };
    if (!(SCRIPT_KINDS as readonly string[]).includes(kind)) {
      return { error: "Ungültiger Script-Typ." };
    }

    const packageType =
      kind === "PACKAGE" ? (formData.get("packageType") as string)?.trim() || null : null;
    const addonKey =
      kind === "ADDON" ? (formData.get("addonKey") as string)?.trim() || null : null;

    const baseKey = (formData.get("key") as string)?.trim() || slugify(`${kind}_${title}`);
    let key = baseKey;
    for (let i = 2; await db.closingScript.findUnique({ where: { key } }); i++) {
      key = `${baseKey}_${i}`;
    }

    const created = await db.closingScript.create({
      data: {
        key,
        kind,
        title,
        body,
        packageType,
        addonKey,
        displayOrder: Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
        isActive: formData.get("isActive") === "true",
        version: 1,
        createdById: actor.id,
      },
    });

    await db.closingScriptRevision.create({
      data: { scriptId: created.id, version: 1, title, body, createdById: actor.id },
    });

    revalidatePath(PATH);
    return { ok: true, id: created.id };
  });
}

export async function updateClosingScript(id: string, formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const existing = await db.closingScript.findUnique({ where: { id } });
    if (!existing) return { error: "Script nicht gefunden." };

    const title = (formData.get("title") as string)?.trim();
    const body = (formData.get("body") as string)?.trim();
    const kind = (formData.get("kind") as string)?.trim();
    if (!title) return { error: "Titel ist Pflichtfeld." };
    if (!body) return { error: "Der Script-Text ist Pflichtfeld." };
    if (!(SCRIPT_KINDS as readonly string[]).includes(kind)) {
      return { error: "Ungültiger Script-Typ." };
    }

    const contentChanged = existing.title !== title || existing.body !== body;
    const nextVersion = contentChanged ? existing.version + 1 : existing.version;

    await db.$transaction(async (tx) => {
      await tx.closingScript.update({
        where: { id },
        data: {
          kind,
          title,
          body,
          packageType:
            kind === "PACKAGE" ? (formData.get("packageType") as string)?.trim() || null : null,
          addonKey:
            kind === "ADDON" ? (formData.get("addonKey") as string)?.trim() || null : null,
          displayOrder:
            Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
          isActive: formData.get("isActive") === "true",
          version: nextVersion,
        },
      });
      if (contentChanged) {
        await tx.closingScriptRevision.create({
          data: { scriptId: id, version: nextVersion, title, body, createdById: actor.id },
        });
      }
    });

    revalidatePath(PATH);
    return { ok: true, newVersion: nextVersion, versioned: contentChanged };
  });
}

export async function toggleClosingScript(id: string, isActive: boolean) {
  return guarded(async () => {
    await requireAdmin();
    await db.closingScript.update({ where: { id }, data: { isActive } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function deleteClosingScript(id: string) {
  return guarded(async () => {
    await requireAdmin();
    // Revisionen bleiben erhalten → das Script wird nur deaktiviert.
    await db.closingScript.update({ where: { id }, data: { isActive: false } });
    revalidatePath(PATH);
    return { ok: true };
  });
}
