import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  einleitungText: string;
  executiveSummary: string;
  contextPageText: string;
  digitalizationIntro: string;
  scoreAnalysis: string;
  moduleInsights: Record<number, string>;
  moduleDetailedAnalysis: Record<number, string>;
  moduleScoreComposition: Record<number, string>;
  conclusionText: string;
  orientationText: string;
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

async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const res = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return res.content[0].type === "text" ? res.content[0].text.trim() : "";
}

// ── Einleitung (Page 2) ──────────────────────────────────────────────────────
async function generateEinleitung(data: BlueprintReportData): Promise<string> {
  const moduleCount = data.moduleScores.length;
  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe die Einleitung für einen professionellen Digitalisierungsanalysebericht — den OKUN Blueprint™ 2.0.

Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}
Analysedatum: Abgeschlossen mit ${data.totalAnswered} von ${data.totalActive} Fragen beantwortet

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich und professionell. Schreibe in der zweiten Person ("Sie", "Ihr Unternehmen").
Jeder Absatz muss mindestens 4 vollständige Sätze enthalten. Die Einleitung muss eine Seite füllen.

Absatz 1: Was ist der OKUN Blueprint™ 2.0? Beschreibe präzise, was diese Analyse ist — ein strukturiertes Analyse-Werkzeug zur Messung des Digitalisierungsstandes. Sie entsteht aus den Antworten des Unternehmens selbst, nicht aus einer externen Einschätzung.

Absatz 2: Wie funktioniert die Analyse methodisch? Sie deckt ${moduleCount} operative Module ab, jedes Modul bewertet mehrere Kriterien, und aus den Antworten entsteht ein Punktescore (0–100). Der Score ist eine Standortbestimmung, kein Urteil.

Absatz 3: Was sind die ${moduleCount} Module des Blueprints? Beschreibe kurz, welche Bereiche abgedeckt werden (Prozessmanagement, Vertrieb, Führungsstruktur, Automatisierungsgrad, Unternehmensstruktur, Kommunikation, Personalmanagement und weitere). Erkläre, warum genau diese Bereiche relevant sind.

Absatz 4: Wie ist dieser Bericht aufgebaut? Unternehmenskontext, Gesamtauswertung, Score-Analyse des Ist-Zustandes, Detailanalyse jedes Moduls mit Score-Zusammensetzung, abschließendes Fazit. Jede Seite enthält konkrete Informationen zum Ist-Zustand.

Absatz 5: Wie sollte dieser Bericht gelesen werden? Was bedeuten hohe und niedrige Scores, warum sind die Module mit dem größten Abstand nach unten besonders relevant, wie ist der Score im Verhältnis zum Branchenumfeld zu sehen. Das Strategiegespräch vertieft die Erkenntnisse.

Schreibe jetzt die 5 Absätze:`;

  try {
    const raw = await callClaude(prompt, 2000);
    return htmlParagraphs(raw);
  } catch (e) {
    console.error("[Blueprint] generateEinleitung failed:", e);
    return `<p>Der OKUN Blueprint™ 2.0 ist ein strukturiertes Analyse-Werkzeug zur systematischen Bewertung des Digitalisierungsstandes von ${data.company.name}. Die Analyse basiert vollständig auf den Antworten aus dem Fragebogen und spiegelt damit die eigene Einschätzung des Unternehmens wider, nicht eine externe Bewertung von außen. Das Ergebnis ist eine differenzierte Standortbestimmung, die zeigt, wo das Unternehmen heute steht.</p>
<p>Die Analyse deckt ${moduleCount} operative Module ab. Für jedes Modul werden mehrere Kriterien bewertet und zu einem Score von 0 bis 100 Punkten verdichtet. Je höher der Score, desto stärker ist der Digitalisierungsgrad in diesem Bereich. Der Gesamtscore ergibt sich aus dem Durchschnitt aller Module und gibt eine Übersicht über den Stand des gesamten Unternehmens.</p>
<p>Die bewerteten Module decken die wichtigsten operativen Bereiche eines Unternehmens ab: Prozesse, Vertrieb, Führung, Automatisierung, Unternehmensstruktur, Kommunikation und Personal. Diese Auswahl wurde gewählt, weil sie gemeinsam die Bereiche abbilden, in denen Digitalisierung den größten Einfluss auf Effizienz, Skalierbarkeit und Wettbewerbsfähigkeit hat.</p>
<p>Dieser Bericht ist wie folgt aufgebaut: Nach diesem einleitenden Abschnitt folgt die Gesamtauswertung mit allen Modul-Scores auf einen Blick, danach eine ausführliche Score-Analyse des aktuellen Standes, anschließend eine Detailseite pro Modul mit Erläuterung der Score-Zusammensetzung und abschließend das Fazit.</p>
<p>Beim Lesen dieses Berichts ist zu beachten, dass niedrige Scores keine fachliche Schwäche bedeuten, sondern den Grad der strukturellen und digitalen Absicherung der vorhandenen Arbeit widerspiegeln. Bereiche mit besonders niedrigen Scores sind jene, in denen Digitalisierung den größten Hebeleffekt entfalten kann. Die Ergebnisse werden im Strategiegespräch mit OKUN Systems gemeinsam eingeordnet.</p>`;
  }
}

// ── Context page text (Page 3) ───────────────────────────────────────────────
async function generateContextPageText(data: BlueprintReportData): Promise<string> {
  if (!data.companyContext || data.companyContext.entries.length === 0) {
    return "";
  }

  const context = formatContextForPrompt(data);
  const prompt = `Du bist Senior-Berater bei OKUN Systems und schreibst den Unternehmenskontext für einen professionellen Analysebericht.

Unternehmenskontext aus dem Vorgespräch:
${context}

Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Dritte Person ("Das Unternehmen...", "${data.company.name}..."). Nur Informationen aus dem Kontext — keine Erfindungen.
Jeder Absatz mindestens 4 vollständige Sätze.

Absatz 1: Branche, Geschäftsmodell, Marktpositionierung.
Absatz 2: Aktuelle Situation — Größe, Team, operativer Alltag heute.
Absatz 3: Die wichtigsten Herausforderungen — was kostet Zeit, was läuft suboptimal.
Absatz 4: Ausgangslage — was ist bereits digitalisiert, was läuft manuell, welche Tools werden genutzt.
Absatz 5: Motivation und Ziele — warum jetzt Digitalisierung, was soll erreicht werden.

Schreibe jetzt die 5 Absätze:`;

  try {
    const raw = await callClaude(prompt, 1800);
    return htmlParagraphs(raw);
  } catch (e) {
    console.error("[Blueprint] generateContextPageText failed:", e);
    return "";
  }
}

// ── Digitalization intro (Page 4) ────────────────────────────────────────────
async function generateDigitalizationIntro(data: BlueprintReportData): Promise<string> {
  const industry = data.company.industry || "Mittelstand";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe einen professionellen Einführungstext über Digitalisierung und Automatisierung für einen Analysebericht.

Unternehmen: ${data.company.name} | Branche: ${industry}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich, für Entscheider im Mittelstand. Kein Marketing-Deutsch, keine englischen Begriffe.
Jeder Absatz mindestens 4 vollständige Sätze.

Absatz 1: Was ist Digitalisierung und Automatisierung — praxisnahe Definition ohne Fachbegriffe. Was bedeutet es im Unternehmensalltag, wenn Prozesse digitalisiert werden?

Absatz 2: Wie wirkt Digitalisierung konkret im Tagesgeschäft? Welche Aufgaben betrifft sie, was passiert mit manuellen Tätigkeiten?

Absatz 3: Was kann konkret erreicht werden? Zeitersparnis, Kostensenkung, Fehlerreduktion, Skalierbarkeit — mit konkreten Beispielen aus der Praxis.

Absatz 4: Spezifisch für "${industry}" — typische Prozesse und Herausforderungen in dieser Branche, bei denen Digitalisierung besonders stark hilft. Konkrete branchenspezifische Beispiele.

Absatz 5: Warum ist jetzt der richtige Zeitpunkt? Wettbewerbsdruck, Fachkräftemangel, Technologiereife, steigende Erwartungen — welche Faktoren machen Digitalisierung heute zur Notwendigkeit?

Schreibe jetzt die 5 Absätze:`;

  try {
    const raw = await callClaude(prompt, 1800);
    const result = htmlParagraphs(raw);
    return result || `<p>${data.company.name} steht vor einer digitalen Transformation, die in der heutigen Geschäftswelt nicht mehr optional ist. Digitalisierung bedeutet die systematische Nutzung digitaler Technologien, um Prozesse effizienter, transparenter und skalierbarer zu gestalten. Was früher ausschließlich durch Personalaufwand bewältigt wurde, kann heute durch strukturierte, systemgestützte Abläufe unterstützt oder vollständig automatisiert werden.</p>`;
  } catch (e) {
    console.error("[Blueprint] generateDigitalizationIntro failed:", e);
    return `<p>${data.company.name} steht vor einer digitalen Transformation, die in der heutigen Geschäftswelt nicht mehr optional ist. Digitalisierung bedeutet die systematische Nutzung digitaler Technologien, um Prozesse effizienter, transparenter und skalierbarer zu gestalten. Was früher ausschließlich durch Personalaufwand bewältigt wurde, kann heute durch strukturierte, systemgestützte Abläufe unterstützt oder vollständig automatisiert werden. Unternehmen, die diesen Schritt gehen, verschaffen sich einen messbaren Vorteil bei Reaktionsgeschwindigkeit, Skalierbarkeit und Betriebskosten.</p>`;
  }
}

// ── Score analysis (Page 6) ──────────────────────────────────────────────────
async function generateScoreAnalysis(data: BlueprintReportData, avgScore: number): Promise<string> {
  const label = scoreLabelText(avgScore);
  const moduleList = data.moduleScores
    .map((m) => `${m.label}: ${m.score}/100 (${scoreLabelText(m.score)})`)
    .join("\n");
  const worst = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3)
    .map((m) => `${m.label} (${m.score}/100)`).join(", ");
  const best = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100)`).join(" und ");

  const contextHint = data.companyContext
    ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}`
    : "";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe eine tiefgehende Analyse des AKTUELLEN Digitalisierungsstandes von ${data.company.name}.

NUR IST-ZUSTAND — keine Empfehlungen, keine Maßnahmen, keine nächsten Schritte.

Gesamtscore: ${avgScore}/100 (${label})
Stärkste Bereiche: ${best}
Größter Nachholbedarf: ${worst}
Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}

Ergebnisse je Modul:
${moduleList}${contextHint}

Schreibe genau 6 Absätze als Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Direkte Ansprache ("Sie", "Ihr Unternehmen"). Sachlich. Keine englischen Begriffe.
Jeder Absatz mindestens 4 vollständige Sätze. Die Analyse muss eine vollständige Seite füllen.

Absatz 1: Wie setzt sich der Gesamtscore von ${avgScore}/100 aus den ${data.moduleScores.length} Modulen zusammen? Was bedeutet "${label}" konkret?

Absatz 2: Analyse der Streuung zwischen den Modulen. Gibt es ein gleichmäßiges Bild oder große Unterschiede? Was sagt diese Verteilung über den aktuellen Zustand aus?

Absatz 3: Was zeigen die Stärkebereiche (${best}) konkret? Was funktioniert gut, wie zeigt sich das im Tagesgeschäft?

Absatz 4: Was zeigen die Nachholbereiche (${worst}) konkret? Wie äußert sich der aktuelle Stand im Arbeitsalltag — welche Reibungspunkte, Mehraufwände, Risiken?

Absatz 5: Welches Stadium der digitalen Entwicklung befindet sich ${data.company.name} heute? Was kennzeichnet dieses Stadium typischerweise?

Absatz 6: Wie verhält sich der Score von ${avgScore}/100 im Branchenkontext? Welche typischen Merkmale eines Unternehmens mit diesem Score-Profil treffen auf ${data.company.name} zu?

Schreibe jetzt die 6 Absätze:`;

  try {
    const raw = await callClaude(prompt, 2500);
    return htmlParagraphs(raw);
  } catch (e) {
    console.error("[Blueprint] generateScoreAnalysis failed:", e);
    return "";
  }
}

// ── Module analysis: insights + detailed (Pages 7–N) ─────────────────────────
async function generateModuleInsightsAndDetailed(data: BlueprintReportData, avgScore: number): Promise<{
  moduleInsights: Record<number, string>;
  moduleDetailedAnalysis: Record<number, string>;
}> {
  const moduleList = data.moduleScores
    .map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100 (${scoreLabelText(m.score)})`)
    .join("\n");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const moduleKeys = data.moduleScores.map((m) => m.moduleNumber);

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle eine Modulanalyse für ${data.company.name}.

NUR IST-ZUSTAND — keine Empfehlungen, keine Maßnahmen. Keine englischen Begriffe.

Gesamt-Score: ${avgScore}/100 (${scoreLabelText(avgScore)})
Modul-Scores:
${moduleList}${contextHint}

Antworte NUR mit gültigem JSON. Kein Text davor oder danach, kein Markdown.
Erstelle für jedes Modul (Nummern: ${moduleKeys.join(", ")}) zwei Texte:
- "insights": 2-3 Sätze Kurzeinschätzung des Ist-Zustandes
- "detailed": 8-10 vollständige Sätze ausführliche Analyse — was zeigt dieser Score konkret, welche Auswirkungen hat der aktuelle Stand im Tagesgeschäft, was charakterisiert das Unternehmen in diesem Bereich heute

{
${moduleKeys.map((n) => {
  const m = data.moduleScores.find((s) => s.moduleNumber === n);
  return `  "${n}_insights": "Kurzeinschätzung ${m?.label ?? `Modul ${n}`} (${m?.score ?? 0}/100) — nur Ist-Zustand",
  "${n}_detailed": "Ausführliche Analyse ${m?.label ?? `Modul ${n}`} (${m?.score ?? 0}/100) — 8-10 Sätze, nur Ist-Zustand"`;
}).join(",\n")}
}`;

  try {
    const raw = await callClaude(prompt, 6000);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as Record<string, string>;

    const moduleInsights: Record<number, string> = {};
    const moduleDetailedAnalysis: Record<number, string> = {};
    for (const m of data.moduleScores) {
      const n = m.moduleNumber;
      if (parsed[`${n}_insights`]) moduleInsights[n] = parsed[`${n}_insights`];
      if (parsed[`${n}_detailed`]) moduleDetailedAnalysis[n] = parsed[`${n}_detailed`];
    }
    return { moduleInsights, moduleDetailedAnalysis };
  } catch (e) {
    console.error("[Blueprint] generateModuleInsightsAndDetailed failed:", e);
    return { moduleInsights: {}, moduleDetailedAnalysis: {} };
  }
}

// ── Module score composition (separate call for reliability) ─────────────────
async function generateModuleScoreComposition(data: BlueprintReportData): Promise<Record<number, string>> {
  const moduleList = data.moduleScores
    .map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100 (${scoreLabelText(m.score)})`)
    .join("\n");

  const moduleDescriptions: Record<number, string> = {
    1: "Unternehmensprofil — Grundstruktur, Unternehmensform, Grunddaten",
    2: "Prozessqualität — Dokumentationsgrad, Standardisierung, Qualitätssicherung",
    3: "Vertriebsstruktur — Kundendatenverwaltung, Vertriebsprozesse, Auftragsmanagement",
    4: "Führungsstruktur — Führungsklarheit, Entscheidungswege, Strategiemanagement",
    5: "Automatisierungsgrad — Grad der Prozessautomatisierung, Systemnutzung, manuelle Tätigkeiten",
    6: "Unternehmensstruktur — Organisationsstruktur, Zuständigkeiten, Ablauforganisation",
    7: "Kommunikation — interne und externe Kommunikationswege, Dokumentenmanagement",
    8: "Personalmanagement — Recruiting, Personalverwaltung, Zeiterfassung, Mitarbeiterentwicklung",
  };

  const moduleKeys = data.moduleScores.map((m) => m.moduleNumber);

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erkläre für jedes Modul, wie sich der Score zusammensetzt.

Modul-Scores:
${moduleList}

Antworte NUR mit gültigem JSON. Kein Text davor oder danach, kein Markdown.
Erstelle für jedes Modul (Nummern: ${moduleKeys.join(", ")}) 3-4 Sätze:
- Erkläre, welche konkreten Kriterien in diesem Modul bewertet wurden
- Wie diese Kriterien den Score beeinflusst haben
- Was der Score von X/100 in diesem Bereich konkret bedeutet

{
${moduleKeys.map((n) => {
  const m = data.moduleScores.find((s) => s.moduleNumber === n);
  const desc = moduleDescriptions[n] ?? `Modul ${n}`;
  return `  "${n}": "Score-Zusammensetzung für ${m?.label ?? `Modul ${n}`} (${m?.score ?? 0}/100): Bewertet wurden ${desc}. 3-4 Sätze zur Score-Zusammensetzung."`;
}).join(",\n")}
}`;

  try {
    const raw = await callClaude(prompt, 3000);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as Record<string, string>;

    const result: Record<number, string> = {};
    for (const m of data.moduleScores) {
      if (parsed[String(m.moduleNumber)]) result[m.moduleNumber] = parsed[String(m.moduleNumber)];
    }
    return result;
  } catch (e) {
    console.error("[Blueprint] generateModuleScoreComposition failed:", e);
    return {};
  }
}

// ── Conclusion + executive summary + orientation ─────────────────────────────
async function generateFinalSections(data: BlueprintReportData, avgScore: number): Promise<{
  conclusionText: string;
  executiveSummary: string;
  orientationText: string;
}> {
  const worstModules = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3).map((m) => m.label).join(", ");
  const bestModules = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2).map((m) => m.label).join(" und ");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle das abschließende Fazit für ${data.company.name}.

NUR IST-ZUSTAND — KEINE Lösungen, KEINE Empfehlungen, KEINE Produktnamen, KEINE Maßnahmen. Keine englischen Begriffe.

Score: ${avgScore}/100 (${scoreLabelText(avgScore)})
Stärken: ${bestModules}
Größte Nachholbereiche: ${worstModules}${contextHint}

Antworte NUR mit gültigem JSON. Kein Text davor oder danach, kein Markdown:
{
  "executiveSummary": "4-5 prägnante Sätze für Entscheider. Score einordnen, wichtigste Stärken und Nachholbereiche benennen — sachlich, nur Ist-Zustand.",
  "conclusionText": "6 Absätze getrennt durch doppelten Zeilenumbruch. Mindestens 4 Sätze pro Absatz. Nur Ist-Zustand, keine Lösungen. Absatz 1: Gesamtbild aus allen Modulen. Absatz 2: Stärken im Detail. Absatz 3: Nachholbereiche im Tagesgeschäft. Absatz 4: Gesamtbild und Reifegrad. Absatz 5: Branchenkontext und Einordnung. Absatz 6: Kernaussage der Analyse.",
  "orientationText": "2-3 Sätze: Im Strategiegespräch werden die Ergebnisse vertieft. Bewährte Standardlösungen (Google Workspace, strukturierte Verwaltungssysteme, Kundenmanagement-Systeme) sowie individuelle Ansätze werden besprochen. Der Handlungsrahmen wird gemeinsam erarbeitet."
}`;

  try {
    const raw = await callClaude(prompt, 5000);
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      executiveSummary?: string;
      conclusionText?: string;
      orientationText?: string;
    };

    return {
      executiveSummary: parsed.executiveSummary ?? `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      conclusionText: htmlParagraphs(parsed.conclusionText ?? ""),
      orientationText: parsed.orientationText ?? "Im Strategiegespräch mit OKUN Systems werden die Analyseergebnisse vertieft.",
    };
  } catch (e) {
    console.error("[Blueprint] generateFinalSections failed:", e);
    return {
      executiveSummary: `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      conclusionText: "",
      orientationText: "Im Strategiegespräch mit OKUN Systems werden die Analyseergebnisse vertieft.",
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

// ── Public: generate all report texts — sequential to avoid rate limiting ─────
export async function generateReportTexts(data: BlueprintReportData): Promise<ReportTexts> {
  const avgScore = calcAvgScore(data);

  // Sequential execution — parallel calls cause rate limiting on the Anthropic API
  const einleitungText = await generateEinleitung(data);
  const contextPageText = await generateContextPageText(data);
  const digitalizationIntro = await generateDigitalizationIntro(data);
  const scoreAnalysis = await generateScoreAnalysis(data, avgScore);

  // Module texts split into 2 sequential calls for reliability
  const { moduleInsights, moduleDetailedAnalysis } = await generateModuleInsightsAndDetailed(data, avgScore);
  const moduleScoreComposition = await generateModuleScoreComposition(data);

  const finalSections = await generateFinalSections(data, avgScore);

  return {
    einleitungText,
    executiveSummary: finalSections.executiveSummary,
    contextPageText,
    digitalizationIntro,
    scoreAnalysis,
    moduleInsights,
    moduleDetailedAnalysis,
    moduleScoreComposition,
    conclusionText: finalSections.conclusionText,
    orientationText: finalSections.orientationText,
  };
}
