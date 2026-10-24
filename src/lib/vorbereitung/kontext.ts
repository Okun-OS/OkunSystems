import { PURPOSES } from "@/lib/blueprint/pillar3-catalog";
import { GRENZE_AUTOMATISIERUNGEN } from "@/lib/strategie/katalog";

/**
 * Was der Vorbereitungs-Chat weiß, bevor das erste Wort fällt.
 *
 * Der Text entsteht aus Werten und bleibt über ein ganzes Gespräch hinweg
 * gleich — das ist kein Zufall, sondern die Bedingung dafür, dass er
 * zwischengespeichert wird. Bericht, Leitfaden und Zahlen sind lang; ohne
 * Caching zahlt man sie bei jeder Nachricht neu.
 *
 * Deshalb steht hier nichts Veränderliches: keine Uhrzeit, keine laufende
 * Nummer, nichts, was sich zwischen zwei Nachrichten verschiebt.
 */

export type PostenZeile = {
  id: string;
  titel: string;
  art: string;
  zustand: string;
  warum: string | null;
  kundeSieht: boolean;
};

export type ProgrammZeile = {
  name: string;
  zwecke: string[];
  kostenProMonat: number | null;
  bindung: string | null;
  zufriedenheit: string | null;
};

export type VorschlagZeile = {
  id: string;
  bewegung: string;
  titel: string;
  zustand: string;
  sparenProMonat: number | null;
};

export type Kontext = {
  firma: string;
  branche: string | null;
  paket: string | null;
  beraterName: string;
  /** Der Fließtext aus dem Blueprint-Bericht, soweit vorhanden. */
  bericht: string | null;
  /** Das Leitfaden-Dossier, aus dem die Posten stammen. */
  dossier: string | null;
  posten: PostenZeile[];
  programme: ProgrammZeile[];
  vorschlaege: VorschlagZeile[];
};

function zweckLabel(key: string): string {
  return PURPOSES.find((p) => p.key === key)?.label ?? key;
}

function programmZeile(p: ProgrammZeile): string {
  const teile = [p.zwecke.map(zweckLabel).join(", ") || "kein Zweck angegeben"];
  teile.push(p.kostenProMonat === null ? "Preis unbekannt" : `${p.kostenProMonat} €/Monat`);
  if (p.bindung) teile.push(p.bindung === "jahresvertrag" ? "Jahresvertrag" : p.bindung);
  if (p.zufriedenheit) {
    teile.push(
      p.zufriedenheit === "laeuft"
        ? "läuft gut — nicht ablösen"
        : p.zufriedenheit === "aergert"
          ? "ärgert den Betrieb"
          : "geht so"
    );
  }
  return `- ${p.name}: ${teile.join(" · ")}`;
}

/**
 * Die Anweisung — was dieser Chat ist und was er nicht ist.
 *
 * Bewusst knapp bei dem, was er darf, und ausführlich bei dem, was er nicht
 * behaupten darf. Er sitzt an einer Stelle, an der eine erfundene Zahl oder
 * ein zu großzügiges Versprechen erst im Termin auffällt — vor dem Kunden.
 */
export function anweisung(k: Kontext): string {
  return `Du bereitest mit ${k.beraterName} ein Strategiegespräch von OKUN Systems vor.

Der Betrieb: ${k.firma}${k.branche ? ` (${k.branche})` : ""}. Gebuchtes Paket: ${
    k.paket ?? "noch keines hinterlegt"
  }.

## Was in diesem Gespräch entschieden wird

1. Welche Lösungen zur Wahl stehen — höchstens ${GRENZE_AUTOMATISIERUNGEN} Automatisierungen kommen ins Paket.
2. Welche digitalen Grundlagen wir neu aufsetzen, zusammenlegen oder ablösen.
3. In welcher Reihenfolge der Berater durch das Haus führt und was er dort sagt.

## Wie du arbeitest

Du redest wie ein Kollege, der den Fall kennt: kurz, konkret, ohne Floskeln.
Du fragst nach, wenn etwas fehlt, statt es zu erfinden. Du schlägst vor und
begründest aus seinen Daten — nicht aus allgemeinen Erfahrungswerten.

Du darfst recherchieren, wenn es um Preise, Anbieter oder Alternativen geht,
die nicht in den Daten stehen. Sag dazu, was du gefunden hast und woher.

Du änderst die Vorbereitung selbst über die Werkzeuge. Sag vorher in einem
Satz, was du tust, und tu es dann — nicht umgekehrt.

## Was du nicht tust

- **Keine Zahl erfinden.** Was der Betrieb nicht angegeben hat, ist unbekannt,
  nicht null. Ein fehlender Preis wird erfragt oder recherchiert und dann als
  Schätzung gekennzeichnet — nie stillschweigend eingesetzt.
- **Nichts streichen, womit der Betrieb zufrieden ist.** Steht bei einem
  Programm „läuft gut", ist es tabu, auch wenn ein Modul dasselbe könnte.
- **Nicht über das Paket hinaus versprechen.** Was über dem gebuchten Paket
  liegt, ist ein eigenes Vorhaben und wird als solches benannt.
- **Keine Ersparnis ohne Datum.** Bei einem Jahresvertrag greift sie erst zum
  Vertragsende. Das gehört in denselben Satz.

Am Ende der Vorbereitung schließt du sie ab — aber erst, wenn die Auswahl
steht, die Grundlagen entschieden sind und der Berater das Haus einmal selbst
abgelaufen ist.`;
}

/** Die Daten des Betriebs, so wie der Chat sie liest. */
export function lage(k: Kontext): string {
  const teile: string[] = [];

  teile.push("# Was über diesen Betrieb bekannt ist");

  if (k.programme.length > 0) {
    teile.push("\n## Programme im Einsatz");
    teile.push(k.programme.map(programmZeile).join("\n"));
    const ohnePreis = k.programme.filter((p) => p.kostenProMonat === null).length;
    if (ohnePreis > 0) {
      teile.push(
        `\nBei ${ohnePreis} von ${k.programme.length} Programmen fehlt der Preis. ` +
          `Solange er fehlt, lässt sich nicht beziffern, was ein Wechsel spart — ` +
          `frag danach oder recherchiere den Listenpreis und trag ihn als Schätzung nach.`
      );
    }
  }

  if (k.vorschlaege.length > 0) {
    teile.push("\n## Grundlagen-Schablone (maschinell gerechnet, noch nicht entschieden)");
    for (const v of k.vorschlaege) {
      const geld = v.sparenProMonat === null ? "" : ` — ${v.sparenProMonat} €/Monat`;
      teile.push(`- [${v.id}] ${v.bewegung}: ${v.titel}${geld} (${v.zustand})`);
    }
  }

  if (k.posten.length > 0) {
    teile.push("\n## Posten aus dem Leitfaden");
    for (const p of k.posten) {
      teile.push(
        `- [${p.id}] ${p.titel} — Art: ${p.art}, Stand: ${p.zustand}` +
          `${p.kundeSieht ? "" : ", für den Kunden verborgen"}` +
          `${p.warum ? `\n    Warum: ${p.warum}` : ""}`
      );
    }
  }

  if (k.dossier) {
    teile.push("\n## Das Dossier zum Leitfaden\n");
    teile.push(k.dossier);
  }

  if (k.bericht) {
    teile.push("\n## Aus dem Blueprint-Bericht\n");
    teile.push(k.bericht);
  }

  return teile.join("\n");
}
