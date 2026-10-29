import { anleitungsSchluessel } from "@/lib/strategy-guide/schluessel";
import type { GuideDocument } from "@/lib/strategy-guide/types";
import { artAusBlock, type PostenArt } from "./katalog";

/**
 * Aus dem Leitfaden werden Posten.
 *
 * Der Leitfaden ist eine interne Unterlage und bleibt es. Für das Gespräch
 * werden seine Umsetzungsposten **abgeschrieben**, nicht verlinkt: Was auf dem
 * Tisch lag, muss später unverändert nachlesbar sein, auch wenn der Leitfaden
 * danach dreimal nachgeschärft wurde. Ein Verweis würde mitwandern, eine
 * Abschrift nicht.
 *
 * Diese Datei rechnet nicht und fragt nichts — sie übersetzt. Die Zuordnung
 * zu Aufgaben, der Aufwand und die Freigabe entstehen danach in der
 * Vorbereitung, von Hand.
 */

export type PostenEntwurf = {
  schluessel: string;
  art: PostenArt;
  block: string;
  titel: string;
  befund: string | null;
  womit: string | null;
  warum: string | null;
  wieWirEsMachen: string | null;
  einordnung: string | null;
  position: number;
};

/** Der Block, unter dem individuelle Entwicklungen geführt werden. */
const BLOCK_CUSTOM = "Individuelle Entwicklung";

/**
 * Die Posten einer Leitfaden-Fassung, in der Reihenfolge des Gesprächs.
 *
 * Erst die Umsetzung — das ist, was im Paket steckt. Danach die geprüften
 * Custom-Vorschläge, die darüber hinausgehen. Diese Reihenfolge ist keine
 * Geschmacksfrage: Wer mit dem Zusatzgeschäft anfängt, verkauft; wer mit dem
 * Gekauften anfängt, liefert.
 */
export function entwurfAusLeitfaden(guide: GuideDocument): PostenEntwurf[] {
  const entwuerfe: PostenEntwurf[] = [];
  const vergeben = new Set<string>();

  const aufnehmen = (e: Omit<PostenEntwurf, "position">) => {
    // Zwei Posten mit gleichem Block und Titel ergäben denselben Schlüssel und
    // damit einen Konflikt beim Speichern. Der zweite wird unterschieden,
    // statt den ersten zu überschreiben — beide standen im Leitfaden.
    let schluessel = e.schluessel;
    let n = 2;
    while (vergeben.has(schluessel)) schluessel = `${e.schluessel}-${n++}`;
    vergeben.add(schluessel);
    entwuerfe.push({ ...e, schluessel, position: entwuerfe.length });
  };

  for (const posten of guide.umsetzung ?? []) {
    const block = posten.block?.trim() || "Ohne Block";
    const titel = posten.titel?.trim();
    if (!titel) continue;
    aufnehmen({
      schluessel: anleitungsSchluessel(block, titel) || titel.toLowerCase(),
      art: artAusBlock(block),
      block,
      titel,
      befund: leer(posten.befund),
      womit: leer(posten.womit),
      warum: leer(posten.warum),
      wieWirEsMachen: leer(posten.wieWirEsMachen),
      einordnung: leer(posten.einordnung),
    });
  }

  for (const vorschlag of guide.customVorschlaege ?? []) {
    const titel = vorschlag.titel?.trim();
    if (!titel) continue;
    aufnehmen({
      schluessel: anleitungsSchluessel(BLOCK_CUSTOM, titel) || titel.toLowerCase(),
      art: "custom",
      block: BLOCK_CUSTOM,
      titel,
      // Der Aufhänger ist der Befund, auf dem der Vorschlag fußt — ohne ihn
      // wäre er eine Behauptung, und genau so würde er im Gespräch klingen.
      befund: leer(vorschlag.aufhaenger),
      womit: leer(vorschlag.idee),
      warum: leer(vorschlag.nutzen),
      wieWirEsMachen: leer(vorschlag.groessenordnung),
      einordnung: "Über das gebuchte Paket hinaus — ein eigenes Vorhaben.",
    });
  }

  return entwuerfe;
}

function leer(wert: string | null | undefined): string | null {
  const t = wert?.trim();
  return t ? t : null;
}

/**
 * Was beim Übernehmen auffällt.
 *
 * Wird dem Kollegen angezeigt, bevor er die Vorbereitung beginnt. Lieber
 * vorher wissen, dass drei Posten keiner Art zuzuordnen waren, als sie im
 * Gespräch zu entdecken.
 */
export function entwurfsHinweise(entwuerfe: PostenEntwurf[]): string[] {
  const hinweise: string[] = [];

  const offen = entwuerfe.filter((e) => e.art === "offen");
  if (offen.length > 0) {
    hinweise.push(
      `${offen.length === 1 ? "Ein Posten ließ sich" : `${offen.length} Posten ließen sich`} keinem Block ` +
        `des Leistungsumfangs zuordnen und ${offen.length === 1 ? "wartet" : "warten"} auf eine Einordnung.`
    );
  }

  const automatisierungen = entwuerfe.filter((e) => e.art === "automatisierung").length;
  if (automatisierungen === 0) {
    hinweise.push(
      "Der Leitfaden nennt keine Automatisierung. Ohne Kandidaten gibt es im Gespräch nichts zu wählen."
    );
  }

  const ohneBefund = entwuerfe.filter((e) => !e.befund).length;
  if (ohneBefund > 0) {
    hinweise.push(
      `${ohneBefund} Posten ${ohneBefund === 1 ? "hat" : "haben"} keinen Befund. ` +
        "Ein Vorschlag ohne die Zahl dahinter überzeugt im Gespräch niemanden."
    );
  }

  return hinweise;
}
