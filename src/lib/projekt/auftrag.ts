/**
 * Vom Arbeitsauftrag zum Projektstatus.
 *
 * Im Strategiegespräch wird gewählt; danach beginnt die Umsetzung. Bisher
 * endete die Spur dort: Die Auswahl stand als JSON in der Sitzung, und das
 * Projekt wurde daneben von Hand angelegt — mit Titeln, die anders hießen als
 * im Gespräch. Der Kunde sah das Haus mit seiner Auswahl und daneben einen
 * Projektstatus, der davon nichts wusste.
 *
 * Deshalb wird aus jedem gewählten Posten genau ein Meilenstein. Nicht als
 * Kopie, sondern als Verweis: `Milestone.postenId` hält beides zusammen, und
 * ein zweiter Durchlauf schreibt dasselbe Projekt fort, statt ein zweites
 * anzulegen.
 *
 * Hier liegen die Regeln ohne Datenbank — die Schritte dorthin nebenan.
 */

export const MEILENSTEIN_ZUSTAENDE = [
  {
    key: "geplant",
    label: "Geplant",
    kundentext: "Steht auf der Liste, noch nicht begonnen.",
  },
  {
    key: "umsetzung",
    label: "In Umsetzung",
    kundentext: "Wir bauen daran.",
  },
  { key: "live", label: "Live", kundentext: "Läuft bei Ihnen." },
] as const;

export type MeilensteinZustand = (typeof MEILENSTEIN_ZUSTAENDE)[number]["key"];

export function istMeilensteinZustand(wert: string): wert is MeilensteinZustand {
  return MEILENSTEIN_ZUSTAENDE.some((z) => z.key === wert);
}

export function zustandLabel(key: string): string {
  return MEILENSTEIN_ZUSTAENDE.find((z) => z.key === key)?.label ?? "Geplant";
}

/**
 * Wie weit ein Projekt ist.
 *
 * Ein Meilenstein in Umsetzung zählt halb. Das ist keine Messung, sondern
 * eine Zusage an den Kunden: Dass gearbeitet wird, soll man sehen, ohne dass
 * jemand Prozente schätzt. Fertig ist nur, was live ist.
 */
export function projektFortschritt(
  zustaende: readonly string[]
): number {
  if (zustaende.length === 0) return 0;
  const punkte = zustaende.reduce((summe, z) => {
    if (z === "live") return summe + 1;
    if (z === "umsetzung") return summe + 0.5;
    return summe;
  }, 0);
  return Math.round((punkte / zustaende.length) * 100);
}

/**
 * Der Status des Projekts, abgeleitet aus seinen Meilensteinen.
 *
 * Von Hand gepflegt wäre er nach dem zweiten Meilenstein falsch. Ein Projekt
 * ohne Meilensteine bleibt in Planung — nicht „fertig", auch wenn null von
 * null erledigt sind.
 */
export function projektStatus(zustaende: readonly string[]): string {
  if (zustaende.length === 0) return "PLANNING";
  if (zustaende.every((z) => z === "live")) return "COMPLETED";
  if (zustaende.some((z) => z === "umsetzung" || z === "live")) return "ACTIVE";
  return "PLANNING";
}

export type AuftragsPosten = {
  id: string;
  titel: string;
  /** Was der Kunde davon merkt — steht als Beschreibung am Meilenstein. */
  warum: string | null;
  art: string;
  zustand: string;
  kundeSieht: boolean;
  position: number;
};

/**
 * Was aus einer Auswahl in die Umsetzung geht.
 *
 * Nur Gewähltes, und nur was der Kunde im Gespräch auch sehen durfte: Ein
 * Posten, den wir intern aussortiert haben, taucht nicht plötzlich in seinem
 * Projektstatus auf. „Später" bleibt draußen — es ist eine Absage mit
 * Hoffnung, kein Auftrag.
 */
export function auftragsPosten(posten: readonly AuftragsPosten[]): AuftragsPosten[] {
  return posten
    .filter((p) => p.zustand === "gewaehlt" && p.kundeSieht)
    .slice()
    .sort((a, b) => a.position - b.position);
}
