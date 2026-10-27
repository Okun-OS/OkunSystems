import { db } from "@/lib/db";
import { appUrl, generateToken } from "@/lib/closing/token";
import { fuehrtZurBesprechung } from "./arten";

/**
 * Der Weg eines Gastes in die Besprechung.
 *
 * Wer kein Konto bei uns hat, kann sich nicht anmelden — und soll trotzdem
 * nicht auf einer fremden Oberfläche landen. Deshalb ein Link auf unsere
 * Seite: dort steht, worum es geht, wer eingeladen hat und wann es losgeht,
 * und von dort geht es in denselben Raum, in dem auch wir sitzen.
 *
 * Der Link gilt, bis der Termin ein paar Stunden vorbei ist. Danach führt er
 * nirgends mehr hin — ein Videoraum, der ewig offen steht, ist kein Raum.
 */

/** So lange nach dem Ende bleibt der Link gültig. */
export const NACHLAUF_STUNDEN = 3;

export function gastLink(token: string): string {
  return `${appUrl()}/besprechung/${token}`;
}

/**
 * Den Zugang holen — und ihn anlegen, falls es noch keinen gibt.
 *
 * Einmal ausgestellt bleibt er derselbe: Wer den Link schon weitergegeben
 * hat, soll ihn nicht dadurch entwerten, dass er die Seite noch einmal
 * öffnet.
 */
export async function gastZugang(terminId: string): Promise<
  { ok: true; token: string; link: string } | { ok: false; error: string }
> {
  const termin = await db.appointment.findUnique({
    where: { id: terminId },
    select: { id: true, type: true, gastToken: true },
  });
  if (!termin) return { ok: false, error: "Termin nicht gefunden." };
  if (!fuehrtZurBesprechung(termin.type)) {
    return {
      ok: false,
      error: "Diese Terminart hat keinen Besprechungsraum, zu dem man einladen könnte.",
    };
  }

  if (termin.gastToken) {
    return { ok: true, token: termin.gastToken, link: gastLink(termin.gastToken) };
  }

  const token = generateToken();
  await db.appointment.update({ where: { id: terminId }, data: { gastToken: token } });
  return { ok: true, token, link: gastLink(token) };
}

export type GastSicht = {
  terminId: string;
  titel: string;
  beginn: Date;
  ende: Date;
  /** Mit wem der Termin ist — zur Begrüßung. */
  gastName: string | null;
  abgesagt: boolean;
  vorbei: boolean;
};

/** Was hinter einem Gastlink steckt — oder warum er nicht mehr trägt. */
export async function gastSicht(token: string): Promise<GastSicht | null> {
  const sauber = token.trim();
  if (!sauber) return null;

  const termin = await db.appointment.findUnique({
    where: { gastToken: sauber },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      startTime: true,
      endTime: true,
      gastName: true,
    },
  });
  if (!termin || !fuehrtZurBesprechung(termin.type)) return null;

  const grenze = new Date(termin.endTime.getTime() + NACHLAUF_STUNDEN * 3600_000);
  return {
    terminId: termin.id,
    titel: termin.title,
    beginn: termin.startTime,
    ende: termin.endTime,
    gastName: termin.gastName,
    abgesagt: termin.status === "CANCELLED",
    vorbei: new Date() > grenze,
  };
}
