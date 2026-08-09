import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  executiveSummary: string;
  contextPageText: string;         // Page 2: company context narrative
  scoreAnalysis: string;           // Page 3: score analysis prose
  moduleInsights: Record<number, string>; // Per-module expanded analysis
  moduleDetailedAnalysis: Record<number, string>; // Per-module deep-dive paragraphs
  automationPotentials: string;    // Page 8: automation & solution analysis
  roadmapIntro: string;            // Page 9: roadmap context intro
  conclusionText: string;          // Page 10: personalized conclusion
  recommendationContext: string;
}

function scoreLabelText(score: number): string {
  if (score >= 80) return "Sehr gut";
  if (score >= 65) return "Gut";
  if (score >= 50) return "Ausbaufähig";
  if (score >= 35) return "Handlungsbedarf";
  return "Dringend";
}

function calcAvgScore(data: BlueprintReportData): number {
  return data.moduleScores.length > 0
    ? Math.round(data.moduleScores.reduce((s, m) => s + m.score, 0) / data.moduleScores.length)
    : 0;
}

function formatContextForPrompt(data: BlueprintReportData): string {
  if (!data.companyContext) return "Kein Unternehmenskontext verfügbar.";
  if (data.companyContext.summary) return data.companyContext.summary;

  // Build from entries
  const pairs = data.companyContext.entries
    .reduce<Array<{ q: string; a: string }>>((acc, e, i, arr) => {
      if (e.role === "assistant") {
        const next = arr[i + 1];
        if (next?.role === "user") acc.push({ q: e.content, a: next.content });
      }
      return acc;
    }, []);

  return pairs.map((p) => `Frage: ${p.q}\nAntwort: ${p.a}`).join("\n\n");
}

// ── Context page text (Page 2) ───────────────────────────────────────────────
async function generateContextPageText(data: BlueprintReportData): Promise<string> {
  if (!data.companyContext || data.companyContext.entries.length === 0) {
    return "";
  }

  const context = formatContextForPrompt(data);
  const prompt = `Du bist Senior-Berater bei OKUN Systems und schreibst den Einleitungsabschnitt für einen professionellen Analysebericht.

Unternehmenskontext aus dem Vorgespräch:
${context}

Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}

Schreibe einen professionellen Unternehmensabschnitt mit genau 4 Absätzen als zusammenhängenden Fließtext.
Kein Markdown, keine Aufzählungen, keine Überschriften.
Schreibe in der dritten Person ("Das Unternehmen...", "Der Betrieb...", "${data.company.name}...").
Schreibe nur das, was aus dem Unternehmenskontext hervorgeht — erfinde keine Informationen.

Absatz 1: Kurze, prägnante Beschreibung des Unternehmens — Branche, Geschäftsmodell, Was macht es konkret.

Absatz 2: Aktuelle Situation — Größe, Aufstellung, Digitalisierungsstand, wo das Unternehmen heute steht.

Absatz 3: Die wichtigsten Herausforderungen, die im Gespräch genannt wurden. Was kostet Zeit, was ist aufwändig, was läuft suboptimal?

Absatz 4: Die Motivation und Ziele — warum beschäftigt sich das Unternehmen jetzt mit Digitalisierung, und was soll konkret erreicht werden?

Schreibe jetzt die 4 Absätze:`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    return htmlParagraphs(raw);
  } catch {
    return "";
  }
}

// ── Score analysis (Page 3) ──────────────────────────────────────────────────
async function generateScoreAnalysis(data: BlueprintReportData, avgScore: number): Promise<string> {
  const label = scoreLabelText(avgScore);
  const worst = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3)
    .map((m) => `${m.label} (${m.score}/100)`).join(", ");
  const best = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100)`).join(" und ");

  const contextHint = data.companyContext
    ? `\n\nUnternehmenskontext: ${formatContextForPrompt(data)}`
    : "";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe einen professionellen Analysetext über den Digitalisierungsstand von ${data.company.name}.

Daten:
- Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}
- Digitalisierungsscore: ${avgScore} von 100 Punkten
- Einstufung: ${label}
- Stärkste Bereiche: ${best}
- Größte Handlungsfelder: ${worst}
- Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}${contextHint}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Schreibe in direkter Ansprache ("Sie", "Ihr Unternehmen"). Sachlich und präzise — kein Marketing-Deutsch.

Absatz 1: Ordne den Score ${avgScore}/100 auf der OKUN-Skala ein. Was bedeutet "${label}" in der Praxis, konkret für ein Unternehmen wie ${data.company.name}?

Absatz 2: Was zeigt die Gesamtanalyse konkret? Wo steht das Unternehmen, was läuft bereits gut (${best})?

Absatz 3: Analysiere die drei größten Handlungsfelder (${worst}) im Detail. Warum sind genau diese Bereiche kritisch, welche Konsequenzen hat der aktuelle Zustand?

Absatz 4: Formuliere konkrete priorisierte nächste Schritte für ${data.company.name} — kein Allgemeines, sondern was als Erstes, Zweites und Drittes angegangen werden sollte und warum.

Absatz 5: Realistischer Ausblick — was wird möglich sein, wenn die wichtigsten Maßnahmen umgesetzt sind, und in welchem Zeitrahmen?

Schreibe jetzt die 5 Absätze:`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    return htmlParagraphs(raw);
  } catch {
    return "";
  }
}

// ── Module insights + detailed analysis (Pages 4–7) ─────────────────────────
async function generateModuleTexts(data: BlueprintReportData, avgScore: number): Promise<{
  moduleInsights: Record<number, string>;
  moduleDetailedAnalysis: Record<number, string>;
}> {
  const moduleList = data.moduleScores.map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100`).join("\n");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle eine detaillierte Modulanalyse für ${data.company.name}.

Gesamt-Score: ${avgScore}/100 (${scoreLabelText(avgScore)})

Modul-Scores:
${moduleList}${contextHint}

Antworte NUR mit diesem JSON-Objekt (kein Markdown, kein Kommentar):
{
  "insights": {
    "1": "Kurze Einschätzung M1 (1-2 Sätze, faktenbasiert)",
    "2": "Kurze Einschätzung M2",
    "3": "Kurze Einschätzung M3",
    "4": "Kurze Einschätzung M4",
    "5": "Kurze Einschätzung M5",
    "6": "Kurze Einschätzung M6",
    "7": "Kurze Einschätzung M7",
    "8": "Kurze Einschätzung M8"
  },
  "detailed": {
    "1": "Ausführliche Analyse M1 (3-5 Sätze: was funktioniert, wo bestehen Schwachstellen, welche Auswirkungen hat das, was ist der erste konkrete Handlungsschritt)",
    "2": "Ausführliche Analyse M2",
    "3": "Ausführliche Analyse M3",
    "4": "Ausführliche Analyse M4",
    "5": "Ausführliche Analyse M5",
    "6": "Ausführliche Analyse M6",
    "7": "Ausführliche Analyse M7",
    "8": "Ausführliche Analyse M8"
  }
}`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      insights?: Record<string, string>;
      detailed?: Record<string, string>;
    };

    const moduleInsights: Record<number, string> = {};
    const moduleDetailedAnalysis: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed.insights ?? {})) {
      moduleInsights[parseInt(k, 10)] = v;
    }
    for (const [k, v] of Object.entries(parsed.detailed ?? {})) {
      moduleDetailedAnalysis[parseInt(k, 10)] = v;
    }
    return { moduleInsights, moduleDetailedAnalysis };
  } catch {
    const empty: Record<number, string> = {};
    return { moduleInsights: empty, moduleDetailedAnalysis: empty };
  }
}

// ── Automation potentials + conclusion + recommendation context (Pages 8, 9, 10) ──
async function generateFinalSections(data: BlueprintReportData, avgScore: number): Promise<{
  automationPotentials: string;
  roadmapIntro: string;
  conclusionText: string;
  executiveSummary: string;
  recommendationContext: string;
}> {
  const recList = data.recommendations
    .slice(0, 6)
    .map((r) => `- ${r.name} (${r.category}, Signal: ${r.signalScore})`)
    .join("\n");

  const signalsSummary = `Workforce: ${data.signals.WORKFORCE} | Bewährt: ${data.signals.BEWAEHRTE_LOESUNG} | Individual: ${data.signals.CUSTOM_DEVELOPMENT}`;
  const worstModules = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3).map((m) => m.label).join(", ");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle spezifische Berichtsabschnitte für ${data.company.name}.

Score: ${avgScore}/100 | Einstufung: ${scoreLabelText(avgScore)}
Größte Handlungsfelder: ${worstModules}
Signalstärken: ${signalsSummary}
Empfohlene Lösungen:
${recList}
Paket: ${data.packageType ?? "Standard"}${contextHint}

Antworte NUR mit diesem JSON-Objekt (kein Markdown):
{
  "executiveSummary": "3-4 prägnante Sätze für Entscheider. Stärken und Potenziale konkret benennen — kein Marketing. Individuelle Situation von ${data.company.name} ansprechen.",
  "automationPotentials": "3-4 Absätze Fließtext über Automatisierungs- und Digitalisierungspotenziale. Getrennte Absätze für: (1) bereits vorhandene/bewährte Lösungen, (2) Automatisierungspotenziale, (3) OKUN Workforce Einsatzmöglichkeiten. Nur Lösungen erwähnen, die OKUN tatsächlich anbietet. Keine erfundenen Produkte.",
  "roadmapIntro": "2-3 Sätze Einleitung für den Umsetzungsfahrplan. Warum diese Reihenfolge, was kommt zuerst und warum?",
  "conclusionText": "4 Absätze Fließtext für das Fazit. Absatz 1: wichtigste Erkenntnisse zusammenfassen. Absatz 2: größte Potenziale hervorheben. Absatz 3: priorisierte Handlungsfelder benennen. Absatz 4: sinnvoller nächster Schritt und Vorbereitung auf das Strategiegespräch.",
  "recommendationContext": "2-3 Sätze Einleitung für Lösungsempfehlungen. Bezug zu ${worstModules}."
}`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      executiveSummary?: string;
      automationPotentials?: string;
      roadmapIntro?: string;
      conclusionText?: string;
      recommendationContext?: string;
    };

    return {
      executiveSummary: parsed.executiveSummary ?? `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      automationPotentials: htmlParagraphs(parsed.automationPotentials ?? ""),
      roadmapIntro: parsed.roadmapIntro ?? "",
      conclusionText: htmlParagraphs(parsed.conclusionText ?? ""),
      recommendationContext: parsed.recommendationContext ?? "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen.",
    };
  } catch {
    return {
      executiveSummary: `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      automationPotentials: "",
      roadmapIntro: "",
      conclusionText: "",
      recommendationContext: "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen.",
    };
  }
}

// ── Helper: wrap double-newline separated paragraphs in <p> tags ─────────────
function htmlParagraphs(text: string): string {
  if (!text) return "";
  if (text.startsWith("<p>")) return text;
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p}</p>`)
    .join("\n");
}

// ── Public: generate all report texts in parallel ─────────────────────────────
export async function generateReportTexts(data: BlueprintReportData): Promise<ReportTexts> {
  const avgScore = calcAvgScore(data);

  const [contextPageText, scoreAnalysis, moduleTexts, finalSections] = await Promise.all([
    generateContextPageText(data),
    generateScoreAnalysis(data, avgScore),
    generateModuleTexts(data, avgScore),
    generateFinalSections(data, avgScore),
  ]);

  return {
    executiveSummary: finalSections.executiveSummary,
    contextPageText,
    scoreAnalysis,
    moduleInsights: moduleTexts.moduleInsights,
    moduleDetailedAnalysis: moduleTexts.moduleDetailedAnalysis,
    automationPotentials: finalSections.automationPotentials,
    roadmapIntro: finalSections.roadmapIntro,
    conclusionText: finalSections.conclusionText,
    recommendationContext: finalSections.recommendationContext,
  };
}
