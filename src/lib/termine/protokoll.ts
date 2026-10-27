import { askModel } from "@/lib/strategy-guide/model";
import { formatiereBerlin } from "@/lib/zeit";

/**
 * Aus Stichpunkten wird ein Protokoll.
 *
 * Der Berater schreibt während des Gesprächs mit — halbe Sätze, Namen,
 * Zahlen, in der Reihenfolge, in der sie fallen. Das ist die ehrlichste
 * Quelle, die es gibt: Was nicht notiert wurde, war nicht wichtig genug.
 *
 * Daraus wird hier ein lesbares Protokoll. Nicht mehr: Es wird geordnet und
 * ausformuliert, nicht ergänzt. Ein Protokoll, das Punkte erfindet, die
 * niemand besprochen hat, ist schlimmer als gar keines — es steht hinterher
 * als Vereinbarung da.
 */

export type Mitschrift = {
  titel: string;
  beginn: Date;
  /** Wer dabei war, mit Namen. */
  teilnehmer: string[];
  firma: string;
  /** Was in diesem Gespräch erreicht werden sollte. */
  ziel: string | null;
  /** Das Mitgehörte, soweit vorhanden. */
  transkript: string;
  /** Die rohen Stichpunkte, eine Zeile je Punkt. */
  notizen: string;
};

export class LeereMitschriftError extends Error {
  constructor() {
    super("Ohne Stichpunkte kein Protokoll.");
    this.name = "LeereMitschriftError";
  }
}

const SYSTEM = `Du schreibst das Protokoll einer Besprechung bei OKUN Systems.

Du bekommst die Stichpunkte, die währenddessen mitgeschrieben wurden, und
machst daraus ein Protokoll in klarem Deutsch.

## Deine Quellen

Du bekommst bis zu zwei: das Mitgehörte und die Stichpunkte des Beraters.
Das Mitgehörte ist vollständig, aber ungefiltert — Begrüßungen, Füllwörter,
Verständigungsfehler stehen darin. Die Stichpunkte sind unvollständig, aber
gewichtet: Was jemand mitten im Gespräch notiert, war ihm wichtig. Nimm die
Stichpunkte als Gliederung und das Mitgehörte als Beleg.

## Die eine Regel

**Du ergänzt nichts.** Keinen Punkt, der nicht in den Stichpunkten steht,
keine Zahl, keinen Namen, keine Zusage. Was unklar notiert ist, bleibt
unklar formuliert — lieber „Preis offen" als eine erfundene Zahl. Ein
Protokoll gilt hinterher als das, was vereinbart wurde.

## Form

Vier Abschnitte, jeder mit der Überschrift in einer eigenen Zeile. Lass
einen Abschnitt weg, wenn die Stichpunkte nichts dazu hergeben — ein
leerer Abschnitt sieht aus wie ein Versäumnis.

Besprochen
— worum es ging, in ganzen Sätzen, der Reihe nach.

Entschieden
— was festgelegt wurde. Nur, was wirklich entschieden ist.

Offen
— was ungeklärt blieb.

Nächste Schritte
— wer was bis wann macht. Steht kein Name dabei, schreib keinen hin.

## Ton

Sachlich und knapp. Keine Anrede, keine Grußformel, keine Füllsätze wie
„es wurde ausführlich diskutiert". Wer es liest, will wissen, was gilt.`;

export async function schreibeProtokoll(m: Mitschrift): Promise<string> {
  const notizen = m.notizen.trim();
  const transkript = m.transkript.trim();
  if (!notizen && !transkript) throw new LeereMitschriftError();

  const kopf = [
    `Besprechung: ${m.titel}`,
    `Betrieb: ${m.firma}`,
    `Wann: ${formatiereBerlin(m.beginn)} Uhr`,
    m.teilnehmer.length > 0 ? `Dabei: ${m.teilnehmer.join(", ")}` : null,
    m.ziel ? `Ziel des Gesprächs: ${m.ziel}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  /*
    Zwei Quellen, zwei Gewichte.

    Das Mitgehörte ist vollständig, aber ungefiltert — es enthält auch jedes
    „genau" und jede Begrüßung. Die Stichpunkte sind unvollständig, aber
    gewichtet: Was jemand mitten im Gespräch aufschreibt, war ihm wichtig.
    Deshalb bekommt das Modell beides und weiß, was es womit anfangen soll.
  */
  const quellen = [
    transkript ? `## Was gesagt wurde (mitgehört)\n\n${transkript}` : null,
    notizen ? `## Stichpunkte des Beraters — das Wichtige\n\n${notizen}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const text = await askModel({
    system: SYSTEM,
    prompt: `${kopf}\n\n${quellen}`,
    maxTokens: 4000,
    // Ordnen und ausformulieren, nicht nachdenken — hier wird nichts gelöst.
    aufwand: "low",
    label: "Besprechungsprotokoll",
  });

  return text.trim();
}

/**
 * Der Kopf, der über jedem Protokoll steht.
 *
 * Bewusst nicht vom Modell geschrieben: Titel, Datum und Teilnehmer sind
 * Daten, keine Formulierung. Sie sollen auch dann stimmen, wenn das Modell
 * einen schlechten Tag hat.
 */
export function protokollKopf(m: Omit<Mitschrift, "notizen">): string {
  const zeilen = [
    m.titel,
    `${m.firma} · ${formatiereBerlin(m.beginn)} Uhr`,
  ];
  if (m.teilnehmer.length > 0) zeilen.push(`Dabei: ${m.teilnehmer.join(", ")}`);
  return zeilen.join("\n");
}
