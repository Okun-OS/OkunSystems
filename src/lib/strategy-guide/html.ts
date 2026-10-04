import type { GuideDocument, ProtokollEintrag } from "./types";
import { packageLabel } from "@/lib/packages";

/**
 * Der Leitfaden als druckbares Dokument.
 *
 * Bewusst nüchtern und ohne Markenauftritt: Das hier ist kein Kundenbericht,
 * sondern ein Arbeitszettel für den Kollegen. Er soll ihn im Gespräch
 * daneben liegen haben und etwas darauf notieren können — also viel Weiß,
 * große Schrift, klare Abschnitte.
 *
 * Auf jeder Seite steht, dass der Kunde das nicht sehen darf. Ein
 * Ausdruck, der auf dem Tisch liegen bleibt, sagt das sonst niemandem.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Absätze aus einem mehrzeiligen Text. */
function p(text: string): string {
  return esc(text)
    .split(/\n{2,}/)
    .map((abs) => `<p>${abs.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function abschnitt(nr: number, titel: string, inhalt: string): string {
  return `<section class="abs">
    <h2><span class="nr">${nr}</span>${esc(titel)}</h2>
    ${inhalt}
  </section>`;
}

export function renderGuideHtml(params: {
  doc: GuideDocument;
  protokoll: ProtokollEintrag[];
  companyName: string;
  packageType: string | null;
  version: number;
  erstelltAm: Date;
  blueprintAbgeschlossen: Date | null;
}): string {
  const { doc, protokoll, companyName, packageType, version, erstelltAm } = params;
  const datum = (d: Date) => d.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  const kernbefunde = doc.kernbefunde
    .map(
      (b) => `<div class="karte">
        <div class="karte-titel">${esc(b.titel)}</div>
        <div class="beleg">${esc(b.beleg)}</div>
        <div class="karte-text">${esc(b.wirkung)}</div>
      </div>`
    )
    .join("");

  const vorschlaege =
    doc.customVorschlaege.length === 0
      ? `<p class="leer">Die unabhängige Prüfung hat keinen Vorschlag bestätigt. Das heißt nicht,
         dass es keinen gibt — nur, dass sich aus diesen Daten keiner belegen ließ.
         Im Gespräch nachfragen statt raten.</p>`
      : doc.customVorschlaege
          .map(
            (v) => `<div class="karte vorschlag">
              <div class="karte-titel">${esc(v.titel)}
                <span class="geprueft">geprüft · Runde ${v.geprueftInRunde}</span>
              </div>
              <div class="aufhaenger"><span>Aufhänger</span>${esc(v.aufhaenger)}</div>
              <div class="karte-text">${esc(v.idee)}</div>
              <div class="karte-text grau">${esc(v.nutzen)}</div>
              <div class="groesse">Grobe Einordnung, im Gespräch zu bestätigen: ${esc(v.groessenordnung)}</div>
            </div>`
          )
          .join("");

  // Nach Block gruppiert, in der Reihenfolge, in der sie auftreten — das ist
  // die Reihenfolge des Leistungsumfangs.
  const bloecke: Array<{ name: string; posten: typeof doc.umsetzung }> = [];
  for (const posten of doc.umsetzung) {
    const vorhanden = bloecke.find((b) => b.name === posten.block);
    if (vorhanden) vorhanden.posten.push(posten);
    else bloecke.push({ name: posten.block, posten: [posten] });
  }

  const umsetzung =
    doc.umsetzung.length === 0
      ? `<p class="leer">Für diesen Fall ist nicht hinterlegt, was im gebuchten Paket
         umgesetzt wird. Im Gespräch nichts zusagen.</p>`
      : bloecke
          .map(
            (b) => `<div class="block">
              <div class="block-name">${esc(b.name)}</div>
              ${
                /workforce/i.test(b.name) && doc.workforceUrteil
                  ? `<div class="urteil">${p(doc.workforceUrteil)}</div>`
                  : ""
              }
              ${b.posten
                .map(
                  (pst) => `<div class="posten">
                    <div class="posten-titel">${esc(pst.titel)}</div>
                    <div class="einordnung">${esc(pst.einordnung)}</div>
                    <div class="beleg">${esc(pst.befund)}</div>
                    <div class="feld"><span>Womit</span>${esc(pst.womit)}</div>
                    <div class="feld"><span>Warum gerade das</span>${esc(pst.warum)}</div>
                    <div class="feld"><span>Wie wir vorgehen</span>${esc(pst.wieWirEsMachen)}</div>
                  </div>`
                )
                .join("")}
            </div>`
          )
          .join("");

  const einwaende = doc.einwaende
    .map(
      (e) => `<div class="karte">
        <div class="einwand">„${esc(e.einwand)}“</div>
        <div class="karte-text">${esc(e.antwort)}</div>
      </div>`
    )
    .join("");

  const protokollZeilen = protokoll
    .map(
      (e) => `<tr>
        <td class="runde">R${e.runde}</td>
        <td class="urteil ${e.bestanden ? "ja" : "nein"}">${e.bestanden ? "bestanden" : "verworfen"}</td>
        <td>${esc(e.titel)}</td>
        <td class="grund">${esc(e.begruendung)}${
          e.standardprodukte
            ? `<div class="markt"><span>Von der Stange</span>${esc(e.standardprodukte)}</div>`
            : ""
        }</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>Leitfaden Strategiegespräch — ${esc(companyName)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #15202b; font-size: 10.5pt; line-height: 1.55; margin: 0;
    /*
     * Keine Ligaturen. Auf dem Server greift der Renderer zu einer Schrift,
     * deren ff- und fi-Glyphen keine Rückabbildung auf die Buchstaben
     * mitbringen: Im Druck sieht "Prüffristen" richtig aus, beim Kopieren
     * und beim Suchen im PDF zerfällt es zu "Prü ff risten". Ohne Ligaturen
     * setzt der Renderer jeden Buchstaben einzeln, und beides stimmt.
     */
    font-variant-ligatures: none;
  }
  /*
   * Die Warnzeile steht in einem Tabellenkopf, nicht in einem festen Element.
   * Chromium wiederholt einen thead beim Druck auf jeder Seite und hält den
   * Platz dafür frei — ein position: fixed würde zwar auch auf jeder Seite
   * erscheinen, aber ab Seite zwei über der ersten Textzeile liegen.
   *
   * Das ist der Grund für die Wiederholung: Wer Seite drei vom Tisch nimmt,
   * soll auch dort lesen, dass das Blatt nicht für den Kunden ist.
   */
  table.blatt { width: 100%; border-collapse: collapse; }
  table.blatt > thead { display: table-header-group; }
  table.blatt > thead td { padding: 0 0 12px; border: 0; }
  table.blatt > tbody td { padding: 0; border: 0; }
  .warnung {
    border: 1px solid #c2410c; color: #9a3412; background: #fff7ed;
    font-size: 8pt; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase;
    padding: 5px 10px; border-radius: 3px;
  }
  header { border-bottom: 2px solid #15202b; padding-bottom: 10px; margin-bottom: 20px; }
  h1 { font-size: 19pt; margin: 0 0 3px; letter-spacing: -0.3px; }
  .meta { font-size: 9pt; color: #5b6b7f; }
  /*
   * Abschnitte duerfen umbrechen. Haelt man sie zusammen, bleibt am Seitenfuss
   * ein Drittel leer, und ein zu hoher Abschnitt bricht trotzdem — dann aber
   * gleich hinter der Ueberschrift, sodass die Karten ohne Titel dastehen.
   */
  .abs { margin-bottom: 20px; }
  h2 {
    font-size: 11.5pt; margin: 0 0 9px; display: flex; align-items: center; gap: 9px;
    border-bottom: 1px solid #dde3ea; padding-bottom: 5px;
    /* Eine Ueberschrift allein am Seitenende ist keine Ueberschrift. */
    break-after: avoid; page-break-after: avoid;
  }
  .nr {
    display: inline-flex; align-items: center; justify-content: center;
    width: 19px; height: 19px; border-radius: 4px; background: #15202b; color: #fff;
    font-size: 9pt; flex-shrink: 0;
  }
  p { margin: 0 0 7px; }
  .vorlesen { background: #f6f8fa; border-left: 3px solid #15202b; padding: 11px 14px; }
  .karte { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 13px; margin-bottom: 9px; page-break-inside: avoid; }
  .karte-titel { font-weight: 700; font-size: 10.5pt; margin-bottom: 4px; }
  .karte-text { font-size: 10pt; margin-top: 5px; }
  .grau { color: #5b6b7f; }
  .beleg { font-size: 9.5pt; font-weight: 600; color: #0369a1; }
  .vorschlag { border-left: 3px solid #0369a1; }
  /*
   * Kein float. Die Einordnung ist längst ein ganzer Satz ("im gebuchten
   * Paket enthalten, wenn die Branchensoftware eine Übergabe zulässt …"),
   * und ein rechtsbündiges Schildchen mit so viel Text legt sich über die
   * Zeile darunter oder rutscht beim Seitenumbruch an den Kopf der nächsten
   * Seite, losgelöst von dem, wozu es gehört. Es steht jetzt als eigene
   * Zeile unter dem Titel, wo es nicht verrutschen kann.
   */
  .geprueft { display: block; font-size: 8pt; font-weight: 600; color: #15803d; margin-top: 2px; }
  .aufhaenger { font-size: 9.5pt; color: #0369a1; margin-top: 4px; }
  .aufhaenger span {
    display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px;
    color: #94a3b8; font-weight: 700;
  }
  .groesse { font-size: 9pt; color: #64748b; margin-top: 7px; }
  .fertig { border-left: 3px solid #15803d; }
  .block { margin-bottom: 11px; page-break-inside: avoid; }
  .block-name {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.8px;
    color: #15202b; font-weight: 700; border-bottom: 1px solid #15202b;
    padding-bottom: 3px; margin-bottom: 6px;
  }
  .posten { padding: 5px 0 7px 11px; border-left: 2px solid #dde3ea; margin-bottom: 5px; }
  .posten-titel { font-weight: 700; font-size: 10pt; }
  .feld { font-size: 10pt; margin-top: 5px; }
  .feld span {
    display: block; font-size: 7.5pt; text-transform: uppercase;
    letter-spacing: 0.8px; color: #94a3b8; font-weight: 700;
  }
  .urteil {
    background: #f6f8fa; border-left: 3px solid #64748b; padding: 8px 11px;
    margin-bottom: 8px; font-size: 10pt;
  }
  .urteil p { margin: 0 0 5px; }
  .aufhaenger.gruen { color: #15803d; }
  .einordnung {
    display: block; font-size: 8pt; font-weight: 600; color: #64748b;
    margin-top: 2px; line-height: 1.35;
  }
  .einwand { font-style: italic; color: #475569; }
  .ablauf { margin-top: 11px; background: #f6f8fa; padding: 10px 13px; border-radius: 4px; }
  .ablauf-titel {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.8px;
    color: #64748b; font-weight: 700; margin-bottom: 4px;
  }
  .leer { font-size: 10pt; color: #64748b; }
  table.protokoll { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 4px; }
  table.protokoll td { border-top: 1px solid #e2e8f0; padding: 5px 7px 5px 0; vertical-align: top; }
  .runde { color: #94a3b8; width: 26px; }
  .urteil { width: 68px; font-weight: 700; }
  .urteil.ja { color: #15803d; }
  .urteil.nein { color: #b45309; }
  .grund { color: #64748b; }
  .markt { margin-top: 4px; color: #94a3b8; }
  .markt span {
    display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.7px;
    color: #b6c2d0; font-weight: 700;
  }
  footer { margin-top: 22px; padding-top: 9px; border-top: 1px solid #dde3ea; font-size: 8pt; color: #94a3b8; }
</style></head>
<body>
<table class="blatt">
  <thead><tr><td>
    <div class="warnung">Interne Unterlage — nicht an den Kunden geben</div>
  </td></tr></thead>
  <tbody><tr><td>

  <header>
    <h1>Leitfaden Strategiegespräch</h1>
    <div class="meta">
      ${esc(companyName)}${packageType ? ` · ${esc(packageLabel(packageType) ?? packageType)}` : ""}
      · Fassung ${version} vom ${datum(erstelltAm)}
      ${params.blueprintAbgeschlossen ? ` · Blueprint abgeschlossen am ${datum(params.blueprintAbgeschlossen)}` : ""}
    </div>
  </header>

  ${abschnitt(1, "Was wir festgestellt haben", p(doc.befund))}
  ${abschnitt(2, "So steigst du ein", `<div class="vorlesen">${p(doc.gespraechseinstieg)}</div>`)}
  ${abschnitt(3, "Die stärksten Befunde", kernbefunde)}
  ${abschnitt(4, "Warum das Expertise zeigt", p(doc.expertise))}
  ${abschnitt(5, "Unsere Empfehlung", p(doc.empfehlung))}
  ${abschnitt(6, "Custom-Projekte, die hier gehen", vorschlaege)}
  ${abschnitt(
    7,
    "Was wir umsetzen und womit",
    umsetzung
  )}
  ${abschnitt(8, "Wie das abläuft", p(doc.unsereLeistung))}
  ${abschnitt(9, "Womit du rechnen musst", einwaende)}
  ${abschnitt(10, "Was am Ende stehen sollte", p(doc.abschluss))}

  ${
    protokoll.length > 0
      ? `<section class="abs">
          <h2><span class="nr">✓</span>Prüfprotokoll</h2>
          <p class="grau" style="font-size:9pt">Jeder Vorschlag wurde in einem eigenen Durchlauf
          gegen die Daten geprüft — ohne die Begründung, mit der er entstanden ist.</p>
          <table class="protokoll">${protokollZeilen}</table>
        </section>`
      : ""
  }

  <footer>
    Erzeugt am ${datum(erstelltAm)} aus dem OKUN Blueprint von ${esc(companyName)}.
    Die Zahlen stammen aus der Auswertung und sind nicht geschätzt.
    Diese Unterlage ist für den internen Gebrauch bestimmt.
  </footer>

  </td></tr></tbody>
</table>
</body></html>`;
}
