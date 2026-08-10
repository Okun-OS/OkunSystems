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

// ── Einleitung (Page 2) ──────────────────────────────────────────────────────
async function generateEinleitung(data: BlueprintReportData): Promise<string> {
  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe die Einleitung für einen professionellen Digitalisierungsanalysebericht — den OKUN Blueprint™ 2.0.

Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}
Analysedatum: Abgeschlossen mit ${data.totalAnswered} von ${data.totalActive} Fragen beantwortet

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich und professionell. Schreibe in der zweiten Person ("Sie", "Ihr Unternehmen").
Jeder Absatz soll mindestens 4 vollständige Sätze enthalten.

Absatz 1: Was ist der OKUN Blueprint™ 2.0? Beschreibe präzise, was diese Analyse ist — ein strukturiertes Analyse-Werkzeug zur Messung des Digitalisierungsstandes eines Unternehmens. Erkläre, dass sie keine Einschätzung von außen ist, sondern aus den Antworten des Unternehmens selbst entsteht.

Absatz 2: Wie funktioniert die Analyse methodisch? Erkläre, dass sie acht operative Module abdeckt, dass pro Modul mehrere Kriterien bewertet werden und wie aus den Antworten ein Punktescore (0–100) entsteht. Erläutere, dass der Score kein Urteil, sondern eine Standortbestimmung ist.

Absatz 3: Was sind die 8 Module des Blueprints? Beschreibe kurz, welche acht Bereiche eines Unternehmens abgedeckt werden — Führung & Organisation, Prozessmanagement, Kommunikation & Dokumentation, Vertrieb & CRM, Personalmanagement, Finanz- & Buchhaltungsprozesse, IT-Infrastruktur & Sicherheit und Datenauswertung & Reporting. Erkläre, warum genau diese Bereiche relevant sind.

Absatz 4: Wie ist dieser Bericht aufgebaut? Beschreibe den Aufbau: Unternehmenskontext aus dem Vorgespräch, Gesamtauswertung mit allen Scores, Score-Analyse des aktuellen Stands, Detailanalyse jedes Moduls mit Score-Zusammensetzung, abschließendes Fazit. Erkläre, dass jede Seite konkrete Informationen zum Ist-Zustand enthält.

Absatz 5: Wie sollte dieser Bericht gelesen werden? Gib Hinweise zur Interpretation — was bedeuten hohe und niedrige Scores, warum sind die Module mit dem größten Abstand nach unten besonders interessant, wie verhält sich der Branchendurchschnitt. Weise darauf hin, dass im Strategiegespräch die Erkenntnisse vertieft werden.

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
    return `<p>Der OKUN Blueprint™ 2.0 ist ein strukturiertes Analyse-Werkzeug zur systematischen Bewertung des Digitalisierungsstandes von ${data.company.name}. Die Analyse basiert vollständig auf den Antworten, die im Rahmen des strukturierten Fragebogens gegeben wurden — sie spiegelt damit die eigene Einschätzung des Unternehmens wider, nicht eine externe Bewertung von außen. Das Ergebnis ist eine differenzierte Standortbestimmung, keine pauschale Bewertung.</p>`;
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

Schreibe einen professionellen Unternehmensabschnitt mit genau 5 Absätzen als zusammenhängenden Fließtext.
Kein Markdown, keine Aufzählungen, keine Überschriften. Schreibe vollständige, ausformulierte Sätze.
Schreibe in der dritten Person ("Das Unternehmen...", "Der Betrieb...", "${data.company.name}...").
Schreibe nur das, was aus dem Unternehmenskontext hervorgeht — erfinde keine Informationen.
Jeder Absatz soll mindestens 4 vollständige Sätze enthalten und substanziell sein.

Absatz 1: Beschreibung des Unternehmens — Branche, Geschäftsmodell, Was macht es konkret, wie positioniert es sich am Markt.

Absatz 2: Aktuelle Situation — Größe, Aufstellung, Team, Digitalisierungsstand, operative Realität heute.

Absatz 3: Die wichtigsten Herausforderungen aus dem Gespräch — Was kostet Zeit, was ist aufwändig, wo entstehen Fehler, was läuft suboptimal? Konkrete Beispiele nennen.

Absatz 4: Die Ausgangslage im Detail — Welche Prozesse sind bereits digitalisiert, welche laufen noch manuell, welche Tools oder Systeme werden eingesetzt?

Absatz 5: Die Motivation und Ziele — Warum beschäftigt sich das Unternehmen jetzt mit Digitalisierung, und was soll konkret erreicht werden?

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

// ── Digitalization intro (Page 4) ────────────────────────────────────────────
async function generateDigitalizationIntro(data: BlueprintReportData): Promise<string> {
  const industry = data.company.industry || "Mittelstand";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe einen professionellen Einführungstext über Digitalisierung und Automatisierung für einen Analysebericht.

Unternehmen: ${data.company.name} | Branche: ${industry}

Schreibe genau 5 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich, präzise, für Entscheider im Mittelstand. Kein Marketing-Deutsch, keine englischen Begriffe.
Jeder Absatz soll mindestens 4 vollständige Sätze enthalten.

Absatz 1: Was ist Digitalisierung und Automatisierung? Eine klare, praxisnahe Definition für Entscheider ohne Fachbegriffe aus dem Englischen. Erkläre, was es in der Unternehmensrealität bedeutet, wenn Prozesse digitalisiert oder automatisiert werden.

Absatz 2: Wie wirkt Digitalisierung konkret im Tagesgeschäft? Welche Arten von Aufgaben betrifft sie, wie verändert sie Abläufe, was passiert mit manuellen Tätigkeiten?

Absatz 3: Was kann konkret erreicht werden? Zeitersparnis, Kostensenkung, Fehlerreduktion, Skalierbarkeit, bessere Transparenz — mit konkreten Beispielen, die zeigen, was in der Praxis möglich ist.

Absatz 4: Spezifisch für die Branche "${industry}" — Welche typischen Prozesse, Engpässe und Herausforderungen gibt es in dieser Branche, bei denen Digitalisierung besonders stark hilft? Konkrete branchenspezifische Beispiele und Einsatzbereiche nennen.

Absatz 5: Warum ist jetzt der richtige Zeitpunkt? Wettbewerbsdruck, Fachkräftemangel, Technologiereife, steigende Kundenerwartungen — welche Faktoren machen Digitalisierung heute zu einer strategischen Notwendigkeit?

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

// ── Score analysis (Page 6) ──────────────────────────────────────────────────
async function generateScoreAnalysis(data: BlueprintReportData, avgScore: number): Promise<string> {
  const label = scoreLabelText(avgScore);
  const moduleList = data.moduleScores
    .map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100 (${scoreLabelText(m.score)})`)
    .join("\n");
  const worst = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3)
    .map((m) => `${m.label} (${m.score}/100)`).join(", ");
  const best = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100)`).join(" und ");

  const contextHint = data.companyContext
    ? `\n\nUnternehmenskontext: ${formatContextForPrompt(data)}`
    : "";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe eine tiefgehende Analyse des aktuellen Digitalisierungsstandes von ${data.company.name}.

WICHTIG: Dieser Abschnitt beschreibt ausschließlich den AKTUELLEN STAND — keine Empfehlungen, keine Maßnahmen, keine nächsten Schritte, keine Lösungen. Nur Analyse des Ist-Zustandes.

Daten:
- Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${data.company.industry}` : ""}
- Gesamtdigitalisierungsgrad: ${avgScore} von 100 Punkten
- Einstufung: ${label}
- Stärkste Bereiche: ${best}
- Bereiche mit größtem Nachholbedarf: ${worst}
- Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}

Ergebnisse je Modul:
${moduleList}${contextHint}

Schreibe genau 6 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Schreibe in direkter Ansprache ("Sie", "Ihr Unternehmen"). Sachlich und präzise — kein Marketing-Deutsch, keine englischen Begriffe.
Jeder Absatz soll mindestens 4 vollständige, substanzielle Sätze enthalten. Die Analyse soll eine ganze Seite füllen.
KEINE Handlungsempfehlungen, KEINE Maßnahmen, KEINE Zukunftspläne.

Absatz 1: Wie setzt sich der Gesamtscore von ${avgScore}/100 aus den 8 Modulen zusammen? Was bedeutet "${label}" als Einstufung konkret für ein Unternehmen wie ${data.company.name}? Wie ist das Gesamtbild über alle Module hinweg?

Absatz 2: Analysiere die Streuung der Scores zwischen den Modulen. Gibt es ein gleichmäßiges Bild oder große Unterschiede zwischen starken und schwachen Bereichen? Was sagt diese Streuung über den aktuellen Zustand des Unternehmens aus?

Absatz 3: Beschreibe detailliert, was in den Stärkebereichen (${best}) bereits vorhanden ist und was diese Scores konkret bedeuten. Was funktioniert gut, was läuft reibungslos? Wie zeigt sich das im Tagesgeschäft?

Absatz 4: Beschreibe detailliert den aktuellen Zustand in den Bereichen mit dem größten Nachholbedarf (${worst}). Was zeigen diese niedrigen Scores konkret? Wie äußert sich das im Arbeitsalltag des Unternehmens — welche Reibungspunkte, welche Mehraufwände, welche Risiken entstehen durch diesen Stand?

Absatz 5: Analysiere das Gesamtbild aus der Perspektive der Unternehmensreife. Welches Stadium der digitalen Entwicklung befindet sich ${data.company.name} heute? Was kennzeichnet dieses Stadium typischerweise für Unternehmen dieser Größe und Branche?

Absatz 6: Wie verhält sich der Gesamtscore von ${avgScore}/100 im Kontext der acht bewerteten Dimensionen? Was sind die typischen Merkmale eines Unternehmens mit diesem Score-Profil, und welche dieser Merkmale treffen auf ${data.company.name} zu?

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

// ── Module insights + detailed analysis + score composition (Pages 7–14) ─────
async function generateModuleTexts(data: BlueprintReportData, avgScore: number): Promise<{
  moduleInsights: Record<number, string>;
  moduleDetailedAnalysis: Record<number, string>;
  moduleScoreComposition: Record<number, string>;
}> {
  const moduleList = data.moduleScores.map((m) => `M${m.moduleNumber} ${m.label}: ${m.score}/100 (${scoreLabelText(m.score)})`).join("\n");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle eine detaillierte Modulanalyse für ${data.company.name}.

WICHTIG: Beschreibe ausschließlich den AKTUELLEN STAND — keine Empfehlungen, keine Maßnahmen, keine nächsten Schritte. Nur Analyse des Ist-Zustandes. Verwende keine englischen Begriffe.

Gesamt-Score: ${avgScore}/100 (${scoreLabelText(avgScore)})

Modul-Scores:
${moduleList}${contextHint}

Modul-Übersicht (was jedes Modul bewertet):
M1 Führung & Organisation: Klarheit der Führungsstruktur, Entscheidungsprozesse, Strategie- und Zielmanagement
M2 Prozessmanagement: Dokumentationsgrad, Standardisierung von Abläufen, Qualitätssicherung
M3 Kommunikation & Dokumentation: Interne Kommunikationswege, Dokumentenmanagement, Wissensmanagement
M4 Vertrieb & Kundenmanagement: Kundendaten-Verwaltung, Vertriebsprozesse, Angebots- und Auftragsverwaltung
M5 Personalmanagement: Recruiting-Prozesse, Personalverwaltung, Zeiterfassung, Mitarbeiterentwicklung
M6 Finanz- & Buchhaltungsprozesse: Rechnungsstellung, Buchhaltungsabläufe, Liquiditätsplanung, Controlling
M7 IT-Infrastruktur & Datensicherheit: Technische Ausstattung, Datensicherung, Zugriffsrechte, IT-Stabilität
M8 Datenauswertung & Reporting: Kennzahlen-Erfassung, Auswertungsprozesse, Entscheidungsgrundlagen

Antworte NUR mit diesem JSON-Objekt (kein Markdown, kein Kommentar):
{
  "insights": {
    "1": "Kurze Einschätzung M1 (2-3 Sätze, faktenbasiert, nur Ist-Zustand)",
    "2": "Kurze Einschätzung M2",
    "3": "Kurze Einschätzung M3",
    "4": "Kurze Einschätzung M4",
    "5": "Kurze Einschätzung M5",
    "6": "Kurze Einschätzung M6",
    "7": "Kurze Einschätzung M7",
    "8": "Kurze Einschätzung M8"
  },
  "detailed": {
    "1": "Ausführliche Analyse M1 — Führung & Organisation (8-10 vollständige Sätze): Beschreibe ausführlich, was dieser Score über den aktuellen Zustand aussagt. Erkläre, welche Aspekte der Führungsstruktur und des Organisationsmanagements bewertet wurden und wie sie sich im Tagesgeschäft zeigen. Gehe auf konkrete Auswirkungen des aktuellen Stands ein — was funktioniert, wo gibt es operative Konsequenzen. Beschreibe das Muster, das dieser Score typischerweise in Unternehmen dieser Art widerspiegelt. Nur Ist-Zustand, keine Handlungsempfehlungen.",
    "2": "Ausführliche Analyse M2 — Prozessmanagement (8-10 Sätze, nur Ist-Zustand)",
    "3": "Ausführliche Analyse M3 — Kommunikation & Dokumentation (8-10 Sätze, nur Ist-Zustand)",
    "4": "Ausführliche Analyse M4 — Vertrieb & Kundenmanagement (8-10 Sätze, nur Ist-Zustand)",
    "5": "Ausführliche Analyse M5 — Personalmanagement (8-10 Sätze, nur Ist-Zustand)",
    "6": "Ausführliche Analyse M6 — Finanz- & Buchhaltungsprozesse (8-10 Sätze, nur Ist-Zustand)",
    "7": "Ausführliche Analyse M7 — IT-Infrastruktur & Datensicherheit (8-10 Sätze, nur Ist-Zustand)",
    "8": "Ausführliche Analyse M8 — Datenauswertung & Reporting (8-10 Sätze, nur Ist-Zustand)"
  },
  "composition": {
    "1": "Erkläre in 3-4 Sätzen, wie sich der Score von M1 zusammensetzt: Welche konkreten Kriterien in Führung & Organisation wurden bewertet, welche Aspekte haben den Score beeinflusst, was hat die Einstufung '${scoreLabelText(data.moduleScores.find(m=>m.moduleNumber===1)?.score ?? 50)}' erzeugt? Beziehe dich auf die Bewertungsdimensionen Führungsklarheit, Entscheidungswege, Strategiemanagement.",
    "2": "Score-Zusammensetzung M2 — Prozessmanagement: Bewertete Kriterien Dokumentationsgrad, Standardisierung, Qualitätssicherung (3-4 Sätze)",
    "3": "Score-Zusammensetzung M3 — Kommunikation & Dokumentation: Bewertete Kriterien Kommunikationswege, Dokumentenmanagement, Wissenstransfer (3-4 Sätze)",
    "4": "Score-Zusammensetzung M4 — Vertrieb & Kundenmanagement: Bewertete Kriterien Kundendatenverwaltung, Vertriebsprozesse, Auftragsmanagement (3-4 Sätze)",
    "5": "Score-Zusammensetzung M5 — Personalmanagement: Bewertete Kriterien Recruiting, Personalverwaltung, Zeiterfassung, Mitarbeiterentwicklung (3-4 Sätze)",
    "6": "Score-Zusammensetzung M6 — Finanz- & Buchhaltung: Bewertete Kriterien Rechnungsstellung, Buchhaltungsabläufe, Controlling (3-4 Sätze)",
    "7": "Score-Zusammensetzung M7 — IT-Infrastruktur: Bewertete Kriterien technische Ausstattung, Datensicherung, Zugriffsmanagement, IT-Stabilität (3-4 Sätze)",
    "8": "Score-Zusammensetzung M8 — Datenauswertung: Bewertete Kriterien Kennzahlenerfassung, Auswertungsprozesse, Entscheidungsdaten (3-4 Sätze)"
  }
}`;

  try {
    const res = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = res.content[0].type === "text" ? res.content[0].text : "{}";
    const jsonStr = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      insights?: Record<string, string>;
      detailed?: Record<string, string>;
      composition?: Record<string, string>;
    };

    const moduleInsights: Record<number, string> = {};
    const moduleDetailedAnalysis: Record<number, string> = {};
    const moduleScoreComposition: Record<number, string> = {};
    for (const [k, v] of Object.entries(parsed.insights ?? {})) {
      moduleInsights[parseInt(k, 10)] = v;
    }
    for (const [k, v] of Object.entries(parsed.detailed ?? {})) {
      moduleDetailedAnalysis[parseInt(k, 10)] = v;
    }
    for (const [k, v] of Object.entries(parsed.composition ?? {})) {
      moduleScoreComposition[parseInt(k, 10)] = v;
    }
    return { moduleInsights, moduleDetailedAnalysis, moduleScoreComposition };
  } catch {
    const empty: Record<number, string> = {};
    return { moduleInsights: empty, moduleDetailedAnalysis: empty, moduleScoreComposition: empty };
  }
}

// ── Conclusion + executive summary + orientation (Page 15) ───────────────────
async function generateFinalSections(data: BlueprintReportData, avgScore: number): Promise<{
  conclusionText: string;
  executiveSummary: string;
  orientationText: string;
}> {
  const worstModules = [...data.moduleScores].sort((a, b) => a.score - b.score).slice(0, 3).map((m) => m.label).join(", ");
  const bestModules = [...data.moduleScores].sort((a, b) => b.score - a.score).slice(0, 2).map((m) => m.label).join(" und ");
  const contextHint = data.companyContext ? `\n\nUnternehmenskontext:\n${formatContextForPrompt(data)}` : "";

  const prompt = `Du bist Lead-Berater bei OKUN Systems. Erstelle das abschließende Fazit für ${data.company.name}.

WICHTIG: Das Fazit beschreibt ausschließlich den AKTUELLEN STAND — es enthält KEINE Lösungen, KEINE Empfehlungen, KEINE konkreten Maßnahmen, KEINE Produktnamen. Nur Zusammenfassung der Analyseergebnisse und Einordnung des Ist-Zustandes. Keine englischen Begriffe.

Score: ${avgScore}/100 | Einstufung: ${scoreLabelText(avgScore)}
Stärken: ${bestModules}
Größte Nachholbereiche: ${worstModules}
Paket: ${data.packageType ?? "Standard"}${contextHint}

Antworte NUR mit diesem JSON-Objekt (kein Markdown):
{
  "executiveSummary": "4-5 prägnante Sätze für Entscheider. Score einordnen, wichtigste Stärken und Nachholbereiche benennen — sachlich und konkret. Kein Marketing, keine Lösungen, nur Ist-Zustand.",
  "conclusionText": "6 Absätze Fließtext (mindestens je 4 vollständige Sätze). Nur Ist-Zustand, keine Lösungen, keine Empfehlungen, keine englischen Begriffe.\\n\\nAbsatz 1: Was hat die Gesamtanalyse gezeigt? Die wichtigsten Erkenntnisse aus allen 8 Modulen zusammenfassen — was ist das übergreifende Bild, was hat sich bestätigt, was war auffällig?\\n\\nAbsatz 2: Welche Stärken hat ${data.company.name} heute konkret? Beschreibe ausführlich, was in den starken Bereichen (${bestModules}) vorhanden ist und was das für die operative Leistungsfähigkeit des Unternehmens bedeutet.\\n\\nAbsatz 3: Wie zeigen sich die Nachholbereiche im Tagesgeschäft? Beschreibe konkret, wie sich der aktuelle Stand in ${worstModules} im operativen Alltag bemerkbar macht — welche Auswirkungen hat das, welche Mehraufwände entstehen?\\n\\nAbsatz 4: Welches Gesamtbild ergibt sich aus der Kombination von Stärken und Nachholbereichen? Welcher Reifegrad beschreibt ${data.company.name} heute am treffendsten? Welche Muster sind typisch für Unternehmen in dieser Situation?\\n\\nAbsatz 5: Wie ist der Score von ${avgScore}/100 im Branchenkontext einzuordnen? Was bedeutet diese Einstufung für ein Unternehmen der Größe und Branche von ${data.company.name} in der heutigen Zeit?\\n\\nAbsatz 6: Was ist die Kernaussage dieser Analyse für ${data.company.name}? Fasse in einem abschließenden Absatz zusammen, was diese Analyse über den aktuellen Digitalisierungsstand des Unternehmens aussagt — ohne Handlungsempfehlungen.",
  "orientationText": "2-3 Sätze: Im bevorstehenden Strategiegespräch mit OKUN Systems werden die Analyseergebnisse vertieft. Erwähne kurz, dass bewährte Standardlösungen (z.B. Google Workspace für Kommunikation und Zusammenarbeit, strukturierte Tabellenkalkulationen als erste Zwischenlösungen, spezialisierte Kundenmanagement-Systeme) sowie individuelle Entwicklungsansätze besprochen werden — je nach Situation. Betone, dass der genaue Handlungsrahmen im Strategiegespräch gemeinsam erarbeitet wird."
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
      orientationText?: string;
    };

    return {
      executiveSummary: parsed.executiveSummary ?? `${data.company.name} hat den OKUN Blueprint™ 2.0 abgeschlossen.`,
      conclusionText: htmlParagraphs(parsed.conclusionText ?? ""),
      orientationText: parsed.orientationText ?? "Im Strategiegespräch mit OKUN Systems werden die Analyseergebnisse vertieft und konkrete nächste Schritte gemeinsam erarbeitet.",
    };
  } catch {
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

// ── Public: generate all report texts in parallel ─────────────────────────────
export async function generateReportTexts(data: BlueprintReportData): Promise<ReportTexts> {
  const avgScore = calcAvgScore(data);

  const [einleitungText, contextPageText, digitalizationIntro, scoreAnalysis, moduleTexts, finalSections] = await Promise.all([
    generateEinleitung(data),
    generateContextPageText(data),
    generateDigitalizationIntro(data),
    generateScoreAnalysis(data, avgScore),
    generateModuleTexts(data, avgScore),
    generateFinalSections(data, avgScore),
  ]);

  return {
    einleitungText,
    executiveSummary: finalSections.executiveSummary,
    contextPageText,
    digitalizationIntro,
    scoreAnalysis,
    moduleInsights: moduleTexts.moduleInsights,
    moduleDetailedAnalysis: moduleTexts.moduleDetailedAnalysis,
    moduleScoreComposition: moduleTexts.moduleScoreComposition,
    conclusionText: finalSections.conclusionText,
    orientationText: finalSections.orientationText,
  };
}
