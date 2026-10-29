import { terminart } from "./arten";

/**
 * Mit wem der Termin ist.
 *
 * Meistens ein Kunde. Manchmal nicht: ein Erstkontakt, ein Verband, eine
 * Feuerwehr, die noch nichts gebucht hat. Beides ist ein Termin, und beides
 * braucht einen Raum, ein Ziel und ein Protokoll — nur eben nicht beides
 * einen Blueprint.
 *
 * Statt an jeder Stelle `company?.name ?? gastName ?? "—"` zu schreiben,
 * steht die Regel hier einmal.
 */

export type Gegenueber = {
  /** Wie es überall angezeigt wird. */
  name: string;
  /** Gesetzt, wenn es ein Kunde ist — dann gibt es auch eine Kundenseite. */
  companyId: string | null;
};

export function gegenueber(termin: {
  company?: { id: string; name: string } | null;
  companyId?: string | null;
  gastName?: string | null;
}): Gegenueber {
  if (termin.company) {
    return { name: termin.company.name, companyId: termin.company.id };
  }
  const gast = termin.gastName?.trim();
  if (gast) return { name: gast, companyId: null };
  /*
    Kein Kunde und kein Name — gibt es nur bei Altbestand oder wenn jemand
    an der Datenbank vorbei schreibt. Lieber ein ehrlicher Platzhalter als
    ein leeres Feld, hinter dem man einen Fehler sucht.
  */
  return { name: "Ohne Angabe", companyId: termin.companyId ?? null };
}

/**
 * Darf diese Terminart ohne Kunden stattfinden?
 *
 * Strategiegespräch und Closing dürfen es nicht: Das eine liest den
 * Blueprint eines Betriebs, das andere schreibt einen Vertrag. Beides setzt
 * voraus, dass es diesen Betrieb bei uns gibt. Alles andere — Besprechung,
 * Review, Support, Vor Ort — ist auch mit jemandem möglich, der noch kein
 * Kunde ist.
 */
export function darfOhneKunden(art: string | null | undefined): boolean {
  const a = terminart(art);
  return Boolean(a && !a.eigenerArbeitsplatz);
}
