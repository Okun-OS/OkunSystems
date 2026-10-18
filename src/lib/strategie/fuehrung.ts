import { db } from "@/lib/db";
import { alsAnsicht, kundeDarfSehen, type AnsichtKey } from "./katalog";
import { fuehrungFuer, istBeraterDa, type Fuehrung } from "./engine";

/**
 * Wer führt, und wer sieht mit.
 *
 * Im Gespräch geht der Berater durchs Haus und der Kunde sieht denselben
 * Raum — nicht, weil ein Bildschirm geteilt wird, sondern weil beide Seiten
 * denselben Stand von hier lesen. Das ist dasselbe Muster wie beim Radar im
 * Closing und hat denselben Grund: Ein geteilter Bildschirm zeigt dem Kunden
 * die Oberfläche des Beraters samt allem, was ihn nichts angeht.
 *
 * Nach dem Gespräch dreht es sich um. Dann ist niemand mehr da, der führt,
 * und der Kunde geht allein durchs Haus — das ist der Satz aus dem letzten
 * Raum: Was er gesehen hat, steht ab sofort in seinem Portal.
 */

export type { Fuehrung };

export type Stand = {
  sitzungId: string;
  ansicht: AnsichtKey;
  /** 0 = wie es heute ist, 1 = wie es danach ist. */
  stufe: number;
  rev: number;
  /** Wie der Kunde das Haus gerade betritt. */
  fuehrung: Fuehrung;
  /** Ist der Berater gerade im Gespräch? */
  beraterDa: boolean;
  abgeschlossen: boolean;
};

/** Den Stand lesen, den die Kundenseite anzeigt. */
export async function ladeStand(sitzungId: string): Promise<Stand | null> {
  const s = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: {
      id: true,
      status: true,
      ansicht: true,
      ansichtStufe: true,
      rev: true,
      freigegebenAm: true,
      beraterPresenceAt: true,
      abgeschlossenAm: true,
    },
  });
  if (!s) return null;
  if (!kundeDarfSehen(s.status, s.freigegebenAm)) return null;

  return {
    sitzungId: s.id,
    ansicht: alsAnsicht(s.ansicht),
    stufe: s.ansichtStufe,
    rev: s.rev,
    fuehrung: fuehrungFuer(s),
    beraterDa: istBeraterDa(s.beraterPresenceAt),
    abgeschlossen: Boolean(s.abgeschlossenAm),
  };
}

/**
 * Den Ort setzen, an dem beide Seiten stehen.
 *
 * Nur der Berater ruft das auf, und zwar bei jedem Schritt im Rundgang. Der
 * Aufruf ist zugleich das Lebenszeichen: Wer führt, bewegt sich — und wer
 * sich zehn Minuten nicht bewegt hat, führt nicht mehr.
 */
export async function setzeAnsicht(
  sitzungId: string,
  roh: string
): Promise<{ ok: true; ansicht: AnsichtKey; rev: number } | { error: string }> {
  const ansicht = alsAnsicht(roh);
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { id: true, status: true, abgeschlossenAm: true },
  });
  if (!sitzung) return { error: "Sitzung nicht gefunden." };
  if (sitzung.abgeschlossenAm) {
    return { error: "Das Gespräch ist abgeschlossen und lässt sich nicht mehr steuern." };
  }

  const aktualisiert = await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: {
      ansicht,
      // Jeder Raum fängt bei „heute" an. Wer zurückkommt, soll denselben
      // Knopf noch einmal drücken können.
      ansichtStufe: 0,
      beraterPresenceAt: new Date(),
      // Sobald jemand den ersten Schritt tut, läuft das Gespräch. Den Status
      // von Hand umzustellen wäre ein weiterer Knopf, den im Termin niemand
      // drückt.
      ...(sitzung.status === "freigegeben" ? { status: "laeuft" } : {}),
      rev: { increment: 1 },
    },
    select: { rev: true },
  });

  return { ok: true, ansicht, rev: aktualisiert.rev };
}

/**
 * Den Takt im Raum weiterschalten.
 *
 * Ein Raum erzählt sich in Schritten: erst die Einführung, dann Station für
 * Station, dann der Umbau. Welcher Schritt das ist, weiß nur der Raum — hier
 * steht nur die Zahl, damit beide Seiten beim selben Schritt stehen. Deshalb
 * ist das auch ein eigener Aufruf und nicht Teil des Ortswechsels: Im
 * Gespräch setzt er den Moment, erst reden, dann weiterschalten.
 */
export const MAX_STUFE = 99;

export async function setzeStufe(
  sitzungId: string,
  stufe: number
): Promise<{ ok: true; stufe: number; rev: number } | { error: string }> {
  const sauber = Math.min(Math.max(Math.round(stufe) || 0, 0), MAX_STUFE);
  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { abgeschlossenAm: true },
  });
  if (!sitzung) return { error: "Sitzung nicht gefunden." };
  if (sitzung.abgeschlossenAm) {
    return { error: "Das Gespräch ist abgeschlossen und lässt sich nicht mehr steuern." };
  }

  const aktualisiert = await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { ansichtStufe: sauber, beraterPresenceAt: new Date(), rev: { increment: 1 } },
    select: { rev: true },
  });
  return { ok: true, stufe: sauber, rev: aktualisiert.rev };
}

/** Lebenszeichen ohne Ortswechsel — der Berater ist da, geht aber nicht. */
export async function meldeDa(sitzungId: string): Promise<void> {
  await db.strategieSitzung.update({
    where: { id: sitzungId },
    data: { beraterPresenceAt: new Date() },
  });
}

/**
 * Die Sitzung, die dieser Betrieb gerade sehen darf.
 *
 * Höchstens eine: Gibt es mehrere freigegebene, ist die zum nächsten Termin
 * gehörende die richtige. Vorbereitete ohne Freigabe erreichen den Kunden
 * nie — dafür ist die Freigabe da.
 */
export async function sitzungFuerKunde(companyId: string): Promise<string | null> {
  const sitzung = await db.strategieSitzung.findFirst({
    where: {
      companyId,
      freigegebenAm: { not: null },
      status: { in: ["freigegeben", "laeuft", "abgeschlossen"] },
    },
    orderBy: [{ abgeschlossenAm: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: { id: true },
  });
  return sitzung?.id ?? null;
}
