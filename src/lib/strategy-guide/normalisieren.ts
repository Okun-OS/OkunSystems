import type {
  GuideDocument,
  GepruefterVorschlag,
  Kernbefund,
  Einwand,
  Umsetzungsposten,
  NichtUmgesetzt,
} from "./types";

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const liste = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
const zahl = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/**
 * Macht aus einer gespeicherten Fassung ein vollständiges Dokument.
 *
 * Fassungen bleiben dauerhaft liegen, das Dokument wächst aber mit. Eine
 * Fassung, die vor einem neuen Feld entstanden ist, kennt es nicht — und ein
 * Zugriff darauf lässt das Rendern abstürzen. Für den Kollegen heißt das: Der
 * Leitfaden, den er gestern erzeugt hat, lässt sich plötzlich nicht mehr
 * öffnen oder nicht mehr drucken.
 *
 * Deshalb wird jede gelesene Fassung hier durchgeschleust — und zwar bis in
 * die Einträge der Listen hinein. Beim ersten Anlauf habe ich nur die äußere
 * Form geprüft; ein Umsetzungsposten aus der Zeit davor hat das PDF trotzdem
 * zu Fall gebracht, weil ihm drei Felder fehlten.
 *
 * Fehlendes wird leer ergänzt, nicht erfunden. Wo ein Feld bloß umbenannt
 * wurde, wird der alte Inhalt übernommen, statt ihn fallen zu lassen.
 */
export function normalisiereGuide(roh: unknown): GuideDocument | null {
  if (!roh || typeof roh !== "object") return null;
  const q = roh as Record<string, unknown>;

  const kernbefunde: Kernbefund[] = liste(q.kernbefunde).map((b) => ({
    titel: text(b.titel),
    beleg: text(b.beleg),
    wirkung: text(b.wirkung),
  }));

  const einwaende: Einwand[] = liste(q.einwaende).map((e) => ({
    einwand: text(e.einwand),
    antwort: text(e.antwort),
  }));

  const customVorschlaege: GepruefterVorschlag[] = liste(q.customVorschlaege).map((v) => ({
    titel: text(v.titel),
    aufhaenger: text(v.aufhaenger),
    idee: text(v.idee),
    nutzen: text(v.nutzen),
    groessenordnung: text(v.groessenordnung),
    geprueftInRunde: zahl(v.geprueftInRunde),
  }));

  const umsetzung: Umsetzungsposten[] = liste(q.umsetzung).map((p) => ({
    block: text(p.block),
    titel: text(p.titel),
    befund: text(p.befund),
    womit: text(p.womit),
    warum: text(p.warum),
    // "wasWirTun" hieß das Feld, bevor es in drei aufgeteilt wurde. Der Inhalt
    // ist derselbe Gedanke, also wird er übernommen statt verworfen.
    wieWirEsMachen: text(p.wieWirEsMachen) || text(p.wasWirTun),
    einordnung: text(p.einordnung),
  }));

  const nichtUmgesetzt: NichtUmgesetzt[] = liste(q.nichtUmgesetzt).map((n) => ({
    titel: text(n.titel),
    warum: text(n.warum),
  }));

  return {
    befund: text(q.befund),
    gespraechseinstieg: text(q.gespraechseinstieg),
    kernbefunde,
    expertise: text(q.expertise),
    empfehlung: text(q.empfehlung),
    customVorschlaege,
    umsetzung,
    nichtUmgesetzt,
    workforceUrteil: text(q.workforceUrteil),
    unsereLeistung: text(q.unsereLeistung),
    einwaende,
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
