"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { bereiteVor } from "@/lib/termine/beistand";
import { schreibeProtokoll, LeereMitschriftError } from "@/lib/termine/protokoll";
import { gegenueber } from "@/lib/termine/gegenueber";
import { gastZugang } from "@/lib/termine/gastzugang";
import { sendBesprechungsEinladung } from "@/lib/email";

/**
 * Die Besprechung rundherum: Ziel setzen, Protokoll erzeugen, freigeben.
 *
 * Das Gespräch selbst läuft über die API-Route — dort zählt jede Sekunde.
 * Hier steht, was davor und danach passiert.
 */

async function erlaubt() {
  const actor = await getActor();
  if (!actor || actor.role === "CLIENT") {
    throw new Error("Keine Berechtigung für Besprechungen.");
  }
  return actor;
}

async function hole(terminId: string) {
  const termin = await db.appointment.findUnique({
    where: { id: terminId },
    select: {
      id: true,
      title: true,
      startTime: true,
      companyId: true,
      company: { select: { id: true, name: true } },
      gastName: true,
      attendees: { select: { name: true } },
      besprechung: true,
    },
  });
  if (!termin) throw new Error("Termin nicht gefunden.");
  return termin;
}

/**
 * Das Ziel festlegen — und daraus die Vorbereitung ableiten.
 *
 * Ohne Ziel gibt es keinen Beistand: Niemand kann sagen, ob ein Hinweis
 * gerade hilft, wenn unklar ist, worauf das Gespräch hinauslaufen soll.
 */
export async function zielSetzen(terminId: string, ziel: string) {
  return guarded(async () => {
    await erlaubt();
    const termin = await hole(terminId);
    const sauber = ziel.trim();

    let vorbereitung: string | null = null;
    if (sauber && process.env.ANTHROPIC_API_KEY) {
      try {
        vorbereitung = await bereiteVor(sauber, gegenueber(termin).name);
      } catch (fehler) {
        // Das Ziel ist das Wichtige; die Vorbereitung lässt sich nachholen.
        console.error("[besprechung] Vorbereitung fehlgeschlagen:", fehler);
      }
    }

    await db.besprechung.upsert({
      where: { appointmentId: terminId },
      create: { appointmentId: terminId, ziel: sauber || null, vorbereitung },
      update: { ziel: sauber || null, ...(vorbereitung ? { vorbereitung } : {}) },
    });

    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const, vorbereitung };
  });
}

/** Die Vorbereitung von Hand überschreiben. */
export async function vorbereitungSetzen(terminId: string, text: string) {
  return guarded(async () => {
    await erlaubt();
    await db.besprechung.upsert({
      where: { appointmentId: terminId },
      create: { appointmentId: terminId, vorbereitung: text.trim() || null },
      update: { vorbereitung: text.trim() || null },
    });
    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const };
  });
}

export async function protokollErzeugen(terminId: string) {
  return guarded(async () => {
    await erlaubt();
    const termin = await hole(terminId);
    if (!process.env.ANTHROPIC_API_KEY) {
      return { error: "Für das Protokoll fehlt der Zugang zum Modell." };
    }

    try {
      const protokoll = await schreibeProtokoll({
        titel: termin.title,
        beginn: termin.startTime,
        firma: gegenueber(termin).name,
        teilnehmer: termin.attendees.map((a) => a.name).filter((n): n is string => Boolean(n)),
        ziel: termin.besprechung?.ziel ?? null,
        transkript: termin.besprechung?.transkript ?? "",
        notizen: termin.besprechung?.mitschrift ?? "",
      });

      await db.besprechung.upsert({
        where: { appointmentId: terminId },
        create: { appointmentId: terminId, protokoll, protokollAm: new Date() },
        update: {
          protokoll,
          protokollAm: new Date(),
          /*
            Ein neues Protokoll ist nicht mehr das freigegebene.

            Wer nach der Freigabe noch einmal erzeugt, bekommt einen anderen
            Text — der Kunde soll nicht stillschweigend eine zweite Fassung
            lesen, die niemand geprüft hat.
          */
          freigegebenAm: null,
          freigegebenById: null,
        },
      });

      revalidatePath(`/admin/termine/${terminId}`);
      return { ok: true as const };
    } catch (fehler) {
      if (fehler instanceof LeereMitschriftError) {
        return {
          error:
            "Es liegt nichts vor, woraus sich ein Protokoll schreiben ließe — " +
            "weder Mitgehörtes noch Stichpunkte.",
        };
      }
      console.error("[besprechung] Protokoll fehlgeschlagen:", fehler);
      return { error: "Das Protokoll ließ sich nicht erzeugen." };
    }
  });
}

/** Das Protokoll ändern — bevor es jemand bekommt. */
export async function protokollSetzen(terminId: string, text: string) {
  return guarded(async () => {
    await erlaubt();
    await db.besprechung.update({
      where: { appointmentId: terminId },
      data: { protokoll: text.trim() || null },
    });
    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const };
  });
}

/**
 * Das Protokoll freigeben.
 *
 * Dieselbe Hürde wie beim Leitfaden und bei den Grundlagen — hier wiegt sie
 * schwerer: In einem Protokoll steht, was angeblich vereinbart wurde.
 */
export async function protokollFreigeben(terminId: string, frei: boolean) {
  return guarded(async () => {
    const actor = await erlaubt();
    const besprechung = await db.besprechung.findUnique({
      where: { appointmentId: terminId },
      select: { protokoll: true },
    });
    if (frei && !besprechung?.protokoll) {
      return { error: "Es gibt noch kein Protokoll zum Freigeben." };
    }
    await db.besprechung.update({
      where: { appointmentId: terminId },
      data: {
        freigegebenAm: frei ? new Date() : null,
        freigegebenById: frei ? actor.id : null,
      },
    });
    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const };
  });
}

/**
 * Den Gastlink holen — und ihn beim ersten Mal ausstellen.
 *
 * Getrennt vom Versand, weil der Link auch ohne Mailversand etwas wert ist:
 * Kopieren und über den eigenen Kanal schicken geht immer.
 */
export async function gastLinkHolen(terminId: string) {
  return guarded(async () => {
    await erlaubt();
    const zugang = await gastZugang(terminId);
    if (!zugang.ok) return { error: zugang.error };
    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const, link: zugang.link };
  });
}

/**
 * Die Einladung verschicken.
 *
 * An die hinterlegte Adresse des Gastes oder, bei einem Kunden, an dessen
 * Ansprechpartner. Scheitert der Versand, sagt die Antwort warum — und der
 * Link kommt trotzdem zurück, damit er von Hand verschickt werden kann.
 */
export async function einladungSenden(terminId: string, anAdresse?: string) {
  return guarded(async () => {
    const actor = await erlaubt();
    const termin = await db.appointment.findUnique({
      where: { id: terminId },
      select: {
        id: true, title: true, startTime: true, endTime: true,
        gastName: true, gastEmail: true,
        company: { select: { name: true, contactEmail: true, contactFirstName: true, contactLastName: true } },
      },
    });
    if (!termin) return { error: "Termin nicht gefunden." };

    const zugang = await gastZugang(terminId);
    if (!zugang.ok) return { error: zugang.error };

    const adresse = (anAdresse ?? termin.gastEmail ?? termin.company?.contactEmail ?? "").trim();
    if (!adresse) {
      return {
        ok: true as const,
        link: zugang.link,
        error:
          "Für diesen Termin ist keine E-Mail-Adresse hinterlegt. " +
          "Den Link können Sie kopieren und selbst verschicken.",
      };
    }

    const name =
      termin.gastName ??
      [termin.company?.contactFirstName, termin.company?.contactLastName]
        .filter(Boolean)
        .join(" ") ??
      null;

    const ergebnis = await sendBesprechungsEinladung({
      toEmail: adresse,
      toName: name,
      titel: termin.title,
      beginn: termin.startTime,
      ende: termin.endTime,
      link: zugang.link,
      vonName: actor.name ?? "OKUN Systems",
    });

    if (!ergebnis.ok) {
      return { ok: true as const, link: zugang.link, error: ergebnis.error };
    }

    await db.appointment.update({
      where: { id: terminId },
      data: { gastEingeladenAm: new Date() },
    });
    revalidatePath(`/admin/termine/${terminId}`);
    return { ok: true as const, link: zugang.link, gesendetAn: adresse };
  });
}
