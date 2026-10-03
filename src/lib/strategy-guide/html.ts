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
        <td class="grund">${esc(e.begruendung)}</td>
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
  .geprueft { float: right; font-size: 8pt; font-weight: 600; color: #15803d; }
  .aufhaenger { font-size: 9.5pt; color: #0369a1; margin-top: 4px; }
  .aufhaenger span {
    display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px;
    color: #94a3b8; font-weight: 700;
  }
  .groesse { font-size: 9pt; color: #64748b; margin-top: 7px; }
  .einwand { font-style: italic; color: #475569; }
  .leer { font-size: 10pt; color: #64748b; }
  table.protokoll { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 4px; }
  table.protokoll td { border-top: 1px solid #e2e8f0; padding: 5px 7px 5px 0; vertical-align: top; }
  .runde { color: #94a3b8; width: 26px; }
  .urteil { width: 68px; font-weight: 700; }
  .urteil.ja { color: #15803d; }
  .urteil.nein { color: #b45309; }
  .grund { color: #64748b; }
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
  ${abschnitt(7, "Womit du rechnen musst", einwaende)}
  ${abschnitt(8, "Was am Ende stehen sollte", p(doc.abschluss))}

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
