"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import {
  darfWaehlen,
  freigabeHindernisse,
  pruefeAuswahl,
  type PostenStand,
} from "@/lib/strategie/engine";
import type { PostenArt, PostenZustand } from "@/lib/strategie/katalog";
import { beruehre, ladeSitzung, setzeAufgaben, setzeSitzungAuf } from "@/lib/strategie/sitzung";
import { berlinTeile, berlinZeitpunkt } from "@/lib/zeit";

/**
 * Die Vorbereitung des Strategiegesprächs.
 *
 * Alles hier ist Vorbereitung — im Gespräch selbst wird nur noch gewählt.
 * Deshalb liegt die Prüfung hier und nicht erst bei der Freigabe: Wer im
 * Termin merkt, dass ein Posten nicht eingeordnet ist, kann nichts mehr tun.
 */

async function erlaubt() {
  const actor = await getActor();
  if (!actor || !mayDoStrategy(actor.role, actor.canStrategy)) {
    throw new Error("Keine Berechtigung für Strategiegespräche.");
  }
  return actor;
}

function aktualisiere(companyId: string, sitzungId?: string) {
  revalidatePath(`/admin/kunden/${companyId}/strategie`);
  if (sitzungId) revalidatePath(`/admin/kunden/${companyId}/strategie/${sitzungId}`);
}

/** Lädt die Sitzung und stellt sicher, dass sie zu diesem Betrieb gehört. */
async function hole(sitzungId: string) {
  const sitzung = await ladeSitzung(sitzungId);
  if (!sitzung) throw new Error("Strategiesitzung nicht gefunden.");
  return sitzung;
}

export async function sitzungAufsetzen(companyId: string, appointmentId: string) {
  return guarded(async () => {
    const actor = await erlaubt();
    const ergebnis = await setzeSitzungAuf({ appointmentId, beraterId: actor.id });
    if ("error" in ergebnis) return ergebnis;
    aktualisiere(companyId, ergebnis.sitzungId);
    return ergebnis;
  });
}

/**
 * Termin anlegen und Sitzung in einem Zug aufsetzen.
 *
 * Der Weg ins Transformation Studio führt über eine Sitzung, die Sitzung
 * über einen Strategietermin — und ein Betrieb, bei dem noch keiner
 * angelegt ist, kam hier nicht weiter. Das Haus wirkte dadurch dreimal
 * hintereinander verschwunden, obwohl nur ein Termin fehlte.
 *
 * Deshalb dieser eine Knopf. Der Termin ist echt und steht danach unter
 * „Termine" — verschieben, umbenennen und absagen geht dort wie bei jedem
 * anderen. Misslingt das Aufsetzen, wird er wieder entfernt: Ein Termin,
 * zu dem es keine Sitzung gibt, wäre eine Leiche im Kalender des Kunden.
 */
export async function terminUndSitzungAnlegen(companyId: string) {
  return guarded(async () => {
    const actor = await erlaubt();

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) return { error: "Betrieb nicht gefunden." };

    /*
      Die nächste volle Stunde in Berlin.

      Nicht „jetzt": Ein Termin, der in der Vergangenheit beginnt, steht
      beim Kunden sofort als verpasst. Und nicht in drei Tagen, weil der
      Termin ohnehin verschoben wird — er ist der Haken, an dem die Sitzung
      hängt, nicht die Verabredung.
    */
    const jetzt = new Date();
    const t = berlinTeile(jetzt);
    const beginn = berlinZeitpunkt(t.jahr, t.monat, t.tag, t.stunde + 1, 0);
    const ende = new Date(beginn.getTime() + 60 * 60 * 1000);

    const termin = await db.appointment.create({
      data: {
        title: "Strategiegespräch",
        type: "STRATEGY",
        status: "SCHEDULED",
        startTime: beginn,
        endTime: ende,
        companyId,
        notes: "Beim Aufsetzen der Sitzung angelegt — Zeit bei Bedarf anpassen.",
      },
      select: { id: true },
    });

    const ergebnis = await setzeSitzungAuf({
      appointmentId: termin.id,
      beraterId: actor.id,
    });
    if ("error" in ergebnis) {
      await db.appointment.delete({ where: { id: termin.id } }).catch(() => {
        // Bleibt er doch stehen, ist er unter „Termine" von Hand zu löschen —
        // schlimmer wäre, die eigentliche Ursache hier zu verschlucken.
      });
      return ergebnis;
    }

    revalidatePath(`/admin/kunden/${companyId}/termine`);
    aktualisiere(companyId, ergebnis.sitzungId);
    return ergebnis;
  });
}

export async function postenArtSetzen(sitzungId: string, postenId: string, art: PostenArt) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    await db.strategiePosten.update({ where: { id: postenId }, data: { art } });
    await beruehre(sitzungId);
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

export async function postenZustandSetzen(
  sitzungId: string,
  postenId: string,
  zustand: PostenZustand
) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);

    const stand: PostenStand[] = sitzung.posten.map((p) => ({
      id: p.id,
      art: p.art,
      zustand: p.zustand,
      titel: p.titel,
      kundeSieht: p.kundeSieht,
    }));
    const dieser = stand.find((p) => p.id === postenId);
    if (!dieser) return { error: "Posten gehört nicht zu dieser Sitzung." };

    // Die Grenze gilt hier, nicht erst in der Oberfläche. Ein Knopf lässt sich
    // umgehen, eine Serverprüfung nicht — und an dieser Grenze hängt, ob aus
    // dem Gespräch eine Nachforderung wird.
    if (zustand === "gewaehlt") {
      const urteil = darfWaehlen(dieser, stand);
      if (!urteil.erlaubt) return { error: urteil.grund ?? "Nicht wählbar." };
    }

    await db.strategiePosten.update({ where: { id: postenId }, data: { zustand } });
    await beruehre(sitzungId);
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

export async function postenSichtbarkeitSetzen(
  sitzungId: string,
  postenId: string,
  kundeSieht: boolean
) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    await db.strategiePosten.update({ where: { id: postenId }, data: { kundeSieht } });
    await beruehre(sitzungId);
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

export async function postenAufgabenSetzen(
  sitzungId: string,
  postenId: string,
  aufgabenKeys: string[]
) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    const ergebnis = await setzeAufgaben(postenId, aufgabenKeys);
    if ("error" in ergebnis) return ergebnis;
    aktualisiere(sitzung.companyId, sitzungId);
    return ergebnis;
  });
}

export async function postenAufwandSetzen(
  sitzungId: string,
  postenId: string,
  internerAufwand: string
) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    await db.strategiePosten.update({
      where: { id: postenId },
      data: { internerAufwand: internerAufwand.trim() || null },
    });
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

/**
 * Die Freigabe — ab hier erreicht die Sitzung den Kunden.
 *
 * Mit Hindernissen: Was nicht eingeordnet ist oder nichts zur Wahl stellt,
 * geht nicht durch. Die Freigabe ist der einzige Ort, an dem ein Mensch
 * bestätigt, dass er gelesen hat, was eine Maschine geschrieben hat.
 */
export async function sitzungFreigeben(sitzungId: string) {
  return guarded(async () => {
    const actor = await erlaubt();
    const sitzung = await hole(sitzungId);

    const hindernisse = freigabeHindernisse(
      sitzung.posten.map((p) => ({
        id: p.id,
        art: p.art,
        zustand: p.zustand,
        titel: p.titel,
        kundeSieht: p.kundeSieht,
        aufwandHeuteMinuten: p.aufwandHeuteMinuten,
      }))
    );
    if (hindernisse.length > 0) return { error: hindernisse.join(" ") };

    await db.strategieSitzung.update({
      where: { id: sitzungId },
      data: {
        status: "freigegeben",
        freigegebenAm: new Date(),
        freigegebenById: actor.id,
        rev: { increment: 1 },
      },
    });
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

export async function freigabeZuruecknehmen(sitzungId: string) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    if (sitzung.abgeschlossenAm) {
      return { error: "Das Gespräch ist abgeschlossen — daran ändert sich nichts mehr." };
    }
    await db.strategieSitzung.update({
      where: { id: sitzungId },
      data: {
        status: "vorbereitet",
        freigegebenAm: null,
        freigegebenById: null,
        rev: { increment: 1 },
      },
    });
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

export async function notizSetzen(sitzungId: string, notiz: string) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    await db.strategieSitzung.update({
      where: { id: sitzungId },
      data: { interneNotiz: notiz.trim() || null },
    });
    aktualisiere(sitzung.companyId, sitzungId);
    return { ok: true as const };
  });
}

/** Der Stand der Auswahl — für die Anzeige im Kopf der Vorbereitung. */
export async function auswahlStand(sitzungId: string) {
  return guarded(async () => {
    await erlaubt();
    const sitzung = await hole(sitzungId);
    return pruefeAuswahl(
      sitzung.posten.map((p) => ({
        id: p.id,
        art: p.art,
        zustand: p.zustand,
        titel: p.titel,
        kundeSieht: p.kundeSieht,
      }))
    );
  });
}
