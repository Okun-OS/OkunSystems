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

export async function generateReportTexts(
  data: BlueprintReportData
): Promise<ReportTexts> {
  const avgScore =
    data.moduleScores.length > 0
      ? Math.round(
          data.moduleScores.reduce((s, m) => s + m.score, 0) /
            data.moduleScores.length
        )
      : 0;

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
    .map((m) => `${m.label} (${m.score}/100)`)
    .join(", ");

  const bestModules = [...data.moduleScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100)`)
    .join(", ");

  const prompt = `Du bist Lead-Berater bei OKUN Systems und verfasst den professionellen OKUN Blueprint™ 2.0 Analysebericht für folgendes Unternehmen.

Unternehmen: ${data.company.name}
Branche: ${data.company.industry ?? "nicht angegeben"}
Paket: ${data.packageType ?? "Standard"}
Analyse abgeschlossen: ${data.completedAt?.toLocaleDateString("de-DE") ?? "–"}
Beantwortete Fragen: ${data.totalAnswered} / ${data.totalActive}

Gesamtscore: ${avgScore}/100 (Bewertung: ${scoreLabelText(avgScore)})
Stärkste Bereiche: ${bestModules}
Schwächste Bereiche: ${worstModules}

Alle Modul-Scores (0–100):
${moduleList}

Top-Empfehlungen:
${recList}

Signalstärken:
- OKUN Workforce-Lösungen: ${data.signals.WORKFORCE}
- Bewährte Standardlösungen: ${data.signals.BEWAEHRTE_LOESUNG}
- Individuelle Entwicklung: ${data.signals.CUSTOM_DEVELOPMENT}

Erstelle Berichtstexte im JSON-Format. Alle Felder auf Deutsch. Antworte NUR mit dem JSON-Objekt, kein Markdown drumherum.

{
  "scoreAnalysis": "WICHTIG: Hier kommt ein zusammenhängender Fließtext ohne Aufzählungen und ohne Zwischenüberschriften. Reiner Fließtext in HTML-Absätzen (<p>...</p>). Ca. 600-700 Wörter. Der Text liest sich wie ein Abschnitt aus einem professionellen Beratungsbericht – sachlich, präzise, direkt. Kein Marketing, keine Floskeln. Schreib so, als würde ein erfahrener Unternehmensberater das persönlich für ${data.company.name} verfassen. Inhalt der Absätze in dieser Reihenfolge: (1) Was der Score ${avgScore}/100 konkret bedeutet und wie er sich in den Kontext der OKUN-Skala (0–100) einordnet – was '${scoreLabelText(avgScore)}' für ein Unternehmen in der Praxis heißt. (2) Was die Analyse über den aktuellen Digitalisierungsstand von ${data.company.name} aussagt: welche Bereiche bereits funktionieren (${bestModules}) und was das bedeutet. (3) Wo die größten Lücken liegen: die schwächsten Bereiche (${worstModules}) im Detail erklären – warum genau diese Bereiche kritisch sind und welche konkreten Konsequenzen der Status quo hat, wenn nichts unternommen wird. (4) Was ${data.company.name} als nächstes konkret tun sollte – keine abstrakten Ratschläge, sondern spezifische, priorisierte Handlungsempfehlungen die sich aus den Schwachstellen ergeben. (5) Ausblick: Was realistisch möglich ist wenn die identifizierten Maßnahmen umgesetzt werden – welche Veränderungen im Unternehmen das bewirken kann und in welchem Zeitrahmen Verbesserungen sichtbar werden könnten.",
  "executiveSummary": "3-4 Sätze professionelle Zusammenfassung des Digitalisierungsstands für Entscheider. Nennt konkrete Stärken und Hauptpotenziale. Kein Marketing-Deutsch.",
  "moduleInsights": {
    "1": "1-2 Sätze Kernaussage zu Modul 1",
    "2": "1-2 Sätze Kernaussage zu Modul 2",
    "3": "1-2 Sätze Kernaussage zu Modul 3",
    "4": "1-2 Sätze Kernaussage zu Modul 4",
    "5": "1-2 Sätze Kernaussage zu Modul 5",
    "6": "1-2 Sätze Kernaussage zu Modul 6",
    "7": "1-2 Sätze Kernaussage zu Modul 7",
    "8": "1-2 Sätze Kernaussage zu Modul 8"
  },
  "recommendationContext": "2-3 Sätze Einleitung für den Empfehlungsbereich. Erklärt warum diese Lösungen priorisiert wurden."
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonStr) as {
      scoreAnalysis?: string;
      executiveSummary?: string;
      moduleInsights?: Record<string, string>;
      recommendationContext?: string;
    };

    const moduleInsights: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed.moduleInsights ?? {})) {
      moduleInsights[parseInt(k, 10)] = v;
    }

    return {
      scoreAnalysis: parsed.scoreAnalysis ?? "",
      executiveSummary: parsed.executiveSummary ?? "",
      moduleInsights,
      recommendationContext: parsed.recommendationContext ?? "",
    };
  } catch {
    return {
      scoreAnalysis: `<p>${data.company.name} hat den OKUN Blueprint™ 2.0 Analyseprozess abgeschlossen. Die detaillierte Auswertung finden Sie in den nachfolgenden Abschnitten dieses Berichts.</p>`,
      executiveSummary: `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      moduleInsights: {},
      recommendationContext: "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen.",
    };
  }
}
