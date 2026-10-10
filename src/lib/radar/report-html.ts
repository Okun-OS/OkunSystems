import type { KundenErgebnis } from "./views";

/**
 * Der Ergebnisbericht als Druckbogen.
 *
 * Eine Seite. Das ist keine Sparmaßnahme, sondern die Aussage: Das Radar ist
 * eine Kurzdiagnose, und ein sechsseitiges Papier würde eine Tiefe
 * vortäuschen, die es nicht hat. Was mehr braucht, gehört in den Blueprint.
 *
 * Gerendert wird mit derselben Strecke wie Bericht und Leitfaden
 * (`renderHtmlToPdf`), damit es nur einen Browser und eine Schriftwahl im
 * Haus gibt.
 */

function esc(s: unknown): string {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

const BAND_FARBE: Record<string, string> = {
  gering: "#94a3b8",
  mittel: "#b45309",
  hoch: "#0369a1",
};

const STUFEN_FARBE: Record<string, { rahmen: string; flaeche: string; schrift: string }> = {
  A: { rahmen: "#15803d", flaeche: "#f0fdf4", schrift: "#15803d" },
  B: { rahmen: "#b45309", flaeche: "#fffbeb", schrift: "#b45309" },
  C: { rahmen: "#64748b", flaeche: "#f8fafc", schrift: "#334155" },
};

export function renderRadarReportHtml(params: {
  ergebnis: KundenErgebnis;
  companyName: string;
  branche?: string | null;
  groesse?: string | null;
  closerName?: string | null;
}): string {
  const { ergebnis: e, companyName } = params;
  const farbe = STUFEN_FARBE[e.stufe] ?? STUFEN_FARBE.B;

  const datum = new Date(e.erstelltAm).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const kopfzeilen = [
    params.branche ? `Branche: ${esc(params.branche)}` : null,
    params.groesse ? `Größe: ${esc(params.groesse)}` : null,
    `Analyse vom ${esc(datum)}`,
  ]
    .filter(Boolean)
    .join(" &middot; ");

  const achsen = e.achsen
    .map((a) => {
      const farbWert = BAND_FARBE[a.band] ?? "#64748b";
      // Ohne belastbare Zahl keine Balkenlänge: Ein halb gefüllter Balken ist
      // eine Behauptung, die drei beantwortete Fragen nicht tragen.
      // Aufgefüllt bis zum erreichten Band, nicht nur das eine eingefärbt:
      // Ein einzeln markiertes drittes Segment liest sich wie „wenig“, obwohl
      // es „hoch“ heißt. Gefüllt wie eine Pegelanzeige ist es eindeutig.
      const stufen = ["gering", "mittel", "hoch"];
      const erreicht = stufen.indexOf(a.band);
      const anzeige =
        a.wert === null
          ? `<div class="baender">${stufen
              .map(
                (_, i) =>
                  `<span class="band" style="background:${i <= erreicht ? farbWert : "#e2e8f0"}"></span>`
              )
              .join("")}</div>`
          : `<div class="balken"><span style="width:${a.wert}%;background:${farbWert}"></span></div>`;
      const zahl =
        a.wert === null
          ? `<span class="band-text" style="color:${farbWert}">${esc(a.band)}</span>`
          : `<span class="zahl">${a.wert}<span class="von">/100</span></span>`;
      return `<div class="achse">
        <div class="achse-kopf"><span class="achse-name">${esc(a.label)}</span>${zahl}</div>
        ${anzeige}
        <div class="achse-frage">${esc(a.frage)}</div>
      </div>`;
    })
    .join("");

  const felder =
    e.felder.length === 0
      ? ""
      : `<section>
          <h2>Erkannte Potenzialfelder</h2>
          <div class="felder">
            ${e.felder
              .map(
                (f) => `<div class="feld">
                  <div class="feld-name">${esc(f.label)}</div>
                  <div class="feld-text">${esc(f.beschreibung)}</div>
                  <ul>${f.belege
                    .slice(0, 3)
                    .map((b) => `<li>${esc(b)}</li>`)
                    .join("")}</ul>
                </div>`
              )
              .join("")}
          </div>
        </section>`;

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>OKUN Radar — ${esc(companyName)}</title>
<style>
  @page { size: A4; margin: 15mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #15202b; font-size: 10pt; line-height: 1.5; margin: 0;
    /* Siehe Leitfaden: Ligaturen zerlegen beim Kopieren die Wörter. */
    font-variant-ligatures: none;
  }
  header { border-bottom: 2px solid #15202b; padding-bottom: 9px; margin-bottom: 14px; }
  .marke { font-size: 7.5pt; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: #0369a1; }
  h1 { font-size: 19pt; margin: 2px 0 3px; letter-spacing: -0.3px; }
  .meta { font-size: 8.5pt; color: #64748b; }
  h2 {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.9px; color: #64748b;
    font-weight: 700; margin: 0 0 7px; break-after: avoid;
  }
  section { margin-bottom: 14px; }
  .urteil { border: 1px solid ${farbe.rahmen}; background: ${farbe.flaeche}; border-radius: 4px; padding: 11px 14px; }
  .urteil-titel { font-size: 12pt; font-weight: 700; color: ${farbe.schrift}; margin-bottom: 4px; }
  .urteil-text { font-size: 10pt; line-height: 1.55; }
  .achse { margin-bottom: 10px; break-inside: avoid; }
  .achse-kopf { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .achse-name { font-size: 10pt; font-weight: 600; }
  .zahl { font-size: 11pt; font-weight: 700; }
  .von { font-size: 8pt; font-weight: 400; color: #94a3b8; }
  .band-text { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; }
  .balken { height: 7px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .balken span { display: block; height: 100%; border-radius: 4px; }
  .baender { display: flex; gap: 3px; }
  .band { display: block; height: 7px; flex: 1; border-radius: 4px; }
  .achse-frage { font-size: 8pt; color: #94a3b8; margin-top: 3px; }
  .felder { display: flex; gap: 9px; }
  .feld { flex: 1; border: 1px solid #e2e8f0; border-radius: 4px; padding: 9px 11px; break-inside: avoid; }
  .feld-name { font-size: 10pt; font-weight: 700; }
  .feld-text { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
  .feld ul { margin: 6px 0 0; padding-left: 13px; }
  .feld li { font-size: 8.5pt; color: #475569; margin-bottom: 3px; line-height: 1.4; }
  .schritt { border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px 13px; background: #f8fafc; }
  .schritt-text { font-size: 10pt; }
  .blueprint { margin-top: 7px; padding-top: 7px; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #475569; }
  .blueprint b { color: #0369a1; }
  footer {
    margin-top: 16px; padding-top: 8px; border-top: 1px solid #e2e8f0;
    font-size: 7.5pt; color: #94a3b8; line-height: 1.5;
  }
</style></head>
<body>
  <header>
    <div class="marke">OKUN Radar &middot; Potenzialanalyse</div>
    <h1>${esc(companyName)}</h1>
    <div class="meta">${kopfzeilen}</div>
  </header>

  <section>
    <div class="urteil">
      <div class="urteil-titel">${esc(e.stufeTitel)}</div>
      <div class="urteil-text">${esc(e.einschaetzung)}</div>
    </div>
  </section>

  <section>
    <h2>Analyseergebnis</h2>
    ${achsen}
  </section>

  ${felder}

  <section>
    <h2>Nächster sinnvoller Schritt</h2>
    <div class="schritt">
      <div class="schritt-text">${esc(e.naechsterSchritt)}</div>
      ${
        e.blueprintEmpfohlen && e.blueprintBegruendung
          ? `<div class="blueprint"><b>OKUN Blueprint:</b> ${esc(e.blueprintBegruendung)}</div>`
          : ""
      }
    </div>
  </section>

  <footer>
    Diese Einschätzung entstand in rund 15 Minuten Gespräch${
      params.closerName ? ` mit ${esc(params.closerName)}` : ""
    } und stützt sich auf ${e.aussagekraft}&nbsp;% der Kernfragen${
      e.spotlight ? ` sowie auf den Ablauf „${esc(e.spotlight.label)}“` : ""
    }. Sie ist eine erste Orientierung, keine vollständige Analyse, und enthält bewusst keine
    Einspar- oder Kostenzusagen. Verbindliche Angaben entstehen ausschließlich aus einem
    schriftlichen Angebot.
  </footer>
</body></html>`;
}
