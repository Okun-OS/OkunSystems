import type { BlueprintReportData, ModuleScoreEntry } from "./report-assembler";
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

function modulePairPage(modules: ModuleScoreEntry[], detailed: Record<number, string>, pairIndex: number, totalPairs: number): string {
  const label = `Modulanalyse · ${modules.map(m => `M${m.moduleNumber}`).join(" & ")}`;
  return `
<div class="npage">
  ${ph(label, `Seite ${pairIndex + 1} von ${totalPairs}`)}
  ${modules.map(m => moduleBlock(m, detailed[m.moduleNumber] ?? "")).join('\n<div class="mod-sep"></div>\n')}
</div>`;
}

export function renderReportHtml(data: BlueprintReportData, texts: ReportTexts, logoDataUri?: string): string {
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
  const modulePairs: ModuleScoreEntry[][] = [];
  for (let i = 0; i < data.moduleScores.length; i += 2) {
    modulePairs.push(data.moduleScores.slice(i, i + 2));
  }
  const moduleDetailPages = modulePairs.map((pair, i) =>
    modulePairPage(pair, texts.moduleDetailedAnalysis, i, modulePairs.length)
  ).join("\n");

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
        <div class="cover-score-desc">Ø Digitalisierungsgrad über alle ${data.moduleScores.length} Blueprint-Module.</div>
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

</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 6: SCORE-ANALYSE (PROSA)
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Analyse des aktuellen Digitalisierungsstandes", "Score-Analyse")}
  <div class="score-prose">
    ${texts.scoreAnalysis || `<p>${data.company.name} hat den OKUN Blueprint™ 2.0 erfolgreich abgeschlossen und einen Gesamtdigitalisierungsgrad von ${avgScore}/100 erreicht. Die Auswertung zeigt ein differenziertes Bild des aktuellen Stands mit klaren Unterschieden zwischen den acht bewerteten Modulen.</p>`}
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════════════
     SEITEN 7–14: MODULANALYSE (JE 1 MODUL PRO SEITE)
     ══════════════════════════════════════════════════════════════════════ -->
${moduleDetailPages}

<!-- ══════════════════════════════════════════════════════════════════════
     SEITE 15: FAZIT
     ══════════════════════════════════════════════════════════════════════ -->
<div class="npage">
  ${ph("Zusammenfassung der Analyseergebnisse", "Fazit")}
  <div class="fazit-prose">
    ${texts.conclusionText || `<p>Die Analyse von ${data.company.name} zeigt ein klares Bild des aktuellen Digitalisierungsstandes. Der OKUN Blueprint™ 2.0 hat die wichtigsten Stärken und Nachholbereiche in allen acht Modulen identifiziert und strukturiert dargestellt.</p>`}
  </div>

  <div class="orientation-box" style="margin-top:auto">
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
