import {
  PROFIL_FELDER,
  SPOTLIGHT_PROZESSE,
  THEMEN,
  frage as frageAusKatalog,
} from "./catalog";
import { radarVerlauf } from "./service";
import type { RadarErgebnis } from "./engine";

/**
 * Was ein späterer Blueprint aus dem Radar übernehmen darf.
 *
 * Zwei Dinge gleichzeitig, und beide sind wichtig:
 *
 *  1. **Niemand soll zweimal dasselbe eintippen.** Was der Interessent im
 *     Radar über seinen Betrieb gesagt hat, steht dem Blueprint zur
 *     Verfügung — als Vorbelegung, die er nur noch bestätigen muss.
 *  2. **Eine Viertelstunde ist keine Erhebung.** Jede Angabe von hier trägt
 *     `herkunft: "radar"` und `bestaetigt: false`. Sie darf eine Blueprint-
 *     Antwort vorschlagen, aber niemals eine sein: Der Blueprint ist eine
 *     bezahlte Leistung mit einer anderen Zusage, und eine vorläufige
 *     Einschätzung, die unbemerkt zu einem erhobenen Befund wird, höhlt
 *     genau diese Zusage aus.
 *
 * Deshalb liefert diese Datei ausdrücklich **keine** fertigen
 * `SessionAnswer`-Datensätze. Wer sie übernehmen will, muss sie bestätigen
 * lassen — und das kann nur die Oberfläche, die dem Kunden die Frage stellt.
 */

export type UebernahmeFeld = {
  key: string;
  label: string;
  wert: string;
  herkunft: "radar";
  /** Immer false. Eine Radar-Angabe ist nie ein erhobener Befund. */
  bestaetigt: false;
  erhobenAm: string;
};

export type RadarUebernahme = {
  radarSessionId: string;
  erhobenAm: string;
  katalogVersion: string;
  closerName: string | null;
  /** Das Unternehmensprofil aus Phase 1, in lesbarer Form. */
  profil: UebernahmeFeld[];
  /** Die Themen, zu denen im Radar schon etwas gesagt wurde. */
  beruehrteThemen: string[];
  /** Der im Spotlight betrachtete Ablauf — ein guter Einstieg für Säule 3. */
  spotlight: string | null;
  /** Das Urteil, ausdrücklich als vorläufig gekennzeichnet. */
  ergebnis: {
    stufe: string;
    stufeTitel: string;
    aussagekraft: number;
    felder: string[];
    /** Fragen, die im Radar offen blieben — die ersten Kandidaten im Blueprint. */
    offeneFragen: string[];
    vorlaeufig: true;
  } | null;
};

function lesbar(key: string, wert: string | string[]): string {
  const feld = PROFIL_FELDER.find((f) => f.key === key);
  if (!feld) return Array.isArray(wert) ? wert.join(", ") : wert;
  if (!feld.optionen) return Array.isArray(wert) ? wert.join(", ") : wert;
  const werte = Array.isArray(wert) ? wert : [wert];
  return werte
    .map((w) => feld.optionen!.find((o) => o.key === w)?.label ?? w)
    .join(", ");
}

/**
 * Die jüngste abgeschlossene Analyse eines Kunden, aufbereitet zur Übernahme.
 *
 * Nur abgeschlossene: Eine halb geführte Analyse ist kein Stand, auf den sich
 * später jemand stützen sollte.
 */
export async function radarUebernahme(companyId: string): Promise<RadarUebernahme | null> {
  const verlauf = await radarVerlauf(companyId);
  const abgeschlossen = verlauf.find((r) => r.abgeschlossenAm);
  if (!abgeschlossen) return null;

  const { ladeRadar } = await import("./service");
  const d = await ladeRadar(abgeschlossen.id);
  if (!d) return null;

  const erhobenAm = (d.abgeschlossenAm ?? d.erstelltAm).toISOString();

  const profil: UebernahmeFeld[] = PROFIL_FELDER.flatMap((feld) => {
    const wert = d.profil[feld.key];
    if (!wert || (Array.isArray(wert) && wert.length === 0)) return [];
    const text = lesbar(feld.key, wert).trim();
    if (!text) return [];
    return [
      {
        key: feld.key,
        label: feld.label,
        wert: text,
        herkunft: "radar" as const,
        bestaetigt: false as const,
        erhobenAm,
      },
    ];
  });

  const beruehrteThemen = [
    ...new Set(
      d.antworten
        .filter((a) => a.optionKeys.length > 0)
        .map((a) => frageAusKatalog(a.frageKey)?.thema)
        .filter((t): t is keyof typeof THEMEN => Boolean(t))
        .map((t) => THEMEN[t])
    ),
  ];

  const spotlight = d.spotlightKey
    ? (SPOTLIGHT_PROZESSE.find((p) => p.key === d.spotlightKey)?.label ?? null)
    : null;

  const e: RadarErgebnis | null = d.ergebnis;

  return {
    radarSessionId: d.id,
    erhobenAm,
    katalogVersion: d.katalogVersion,
    closerName: d.closerName,
    profil,
    beruehrteThemen,
    spotlight,
    ergebnis: e
      ? {
          stufe: e.stufe,
          stufeTitel: e.stufeTitel,
          aussagekraft: e.aussagekraft,
          felder: e.felder.map((f) => f.label),
          offeneFragen: e.offeneFragen.map((f) => f.frage),
          vorlaeufig: true,
        }
      : null,
  };
}
