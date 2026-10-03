import type {
  GuideDocument,
  GepruefterVorschlag,
  Kernbefund,
  Einwand,
  StandardLoesung,
} from "./types";

/**
 * Macht aus einer gespeicherten Fassung ein vollständiges Dokument.
 *
 * Fassungen bleiben dauerhaft liegen, das Dokument wächst aber mit. Eine
 * Fassung, die vor einem neuen Abschnitt entstanden ist, kennt dessen Feld
 * nicht — und ein Zugriff darauf lässt die Seite beim Rendern abstürzen.
 * Für den Kollegen heißt das: Der Leitfaden, den er gestern erzeugt hat,
 * ist plötzlich nicht mehr aufrufbar.
 *
 * Deshalb wird jede gelesene Fassung durch diese Stelle geschleust, statt
 * sich auf die Form zu verlassen, in der sie einmal abgelegt wurde. Fehlende
 * Abschnitte bleiben leer; sie werden nicht erfunden.
 */
export function normalisiereGuide(roh: unknown): GuideDocument | null {
  if (!roh || typeof roh !== "object") return null;
  const q = roh as Record<string, unknown>;

  const text = (v: unknown): string => (typeof v === "string" ? v : "");
  const liste = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

  return {
    befund: text(q.befund),
    gespraechseinstieg: text(q.gespraechseinstieg),
    kernbefunde: liste<Kernbefund>(q.kernbefunde),
    expertise: text(q.expertise),
    empfehlung: text(q.empfehlung),
    customVorschlaege: liste<GepruefterVorschlag>(q.customVorschlaege),
    standardLoesungen: liste<StandardLoesung>(q.standardLoesungen),
    unsereLeistung: text(q.unsereLeistung),
    einwaende: liste<Einwand>(q.einwaende),
    abschluss: text(q.abschluss),
  };
}

/** Dasselbe für eine gespeicherte Fassung, die als JSON-Text vorliegt. */
export function leseGuide(json: string): GuideDocument | null {
  try {
    return normalisiereGuide(JSON.parse(json));
  } catch {
    return null;
  }
}
