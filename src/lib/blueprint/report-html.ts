import type { BlueprintReportData, ModuleScoreEntry } from "./report-assembler";
import type { SolutionRecommendation } from "./types";
import { bandLabel, formatHours, stationLabel } from "./pillar3-engine";
import { STATIONS_OKUN_TAKES } from "./pillar3-catalog";
import type { ReportTexts } from "./report-text-engine";

function scoreColor(score: number): string {
  if (score >= 80) return "#00b8ff";
  if (score >= 65) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  if (score >= 35) return "#f97316";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Sehr gut";
  if (score >= 65) return "Gut";
  if (score >= 50) return "Ausbaufähig";
  if (score >= 35) return "Handlungsbedarf";
  return "Dringend";
}

function ph(eyebrow: string, title: string): string {
  return `<div class="ph">
    <div class="ph-eye">${eyebrow}</div>
    <div class="ph-title">${title}</div>
    <div class="ph-rule"></div>
  </div>`;
}

function compactBar(m: ModuleScoreEntry, insight: string): string {
  const c = scoreColor(m.score);
  return `<div class="cbar">
    <div class="cbar-hd">
      <span class="cbar-name">M${m.moduleNumber} · ${m.label}</span>
      <span class="cbar-score" style="color:${c}">${m.score}<span class="cbar-denom">/100</span></span>
    </div>
    <div class="cbar-track"><div class="cbar-fill" style="width:${m.score}%;background:${c}"></div></div>
    <div class="cbar-meta">
      <span class="cbar-lbl" style="color:${c}">${scoreLabel(m.score)}</span>
      ${insight ? `<span class="cbar-insight">${insight}</span>` : ""}
    </div>
  </div>`;
}

function moduleBlock(m: ModuleScoreEntry, detailed: string): string {
  const c = scoreColor(m.score);
  const lbl = scoreLabel(m.score);
  const detailedHtml = detailed
    ? detailed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
        .map(p => p.startsWith("<p>") ? p : `<p>${p}</p>`).join("\n")
    : "";

  return `<div class="mod-block">
  <div class="mod-name" style="border-left:4px solid ${c}">
    <span class="mod-num" style="color:${c}">M${m.moduleNumber}</span> ${m.label}
    <span class="mod-score-inline" style="color:${c}">${m.score}/100 · ${lbl}</span>
  </div>
  <div class="mfp-head" style="border-left:4px solid ${c}">
    <div class="mfp-score-col">
      <div class="mfp-score-num" style="color:${c}">${m.score}</div>
      <div class="mfp-score-den">/ 100</div>
      <div class="mfp-score-lbl" style="color:${c}">${lbl}</div>
    </div>
    <div class="mfp-bar-col">
      <div class="mfp-bar-track">
        <div class="mfp-bar-fill" style="width:${m.score}%;background:${c}"></div>
      </div>
      <div class="mfp-scale-labels">
        <span>0 – Dringend</span>
        <span>35 – Handlungsbedarf</span>
        <span>50 – Ausbaufähig</span>
        <span>65 – Gut</span>
        <span>80+ – Sehr gut</span>
      </div>
    </div>
  </div>
  <div class="mfp-body">${detailedHtml || `<p>Für dieses Modul liegen keine Analysedaten vor.</p>`}</div>
</div>`;
}

function modulePairPage(modules: ModuleScoreEntry[], detailed: Record<number, string>): string {
  const label = `Modulanalyse · ${modules.map(m => `M${m.moduleNumber}`).join(" & ")}`;
  // Überschrift sind die Modulnamen — eine Seitenzählung als Titel sagt dem
  // Leser nichts darüber, was auf der Seite steht.
  const title = modules.map((m) => m.label).join(" & ");
  return `
<div class="npage">
  ${ph(label, title)}
  ${modules.map(m => moduleBlock(m, detailed[m.moduleNumber] ?? "")).join('\n<div class="mod-sep"></div>\n')}
</div>`;
}


function formatPercent(share: number): string {
  return `${(share * 100).toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`;
}

function formatDecimal(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const SOLUTION_CATEGORY_LABELS: Record<string, string> = {
  WORKFORCE: "OKUN Workforce",
  BEWAEHRTE_LOESUNG: "Bewährte Lösung",
  CUSTOM_DEVELOPMENT: "Individuelle Entwicklung",
};

const SOLUTION_CATEGORY_COLORS: Record<string, string> = {
  WORKFORCE: "#00b8ff",
  BEWAEHRTE_LOESUNG: "#22c55e",
  CUSTOM_DEVELOPMENT: "#f59e0b",
};

function solutionCard(solution: SolutionRecommendation): string {
  const color = SOLUTION_CATEGORY_COLORS[solution.category] ?? "#00b8ff";
  const label = SOLUTION_CATEGORY_LABELS[solution.category] ?? solution.category;
  return `<div class="sol-card" style="border-left:3px solid ${color}">
    <div class="sol-head">
      <span class="sol-name">${solution.name}</span>
      <span class="sol-cat" style="color:${color}">${label}</span>
    </div>
    <div class="sol-desc">${solution.description}</div>
  </div>`;
}

/**
 * Empfehlungen und Roadmap.
 *
 * Die Zuordnung entsteht aus den Antworten des Fragebogens und wird hier nur
 * dargestellt — der Bericht endete bisher mit der Diagnose und ließ den Kunden
 * ohne einen einzigen Vorschlag zurück.
 */
function recommendationPage(data: BlueprintReportData): string {
  const phases = data.roadmap.filter((phase) => phase.solutions.length > 0);

  if (phases.length === 0 && data.recommendations.length === 0) {
    return `
<div class="npage">
  ${ph("Was wir daraus ableiten", "Empfehlungen")}
  <p class="sol-empty">Aus den Antworten lässt sich noch keine belastbare Empfehlung ableiten.
  Die Einordnung erfolgt im Strategiegespräch.</p>
</div>`;
  }

  const body =
    phases.length > 0
      ? phases
          .map(
            (phase) => `<div class="sol-phase">
      <div class="sol-phase-label">${phase.phaseLabel}</div>
      ${phase.solutions.map(solutionCard).join("\n")}
    </div>`
          )
          .join("\n")
      : data.recommendations.map(solutionCard).join("\n");

  return `
<div class="npage">
  ${ph("Was wir daraus ableiten", "Empfehlungen")}
  <p class="sol-intro">Die folgenden Ansätze ergeben sich unmittelbar aus Ihren Antworten.
  Die Reihenfolge ist eine Empfehlung, keine Verpflichtung — welche Schritte in welcher
  Reihenfolge sinnvoll sind, klären wir gemeinsam im Strategiegespräch.</p>
  ${body}
</div>`;
}

/**
 * Die dritte Säule im Bericht: Ist-Ablauf, Stundentabelle, Systemmatrix.
 *
 * Alle Zahlen kommen fertig gerechnet aus der Auswertung — hier wird nur
 * dargestellt. Damit kann die Textgenerierung den Zahlen nicht widersprechen.
 */
function pillar3Pages(data: BlueprintReportData): string {
  const p3 = data.pillar3;
  if (!p3 || !p3.hasData) return "";

  const flowPages = p3.flows.findings
    .map((finding) => {
      const stations = finding.flow.stations
        .map((station) => {
          const label = stationLabel(station.stationKey);
          if (station.mode === "none") {
            return `<span class="flow-station flow-station--none">${label}</span>`;
          }
          const isTakeover =
            station.mode === "manual" && STATIONS_OKUN_TAKES.includes(station.stationKey);
          const cls = isTakeover
            ? "flow-station flow-station--takeover"
            : station.mode === "manual"
              ? "flow-station flow-station--manual"
              : "flow-station";
          return `<span class="${cls}">${label}</span>`;
        })
        .join("");

      const carrier = finding.carrier
        ? `${finding.carrier.role} — an ${finding.carrier.stations} von ${finding.relevantStations} Stationen beteiligt`
        : "keine Rolle benannt";

      return `<div class="flow">
        <div class="flow-title">${finding.flow.title}</div>
        <div class="flow-meta">
          ${finding.manualStations} von ${finding.relevantStations} Stationen von Hand
          · ${finding.systemSwitches} Programmwechsel
          · ${carrier}
        </div>
        <div class="flow-stations">${stations}</div>
      </div>`;
    })
    .join("\n");

  const taskRows = p3.tasks.entries
    .map(
      (entry) => `<tr>
        <td>${entry.task.label}${entry.isHandoffCandidate ? '<span class="p3-badge">Übergabe</span>' : ""}</td>
        <td>${bandLabel("frequency", entry.task.frequencyBand)}</td>
        <td>${bandLabel("duration", entry.task.durationBand)}</td>
        <td class="comp-val">${formatHours(entry.hoursPerMonth)}</td>
      </tr>`
    )
    .join("\n");

  const matrixRows = p3.systems.rows
    .map((row) => {
      const flag = row.isMediaBreak
        ? '<span class="matrix-flag matrix-flag--break">Medienbruch</span>'
        : row.isGap
          ? '<span class="matrix-flag matrix-flag--gap">Lücke</span>'
          : "";
      return `<tr>
        <td>${row.purposeLabel}</td>
        <td class="matrix-sys">${row.systemNames.join(", ") || "—"}</td>
        <td>${flag}</td>
      </tr>`;
    })
    .join("\n");

  const overloaded = p3.systems.overloaded
    .map((entry) => `${entry.name} (${entry.purposeCount} Zwecke)`)
    .join(", ");

  return `
<div class="npage">
  ${ph("Wie bei Ihnen gearbeitet wird", "Abläufe und Handarbeit")}

  <div class="p3-hero">
    <div class="p3-figure">
      <div><span class="p3-figure-num">${formatHours(p3.tasks.totalHoursPerMonth)}</span><span class="p3-figure-unit">Stunden / Monat</span></div>
      <div class="p3-figure-lbl">gehen für wiederkehrende Handarbeit drauf</div>
    </div>
    <div class="p3-figure">
      <div><span class="p3-figure-num">${p3.flows.overallManualShare}</span><span class="p3-figure-unit">%</span></div>
      <div class="p3-figure-lbl">der Stationen laufen von Hand</div>
    </div>
    <div class="p3-figure">
      <div><span class="p3-figure-num">${p3.systems.mediaBreaks.length}</span><span class="p3-figure-unit">Medienbrüche</span></div>
      <div class="p3-figure-lbl">bei ${p3.systems.systemCount} eingesetzten Programmen</div>
    </div>
  </div>

  <div class="section-lbl">Ihre Abläufe, Station für Station</div>
  ${flowPages}
  <div class="flow-legend">
    <span class="lg-takeover">von Hand — hier setzt Automatisierung an</span>
    <span class="lg-manual">von Hand — bleibt bewusst beim Menschen</span>
    <span class="lg-auto">läuft bereits ohne Handarbeit</span>
  </div>
  <p class="p3-note">Durchgestrichene Stationen gibt es in Ihrem Betrieb nicht und zählen
  nirgends mit. Welche Abläufe hier stehen, ergibt sich aus den Aufgaben mit dem größten
  Zeitaufwand — nicht aus einer Auswahl.</p>
</div>

<div class="npage">
  ${ph("Woher die Stunden kommen", "Wiederkehrende Aufgaben")}
  <div class="table-scroll">
    <table class="p3-table">
      <thead>
        <tr>
          <th class="col-wide">Aufgabe</th>
          <th class="col-band">Wie oft</th>
          <th class="col-band">Wie lange</th>
          <th class="col-num comp-right">Std. / Monat</th>
        </tr>
      </thead>
      <tbody>
        ${taskRows}
        <tr class="comp-total">
          <td>Summe</td>
          <td></td>
          <td></td>
          <td class="comp-val">${formatHours(p3.tasks.totalHoursPerMonth)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="comp-note">Gerechnet mit der Mitte des angegebenen Bandes und 4,33 Wochen je Monat.
  ${p3.tasks.handoffCandidates > 0
    ? `${p3.tasks.handoffCandidates} dieser Aufgaben berühren mehr als ein Programm — das sind
       die Stellen, an denen jemand Daten transportiert statt zu entscheiden.`
    : ""}</p>

  <div class="section-lbl" style="margin-top:22px">Welches Programm wofür</div>
  <div class="table-scroll">
    <table class="p3-table p3-matrix">
      <thead>
        <tr>
          <th class="col-purpose">Wofür</th>
          <th class="col-systems">Womit</th>
          <th class="col-finding">Befund</th>
        </tr>
      </thead>
      <tbody>
        ${matrixRows}
      </tbody>
    </table>
  </div>
  <p class="comp-note">
    <strong>Medienbruch</strong> heißt: derselbe Zweck wird von mehreren Programmen bedient,
    jemand hält sie im Gleichstand. <strong>Lücke</strong> heißt: dafür gibt es kein Programm —
    der Vorgang läuft auf Papier oder im Kopf.
    ${overloaded ? ` Auffällig: ${overloaded} trägt mehr, als ein einzelnes Werkzeug tragen sollte.` : ""}
  </p>
</div>`;
}

/** Bezeichnungen der Modul-5-Gruppen für den Hinweis im Bericht. */
const M5_GROUP_LABELS: Record<string, string> = {
  "5.1": "Einsatz- und Dienstplanung",
  "5.2": "Arbeitszeit und Lohnvorbereitung",
  "5.3": "Abwesenheiten und Urlaub",
  "5.4": "Information und Wissen",
  "5.5": "Formulare und Freigaben",
  "5.6": "Vertrieb und Kundenprozesse",
  "5.7": "Backoffice und wiederkehrende Aufgaben",
  "5.8": "Systemlandschaft und Schnittstellen",
};

/**
 * Was nicht gefragt wurde, weil es den Betrieb nicht betrifft.
 *
 * Der Blueprint überspringt Gruppen, die nicht zutreffen, und normiert die
 * Bewertung auf den Rest. Das steht dem Leser zu — es erklärt, warum eine
 * Auswertung kürzer ausfällt, und belegt, dass nicht an Fremdem gemessen wurde.
 */
function skippedGroupsNote(data: BlueprintReportData): string {
  if (data.skippedGroups.length === 0) return "";
  const names = data.skippedGroups
    .map((code) => M5_GROUP_LABELS[code] ?? `Gruppe ${code}`)
    .join(", ");
  return `<div class="skipped-note">
    <strong>Nicht bewertet, weil nicht zutreffend:</strong> ${names}.
    Diese Bereiche wurden anhand Ihrer Angaben übersprungen und fließen nicht in die Bewertung
    ein — Sie werden nicht an Anforderungen gemessen, die Ihr Betrieb nicht hat.
  </div>`;
}

export function renderReportHtml(data: BlueprintReportData, texts: ReportTexts, logoDataUri?: string): string {
  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  // Gewichteter Gesamtwert. Er wird im Assembler gerechnet, damit Umschlag,
  // Tabelle und Fließtext dieselbe Zahl nennen.
  const avgScore = data.totalScore;
  const avgColor = scoreColor(avgScore);
  const avgLabel = scoreLabel(avgScore);

  const compositionRows = data.moduleScores
    .map((m) => {
      const c = scoreColor(m.score);
      return `<tr>
        <td class="comp-mod"><span class="comp-num" style="color:${c}">M${m.moduleNumber}</span> ${m.label}</td>
        <td class="comp-val" style="color:${c}">${m.score}</td>
        <td class="comp-val comp-weight">${formatPercent(m.weight)}</td>
        <td class="comp-val comp-contrib">${formatDecimal(m.contribution)}</td>
      </tr>`;
    })
    .join("\n");

  // Aus den *angezeigten* Beiträgen summieren, damit die Spalte für den Leser
  // aufgeht. Der gerundete Gesamtwert auf dem Umschlag kann dadurch um ein
  // Zehntel abweichen — darauf weist die Fußnote hin.
  const compositionSum = data.moduleScores.reduce(
    (sum, m) => sum + Math.round(m.contribution * 10) / 10,
    0
  );

  // ── All 8 compact bars for overview page ────────────────────────────────
  const allCompactBars = data.moduleScores
    .map((m) => compactBar(m, texts.moduleInsights[m.moduleNumber] ?? ""))
    .join("\n");

  // ── Module detail pages: 2 per page ─────────────────────────────────────
  const modulePairs: ModuleScoreEntry[][] = [];
  for (let i = 0; i < data.moduleScores.length; i += 2) {
    modulePairs.push(data.moduleScores.slice(i, i + 2));
  }
  const moduleDetailPages = modulePairs
    .map((pair) => modulePairPage(pair, texts.moduleDetailedAnalysis))
    .join("\n");

  // ── Logo markup ──────────────────────────────────────────────────────────
  const logoHtml = logoDataUri
    ? `<img src="${logoDataUri}" alt="OKUN" class="cover-logo-img" />`
    : `<div class="cover-logo">OKUN<span>.</span></div>`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>OKUN Blueprint™ 2.0 – ${data.company.name}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: A4;
  margin: 1.8cm 1.8cm;
}
@page:first {
  margin: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, Helvetica, sans-serif;
  font-size: 9.5pt;
  line-height: 1.55;
  color: #1a1a2e;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Page break utility ─────────────────────────────────────────────────── */
.npage { page-break-before: always; padding-top: 0.3cm; min-height: 240mm; display: flex; flex-direction: column; }
/* Prose flow pages — no forced break, no min-height; content continues from previous page */
.flow-page { padding-top: 0.3cm; }

/* ── Page header ──────────────────────────────────────────────────────────*/
.ph { margin-bottom: 20px; }
.ph-eye {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  color: #00b8ff;
  margin-bottom: 3px;
}
.ph-title {
  font-size: 16pt;
  font-weight: 800;
  color: #0d1117;
  margin-bottom: 10px;
  line-height: 1.15;
}
.ph-rule { height: 3px; background: #00b8ff; border-radius: 2px; width: 48px; }

/* ── COVER PAGE ───────────────────────────────────────────────────────────*/
.cover {
  page-break-after: always;
  min-height: 297mm;
  background: #060c17;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 2.2cm 2cm;
  position: relative;
}
.cover-logo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #00b8ff;
  padding-bottom: 18px;
}
.cover-logo-img { height: 44px; width: auto; object-fit: contain; }
.cover-logo { font-size: 20pt; font-weight: 900; color: #fff; letter-spacing: -1px; }
.cover-logo span { color: #00b8ff; }
.cover-logo-sub { font-size: 8pt; color: #556; margin-top: 3px; letter-spacing: 0.5px; }
.cover-confidential {
  font-size: 7.5pt; color: #334; background: #0d1a2d;
  border: 1px solid #1a2840; padding: 4px 10px; border-radius: 4px;
}
.cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 1cm 0; }
.cover-report-label {
  font-size: 8pt; font-weight: 700; letter-spacing: 2px;
  text-transform: uppercase; color: #00b8ff; margin-bottom: 12px;
}
.cover-company { font-size: 30pt; font-weight: 800; color: #fff; margin-bottom: 6px; line-height: 1.1; }
.cover-title { font-size: 14pt; color: #8899aa; font-weight: 400; margin-bottom: 28px; }
.cover-meta-grid { display: flex; gap: 32px; margin-bottom: 36px; }
.cover-meta-label { font-size: 7.5pt; color: #445566; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
.cover-meta-val { font-size: 10pt; color: #aabbcc; font-weight: 600; }
.cover-score-section { display: flex; align-items: flex-start; gap: 32px; }
.cover-score-circle {
  flex-shrink: 0; width: 120px; height: 120px; border-radius: 50%;
  border: 3px solid; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.cover-score-num { font-size: 34pt; font-weight: 900; line-height: 1; }
.cover-score-denom { font-size: 9pt; color: #556677; margin-top: 2px; }
.cover-score-lbl { font-size: 14pt; font-weight: 700; margin-bottom: 8px; }
.cover-score-desc { font-size: 10pt; color: #7788aa; line-height: 1.55; max-width: 380px; }
.cover-exec-summary {
  margin-top: 36px; background: #0d1a2d; border: 1px solid #1a2d4a;
  border-left: 3px solid #00b8ff; border-radius: 8px; padding: 16px 20px;
  color: #aabbcc; font-size: 9.5pt; line-height: 1.65;
}
.cover-exec-label {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #00b8ff; margin-bottom: 8px;
}
.cover-footer {
  border-top: 1px solid #0d1a2d; padding-top: 14px;
  display: flex; justify-content: space-between; align-items: center;
  color: #334455; font-size: 8pt;
}

/* ── Prose pages (Einleitung, Context, Digi) ─────────────────────────────*/
.prose-page {
  font-size: 10pt; line-height: 1.78; color: #1a1a1a;
  text-align: justify; hyphens: auto; flex: 1;
}
.prose-page p { margin-bottom: 13px; }
.prose-page p:last-child { margin-bottom: 0; }

/* ── Info bar ─────────────────────────────────────────────────────────────*/
.info-bar {
  display: flex; gap: 24px; margin-top: 18px; padding: 12px 16px;
  background: #f5f9ff; border: 1px solid #dbeafe; border-radius: 8px;
}
.info-item-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
.info-item-val { font-size: 9.5pt; font-weight: 600; color: #1a1a2e; }

/* ── Industry highlight bar ──────────────────────────────────────────────*/
.digi-industry-bar {
  margin-top: 18px; padding: 14px 18px; background: #f0fdf4;
  border: 1px solid #bbf7d0; border-left: 3px solid #22c55e; border-radius: 8px;
}
.digi-industry-label {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1.2px;
  text-transform: uppercase; color: #16a34a; margin-bottom: 6px;
}

/* ── Score overview page ─────────────────────────────────────────────────*/
.score-hero {
  display: flex; align-items: center; gap: 28px; margin-bottom: 22px;
  padding: 18px 20px; background: #f8faff; border: 1px solid #e5eeff; border-radius: 12px;
}
.score-circle {
  flex-shrink: 0; width: 100px; height: 100px; border-radius: 50%;
  border: 4px solid; display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.score-circle-num { font-size: 28pt; font-weight: 900; line-height: 1; }
.score-circle-den { font-size: 8pt; color: #9ca3af; margin-top: 2px; }
.score-hero-right { flex: 1; }
.score-hero-label { font-size: 20pt; font-weight: 800; margin-bottom: 4px; }
.score-hero-company { font-size: 9.5pt; color: #6b7280; margin-bottom: 10px; }
.score-scale {
  position: relative; height: 10px;
  background: linear-gradient(to right, #ef4444 0%, #f97316 25%, #f59e0b 40%, #22c55e 60%, #00b8ff 80%);
  border-radius: 5px; margin-bottom: 5px;
}
.score-scale-dot {
  position: absolute; top: -4px; width: 18px; height: 18px; border-radius: 50%;
  border: 3px solid #fff; box-shadow: 0 0 0 2px #333; transform: translateX(-50%);
}
.score-scale-labels { display: flex; justify-content: space-between; font-size: 6.5pt; color: #9ca3af; }

/* ── Compact bars ─────────────────────────────────────────────────────────*/
.cbars-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 24px; margin-bottom: 20px; }
.cbar-hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.cbar-name { font-weight: 600; font-size: 9pt; color: #111; }
.cbar-score { font-weight: 800; font-size: 10pt; }
.cbar-denom { font-size: 7.5pt; color: #9ca3af; font-weight: 400; }
.cbar-track { height: 5px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
.cbar-fill { height: 100%; border-radius: 3px; }
.cbar-meta { display: flex; align-items: baseline; gap: 8px; }
.cbar-lbl { font-size: 7.5pt; font-weight: 700; }
.cbar-insight { font-size: 7.5pt; color: #6b7280; flex: 1; line-height: 1.35; }

/* ── Score analysis page ─────────────────────────────────────────────────*/
.score-prose {
  font-size: 10pt; line-height: 1.78; color: #1a1a1a;
  text-align: justify; hyphens: auto; flex: 1;
}
.score-prose p { margin-bottom: 13px; }
.score-prose p:first-child { font-size: 10.5pt; font-weight: 500; }
.score-prose p:last-child { margin-bottom: 0; }

/* ── Module blocks (2 per page) ───────────────────────────────────────────*/
.mod-block { margin-bottom: 14px; }
.mod-name {
  font-size: 10pt; font-weight: 700; color: #0d1117;
  padding: 6px 12px; margin-bottom: 8px; display: flex; align-items: baseline; gap: 8px;
}
.mod-num { font-size: 9.5pt; font-weight: 900; }
.mod-score-inline { margin-left: auto; font-size: 8pt; font-weight: 600; }
.mod-sep { height: 1px; background: #e5e7eb; margin: 14px 0; }

.mfp-head {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 16px; background: #f8faff; border: 1px solid #e5eeff;
  border-radius: 8px; margin-bottom: 10px;
}
.mfp-score-col {
  text-align: center; flex-shrink: 0; min-width: 58px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.mfp-score-num { font-size: 24pt; font-weight: 900; line-height: 1; }
.mfp-score-den { font-size: 8pt; color: #9ca3af; }
.mfp-score-lbl { font-size: 7.5pt; font-weight: 700; margin-top: 3px; }
.mfp-bar-col { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.mfp-bar-track {
  height: 8px; background: #e5e7eb; border-radius: 4px;
  overflow: hidden; margin-bottom: 5px;
}
.mfp-bar-fill { height: 100%; border-radius: 4px; }
.mfp-scale-labels {
  display: flex; justify-content: space-between;
  font-size: 6pt; color: #9ca3af;
}
.mfp-body {
  font-size: 9.5pt; line-height: 1.7; color: #1a1a1a;
  text-align: justify; hyphens: auto;
}
.mfp-body p { margin-bottom: 10px; }
.mfp-body p:last-child { margin-bottom: 0; }

/* ── Section label ────────────────────────────────────────────────────────*/
.section-lbl {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1.5px;
  text-transform: uppercase; color: #00b8ff; margin: 18px 0 10px;
}

/* ── Fazit ────────────────────────────────────────────────────────────────*/
.fazit-prose {
  font-size: 10pt; line-height: 1.78; color: #1a1a1a;
  text-align: justify; hyphens: auto; flex: 1;
}
.fazit-prose p { margin-bottom: 13px; }
.fazit-prose p:last-child { margin-bottom: 0; }

/* ── Zusammensetzung des Gesamtwerts ──────────────────────────────────────*/
.comp-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
.comp-table th {
  text-align: left; font-size: 7pt; font-weight: 700; letter-spacing: 1px;
  text-transform: uppercase; color: #64748b; padding: 0 0 5px; border-bottom: 1px solid #e2e8f0;
}
.comp-table th.comp-right, .comp-table td.comp-val { text-align: right; }
.comp-table td { padding: 4.5px 0; border-bottom: 1px solid #f1f5f9; }
.comp-mod { color: #0d1117; }
.comp-num { font-weight: 800; margin-right: 4px; }
.comp-val { font-weight: 700; font-variant-numeric: tabular-nums; }
.comp-weight { color: #64748b; font-weight: 600; }
.comp-contrib { color: #0d1117; }
.comp-total td { border-bottom: 0; border-top: 1.5px solid #0d1117; padding-top: 7px; font-weight: 800; }
.comp-note { font-size: 7.5pt; color: #64748b; margin-top: 7px; line-height: 1.5; }

/* ── Empfehlungen ─────────────────────────────────────────────────────────*/
.sol-intro { font-size: 9pt; color: #334155; line-height: 1.6; margin-bottom: 16px; }
.sol-empty { font-size: 9pt; color: #64748b; line-height: 1.6; }
.sol-phase { margin-bottom: 18px; }
.sol-phase-label {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase;
  color: #00b8ff; margin-bottom: 8px;
}
.sol-card { background: #f8fafc; border-radius: 4px; padding: 9px 12px; margin-bottom: 7px; }
.sol-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.sol-name { font-size: 9.5pt; font-weight: 700; color: #0d1117; }
.sol-cat { font-size: 7pt; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; white-space: nowrap; }
.sol-desc { font-size: 8.5pt; color: #475569; line-height: 1.55; margin-top: 3px; }

/* ── Dritte Säule ─────────────────────────────────────────────────────────*/
.p3-hero { display: flex; gap: 28px; align-items: stretch; margin-bottom: 18px; }
.p3-figure {
  flex: 1; background: #f8fafc; border-radius: 5px; padding: 14px 18px;
  border-left: 3px solid #00b8ff;
}
.p3-figure-num { font-size: 26pt; font-weight: 800; color: #0d1117; line-height: 1; }
.p3-figure-unit { font-size: 9pt; color: #64748b; margin-left: 3px; font-weight: 600; }
.p3-figure-lbl {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  color: #64748b; margin-top: 6px;
}
.p3-note { font-size: 8pt; color: #64748b; line-height: 1.5; margin-top: 10px; }

.flow { margin-bottom: 14px; break-inside: avoid; }
.flow-title { font-size: 10pt; font-weight: 700; color: #0d1117; margin-bottom: 2px; }
.flow-meta { font-size: 8pt; color: #64748b; margin-bottom: 7px; }
.flow-stations { display: flex; flex-wrap: wrap; gap: 4px; }
.flow-station {
  font-size: 8pt; padding: 3.5px 8px; border-radius: 3px;
  border: .6pt solid #e2e8f0; background: #f8fafc; color: #475569;
}
.flow-station--manual { border-color: #fbbf24; background: #fffbeb; color: #92400e; font-weight: 600; }
.flow-station--takeover { border-color: #00b8ff; background: #e6f6fe; color: #075985; font-weight: 600; }
.flow-station--none { opacity: .45; text-decoration: line-through; }
.flow-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: 7.5pt; color: #64748b; margin-top: 10px; }
.flow-legend span::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 2px;
  margin-right: 5px; vertical-align: -1px;
}
.flow-legend .lg-manual::before { background: #fbbf24; }
.flow-legend .lg-takeover::before { background: #00b8ff; }
.flow-legend .lg-auto::before { background: #e2e8f0; }

.matrix-sys { color: #0d1117; }
.matrix-flag { font-size: 7.5pt; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; }
.matrix-flag--break { color: #92400e; }
.matrix-flag--gap { color: #b91c1c; }

.p3-table { table-layout: fixed; }
.p3-table td:first-child, .p3-table th:first-child { padding-right: 14px; }
.p3-table .col-wide { width: 44%; }
.p3-table .col-band { width: 19%; white-space: nowrap; }
.p3-table .col-num { width: 18%; }
.p3-matrix .col-purpose { width: 30%; }
.p3-matrix .col-systems { width: 48%; }
.p3-matrix .col-finding { width: 22%; }
.p3-badge {
  display: inline-block; font-size: 7pt; font-weight: 700; letter-spacing: .6px;
  text-transform: uppercase; color: #92400e; background: #fffbeb;
  border: .5pt solid #fbbf24; border-radius: 2px; padding: 0 4px; margin-left: 6px;
  vertical-align: 1px;
}

.skipped-note {
  background: #f8fafc; border-left: 3px solid #cbd5e1; padding: 12px 16px;
  font-size: 8.5pt; color: #475569; line-height: 1.55; margin-top: 16px; border-radius: 0 3px 3px 0;
}

.orientation-box {
  margin-top: 22px; padding: 16px 20px; background: #f5f9ff;
  border: 1px solid #dbeafe; border-left: 4px solid #00b8ff; border-radius: 8px;
  font-size: 9.5pt; color: #1a2e50; line-height: 1.65;
}
.orientation-label {
  font-size: 7.5pt; font-weight: 700; letter-spacing: 1.3px;
  text-transform: uppercase; color: #00b8ff; margin-bottom: 7px;
}

.fazit-closing {
  margin-top: 18px; padding: 14px 18px; background: #f0fdf4;
  border: 1px solid #bbf7d0; border-left: 3px solid #22c55e;
  border-radius: 8px; font-size: 9.5pt; color: #166534; line-height: 1.6;
}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 1: COVER
     ══════════════════════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-logo-bar">
    <div>
      ${logoHtml}
      <div class="cover-logo-sub">OKUN Systems · Digitalisierungsberatung</div>
    </div>
    <div class="cover-confidential">Vertraulich · Nur für intern</div>
  </div>

  <div class="cover-body">
    <div class="cover-report-label">OKUN Blueprint™ 2.0 · Analysebericht</div>
    <div class="cover-company">${data.company.name}</div>
    <div class="cover-title">Individueller Digitalisierungsbericht</div>

    <div class="cover-meta-grid">
      ${data.company.industry ? `<div class="cover-meta-item"><div class="cover-meta-label">Branche</div><div class="cover-meta-val">${data.company.industry}</div></div>` : ""}
      <div class="cover-meta-item"><div class="cover-meta-label">Analysedatum</div><div class="cover-meta-val">${dateStr}</div></div>
      <div class="cover-meta-item"><div class="cover-meta-label">Abdeckung</div><div class="cover-meta-val">${data.totalAnswered} / ${data.totalActive} Fragen</div></div>
      <div class="cover-meta-item"><div class="cover-meta-label">Paket</div><div class="cover-meta-val">${data.packageType ?? "Standard"}</div></div>
    </div>

    <div class="cover-score-section">
      <div class="cover-score-circle" style="border-color:${avgColor};color:${avgColor}">
        <div class="cover-score-num" style="color:${avgColor}">${avgScore}</div>
        <div class="cover-score-denom">/ 100</div>
      </div>
      <div>
        <div class="cover-score-lbl" style="color:${avgColor}">${avgLabel}</div>
        <div class="cover-score-desc">Gewichteter Digitalisierungsgrad über ${data.moduleScores.length} bewertete Blueprint-Module.</div>
      </div>
    </div>

    <div class="cover-exec-summary">
      <div class="cover-exec-label">Zusammenfassung</div>
      ${texts.executiveSummary || `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`}
    </div>
  </div>

  <div class="cover-footer">
    <span>OKUN Blueprint™ 2.0 · ${dateStr}</span>
    <span>okun-systems.de</span>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITEN 2+: EINLEITUNG (fließt weiter, keine Zwangsseitenumbrüche)
     ══════════════════════════════════════════════════════════════════════ -->
<div class="flow-page">
  ${ph("Über diese Analyse", "Einleitung")}
  <div class="prose-page">
    ${texts.einleitungText || `<p>Der OKUN Blueprint™ 2.0 ist ein strukturiertes Analyse-Werkzeug zur systematischen Bewertung des Digitalisierungsstandes von ${data.company.name}. Die Analyse basiert vollständig auf den Antworten aus dem Fragebogen und gibt einen differenzierten Überblick über die bewerteten operativen Module.</p>`}
  </div>
  <div class="info-bar">
    ${data.company.industry ? `<div><div class="info-item-label">Branche</div><div class="info-item-val">${data.company.industry}</div></div>` : ""}
    <div><div class="info-item-label">Module</div><div class="info-item-val">${data.moduleScores.length} Bereiche</div></div>
    <div><div class="info-item-label">Beantwortete Fragen</div><div class="info-item-val">${data.totalAnswered} von ${data.totalActive}</div></div>
    <div><div class="info-item-label">Analysedatum</div><div class="info-item-val">${dateStr}</div></div>
  </div>
</div>

${texts.contextPageText ? `
<!-- Unternehmenskontext fließt direkt weiter (gleiche Seite wenn Platz vorhanden) -->
<div class="flow-page">
  ${ph("Ihr Unternehmen", "Unternehmenskontext")}
  <div class="prose-page">
    ${texts.contextPageText}
  </div>
</div>
` : ""}

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 4: GESAMTAUSWERTUNG
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Ihr Ergebnis auf einen Blick", "Gesamtauswertung")}

  <div class="score-hero">
    <div class="score-circle" style="border-color:${avgColor};color:${avgColor}">
      <div class="score-circle-num" style="color:${avgColor}">${avgScore}</div>
      <div class="score-circle-den">/ 100</div>
    </div>
    <div class="score-hero-right">
      <div class="score-hero-label" style="color:${avgColor}">${avgLabel}</div>
      <div class="score-hero-company">${data.company.name}${data.company.industry ? ` · ${data.company.industry}` : ""}</div>
      <div class="score-scale">
        <div class="score-scale-dot" style="left:${Math.min(avgScore, 99)}%;background:${avgColor}"></div>
      </div>
      <div class="score-scale-labels">
        <span>0 – Dringend</span>
        <span>35 – Handlungsbedarf</span>
        <span>50 – Ausbaufähig</span>
        <span>65 – Gut</span>
        <span>80+ – Sehr gut</span>
      </div>
    </div>
  </div>

  <div class="section-lbl">Ergebnisse nach Modul</div>
  <div class="cbars-grid">
    ${allCompactBars}
  </div>

  <div class="section-lbl">So setzt sich Ihr Wert zusammen</div>
  <table class="comp-table">
    <thead>
      <tr>
        <th>Modul</th>
        <th class="comp-right">Wert</th>
        <th class="comp-right">Gewicht</th>
        <th class="comp-right">Beitrag</th>
      </tr>
    </thead>
    <tbody>
      ${compositionRows}
      <tr class="comp-total">
        <td>Gesamtwert</td>
        <td class="comp-val"></td>
        <td class="comp-val">100 %</td>
        <td class="comp-val" style="color:${avgColor}">${formatDecimal(compositionSum)}</td>
      </tr>
    </tbody>
  </table>
  <p class="comp-note">Nicht jedes Modul wiegt gleich schwer — Prozessqualität bestimmt den
  Alltag eines Betriebs stärker als Personalmanagement. Auf dem Umschlag steht der gerundete
  Gesamtwert ${avgScore}.</p>

  ${skippedGroupsNote(data)}

</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SCORE-ANALYSE — fließt weiter, statt eine halbe Seite frei zu lassen
     ══════════════════════════════════════════════════════════════════════ -->
<div class="flow-page">
  ${ph("Analyse des aktuellen Digitalisierungsstandes", "Score-Analyse")}
  <div class="score-prose">
    ${texts.scoreAnalysis || `<p>${data.company.name} hat den OKUN Blueprint™ 2.0 erfolgreich abgeschlossen und einen Gesamtdigitalisierungsgrad von ${avgScore}/100 erreicht. Die Auswertung zeigt ein differenziertes Bild des aktuellen Stands mit klaren Unterschieden zwischen den bewerteten Modulen.</p>`}
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITEN 7–14: MODULANALYSE (JE 1 MODUL PRO SEITE)
     ══════════════════════════════════════════════════════════════════════ -->
${moduleDetailPages}

<!-- ══════════════════════════════════════════════════════════════════════
     DRITTE SÄULE: ABLÄUFE, AUFGABEN, SYSTEME
     ══════════════════════════════════════════════════════════════════════ -->
${pillar3Pages(data)}

<!-- ══════════════════════════════════════════════════════════════════════
     EMPFEHLUNGEN UND ROADMAP
     ══════════════════════════════════════════════════════════════════════ -->
${recommendationPage(data)}

<!-- ══════════════════════════════════════════════════════════════════════
     FAZIT
     ══════════════════════════════════════════════════════════════════════ -->
<div class="flow-page">
  ${ph("Zusammenfassung der Analyseergebnisse", "Fazit")}
  <div class="fazit-prose">
    ${texts.conclusionText || `<p>Die Analyse von ${data.company.name} zeigt ein klares Bild des aktuellen Digitalisierungsstandes. Der OKUN Blueprint™ 2.0 hat die wichtigsten Stärken und Nachholbereiche in den bewerteten Modulen identifiziert und strukturiert dargestellt.</p>`}
  </div>

  <div class="orientation-box" style="margin-top:18px">
    <div class="orientation-label">Ausblick &amp; Orientierung</div>
    ${texts.orientationText || "Im Strategiegespräch mit OKUN Systems werden die Analyseergebnisse vertieft und konkrete nächste Schritte gemeinsam erarbeitet."}
  </div>

  <div class="fazit-closing">
    <strong>Ihr nächster Schritt:</strong> Im Strategiegespräch mit OKUN Systems besprechen wir gemeinsam die Ergebnisse dieser Analyse im Detail — individuell abgestimmt auf die Situation und die Ziele von ${data.company.name}.
  </div>
</div>

</body>
</html>`;
}
