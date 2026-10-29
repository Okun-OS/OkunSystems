import {
  BEOBACHTUNGEN,
  DIMENSIONEN,
  DIMENSION_MAX,
  DIMENSION_REIHENFOLGE,
  type BeobachtungsArt,
  type DimensionKey,
  type RadarFrage,
  type RadarOption,
} from "./catalog";
import { aktiveFragen, type RadarEingabe } from "./engine";

/**
 * Das Live-Bild während des Gesprächs.
 *
 * Mit jeder Antwort wächst das Diagramm rechts — und zwar aus den Antworten,
 * nicht aus einer Erwartung. Drei Regeln, die hier nicht verhandelbar sind:
 *
 *  1. **Keine erfundenen Zahlen.** Kein Branchenvergleich, keine Einsparquote,
 *     keine Hochrechnung. Was im Diagramm steht, hat der Betrieb selbst gesagt.
 *  2. **Fehlende Daten sehen aus wie fehlende Daten.** Eine Dimension ohne
 *     Antwort bekommt keinen Wert, sondern den Status „noch offen“. Sie auf
 *     null zu zeichnen wäre eine Aussage, die niemand getroffen hat.
 *  3. **Jede Beobachtung nennt ihre Quelle.** Rechts steht nichts, wozu sich
 *     nicht sagen ließe, aus welcher Antwort es folgt.
 */

export type DimensionStatus = "offen" | "teilweise" | "erfasst";

export type DimensionWert = {
  key: DimensionKey;
  label: string;
  /** 0 bis 5. Null, solange nichts erfasst ist — nicht 0. */
  wert: number | null;
  status: DimensionStatus;
  beantwortet: number;
  gesamt: number;
};

export type Beobachtung = {
  key: string;
  art: BeobachtungsArt;
  dimension: DimensionKey;
  dimensionLabel: string;
  titel: string;
  text: string;
  /** Die Frage, aus deren Antwort das folgt. */
  quelle: string;
};

export type LiveProfil = {
  dimensionen: DimensionWert[];
  beobachtungen: Beobachtung[];
  /** Wie viele der fünf Dimensionen überhaupt schon Daten haben. */
  erfassteDimensionen: number;
};

const THEMA_ZU_DIMENSION = new Map<string, DimensionKey>();
for (const [key, def] of Object.entries(DIMENSIONEN)) {
  for (const thema of def.themen) THEMA_ZU_DIMENSION.set(thema, key as DimensionKey);
}

/**
 * Die Spanne, die eine Frage auf dem Reifegrad erzeugen kann.
 *
 * Dieselbe Rechnung wie in der Bewertung, nur hier nach Dimension getrennt:
 * Was im Diagramm steht, muss dasselbe aussagen wie der Reifegrad im Ergebnis,
 * sonst reden Gespräch und Bericht über verschiedene Betriebe.
 */
function reifeSpanne(f: RadarFrage): { min: number; max: number } {
  const werte = f.optionen.map((o) =>
    o.signale.filter((s) => s.achse === "reife").reduce((sum, s) => sum + s.wert, 0)
  );
  return { min: Math.min(...werte), max: Math.max(...werte) };
}

function reifeWert(optionen: RadarOption[]): number {
  return optionen.reduce(
    (sum, o) => sum + o.signale.filter((s) => s.achse === "reife").reduce((s2, s) => s2 + s.wert, 0),
    0
  );
}

export function liveProfil(eingabe: RadarEingabe): LiveProfil {
  const aktiv = aktiveFragen(eingabe);
  const nachKey = new Map(eingabe.antworten.map((a) => [a.frageKey, a]));

  const dimensionen: DimensionWert[] = DIMENSION_REIHENFOLGE.map((key) => {
    const fragen = aktiv.filter((f) => THEMA_ZU_DIMENSION.get(f.thema) === key);

    let ist = 0;
    let min = 0;
    let max = 0;
    let beantwortet = 0;

    for (const f of fragen) {
      const antwort = nachKey.get(f.key);
      if (!antwort || antwort.uebersprungen || antwort.optionKeys.length === 0) continue;
      const gewaehlt = antwort.optionKeys
        .map((k) => f.optionen.find((o) => o.key === k))
        .filter((o): o is RadarOption => Boolean(o));
      if (gewaehlt.length === 0) continue;

      const spanne = reifeSpanne(f);
      if (spanne.max === spanne.min) continue;
      ist += Math.min(Math.max(reifeWert(gewaehlt), spanne.min), spanne.max);
      min += spanne.min;
      max += spanne.max;
      beantwortet++;
    }

    const status: DimensionStatus =
      beantwortet === 0 ? "offen" : beantwortet < fragen.length ? "teilweise" : "erfasst";

    return {
      key,
      label: DIMENSIONEN[key].label,
      // Ohne Antwort kein Wert. Null heißt „nicht erfasst“, nicht „schlecht“.
      wert:
        beantwortet === 0 || max === min
          ? null
          : Math.round(((ist - min) / (max - min)) * DIMENSION_MAX * 10) / 10,
      status,
      beantwortet,
      gesamt: fragen.length,
    };
  });

  const gegeben = new Map(
    eingabe.antworten
      .filter((a) => !a.uebersprungen)
      .map((a) => [a.frageKey, a.optionKeys])
  );

  const beobachtungen: Beobachtung[] = BEOBACHTUNGEN.filter((b) =>
    (gegeben.get(b.frage) ?? []).some((k) => b.optionen.includes(k))
  ).map((b) => ({
    key: b.key,
    art: b.art,
    dimension: b.dimension,
    dimensionLabel: DIMENSIONEN[b.dimension].label,
    titel: b.titel,
    text: b.text,
    quelle: b.frage,
  }));

  // Hinweise zuerst — im Gespräch ist das die Information, an der es weitergeht.
  beobachtungen.sort((a, b) => (a.art === b.art ? 0 : a.art === "hinweis" ? -1 : 1));

  return {
    dimensionen,
    beobachtungen,
    erfassteDimensionen: dimensionen.filter((d) => d.wert !== null).length,
  };
}
