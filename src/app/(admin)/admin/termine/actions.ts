"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { STANDARD_ART, terminart } from "@/lib/termine/arten";
import { darfOhneKunden } from "@/lib/termine/gegenueber";
import { berlinAusEingabe } from "@/lib/zeit";

/**
 * Einen Termin anlegen — von der Übersicht aus.
 *
 * Vorher ging das nur im Kundenprofil, und das hat zweierlei verhindert:
 * Wer in der Terminliste stand, musste erst wissen, wessen Profil er öffnen
 * soll — und mit jemandem, der noch kein Kunde ist, ging es überhaupt nicht.
 */

export type AnlageEingabe = {
  art: string;
  titel: string;
  /** Leer heißt: kein Kunde, dann zählt `gastName`. */
  companyId: string;
  gastName: string;
  gastEmail: string;
  datum: string;
  von: string;
  bis: string;
  notizen: string;
};

export async function terminAnlegen(eingabe: AnlageEingabe) {
  return guarded(async () => {
    const actor = await getActor();
    if (!actor || actor.role === "CLIENT") {
      return { error: "Keine Berechtigung, Termine anzulegen." };
    }

    const art = terminart(eingabe.art) ?? terminart(STANDARD_ART)!;
    const titel = eingabe.titel.trim();
    if (!titel) return { error: "Der Termin braucht einen Titel." };

    const beginn = berlinAusEingabe(eingabe.datum, eingabe.von);
    const ende = berlinAusEingabe(eingabe.datum, eingabe.bis);
    if (!beginn || !ende) return { error: "Datum oder Uhrzeit fehlt." };
    if (ende <= beginn) return { error: "Das Ende liegt vor dem Beginn." };

    /*
      Entweder ein Kunde oder ein Name. Nicht beides, nicht keins.

      Die Prüfung steht hier und nicht nur im Formular: Ein Strategiegespräch
      liest den Blueprint eines Betriebs, ein Closing schreibt einen Vertrag.
      Ohne Betrieb hätte beides nichts, womit es arbeiten könnte.
    */
    const companyId = eingabe.companyId.trim();
    const gastName = eingabe.gastName.trim();

    if (companyId) {
      const firma = await db.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!firma) return { error: "Diesen Kunden gibt es nicht." };
    } else {
      if (!gastName) {
        return { error: "Ohne Kunden braucht der Termin einen Namen — mit wem ist er?" };
      }
      if (!darfOhneKunden(art.key)) {
        return {
          error: `${art.label} geht nur mit einem Kunden aus der Liste: Dafür braucht es den Blueprint und die Stammdaten des Betriebs.`,
        };
      }
    }

    const termin = await db.appointment.create({
      data: {
        title: titel,
        type: art.key,
        startTime: beginn,
        endTime: ende,
        notes: eingabe.notizen.trim() || null,
        status: "SCHEDULED",
        companyId: companyId || null,
        gastName: companyId ? null : gastName,
        gastEmail: companyId ? null : eingabe.gastEmail.trim() || null,
      },
      select: { id: true },
    });

    revalidatePath("/admin/termine");
    if (companyId) revalidatePath(`/admin/kunden/${companyId}/termine`);
    return { ok: true as const, terminId: termin.id };
  });
}
