"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { istMeilensteinZustand } from "@/lib/projekt/auftrag";
import { auftragUebernehmen, meilensteinZustandSetzen } from "@/lib/projekt/uebernehmen";

/**
 * Die Umsetzung fortschreiben.
 *
 * Drei Handgriffe, mehr braucht es nicht: die Auswahl übernehmen, einen
 * Meilenstein weiterschieben, das Projekt sichtbar machen oder nicht.
 */

async function erlaubt() {
  const actor = await getActor();
  if (!actor || actor.role === "CLIENT") {
    throw new Error("Keine Berechtigung für die Umsetzung.");
  }
  return actor;
}

export async function auswahlUebernehmen(companyId: string, sitzungId: string) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await db.strategieSitzung.findUnique({
      where: { id: sitzungId },
      select: { companyId: true },
    });
    if (!sitzung || sitzung.companyId !== companyId) {
      return { error: "Diese Sitzung gehört nicht zu diesem Betrieb." };
    }
    const ergebnis = await auftragUebernehmen(sitzungId);
    revalidatePath(`/admin/kunden/${companyId}/projekt`);
    return ergebnis;
  });
}

export async function zustandSetzen(
  companyId: string,
  meilensteinId: string,
  zustand: string
) {
  return guarded(async () => {
    await erlaubt();
    if (!istMeilensteinZustand(zustand)) return { error: "Unbekannter Zustand." };

    // Der Meilenstein muss zu diesem Betrieb gehören — die ID allein ist kein
    // Nachweis, sie steht im Formular des Browsers.
    const meilenstein = await db.milestone.findUnique({
      where: { id: meilensteinId },
      select: { project: { select: { companyId: true } } },
    });
    if (meilenstein?.project.companyId !== companyId) {
      return { error: "Dieser Meilenstein gehört nicht zu diesem Betrieb." };
    }

    const ergebnis = await meilensteinZustandSetzen(meilensteinId, zustand);
    revalidatePath(`/admin/kunden/${companyId}/projekt`);
    return ergebnis;
  });
}

export async function sichtbarkeitSetzen(
  companyId: string,
  projektId: string,
  sichtbar: boolean
) {
  return guarded(async () => {
    await erlaubt();
    await db.project.updateMany({
      where: { id: projektId, companyId },
      data: { isVisibleToClient: sichtbar },
    });
    revalidatePath(`/admin/kunden/${companyId}/projekt`);
    return { ok: true as const };
  });
}
