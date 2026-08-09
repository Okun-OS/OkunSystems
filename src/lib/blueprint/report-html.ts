import type { BlueprintReportData, ModuleScoreEntry } from "./report-assembler";
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

function moduleDetailCard(m: ModuleScoreEntry, detailed: string): string {
  const c = scoreColor(m.score);
  return `<div class="mdc">
    <div class="mdc-head" style="border-left:4px solid ${c}">
      <div class="mdc-num" style="color:${c}">M${m.moduleNumber}</div>
      <div class="mdc-info">
        <div class="mdc-name">${m.label}</div>
        <div class="mdc-badge" style="color:${c}">${scoreLabel(m.score)}</div>
      </div>
      <div class="mdc-score" style="color:${c}">${m.score}<span class="mdc-denom">/100</span></div>
    </div>
    <div class="mdc-bar-track"><div class="mdc-bar-fill" style="width:${m.score}%;background:${c}"></div></div>
    <div class="mdc-body">${detailed || ""}</div>
  </div>`;
}

export function renderReportHtml(data: BlueprintReportData, texts: ReportTexts): string {
  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  const avgScore = data.moduleScores.length > 0
    ? Math.round(data.moduleScores.reduce((s, m) => s + m.score, 0) / data.moduleScores.length)
    : 0;

  const avgColor = scoreColor(avgScore);
  const avgLabel = scoreLabel(avgScore);

  // ── All 8 compact bars for overview page ────────────────────────────────
  const allCompactBars = data.moduleScores
    .map((m) => compactBar(m, texts.moduleInsights[m.moduleNumber] ?? ""))
    .join("\n");

  // ── Module detail pages: 2 per page ─────────────────────────────────────
  const moduleDetailPages = [];
  for (let i = 0; i < data.moduleScores.length; i += 2) {
    const pair = data.moduleScores.slice(i, i + 2);
    const pageNum = Math.floor(i / 2) + 1;
    const cards = pair
      .map((m) => moduleDetailCard(m, texts.moduleDetailedAnalysis[m.moduleNumber] ?? ""))
      .join("\n");
    moduleDetailPages.push(`
<div class="npage">
  ${ph(`Modulanalyse · Seite ${pageNum} von 4`, "Detaillierte Auswertung")}
  <div class="mdc-grid">
    ${cards}
  </div>
</div>`);
  }

  // ── Recommendation cards ─────────────────────────────────────────────────
  const recCards = data.recommendations
    .slice(0, 6)
    .map((r) => {
      const color = CATEGORY_COLORS[r.category] ?? "#888";
      const catLabel = CATEGORY_LABELS[r.category] ?? r.category;
      return `<div class="rec-card">
        <div class="rec-hd">
          <span class="rec-name">${r.name}</span>
          <span class="rec-badge" style="background:${color}1a;color:${color};border:1px solid ${color}33">${catLabel}</span>
        </div>
        <p class="rec-desc">${r.description}</p>
      </div>`;
    })
    .join("\n");

  // ── Roadmap phases ───────────────────────────────────────────────────────
  const roadmapCols = data.roadmap
    .map((phase) => {
      const phaseLabel = TIER_LABELS[phase.packageTier] ?? phase.phaseLabel;
      const items = phase.solutions.map((s) => `<li>${s.name}</li>`).join("");
      return `<div class="rm-col">
        <div class="rm-col-hd">${phaseLabel}</div>
        <ul class="rm-list">${items}</ul>
      </div>`;
    })
    .join("\n");

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
.npage { page-break-before: always; padding-top: 0.3cm; }

/* ── Page header ──────────────────────────────────────────────────────────*/
.ph { margin-bottom: 22px; }
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
  margin-bottom: 0;
}
.cover-logo {
  font-size: 20pt;
  font-weight: 900;
  color: #fff;
  letter-spacing: -1px;
}
.cover-logo span { color: #00b8ff; }
.cover-logo-sub { font-size: 8pt; color: #556; margin-top: 3px; letter-spacing: 0.5px; }
.cover-confidential {
  font-size: 7.5pt;
  color: #334;
  background: #0d1a2d;
  border: 1px solid #1a2840;
  padding: 4px 10px;
  border-radius: 4px;
}
.cover-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1cm 0;
}
.cover-report-label {
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #00b8ff;
  margin-bottom: 12px;
}
.cover-company {
  font-size: 30pt;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
  line-height: 1.1;
}
.cover-title {
  font-size: 14pt;
  color: #8899aa;
  font-weight: 400;
  margin-bottom: 28px;
}
.cover-meta-grid {
  display: flex;
  gap: 32px;
  margin-bottom: 36px;
}
.cover-meta-item { }
.cover-meta-label { font-size: 7.5pt; color: #445566; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
.cover-meta-val { font-size: 10pt; color: #aabbcc; font-weight: 600; }
.cover-score-section {
  display: flex;
  align-items: flex-start;
  gap: 32px;
}
.cover-score-circle {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
}
.cover-score-num { font-size: 34pt; font-weight: 900; line-height: 1; }
.cover-score-denom { font-size: 9pt; color: #556677; margin-top: 2px; }
.cover-score-lbl { font-size: 14pt; font-weight: 700; margin-bottom: 8px; }
.cover-score-desc { font-size: 10pt; color: #7788aa; line-height: 1.55; max-width: 380px; }
.cover-exec-summary {
  margin-top: 36px;
  background: #0d1a2d;
  border: 1px solid #1a2d4a;
  border-left: 3px solid #00b8ff;
  border-radius: 8px;
  padding: 16px 20px;
  color: #aabbcc;
  font-size: 9.5pt;
  line-height: 1.65;
}
.cover-exec-label {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #00b8ff;
  margin-bottom: 8px;
}
.cover-footer {
  border-top: 1px solid #0d1a2d;
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #334455;
  font-size: 8pt;
}

/* ── Context page ─────────────────────────────────────────────────────────*/
.ctx-body {
  font-size: 10.5pt;
  line-height: 1.75;
  color: #222;
  text-align: justify;
  hyphens: auto;
}
.ctx-body p { margin-bottom: 14px; }
.ctx-body p:last-child { margin-bottom: 0; }
.ctx-info-bar {
  display: flex;
  gap: 24px;
  margin-top: 20px;
  padding: 12px 16px;
  background: #f5f9ff;
  border: 1px solid #dbeafe;
  border-radius: 8px;
}
.ctx-info-item { }
.ctx-info-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
.ctx-info-val { font-size: 9.5pt; font-weight: 600; color: #1a1a2e; }

/* ── Score overview page ─────────────────────────────────────────────────*/
.score-hero {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 24px;
  padding: 18px 20px;
  background: #f8faff;
  border: 1px solid #e5eeff;
  border-radius: 12px;
}
.score-circle {
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.score-circle-num { font-size: 28pt; font-weight: 900; line-height: 1; }
.score-circle-den { font-size: 8pt; color: #9ca3af; margin-top: 2px; }
.score-hero-right { flex: 1; }
.score-hero-label { font-size: 20pt; font-weight: 800; margin-bottom: 4px; }
.score-hero-company { font-size: 9.5pt; color: #6b7280; margin-bottom: 10px; }
.score-scale {
  position: relative;
  height: 10px;
  background: linear-gradient(to right, #ef4444 0%, #f97316 25%, #f59e0b 40%, #22c55e 60%, #00b8ff 80%);
  border-radius: 5px;
  margin-bottom: 5px;
}
.score-scale-dot {
  position: absolute;
  top: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 0 0 2px #333;
  transform: translateX(-50%);
}
.score-scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: 6.5pt;
  color: #9ca3af;
}

/* ── Compact bars ─────────────────────────────────────────────────────────*/
.cbars-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  margin-bottom: 20px;
}
.cbar { }
.cbar-hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
.cbar-name { font-weight: 600; font-size: 9pt; color: #111; }
.cbar-score { font-weight: 800; font-size: 10pt; }
.cbar-denom { font-size: 7.5pt; color: #9ca3af; font-weight: 400; }
.cbar-track { height: 5px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 3px; }
.cbar-fill { height: 100%; border-radius: 3px; }
.cbar-meta { display: flex; align-items: baseline; gap: 8px; }
.cbar-lbl { font-size: 7.5pt; font-weight: 700; }
.cbar-insight { font-size: 7.5pt; color: #6b7280; flex: 1; line-height: 1.35; }

/* ── Signal tiles ─────────────────────────────────────────────────────────*/
.signal-row { display: flex; gap: 12px; margin-bottom: 0; }
.signal-tile {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  text-align: center;
}
.signal-num { font-size: 24pt; font-weight: 900; line-height: 1; }
.signal-lbl { font-size: 7.5pt; color: #6b7280; margin-top: 3px; }

/* ── Score analysis page ─────────────────────────────────────────────────*/
.prose {
  font-size: 10.5pt;
  line-height: 1.75;
  color: #1a1a1a;
  text-align: justify;
  hyphens: auto;
}
.prose p { margin-bottom: 14px; }
.prose p:first-child { font-size: 11pt; font-weight: 500; }
.prose p:last-child { margin-bottom: 0; }

/* ── Module detail pages ─────────────────────────────────────────────────*/
.mdc-grid { display: flex; flex-direction: column; gap: 28px; }
.mdc {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  page-break-inside: avoid;
}
.mdc-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px 10px;
  background: #f8faff;
  border-bottom: 1px solid #e5e7eb;
}
.mdc-num { font-size: 20pt; font-weight: 900; line-height: 1; flex-shrink: 0; }
.mdc-info { flex: 1; }
.mdc-name { font-size: 12pt; font-weight: 700; color: #0d1117; }
.mdc-badge { font-size: 8.5pt; font-weight: 600; margin-top: 1px; }
.mdc-score { font-size: 22pt; font-weight: 900; line-height: 1; flex-shrink: 0; }
.mdc-denom { font-size: 9pt; color: #9ca3af; font-weight: 400; }
.mdc-bar-track { height: 7px; background: #e5e7eb; margin: 0; }
.mdc-bar-fill { height: 100%; }
.mdc-body {
  padding: 14px 18px;
  font-size: 9.5pt;
  line-height: 1.7;
  color: #333;
}
.mdc-body p { margin-bottom: 10px; }
.mdc-body p:last-child { margin-bottom: 0; }

/* ── Recommendations ─────────────────────────────────────────────────────*/
.rec-intro { font-size: 10pt; color: #555; margin-bottom: 16px; line-height: 1.6; }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.rec-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 11px 13px;
  page-break-inside: avoid;
}
.rec-hd { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 5px; }
.rec-name { font-weight: 700; font-size: 9.5pt; color: #111; }
.rec-badge { font-size: 6.5pt; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; flex-shrink: 0; margin-top: 1px; }
.rec-desc { font-size: 8pt; color: #666; line-height: 1.5; }

/* ── Roadmap ─────────────────────────────────────────────────────────────*/
.rm-intro { font-size: 10pt; line-height: 1.7; color: #333; margin-bottom: 20px; }
.rm-grid { display: flex; gap: 14px; }
.rm-col { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
.rm-col-hd { background: #00b8ff; color: #fff; font-size: 8.5pt; font-weight: 700; padding: 9px 12px; }
.rm-list { list-style: none; padding: 10px 12px; }
.rm-list li { font-size: 8pt; color: #333; padding: 4px 0; border-bottom: 1px solid #f0f0f0; line-height: 1.4; }
.rm-list li:last-child { border-bottom: none; }

/* ── Fazit ────────────────────────────────────────────────────────────────*/
.fazit-prose {
  font-size: 10.5pt;
  line-height: 1.75;
  color: #1a1a1a;
  text-align: justify;
  hyphens: auto;
}
.fazit-prose p { margin-bottom: 14px; }
.fazit-prose p:last-child { margin-bottom: 0; }
.fazit-closing {
  margin-top: 28px;
  padding: 16px 20px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-left: 3px solid #22c55e;
  border-radius: 8px;
  font-size: 9.5pt;
  color: #166534;
  line-height: 1.6;
}

/* ── Section label in body ────────────────────────────────────────────────*/
.section-lbl {
  font-size: 7.5pt;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #00b8ff;
  margin: 20px 0 10px;
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
      <div class="cover-logo">OKUN<span>.</span></div>
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
        <div class="cover-score-desc">Ø Digitalisierungsscore über alle 8 Blueprint-Module.</div>
      </div>
    </div>

    <div class="cover-exec-summary">
      <div class="cover-exec-label">Executive Summary</div>
      ${texts.executiveSummary || `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`}
    </div>
  </div>

  <div class="cover-footer">
    <span>OKUN Blueprint™ 2.0 · ${dateStr}</span>
    <span>okun-systems.de</span>
  </div>
</div>

${texts.contextPageText ? `
<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 2: UNTERNEHMENSKONTEXT
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Ihr Unternehmen", "Unternehmenskontext")}
  <div class="ctx-body">
    ${texts.contextPageText}
  </div>
  <div class="ctx-info-bar">
    ${data.company.industry ? `<div class="ctx-info-item"><div class="ctx-info-label">Branche</div><div class="ctx-info-val">${data.company.industry}</div></div>` : ""}
    <div class="ctx-info-item"><div class="ctx-info-label">Beantwortete Fragen</div><div class="ctx-info-val">${data.totalAnswered} von ${data.totalActive}</div></div>
    <div class="ctx-info-item"><div class="ctx-info-label">Analysedatum</div><div class="ctx-info-val">${dateStr}</div></div>
    <div class="ctx-info-item"><div class="ctx-info-label">Blueprint-Version</div><div class="ctx-info-val">2.0</div></div>
  </div>
</div>
` : ""}

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 3: GESAMTAUSWERTUNG
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

  <div class="section-lbl">Signalstärken</div>
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

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 4: SCORE-ANALYSE (PROSA)
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Analyse Ihres Digitalisierungsstands", "Score-Analyse")}
  <div class="prose">
    ${texts.scoreAnalysis || `<p>${data.company.name} hat den OKUN Blueprint™ 2.0 erfolgreich abgeschlossen.</p>`}
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITEN 5–8: MODULANALYSE (JE 2 MODULE PRO SEITE)
     ══════════════════════════════════════════════════════════════════════ -->
${moduleDetailPages.join("\n")}

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 9: AUTOMATISIERUNGSPOTENZIALE & LÖSUNGSEMPFEHLUNGEN
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Chancen & Potenziale", "Automatisierung & Lösungen")}
  <div class="prose">
    ${texts.automationPotentials || ""}
  </div>
  ${data.recommendations.length > 0 ? `
  <div class="section-lbl" style="margin-top:20px">Empfohlene Lösungen</div>
  <p class="rec-intro">${texts.recommendationContext || "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen."}</p>
  <div class="rec-grid">
    ${recCards}
  </div>` : ""}
</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 10: UMSETZUNGSFAHRPLAN
     ══════════════════════════════════════════════════════════════════════ -->
${data.roadmap.length > 0 ? `
<div class="npage">
  ${ph("Ihre nächsten Schritte", "Priorisierter Umsetzungsfahrplan")}
  ${texts.roadmapIntro ? `<div class="rm-intro">${texts.roadmapIntro}</div>` : ""}
  <div class="rm-grid">
    ${roadmapCols}
  </div>
</div>` : ""}

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 11: FAZIT & NÄCHSTE SCHRITTE
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Zusammenfassung", "Fazit & Nächste Schritte")}
  <div class="fazit-prose">
    ${texts.conclusionText || ""}
  </div>
  <div class="fazit-closing">
    <strong>Ihr nächster Schritt:</strong> Im Strategiegespräch mit OKUN Systems besprechen wir gemeinsam, wie Sie die identifizierten Potenziale gezielt und mit klaren Prioritäten umsetzen — individuell abgestimmt auf Ihre Situation und Ihr Unternehmen.
  </div>
</div>

</body>
</html>`;
}
