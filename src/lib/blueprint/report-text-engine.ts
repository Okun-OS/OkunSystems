import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  executiveSummary: string;
  moduleInsights: Record<number, string>;
  recommendationContext: string;
  scoreAnalysis: string;
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

// ── Score-Analyse: separater Aufruf, reiner Fließtext (kein JSON) ────────────
async function generateScoreAnalysis(data: BlueprintReportData, avgScore: number): Promise<string> {
  const label = scoreLabelText(avgScore);
  const worst = [...data.moduleScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => `${m.label} (${m.score}/100)`)
    .join(", ");
  const best = [...data.moduleScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100)`)
    .join(" und ");

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe einen professionellen Analysetext über den Digitalisierungsstand von ${data.company.name}.

Daten:
- Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}
- Digitalisierungsscore: ${avgScore} von 100 Punkten
- Einstufung auf der OKUN-Skala: ${label}
- Stärkste Bereiche: ${best}
- Größte Handlungsfelder: ${worst}
- Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften innerhalb des Texts.
Jeder Absatz wird mit einem Zeilenumbruch getrennt.
Schreibe in direkter Ansprache ("Sie", "Ihr Unternehmen"). Sachlich und präzise – kein Marketing-Deutsch.

Absatz 1: Ordne den Score ${avgScore}/100 auf der OKUN-Skala ein. Erkläre was "${label}" in der Praxis bedeutet und wie es sich von anderen Einstufungen unterscheidet.

Absatz 2: Beschreibe was die Gesamtanalyse von ${data.company.name} konkret zeigt. Wo steht das Unternehmen heute? Was läuft bereits gut (${best})?

Absatz 3: Analysiere die drei größten Schwachstellen (${worst}) im Detail. Warum sind genau diese Bereiche kritisch? Welche Konsequenzen hat der aktuelle Zustand für das operative Geschäft, wenn nichts unternommen wird?

Absatz 4: Formuliere konkrete, priorisierte nächste Schritte für ${data.company.name}. Keine abstrakten Empfehlungen – was genau sollte als erstes, zweites, drittes angegangen werden und warum?

Absatz 5: Realistischer Ausblick: Was wird möglich sein, wenn die wichtigsten Maßnahmen umgesetzt sind? In welchem Zeitrahmen sind Verbesserungen spürbar?

Schreibe jetzt die 5 Absätze:`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (!raw) return "";

    // Wrap double-newline-separated paragraphs in <p> tags if Claude returned plain text
    if (!raw.startsWith("<p>")) {
      return raw
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p}</p>`)
        .join("\n");
    }
    return raw;
  } catch {
    return "";
  }
}

// ── Übrige Berichtstexte: JSON-Aufruf ───────────────────────────────────────
async function generateJsonTexts(data: BlueprintReportData, avgScore: number): Promise<Omit<ReportTexts, "scoreAnalysis">> {
  const moduleList = data.moduleScores
    .map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100`)
    .join("\n");

  const recList = data.recommendations
    .slice(0, 5)
    .map((r) => `- ${r.name} (${r.category}, Signalstärke: ${r.signalScore})`)
    .join("\n");

  const worstModules = [...data.moduleScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => m.label)
    .join(", ");

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Analysebericht für: ${data.company.name} (${data.company.industry ?? "Branche nicht angegeben"}).

Score: ${avgScore}/100 (${scoreLabelText(avgScore)})
Fragen: ${data.totalAnswered}/${data.totalActive}

Modul-Scores:
${moduleList}

Empfehlungen:
${recList}

Signale: Workforce ${data.signals.WORKFORCE} | Bewährt ${data.signals.BEWAEHRTE_LOESUNG} | Individual ${data.signals.CUSTOM_DEVELOPMENT}

Antworte NUR mit diesem JSON-Objekt (kein Markdown):
{
  "executiveSummary": "3-4 Sätze Zusammenfassung für Entscheider. Konkrete Stärken und Potenziale. Kein Marketing.",
  "moduleInsights": {
    "1": "1-2 Sätze zu Modul 1",
    "2": "1-2 Sätze zu Modul 2",
    "3": "1-2 Sätze zu Modul 3",
    "4": "1-2 Sätze zu Modul 4",
    "5": "1-2 Sätze zu Modul 5",
    "6": "1-2 Sätze zu Modul 6",
    "7": "1-2 Sätze zu Modul 7",
    "8": "1-2 Sätze zu Modul 8"
  },
  "recommendationContext": "2-3 Sätze Einleitung für Empfehlungen. Warum diese Lösungen? Bezug zu ${worstModules}."
}`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      executiveSummary?: string;
      moduleInsights?: Record<string, string>;
      recommendationContext?: string;
    };

    const moduleInsights: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed.moduleInsights ?? {})) {
      moduleInsights[parseInt(k, 10)] = v;
    }

    return {
      executiveSummary: parsed.executiveSummary ?? "",
      moduleInsights,
      recommendationContext: parsed.recommendationContext ?? "",
    };
  } catch {
    return {
      executiveSummary: `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      moduleInsights: {},
      recommendationContext: "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen.",
    };
  }
}

// ── Öffentliche Funktion: beide Aufrufe parallel ─────────────────────────────
export async function generateReportTexts(data: BlueprintReportData): Promise<ReportTexts> {
  const avgScore = calcAvgScore(data);

  const [jsonTexts, scoreAnalysis] = await Promise.all([
    generateJsonTexts(data, avgScore),
    generateScoreAnalysis(data, avgScore),
  ]);

  return { ...jsonTexts, scoreAnalysis };
}
