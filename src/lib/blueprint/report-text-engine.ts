import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  executiveSummary: string;
  contextPageText: string;
  digitalizationIntro: string;
  scoreAnalysis: string;
  moduleInsights: Record<number, string>;
  moduleDetailedAnalysis: Record<number, string>;
  conclusionText: string;
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

Schreibe einen professionellen Unternehmensabschnitt mit genau 5 Absätzen als zusammenhängenden Fließtext.
Kein Markdown, keine Aufzählungen, keine Überschriften. Schreibe vollständige, ausformulierte Sätze.
Schreibe in der dritten Person ("Das Unternehmen...", "Der Betrieb...", "${data.company.name}...").
Schreibe nur das, was aus dem Unternehmenskontext hervorgeht — erfinde keine Informationen.
Jeder Absatz soll mindestens 4 vollständige Sätze enthalten und substanziell sein.

Absatz 1: Beschreibung des Unternehmens — Branche, Geschäftsmodell, Was macht es konkret, wie positioniert es sich am Markt.

Absatz 2: Aktuelle Situation — Größe, Aufstellung, Team, Digitalisierungsstand, operative Realität heute.

Absatz 3: Die wichtigsten Herausforderungen aus dem Gespräch — Was kostet Zeit, was ist aufwändig, wo entstehen Fehler, was läuft suboptimal? Konkrete Beispiele nennen.

Absatz 4: Die Ausgangslage im Detail — Welche Prozesse sind bereits digitalisiert, welche laufen noch manuell, welche Tools oder Systeme werden eingesetzt?

Absatz 5: Die Motivation und Ziele — Warum beschäftigt sich das Unternehmen jetzt mit Digitalisierung, und was soll konkret erreicht werden? Wo soll das Unternehmen in 1–2 Jahren stehen?

Schreibe jetzt die 5 Absätze:`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    return htmlParagraphs(raw);
  } catch {
    return "";
  }
}

// ── Digitalization intro (Page 3) ────────────────────────────────────────────
async function generateDigitalizationIntro(data: BlueprintReportData): Promise<string> {
  const industry = data.company.industry || "Mittelstand";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe einen professionellen Einführungstext über Digitalisierung und Automatisierung für einen Analysebericht.

Unternehmen: ${data.company.name} | Branche: ${industry}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich, präzise, für Entscheider im Mittelstand. Kein Marketing-Deutsch.
Jeder Absatz soll mindestens 4 vollständige Sätze enthalten.

Absatz 1: Was ist Digitalisierung und Automatisierung? Eine klare, praxisnahe Definition für Entscheider — kein Tech-Jargon. Erkläre, was es in der Unternehmensrealität bedeutet, wenn Prozesse digitalisiert oder automatisiert werden.

Absatz 2: Wie wirkt Digitalisierung konkret im Tagesgeschäft? Welche Arten von Aufgaben betrifft sie, wie verändert sie Abläufe, was passiert mit manuellen Tätigkeiten?

Absatz 3: Was kann konkret erreicht werden? Zeitersparnis, Kostensenkung, Fehlerreduktion, Skalierbarkeit, bessere Transparenz — mit konkreten Beispielen, die zeigen, was in der Praxis möglich ist.

Absatz 4: Spezifisch für die Branche "${industry}" — Welche typischen Prozesse, Engpässe und Herausforderungen gibt es in dieser Branche, bei denen Digitalisierung und Automatisierung besonders stark helfen können? Konkrete branchenspezifische Beispiele und Einsatzbereiche benennen.

Absatz 5: Warum ist jetzt der richtige Zeitpunkt? Wettbewerbsdruck, Fachkräftemangel, Technologiereife, steigende Kundenerwartungen — welche Faktoren machen Digitalisierung heute zu einer strategischen Notwendigkeit, nicht mehr nur einer Option?

Schreibe jetzt die 5 Absätze:`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    return htmlParagraphs(raw);
  } catch {
    return `<p>${data.company.name} steht vor einer digitalen Transformation, die in der heutigen Geschäftswelt nicht mehr optional ist. Digitalisierung bedeutet die systematische Erfassung, Verarbeitung und Nutzung von Informationen durch digitale Technologien — mit dem Ziel, Prozesse effizienter, transparenter und skalierbarer zu gestalten.</p>`;
  }
}

// ── Score analysis (Page 5) ──────────────────────────────────────────────────
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

Schreibe genau 6 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Schreibe in direkter Ansprache ("Sie", "Ihr Unternehmen"). Sachlich und präzise — kein Marketing-Deutsch.
Jeder Absatz soll mindestens 4 vollständige, substanzielle Sätze enthalten. Die Analyse soll eine ganze Seite füllen.

Absatz 1: Ordne den Score ${avgScore}/100 auf der OKUN-Skala ein. Was bedeutet "${label}" konkret für ein Unternehmen wie ${data.company.name}? Wie ist diese Einstufung im Branchenvergleich einzuordnen?

Absatz 2: Was zeigt die Gesamtanalyse im Detail? Wo steht das Unternehmen, welches Bild ergibt sich aus den 8 Modulen zusammen? Was läuft bereits gut (${best})?

Absatz 3: Analysiere die drei größten Handlungsfelder (${worst}) ausführlich — warum sind genau diese Bereiche kritisch, welche konkreten Konsequenzen hat der aktuelle Zustand für das Tagesgeschäft?

Absatz 4: Was sind die verborgenen Kosten des Status quo? Was kostet die Nicht-Digitalisierung in diesen Bereichen heute — an Zeit, Geld, Fehlerquote und Mitarbeiterzufriedenheit?

Absatz 5: Formuliere konkrete priorisierte nächste Schritte für ${data.company.name} — was sollte als Erstes, Zweites und Drittes angegangen werden und warum? Was hat den höchsten Impact bei vertretbarem Aufwand?

Absatz 6: Realistischer Ausblick — was wird möglich sein, wenn die wichtigsten Maßnahmen umgesetzt sind? Welche messbaren Verbesserungen kann ${data.company.name} erwarten, und in welchem Zeitrahmen ist das realistisch?

Schreibe jetzt die 6 Absätze:`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text.trim() : "";
    return htmlParagraphs(raw);
  } catch {
    return "";
  }
}

// ── Module insights + detailed analysis (Pages 6–9) ──────────────────────────
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
    "1": "Kurze Einschätzung M1 (2-3 Sätze, faktenbasiert)",
    "2": "Kurze Einschätzung M2",
    "3": "Kurze Einschätzung M3",
    "4": "Kurze Einschätzung M4",
    "5": "Kurze Einschätzung M5",
    "6": "Kurze Einschätzung M6",
    "7": "Kurze Einschätzung M7",
    "8": "Kurze Einschätzung M8"
  },
  "detailed": {
    "1": "Ausführliche Analyse M1 (5-6 Sätze: was funktioniert gut, wo bestehen konkrete Schwachstellen, welche Auswirkungen hat das auf das Geschäft, was ist der erste konkrete Handlungsschritt, warum ist das prioritär)",
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
      max_tokens: 5000,
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

// ── Conclusion + executive summary + recommendation context (Page 10) ────────
async function generateFinalSections(data: BlueprintReportData, avgScore: number): Promise<{
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
  const bestModules = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2).map((m) => m.label).join(" und ");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle das abschließende Fazit für ${data.company.name}.

Score: ${avgScore}/100 | Einstufung: ${scoreLabelText(avgScore)}
Stärken: ${bestModules}
Größte Handlungsfelder: ${worstModules}
Signalstärken: ${signalsSummary}
Empfohlene Lösungen:
${recList}
Paket: ${data.packageType ?? "Standard"}${contextHint}

Antworte NUR mit diesem JSON-Objekt (kein Markdown):
{
  "executiveSummary": "4-5 prägnante Sätze für Entscheider. Stärken und Potenziale konkret benennen — kein Marketing. Score einordnen, wichtigste Handlungsfelder nennen, nächsten Schritt empfehlen.",
  "conclusionText": "6 Absätze Fließtext (mindestens je 4 vollständige Sätze). Absatz 1: Die wichtigsten Erkenntnisse aus der Gesamtanalyse zusammenfassen — was hat die Analyse gezeigt, was war überraschend, was hat sich bestätigt. Absatz 2: Die Stärken hervorheben — was läuft gut bei ${data.company.name} und warum ist das eine gute Ausgangslage für die nächsten Schritte. Absatz 3: Die größten Potenziale beschreiben — was ist konkret möglich, wenn die wichtigsten Maßnahmen umgesetzt werden, welche messbaren Verbesserungen sind realistisch. Absatz 4: Prioritäten setzen — welche drei Handlungsfelder sollten als erstes angegangen werden und warum (Begründung mit Impact und Aufwand). Absatz 5: Den konkreten Weg beschreiben — wie sieht eine realistische Umsetzung in den nächsten 3-6 Monaten aus, was sind die ersten messbaren Meilensteine. Absatz 6: Ausblick und Einladung zum Strategiegespräch — was wird möglich, wenn das Fundament gelegt ist, und warum ist das Strategiegespräch mit OKUN Systems der logische nächste Schritt.",
  "recommendationContext": "2-3 Sätze Einleitung für die Lösungsempfehlungen. Bezug zu ${worstModules}. Warum genau diese Lösungen?"
}`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      executiveSummary?: string;
      conclusionText?: string;
      recommendationContext?: string;
    };

    return {
      executiveSummary: parsed.executiveSummary ?? `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      conclusionText: htmlParagraphs(parsed.conclusionText ?? ""),
      recommendationContext: parsed.recommendationContext ?? "Basierend auf Ihren Antworten empfehlen wir folgende Maßnahmen.",
    };
  } catch {
    return {
      executiveSummary: `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
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

  const [contextPageText, digitalizationIntro, scoreAnalysis, moduleTexts, finalSections] = await Promise.all([
    generateContextPageText(data),
    generateDigitalizationIntro(data),
    generateScoreAnalysis(data, avgScore),
    generateModuleTexts(data, avgScore),
    generateFinalSections(data, avgScore),
  ]);

  return {
    executiveSummary: finalSections.executiveSummary,
    contextPageText,
    digitalizationIntro,
    scoreAnalysis,
    moduleInsights: moduleTexts.moduleInsights,
    moduleDetailedAnalysis: moduleTexts.moduleDetailedAnalysis,
    conclusionText: finalSections.conclusionText,
    recommendationContext: finalSections.recommendationContext,
  };
}
