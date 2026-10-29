/**
 * Wer sieht welches Angebot — und wann.
 *
 * Diese beiden Regeln standen als Bedingungen mitten in der Oberfläche, und
 * eine davon war falsch: Der Knopf „Dem Kunden zeigen" hing daran, dass das
 * Angebot *nicht* das aktive sei. Ein neu angelegtes Angebot ist aber sofort
 * das aktive — der Knopf war beim ersten Angebot also nie da, `presentedAt`
 * blieb leer, und der Interessent sah nichts. Sichtbar wurde das Angebot erst,
 * als der Vertragsabschluss die Daten einfror, weil dieser Weg nicht nach
 * `presentedAt` fragt.
 *
 * Darum stehen die Regeln jetzt hier: benannt, an einer Stelle und geprüft.
 * Eine Bedingung, an der ein Verkaufsgespräch hängt, gehört nicht in ein
 * `className`-Dickicht.
 */

export type AngebotsZustand = {
  id: string;
  /** Gesetzt, sobald der Berater es dem Interessenten aufgeschaltet hat. */
  presentedAt: Date | string | null;
  /** draft | presented | accepted | … */
  status: string;
};

/**
 * Steht an diesem Angebot ein Knopf, der es dem Kunden zeigt?
 *
 * Ja, solange es noch nie gezeigt wurde — und auch dann wieder, wenn es zwar
 * gezeigt wurde, inzwischen aber ein anderes Angebot aufgeschaltet ist. Im
 * Gespräch kommt oft eine zweite Variante auf den Tisch und danach der Wunsch,
 * zur ersten zurückzukehren.
 *
 * Nein, wenn es bereits angenommen ist: Dann ist es kein Angebot mehr,
 * sondern ein Vertrag.
 */
export function kannGezeigtWerden(
  angebot: AngebotsZustand,
  aktivesAngebotId: string | null
): boolean {
  if (angebot.status === "accepted") return false;
  if (!angebot.presentedAt) return true;
  return angebot.id !== aktivesAngebotId;
}

/** Was auf dem Knopf steht. */
export function knopfBeschriftung(angebot: AngebotsZustand): string {
  return angebot.presentedAt ? "Erneut zeigen" : "Dem Kunden zeigen";
}

/**
 * Liegt beim Interessenten gerade ein Angebot auf dem Bildschirm?
 *
 * Nach der Freischaltung nicht mehr — dann ist das Gespräch vorbei und der
 * Kunde sieht seinen Zugang. Und nicht, solange das Radar Vorrang hat: Beides
 * sind Vollbilder, und es gewinnt, was zuletzt aufgeschaltet wurde.
 */
export function angebotAufDerBuehne(stand: {
  isActivated: boolean;
  radarActive: boolean;
  radarVorrang: boolean;
  offerPresented: boolean;
}): boolean {
  if (stand.isActivated) return false;
  if (stand.radarActive && stand.radarVorrang) return false;
  return stand.offerPresented;
}
