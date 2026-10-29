"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { istCareArt } from "@/lib/care/katalog";
import { berlinZeitpunkt } from "@/lib/zeit";

/**
 * Das Leistungsprotokoll von OKUN Care.
 *
 * Es wird von Hand geführt, und das ist Absicht: Was wir für einen Betrieb
 * getan haben, weiß nur der Mensch, der es getan hat. Eine automatische
 * Ableitung aus Tickets oder Commits würde die Hälfte erfinden und die
 * andere Hälfte übersehen.
 */

async function erlaubt() {
  const actor = await getActor();
  // Der Kundenbereich gehört dem Team; nur der Kunde selbst hat hier nichts
  // zu schreiben — er liest das Protokoll auf seiner Care-Seite.
  if (!actor || actor.role === "CLIENT") {
    throw new Error("Keine Berechtigung für OKUN Care.");
  }
  return actor;
}

/** „2026-03-14" in den Moment, an dem in Berlin dieser Tag beginnt. */
function tagAusFeld(wert: string | null): Date {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(wert ?? "");
  if (!treffer) return new Date();
  return berlinZeitpunkt(Number(treffer[1]), Number(treffer[2]), Number(treffer[3]), 12);
}

export async function leistungErfassen(companyId: string, formular: FormData) {
  return guarded(async () => {
    const actor = await erlaubt();

    const titel = String(formular.get("titel") ?? "").trim();
    if (!titel) return { error: "Ohne Titel bleibt die Zeile leer." };

    const rohArt = String(formular.get("art") ?? "support");
    const art = istCareArt(rohArt) ? rohArt : "support";

    const beschreibung = String(formular.get("beschreibung") ?? "").trim();
    const rohMinuten = String(formular.get("minuten") ?? "").trim();
    const minuten = rohMinuten ? Math.max(0, Math.round(Number(rohMinuten))) : null;

    await db.careLeistung.create({
      data: {
        companyId,
        titel,
        art,
        beschreibung: beschreibung || null,
        erledigtAm: tagAusFeld(formular.get("erledigtAm") as string | null),
        minuten: Number.isFinite(minuten) ? minuten : null,
        kundeSieht: formular.get("kundeSieht") !== "nein",
        erfasstVonId: actor.id,
      },
    });

    revalidatePath(`/admin/kunden/${companyId}/care`);
    return { ok: true as const };
  });
}

export async function leistungSichtbarkeit(
  companyId: string,
  leistungId: string,
  kundeSieht: boolean
) {
  return guarded(async () => {
    await erlaubt();
    await db.careLeistung.updateMany({
      where: { id: leistungId, companyId },
      data: { kundeSieht },
    });
    revalidatePath(`/admin/kunden/${companyId}/care`);
    return { ok: true as const };
  });
}

export async function leistungLoeschen(companyId: string, leistungId: string) {
  return guarded(async () => {
    await erlaubt();
    await db.careLeistung.deleteMany({ where: { id: leistungId, companyId } });
    revalidatePath(`/admin/kunden/${companyId}/care`);
    return { ok: true as const };
  });
}

/**
 * Care von Hand setzen.
 *
 * Nicht jedes Abo kommt über Stripe: Manche Betriebe zahlen auf Rechnung,
 * und bei einem Test will man es ohne Zahlung sehen. Die Stripe-Felder
 * bleiben dabei unberührt — wer dort zahlt, wird weiter von dort
 * fortgeschrieben.
 */
export async function careStatusSetzen(companyId: string, status: "active" | "inactive") {
  return guarded(async () => {
    await erlaubt();
    const jetzt = new Date();
    await db.careSubscription.upsert({
      where: { companyId },
      create: {
        companyId,
        status,
        startedAt: status === "active" ? jetzt : null,
      },
      update: {
        status,
        startedAt: status === "active" ? jetzt : undefined,
        cancelledAt: status === "active" ? null : jetzt,
      },
    });
    revalidatePath(`/admin/kunden/${companyId}/care`);
    return { ok: true as const };
  });
}
