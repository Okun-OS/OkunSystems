import { db } from "@/lib/db";
import {
  auftragsPosten,
  projektFortschritt,
  projektStatus,
  type AuftragsPosten,
} from "./auftrag";

/**
 * Die Auswahl eines Strategiegesprächs in ein Projekt übernehmen.
 *
 * Zweimal ausgeführt ändert nichts Zweites: Das Projekt hängt an der Sitzung,
 * jeder Meilenstein an seinem Posten. Wer nach dem Gespräch noch einen Posten
 * nachwählt, führt es erneut aus und bekommt einen Meilenstein mehr — die
 * Zustände der anderen bleiben, wie sie waren.
 */

export type UebernahmeErgebnis =
  | { ok: true; projektId: string; neu: number; gesamt: number }
  | { error: string };

export async function auftragUebernehmen(sitzungId: string): Promise<UebernahmeErgebnis> {
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: {
      id: true,
      companyId: true,
      company: { select: { name: true } },
      projekt: { select: { id: true } },
      posten: {
        select: {
          id: true,
          titel: true,
          warum: true,
          art: true,
          zustand: true,
          kundeSieht: true,
          position: true,
        },
      },
    },
  });
  if (!sitzung) return { error: "Strategiesitzung nicht gefunden." };

  const auftrag = auftragsPosten(sitzung.posten as AuftragsPosten[]);
  if (auftrag.length === 0) {
    return { error: "In diesem Gespräch ist nichts gewählt, was umgesetzt werden könnte." };
  }

  const projektId =
    sitzung.projekt?.id ??
    (
      await db.project.create({
        data: {
          title: `Umsetzung ${sitzung.company.name}`,
          description:
            "Die im Strategiegespräch gewählten Lösungen — in der Reihenfolge, " +
            "in der sie umgesetzt werden.",
          status: "PLANNING",
          companyId: sitzung.companyId,
          strategieSitzungId: sitzung.id,
          /*
            Sichtbar von Anfang an.

            Ein Projekt, das erst freigegeben wird, wenn jemand daran denkt,
            ist für den Kunden nicht vorhanden — und die Auswahl, die er im
            Gespräch mitgetroffen hat, kennt er ohnehin.
          */
          isVisibleToClient: true,
        },
        select: { id: true },
      })
    ).id;

  const vorhanden = new Set(
    (
      await db.milestone.findMany({
        where: { projectId: projektId, postenId: { not: null } },
        select: { postenId: true },
      })
    ).map((m) => m.postenId)
  );

  let neu = 0;
  for (const [index, posten] of auftrag.entries()) {
    if (vorhanden.has(posten.id)) {
      // Nur die Reihenfolge nachziehen; der Zustand gehört der Umsetzung.
      await db.milestone.updateMany({
        where: { projectId: projektId, postenId: posten.id },
        data: { title: posten.titel, order: index },
      });
      continue;
    }
    await db.milestone.create({
      data: {
        title: posten.titel,
        description: posten.warum,
        zustand: "geplant",
        completed: false,
        order: index,
        projectId: projektId,
        postenId: posten.id,
      },
    });
    neu++;
  }

  await schreibeFortschritt(projektId);

  return { ok: true, projektId, neu, gesamt: auftrag.length };
}

/**
 * Den Zustand eines Meilensteins setzen und das Projekt nachziehen.
 *
 * `completed` bleibt dabei die Spiegelung von „live": Die Übersichten, die es
 * schon lesen, sollen weiter stimmen, ohne dass sie den neuen Zustand kennen
 * müssen.
 */
export async function meilensteinZustandSetzen(
  meilensteinId: string,
  zustand: "geplant" | "umsetzung" | "live"
): Promise<{ ok: true; projektId: string } | { error: string }> {
  const meilenstein = await db.milestone.findUnique({
    where: { id: meilensteinId },
    select: { id: true, projectId: true },
  });
  if (!meilenstein) return { error: "Meilenstein nicht gefunden." };

  await db.milestone.update({
    where: { id: meilensteinId },
    data: {
      zustand,
      completed: zustand === "live",
      completedAt: zustand === "live" ? new Date() : null,
    },
  });

  await schreibeFortschritt(meilenstein.projectId);
  return { ok: true, projektId: meilenstein.projectId };
}

/** Fortschritt und Status eines Projekts aus seinen Meilensteinen neu setzen. */
export async function schreibeFortschritt(projektId: string): Promise<void> {
  const meilensteine = await db.milestone.findMany({
    where: { projectId: projektId },
    select: { zustand: true },
  });
  const zustaende = meilensteine.map((m) => m.zustand);
  await db.project.update({
    where: { id: projektId },
    data: {
      progress: projektFortschritt(zustaende),
      status: projektStatus(zustaende),
    },
  });
}
