"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, guarded } from "@/lib/auth-guards";
import { TEMPLATE_TYPES } from "@/lib/documents/render";
import { extractPlaceholders } from "@/lib/documents/template-engine";
import { isSystemPlaceholderKey } from "@/lib/invoicing/context";

/**
 * Dokumentvorlagen und Custom Placeholder.
 *
 * Jede Änderung an HTML/CSS erzeugt eine neue Template-Version. Bereits
 * erzeugte Dokumente verweisen auf ihre Version und bleiben unverändert.
 */

const PATH = "/admin/einstellungen/vorlagen";

const PLACEHOLDER_TYPES = ["text", "multiline", "number", "date", "currency", "boolean"];

export async function createDocumentTemplate(formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const name = (formData.get("name") as string)?.trim();
    const type = (formData.get("type") as string)?.trim();
    if (!name) return { error: "Name ist Pflichtfeld." };
    if (!(TEMPLATE_TYPES as readonly string[]).includes(type)) {
      return { error: "Ungültiger Dokumenttyp." };
    }

    const html = (formData.get("html") as string) ?? "";
    const css = (formData.get("css") as string) ?? "";
    if (!html.trim()) return { error: "Das Template-HTML darf nicht leer sein." };

    const created = await db.documentTemplate.create({
      data: {
        name,
        type,
        description: (formData.get("description") as string)?.trim() || null,
        isActive: true,
        isDefault: false,
        currentVersion: 1,
        createdById: actor.id,
      },
      select: { id: true },
    });
    await db.documentTemplateVersion.create({
      data: { templateId: created.id, version: 1, html, css, createdById: actor.id },
    });

    revalidatePath(PATH);
    return { ok: true, id: created.id };
  });
}

/** Speichert eine neue Version — die bestehende bleibt unverändert erhalten. */
export async function saveTemplateVersion(templateId: string, formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const template = await db.documentTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Vorlage nicht gefunden." };

    const html = (formData.get("html") as string) ?? "";
    const css = (formData.get("css") as string) ?? "";
    if (!html.trim()) return { error: "Das Template-HTML darf nicht leer sein." };

    const current = await db.documentTemplateVersion.findFirst({
      where: { templateId, version: template.currentVersion },
    });
    if (current && current.html === html && current.css === css) {
      return { ok: true, version: template.currentVersion, unchanged: true };
    }

    const nextVersion = template.currentVersion + 1;
    await db.$transaction([
      db.documentTemplateVersion.create({
        data: {
          templateId,
          version: nextVersion,
          html,
          css,
          note: (formData.get("note") as string)?.trim() || null,
          createdById: actor.id,
        },
      }),
      db.documentTemplate.update({
        where: { id: templateId },
        data: {
          currentVersion: nextVersion,
          name: (formData.get("name") as string)?.trim() || template.name,
          description: (formData.get("description") as string)?.trim() ?? template.description,
        },
      }),
    ]);

    revalidatePath(PATH);
    return { ok: true, version: nextVersion, unchanged: false };
  });
}

export async function setTemplateDefault(templateId: string) {
  return guarded(async () => {
    await requireAdmin();
    const template = await db.documentTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Vorlage nicht gefunden." };
    await db.$transaction([
      db.documentTemplate.updateMany({
        where: { type: template.type, isDefault: true },
        data: { isDefault: false },
      }),
      db.documentTemplate.update({
        where: { id: templateId },
        data: { isDefault: true, isActive: true },
      }),
    ]);
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function toggleTemplateActive(templateId: string, isActive: boolean) {
  return guarded(async () => {
    await requireAdmin();
    await db.documentTemplate.update({ where: { id: templateId }, data: { isActive } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

/** Setzt eine ältere Version wieder als aktuelle Version (als neue Version). */
export async function restoreTemplateVersion(templateId: string, version: number) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const source = await db.documentTemplateVersion.findFirst({
      where: { templateId, version },
    });
    if (!source) return { error: "Version nicht gefunden." };
    const template = await db.documentTemplate.findUnique({ where: { id: templateId } });
    if (!template) return { error: "Vorlage nicht gefunden." };

    const nextVersion = template.currentVersion + 1;
    await db.$transaction([
      db.documentTemplateVersion.create({
        data: {
          templateId,
          version: nextVersion,
          html: source.html,
          css: source.css,
          settings: source.settings ?? undefined,
          note: `Wiederhergestellt aus Version ${version}`,
          createdById: actor.id,
        },
      }),
      db.documentTemplate.update({
        where: { id: templateId },
        data: { currentVersion: nextVersion },
      }),
    ]);
    revalidatePath(PATH);
    return { ok: true, version: nextVersion };
  });
}

export async function createCustomPlaceholder(templateId: string, formData: FormData) {
  return guarded(async () => {
    await requireAdmin();
    const key = (formData.get("key") as string)?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const label = (formData.get("label") as string)?.trim();
    const type = (formData.get("type") as string)?.trim() || "text";
    if (!key) return { error: "Der Platzhalter-Schlüssel ist Pflichtfeld." };
    if (!label) return { error: "Der Anzeigename ist Pflichtfeld." };
    if (!PLACEHOLDER_TYPES.includes(type)) return { error: "Ungültiger Feldtyp." };
    // Systemfelder dürfen nicht überschrieben werden.
    if (isSystemPlaceholderKey(key)) {
      return { error: "Dieser Schlüssel ist für Systemfelder reserviert." };
    }

    const duplicate = await db.customPlaceholder.findFirst({ where: { templateId, key } });
    if (duplicate) return { error: `Der Platzhalter „${key}" existiert bereits.` };

    await db.customPlaceholder.create({
      data: {
        templateId,
        key,
        label,
        type,
        defaultValue: (formData.get("defaultValue") as string)?.trim() || null,
        isRequired: formData.get("isRequired") === "true",
        displayOrder: Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
      },
    });
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function deleteCustomPlaceholder(id: string) {
  return guarded(async () => {
    await requireAdmin();
    await db.customPlaceholder.delete({ where: { id } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

/** Prüft, welche Platzhalter ein Template verwendet — für die Admin-Vorschau. */
export async function analyzeTemplate(html: string) {
  return guarded(async () => {
    await requireAdmin();
    const placeholders = extractPlaceholders(html);
    return {
      ok: true,
      system: placeholders.filter((p) => isSystemPlaceholderKey(p)),
      custom: placeholders.filter((p) => p.startsWith("custom.")).map((p) => p.slice(7)),
      unknown: placeholders.filter((p) => !isSystemPlaceholderKey(p) && !p.startsWith("custom.")),
    };
  });
}
