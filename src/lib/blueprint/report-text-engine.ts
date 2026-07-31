import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  executiveSummary: string;
  moduleInsights: Record<number, string>;
  recommendationContext: string;
}

export async function generateReportTexts(
  data: BlueprintReportData
): Promise<ReportTexts> {
  const moduleList = data.moduleScores
    .map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100`)
    .join("\n");

  const recList = data.recommendations
    .slice(0, 5)
    .map((r) => `- ${r.name} (${r.category}, Signalstärke: ${r.signalScore})`)
    .join("\n");

  const prompt = `Du bist Lead-Berater bei OKUN Systems und verfasst den professionellen OKUN Blueprint™ 2.0 Analysebericht für folgendes Unternehmen.

Unternehmen: ${data.company.name}
Branche: ${data.company.industry ?? "nicht angegeben"}
Paket: ${data.packageType ?? "Standard"}
Analyse abgeschlossen: ${data.completedAt?.toLocaleDateString("de-DE") ?? "–"}
Beantwortete Fragen: ${data.totalAnswered} / ${data.totalActive}

Modul-Scores (0–100):
${moduleList}

Top-Empfehlungen:
${recList}

Signalstärken:
- OKUN Workforce-Lösungen: ${data.signals.WORKFORCE}
- Bewährte Standardlösungen: ${data.signals.BEWAEHRTE_LOESUNG}
- Individuelle Entwicklung: ${data.signals.CUSTOM_DEVELOPMENT}

Erstelle Berichtstexte im JSON-Format:
{
  "executiveSummary": "3-4 Sätze professionelle Zusammenfassung des Digitalisierungsstands für Entscheider. Nennt konkrete Stärken und Hauptpotenziale. Kein Marketing-Deutsch.",
  "moduleInsights": {
    "1": "1-2 Sätze Kernaussage zu Modul 1",
    "2": "...",
    "3": "...",
    "4": "...",
    "5": "...",
    "6": "...",
    "7": "...",
    "8": "..."
  },
  "recommendationContext": "2-3 Sätze Einleitung für den Empfehlungsbereich. Erklärt warum diese Lösungen priorisiert wurden."
}

Schreibe präzise, sachlich und auf Deutsch. Vermeide Füllwörter. Antworte NUR mit dem JSON-Objekt.`;

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
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
