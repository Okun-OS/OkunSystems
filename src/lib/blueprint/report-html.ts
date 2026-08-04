import type { BlueprintReportData } from "./report-assembler";
import type { ReportTexts } from "./report-text-engine";

const CATEGORY_COLORS: Record<string, string> = {
  WORKFORCE: "#00b8ff",
  BEWAEHRTE_LOESUNG: "#3b82f6",
  CUSTOM_DEVELOPMENT: "#a855f7",
};

const CATEGORY_LABELS: Record<string, string> = {
  WORKFORCE: "OKUN Workforce",
  BEWAEHRTE_LOESUNG: "Bewährte Lösungen",
  CUSTOM_DEVELOPMENT: "Individuelle Entwicklung",
};

const TIER_LABELS: Record<string, string> = {
  foundation: "Phase 1 – Grundlagen",
  operations: "Phase 2 – Betrieb",
  custom: "Phase 3 – Individuell",
};

function scoreColor(score: number): string {
  if (score >= 80) return "#00b8ff";
  if (score >= 65) return "#86efac";
  if (score >= 50) return "#fbbf24";
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

export function renderReportHtml(
  data: BlueprintReportData,
  texts: ReportTexts
): string {
  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "–";

  const avgScore =
    data.moduleScores.length > 0
      ? Math.round(
          data.moduleScores.reduce((s, m) => s + m.score, 0) /
            data.moduleScores.length
        )
      : 0;

  const moduleBars = data.moduleScores
    .map((m) => {
      const insight = texts.moduleInsights[m.moduleNumber] ?? "";
      const color = scoreColor(m.score);
      return `
        <div class="module-row">
          <div class="module-header">
            <span class="module-name">M${m.moduleNumber} · ${m.label}</span>
            <span class="module-score" style="color:${color}">${m.score}/100</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${m.score}%;background:${color}"></div>
          </div>
          <div class="module-label-row">
            <span class="maturity-label" style="color:${color}">${scoreLabel(m.score)}</span>
            ${insight ? `<span class="module-insight">${insight}</span>` : ""}
          </div>
        </div>`;
    })
    .join("");

  const recRows = data.recommendations
    .slice(0, 8)
    .map((r) => {
      const color = CATEGORY_COLORS[r.category] ?? "#888";
      const catLabel = CATEGORY_LABELS[r.category] ?? r.category;
      return `
        <div class="rec-card">
          <div class="rec-header">
            <span class="rec-name">${r.name}</span>
            <span class="rec-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${catLabel}</span>
          </div>
          <p class="rec-desc">${r.description}</p>
        </div>`;
    })
    .join("");

  const roadmapPhases = data.roadmap
    .map((phase) => {
      const phaseLabel = TIER_LABELS[phase.packageTier] ?? phase.phaseLabel;
      const items = phase.solutions
        .map((s) => `<li>${s.name}</li>`)
        .join("");
      return `
        <div class="roadmap-phase">
          <div class="roadmap-phase-header">${phaseLabel}</div>
          <ul class="roadmap-list">${items}</ul>
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OKUN Blueprint™ 2.0 – ${data.company.name}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4; margin: 2cm 1.8cm; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #111;
    background: #fff;
  }

  /* ── Cover page ──────────────────────────────────────────────────────── */
  .cover {
    page-break-after: always;
    min-height: 257mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 2cm 0;
  }
  .cover-top { border-bottom: 3px solid #00b8ff; padding-bottom: 24px; }
  .cover-logo {
    font-size: 22pt;
    font-weight: 800;
    color: #111;
    letter-spacing: -0.5px;
  }
  .cover-logo span { color: #00b8ff; }
  .cover-subtitle { color: #555; font-size: 10pt; margin-top: 4px; }
  .cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 40px 0; }
  .cover-company { font-size: 28pt; font-weight: 700; color: #111; margin-bottom: 8px; }
  .cover-title { font-size: 16pt; color: #00b8ff; font-weight: 600; margin-bottom: 24px; }
  .cover-meta { color: #555; font-size: 9.5pt; line-height: 1.8; }
  .cover-score-box {
    display: inline-block;
    border: 2px solid #00b8ff;
    border-radius: 12px;
    padding: 16px 24px;
    margin-top: 24px;
    text-align: center;
  }
  .cover-score-num { font-size: 40pt; font-weight: 800; color: #00b8ff; line-height: 1; }
  .cover-score-lbl { font-size: 9pt; color: #555; margin-top: 4px; }
  .cover-bottom { border-top: 1px solid #e5e5e5; padding-top: 12px; color: #888; font-size: 8.5pt; }

  /* ── Section headings ────────────────────────────────────────────────── */
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 13pt;
    font-weight: 700;
    color: #111;
    border-left: 4px solid #00b8ff;
    padding-left: 12px;
    margin-bottom: 16px;
    page-break-after: avoid;
  }

  /* ── Executive summary ───────────────────────────────────────────────── */
  .summary-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 8px;
    padding: 16px 20px;
    color: #166534;
    font-size: 10.5pt;
    line-height: 1.6;
  }

  /* ── Module scores ───────────────────────────────────────────────────── */
  .module-row { margin-bottom: 16px; page-break-inside: avoid; }
  .module-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
  .module-name { font-weight: 600; font-size: 10pt; color: #111; }
  .module-score { font-weight: 700; font-size: 10pt; }
  .bar-track { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .module-label-row { display: flex; align-items: baseline; gap: 12px; }
  .maturity-label { font-size: 8.5pt; font-weight: 600; }
  .module-insight { font-size: 8.5pt; color: #555; flex: 1; }

  /* ── Recommendations ─────────────────────────────────────────────────── */
  .rec-card {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .rec-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 6px; }
  .rec-name { font-weight: 600; font-size: 10pt; color: #111; }
  .rec-badge { font-size: 7.5pt; font-weight: 600; padding: 2px 8px; border-radius: 999px; white-space: nowrap; }
  .rec-desc { font-size: 8.5pt; color: #555; line-height: 1.5; }

  /* ── Roadmap ─────────────────────────────────────────────────────────── */
  .roadmap-grid { display: flex; gap: 16px; flex-wrap: wrap; }
  .roadmap-phase {
    flex: 1;
    min-width: 150px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .roadmap-phase-header {
    background: #00b8ff;
    color: #fff;
    font-size: 9pt;
    font-weight: 700;
    padding: 8px 12px;
  }
  .roadmap-list { list-style: none; padding: 10px 12px; }
  .roadmap-list li { font-size: 8.5pt; color: #333; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }
  .roadmap-list li:last-child { border-bottom: none; }

  /* ── Signal summary ──────────────────────────────────────────────────── */
  .signal-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .signal-tile {
    flex: 1;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }
  .signal-num { font-size: 22pt; font-weight: 800; }
  .signal-lbl { font-size: 8pt; color: #555; margin-top: 2px; }

  /* ── Score analysis page ─────────────────────────────────────────────── */
  .score-page {
    page-break-before: always;
    page-break-after: always;
    min-height: 247mm;
    display: flex;
    flex-direction: column;
    padding: 0.5cm 0;
  }
  .score-page-header {
    border-bottom: 3px solid #00b8ff;
    padding-bottom: 16px;
    margin-bottom: 28px;
  }
  .score-page-eyebrow {
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #00b8ff;
    margin-bottom: 4px;
  }
  .score-page-title {
    font-size: 17pt;
    font-weight: 800;
    color: #111;
  }
  .score-hero {
    display: flex;
    align-items: center;
    gap: 28px;
    margin-bottom: 28px;
  }
  .score-circle {
    flex-shrink: 0;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    border: 4px solid;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .score-circle-num {
    font-size: 30pt;
    font-weight: 800;
    line-height: 1;
  }
  .score-circle-denom {
    font-size: 9pt;
    color: #888;
    margin-top: 2px;
  }
  .score-hero-meta {
    flex: 1;
  }
  .score-hero-label {
    font-size: 18pt;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .score-hero-company {
    font-size: 10.5pt;
    color: #555;
    margin-bottom: 10px;
  }
  .score-scale {
    position: relative;
    height: 10px;
    background: linear-gradient(to right, #ef4444 0%, #f97316 25%, #fbbf24 40%, #86efac 60%, #00b8ff 80%);
    border-radius: 5px;
    margin-bottom: 6px;
  }
  .score-scale-marker {
    position: absolute;
    top: -4px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 0 0 2px #111;
    transform: translateX(-50%);
  }
  .score-scale-labels {
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
    color: #888;
  }
  .score-analysis-body {
    flex: 1;
    font-size: 10pt;
    line-height: 1.65;
    color: #222;
  }
  .score-analysis-body p {
    margin-bottom: 10px;
  }
  .score-analysis-body p:last-child {
    margin-bottom: 0;
  }
  .score-module-mini {
    margin-top: 20px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .score-module-chip {
    font-size: 8pt;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid;
    font-weight: 600;
  }

  /* ── Footer ──────────────────────────────────────────────────────────── */
  @page { @bottom-right { content: "OKUN Blueprint™ 2.0 · " counter(page) " / " counter(pages); font-size: 8pt; color: #888; } }

  .page-break { page-break-before: always; }
  .confidential { color: #888; font-size: 8pt; text-align: center; margin-top: 32px; }
</style>
</head>
<body>

<!-- ── Cover ────────────────────────────────────────────────────────────── -->
<div class="cover">
  <div class="cover-top">
    <div class="cover-logo">OKUN<span>.</span></div>
    <div class="cover-subtitle">OKUN Systems · Digitalisierungsberatung</div>
  </div>
  <div class="cover-body">
    <div class="cover-company">${data.company.name}</div>
    <div class="cover-title">OKUN Blueprint™ 2.0 – Analysebericht</div>
    <div class="cover-meta">
      ${data.company.industry ? `Branche: ${data.company.industry}<br>` : ""}
      Analysedatum: ${dateStr}<br>
      Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}<br>
      Paket: ${data.packageType ?? "Standard"}
    </div>
    <div class="cover-score-box">
      <div class="cover-score-num">${avgScore}</div>
      <div class="cover-score-lbl">Ø Digitalisierungsscore</div>
    </div>
  </div>
  <div class="cover-bottom">
    Vertraulich · Nur für interne Verwendung · OKUN Systems GmbH
  </div>
</div>

<!-- ── Digitalisierungsscore Erklärung ───────────────────────────────────── -->
<div class="score-page">
  <div class="score-page-header">
    <div class="score-page-eyebrow">Ihr Ergebnis auf einen Blick</div>
    <div class="score-page-title">Digitalisierungsscore</div>
  </div>

  <div class="score-hero">
    <div class="score-circle" style="border-color:${scoreColor(avgScore)};color:${scoreColor(avgScore)}">
      <div class="score-circle-num">${avgScore}</div>
      <div class="score-circle-denom" style="color:#888">/ 100</div>
    </div>
    <div class="score-hero-meta">
      <div class="score-hero-label" style="color:${scoreColor(avgScore)}">${scoreLabel(avgScore)}</div>
      <div class="score-hero-company">${data.company.name}${data.company.industry ? ` · ${data.company.industry}` : ""}</div>
      <div class="score-scale">
        <div class="score-scale-marker" style="left:${avgScore}%;background:${scoreColor(avgScore)}"></div>
      </div>
      <div class="score-scale-labels">
        <span>0 – Dringend</span>
        <span>35 – Handlungsbedarf</span>
        <span>50 – Ausbaufähig</span>
        <span>65 – Gut</span>
        <span>80 – Sehr gut</span>
      </div>
    </div>
  </div>

  <div class="score-analysis-body">
    ${texts.scoreAnalysis || `<p>${data.company.name} hat den OKUN Blueprint™ 2.0 erfolgreich abgeschlossen. Die detaillierten Ergebnisse finden Sie auf den folgenden Seiten.</p>`}
  </div>

  ${data.moduleScores.length > 0 ? `<div class="score-module-mini">
    ${data.moduleScores.map((m) => `<span class="score-module-chip" style="color:${scoreColor(m.score)};border-color:${scoreColor(m.score)}40">M${m.moduleNumber} ${m.label}: ${m.score}</span>`).join("")}
  </div>` : ""}
</div>

<!-- ── Executive Summary ─────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-title">Zusammenfassung</div>
  <div class="summary-box">${texts.executiveSummary || "Analyse wurde erfolgreich durchgeführt."}</div>
</div>

<!-- ── Module Scores ─────────────────────────────────────────────────────── -->
<div class="section">
  <div class="section-title">Ergebnisse nach Modul</div>
  ${moduleBars}
</div>

<!-- ── Signal Summary ───────────────────────────────────────────────── -->
<div class="section page-break">
  <div class="section-title">Signalstärken</div>
  <div class="signal-row">
    <div class="signal-tile">
      <div class="signal-num" style="color:#00b8ff">${data.signals.WORKFORCE}</div>
      <div class="signal-lbl">OKUN Workforce</div>
    </div>
    <div class="signal-tile">
      <div class="signal-num" style="color:#3b82f6">${data.signals.BEWAEHRTE_LOESUNG}</div>
      <div class="signal-lbl">Bewährte Lösungen</div>
    </div>
    <div class="signal-tile">
      <div class="signal-num" style="color:#a855f7">${data.signals.CUSTOM_DEVELOPMENT}</div>
      <div class="signal-lbl">Individuelle Entwicklung</div>
    </div>
  </div>
</div>

<!-- ── Recommendations ───────────────────────────────────────────────────── -->
${
  data.recommendations.length > 0
    ? `<div class="section">
  <div class="section-title">Lösungsempfehlungen</div>
  <p style="font-size:9pt;color:#555;margin-bottom:14px">${texts.recommendationContext || ""}</p>
  ${recRows}
</div>`
    : ""
}

<!-- ── Roadmap ────────────────────────────────────────────────────────────── -->
${
  data.roadmap.length > 0
    ? `<div class="section">
  <div class="section-title">Umsetzungsfahrplan</div>
  <div class="roadmap-grid">${roadmapPhases}</div>
</div>`
    : ""
}

<div class="confidential">
  Dieser Bericht wurde automatisch auf Basis der Fragebogenantworten generiert.<br>
  Erstellt von OKUN Systems · OKUN Blueprint™ 2.0 · ${dateStr}
</div>

</body>
</html>`;
}
