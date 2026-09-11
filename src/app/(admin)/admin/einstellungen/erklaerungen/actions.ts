"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin, guarded } from "@/lib/auth-guards";
import { CONSENT_TYPES } from "@/lib/closing/consent-resolver";

/**
 * Consent-Konfiguration.
 *
 * Sämtliche Checkbox-Texte sind hier frei bearbeitbar — ausdrücklich auch der
 * Text der Einwilligung in die Vertragsaufzeichnung (Typ RECORDING_CONSENT).
 * Im Code ist keine dieser Formulierungen hinterlegt.
 *
 * Änderungen wirken nur auf künftige Abschlüsse: bereits eingefrorene Contract
 * Snapshots und geschriebene Audit Events bleiben unverändert. Jede Textänderung
 * erhöht die Version und wird als Revision archiviert.
 */

const PATH = "/admin/einstellungen/erklaerungen";

function parseAppliesTo(raw: string | null): string[] | null {
  if (!raw?.trim()) return null;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : null;
}

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

export async function createConsentDefinition(formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const title = (formData.get("title") as string)?.trim();
    const checkboxText = (formData.get("checkboxText") as string)?.trim();
    const consentType = (formData.get("consentType") as string)?.trim();
    if (!title) return { error: "Titel ist Pflichtfeld." };
    if (!checkboxText) return { error: "Der Checkbox-Text ist Pflichtfeld." };
    if (!(CONSENT_TYPES as readonly string[]).includes(consentType)) {
      return { error: "Ungültiger Consent-Typ." };
    }

    const contractDocumentId = (formData.get("contractDocumentId") as string)?.trim() || null;
    const documentVersionId = (formData.get("documentVersionId") as string)?.trim() || null;

    if (consentType !== "RECORDING_CONSENT" && !contractDocumentId && !documentVersionId) {
      return {
        error:
          "Bitte ein Vertragsdokument zuordnen. Nur Einwilligungen zur Aufzeichnung dürfen ohne Dokument stehen.",
      };
    }

    const baseKey = (formData.get("key") as string)?.trim() || slugify(title);
    let key = baseKey;
    for (let i = 2; await db.consentDefinition.findUnique({ where: { key } }); i++) {
      key = `${baseKey}_${i}`;
    }

    const appliesTo = parseAppliesTo(formData.get("appliesTo") as string);

    const created = await db.consentDefinition.create({
      data: {
        key,
        title,
        checkboxText,
        consentType,
        isRequired: formData.get("isRequired") === "true",
        isActive: formData.get("isActive") === "true",
        displayOrder: Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
        appliesTo: appliesTo ?? undefined,
        contractDocumentId,
        documentVersionId,
        createdById: actor.id,
        version: 1,
      },
    });

    await db.consentDefinitionRevision.create({
      data: {
        definitionId: created.id,
        version: 1,
        title,
        checkboxText,
        consentType,
        isRequired: created.isRequired,
        appliesTo: appliesTo ?? undefined,
        createdById: actor.id,
      },
    });

    revalidatePath(PATH);
    return { ok: true, id: created.id };
  });
}

export async function updateConsentDefinition(id: string, formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const existing = await db.consentDefinition.findUnique({ where: { id } });
    if (!existing) return { error: "Erklärung nicht gefunden." };

    const title = (formData.get("title") as string)?.trim();
    const checkboxText = (formData.get("checkboxText") as string)?.trim();
    const consentType = (formData.get("consentType") as string)?.trim();
    if (!title) return { error: "Titel ist Pflichtfeld." };
    if (!checkboxText) return { error: "Der Checkbox-Text ist Pflichtfeld." };
    if (!(CONSENT_TYPES as readonly string[]).includes(consentType)) {
      return { error: "Ungültiger Consent-Typ." };
    }

    const isRequired = formData.get("isRequired") === "true";
    const appliesTo = parseAppliesTo(formData.get("appliesTo") as string);

    // Nur inhaltliche Änderungen erzeugen eine neue Version.
    const contentChanged =
      existing.title !== title ||
      existing.checkboxText !== checkboxText ||
      existing.consentType !== consentType ||
      existing.isRequired !== isRequired;
    const nextVersion = contentChanged ? existing.version + 1 : existing.version;

    await db.$transaction(async (tx) => {
      await tx.consentDefinition.update({
        where: { id },
        data: {
          title,
          checkboxText,
          consentType,
          isRequired,
          isActive: formData.get("isActive") === "true",
          displayOrder:
            Number.parseInt((formData.get("displayOrder") as string) ?? "0", 10) || 0,
          appliesTo: appliesTo ?? undefined,
          contractDocumentId: (formData.get("contractDocumentId") as string)?.trim() || null,
          documentVersionId: (formData.get("documentVersionId") as string)?.trim() || null,
          version: nextVersion,
        },
      });
      if (contentChanged) {
        await tx.consentDefinitionRevision.create({
          data: {
            definitionId: id,
            version: nextVersion,
            title,
            checkboxText,
            consentType,
            isRequired,
            appliesTo: appliesTo ?? undefined,
            createdById: actor.id,
          },
        });
      }
    });

    revalidatePath(PATH);
    return { ok: true, newVersion: nextVersion, versioned: contentChanged };
  });
}

export async function toggleConsentDefinition(id: string, isActive: boolean) {
  return guarded(async () => {
    await requireAdmin();
    await db.consentDefinition.update({ where: { id }, data: { isActive } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function reorderConsentDefinition(id: string, displayOrder: number) {
  return guarded(async () => {
    await requireAdmin();
    await db.consentDefinition.update({ where: { id }, data: { displayOrder } });
    revalidatePath(PATH);
    return { ok: true };
  });
}
