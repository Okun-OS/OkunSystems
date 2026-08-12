import Anthropic from "@anthropic-ai/sdk";
import type { BlueprintReportData } from "./report-assembler";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReportTexts {
  einleitungText: string;
  executiveSummary: string;
  contextPageText: string;
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

// ── Einleitung (Pages 2–3) ───────────────────────────────────────────────────
async function generateEinleitung(data: BlueprintReportData): Promise<string> {
  const moduleCount = data.moduleScores.length;
  const industry = data.company.industry || "Mittelstand";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe die Einleitung für einen professionellen Digitalisierungsanalysebericht — den OKUN Blueprint™ 2.0.

Unternehmen: ${data.company.name}${data.company.industry ? ` | Branche: ${industry}` : ""}
Analyse: Abgeschlossen mit ${data.totalAnswered} von ${data.totalActive} Fragen beantwortet
Module: ${moduleCount} bewertet (Prozessqualität, Vertriebsstruktur, Führungsstruktur, Automatisierungsgrad, Unternehmensstruktur, Kommunikation, Personalmanagement)

Schreibe genau 10 Absätze als zusammenhängenden Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Sachlich, professionell, für Entscheider im Mittelstand. Direkte Ansprache: "Sie", "Ihr Unternehmen".
Jeder Absatz muss mindestens 4–5 vollständige Sätze enthalten. Ziel ist, zwei Seiten vollständig zu füllen.
Keine englischen Begriffe. Kein Marketing-Deutsch.

Absatz 1 (Was ist OKUN Systems): Wer ist OKUN Systems? Was macht OKUN Systems — Digitalisierungsberatung speziell für den Mittelstand. Welche Aufgabe hat OKUN Systems gegenüber seinen Kunden — strukturierte Standortbestimmung, keine Produkte verkaufen, sondern den Ist-Zustand klar machen, bevor Maßnahmen diskutiert werden. Wie arbeitet OKUN Systems mit Kunden zusammen.

Absatz 2 (Was ist der OKUN Blueprint™ 2.0): Was ist dieser Analysebericht — ein strukturiertes Werkzeug zur Messung des Digitalisierungsstandes. Er entsteht nicht aus einer externen Einschätzung, sondern vollständig aus den Antworten des Unternehmens selbst. Der Score ist eine Standortbestimmung, kein Urteil über die Qualität der Arbeit.

Absatz 3 (Was ist Digitalisierung): Was bedeutet Digitalisierung im Unternehmensalltag — praxisnahe, konkrete Erklärung ohne Fachbegriffe. Was passiert, wenn Prozesse digitalisiert werden? Der Unterschied zwischen analogem und digitalem Arbeiten im Tagesgeschäft: Daten, Abläufe, Kommunikation, Dokumentation. Welche Arten von Tätigkeiten können digitalisiert werden.

Absatz 4 (Was ist Automatisierung): Was ist Automatisierung und wie unterscheidet sie sich von Digitalisierung. Automatisierung als nächste Stufe — wenn digitale Prozesse nicht nur dokumentiert, sondern selbstständig ausgeführt werden. Beispiele aus dem Alltag: automatische Benachrichtigungen, Dateneingaben ohne manuelle Arbeit, Systeme die miteinander kommunizieren. Was das für den Arbeitsalltag bedeutet.

Absatz 5 (Wofür ist Digitalisierung gut): Was erreichen Unternehmen durch strukturierte Digitalisierung? Zeitersparnis, Fehlerreduktion, Skalierbarkeit, bessere Entscheidungsgrundlagen. Konkrete Beispiele aus dem Alltag — was früher eine Stunde dauerte, in Minuten erledigt. Wie sich die Qualität der Arbeit ändert, wenn manuelle Tätigkeiten wegfallen. Warum Digitalisierung nicht Stellenabbau bedeutet, sondern Kapazitätsgewinn.

Absatz 6 (Relevanz für ${industry}): Welche typischen Herausforderungen hat ein Unternehmen in der Branche ${industry}, bei denen Digitalisierung konkret helfen kann. Typische manuelle Prozesse in dieser Branche. Welche Art von Effizienzpotenzial besteht branchentypisch. Warum gerade jetzt der richtige Zeitpunkt ist.

Absatz 7 (Wie funktioniert die Analyse methodisch): Wie ist die Analyse aufgebaut? Welche ${moduleCount} Module werden bewertet und warum genau diese. Jedes Modul deckt mehrere Kriterien ab, aus den Antworten entsteht ein Score von 0 bis 100. Der Score spiegelt den Grad der strukturellen und digitalen Reife in diesem Bereich wider.

Absatz 8 (Die ${moduleCount} Module): Welche Bereiche decken die ${moduleCount} Module ab — Prozessqualität, Vertriebsstruktur, Führungsstruktur, Automatisierungsgrad, Unternehmensstruktur, Kommunikation, Personalmanagement. Warum wurde genau diese Kombination gewählt — weil sie gemeinsam alle zentralen Unternehmensbereiche abbilden, in denen Digitalisierung Wirkung entfaltet.

Absatz 9 (Aufbau dieses Berichts): Wie ist dieser Bericht gegliedert? Gesamtauswertung mit allen Modul-Scores auf einen Blick, danach ausführliche Score-Analyse des Ist-Zustandes, anschließend eine Detailseite pro Modul mit Score-Zusammensetzung und Analyse, abschließend das Fazit. Jede Seite enthält konkrete Informationen zum aktuellen Stand.

Absatz 10 (Wie liest man den Bericht): Wie sollte dieser Bericht gelesen werden? Was bedeuten hohe Scores und niedrige Scores — niedrige Scores bedeuten nicht schlechte Arbeit, sondern zeigen, wo Digitalisierung den größten Hebeleffekt hat. Wie verhält sich der eigene Score im Branchenvergleich. Was kommt nach dem Bericht — das Strategiegespräch mit OKUN Systems, in dem die Ergebnisse gemeinsam eingeordnet werden.

Schreibe jetzt alle 10 Absätze:`;

  try {
    const raw = await callClaude(prompt, 3500);
    return htmlParagraphs(raw);
  } catch (e) {
    console.error("[Blueprint] generateEinleitung failed:", e);
    return `<p>OKUN Systems ist eine Digitalisierungsberatung, die sich auf den deutschen Mittelstand spezialisiert hat. Die Aufgabe von OKUN Systems ist nicht, Produkte zu verkaufen, sondern gemeinsam mit Unternehmen den aktuellen Stand zu verstehen — bevor über Maßnahmen gesprochen wird. Der OKUN Blueprint™ 2.0 ist das zentrale Werkzeug dieser Standortbestimmung. Er liefert eine strukturierte, datenbasierte Grundlage für alle weiteren Gespräche und Entscheidungen.</p>
<p>Der OKUN Blueprint™ 2.0 ist ein strukturiertes Analyse-Werkzeug zur systematischen Bewertung des Digitalisierungsstandes von ${data.company.name}. Die Analyse basiert vollständig auf den Antworten aus dem Fragebogen und spiegelt damit die eigene Einschätzung des Unternehmens wider, nicht eine externe Bewertung von außen. Das Ergebnis ist eine differenzierte Standortbestimmung, die zeigt, wo das Unternehmen heute steht. Der Score ist kein Urteil über die Qualität der Arbeit, sondern eine Messung des Grades der digitalen und strukturellen Absicherung.</p>
<p>Digitalisierung bedeutet im Unternehmensalltag: Informationen werden digital erfasst, gespeichert und verarbeitet, anstatt auf Papier, in Tabellen oder per Handschlag. Was früher mündlich abgestimmt wurde, wird in Systemen dokumentiert. Was früher manuell übertragen wurde, fließt automatisch von einem Schritt zum nächsten. Digitalisierung schafft Transparenz, Nachvollziehbarkeit und die Möglichkeit, auf verlässliche Daten zurückzugreifen — jederzeit und von überall.</p>
<p>Automatisierung ist die nächste Stufe nach der Digitalisierung. Wenn Prozesse nicht nur digital dokumentiert, sondern von Systemen selbstständig ausgeführt werden, spricht man von Automatisierung. Statt einer Person, die täglich eine Aufgabe manuell erledigt, erledigt ein System diese Aufgabe automatisch — zuverlässiger, schneller und ohne menschliche Fehlerquellen. Automatisierung schafft Kapazitäten, die für anspruchsvollere Tätigkeiten genutzt werden können.</p>
<p>Die bewerteten ${moduleCount} Module decken die wichtigsten operativen Bereiche eines Unternehmens ab: Prozesse, Vertrieb, Führung, Automatisierung, Unternehmensstruktur, Kommunikation und Personal. Diese Auswahl wurde gewählt, weil sie gemeinsam die Bereiche abbilden, in denen Digitalisierung den größten Einfluss auf Effizienz, Skalierbarkeit und Wettbewerbsfähigkeit hat. Jedes Modul wird anhand mehrerer Kriterien bewertet und ergibt einen Score von 0 bis 100 Punkten.</p>
<p>Dieser Bericht ist wie folgt aufgebaut: Nach diesem einleitenden Abschnitt folgt die Gesamtauswertung mit allen Modul-Scores auf einen Blick. Danach folgt eine ausführliche Score-Analyse des aktuellen Standes, anschließend eine Detailseite pro Modul mit Erläuterung der Score-Zusammensetzung, und abschließend das Fazit. Jede Seite enthält konkrete Informationen zum Ist-Zustand.</p>
<p>Beim Lesen dieses Berichts ist zu beachten, dass niedrige Scores keine fachliche Schwäche bedeuten, sondern den Grad der strukturellen und digitalen Absicherung der vorhandenen Arbeit widerspiegeln. Bereiche mit besonders niedrigen Scores sind jene, in denen Digitalisierung den größten Hebeleffekt entfalten kann. Die Ergebnisse werden im Strategiegespräch mit OKUN Systems gemeinsam eingeordnet und in konkrete nächste Schritte übersetzt.</p>`;
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

// ── Score analysis ───────────────────────────────────────────────────────────
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
    ? `\n\nUnternehmenskontext und Unternehmensziele:\n${formatContextForPrompt(data)}`
    : "";

  const prompt = `Du bist Senior-Berater bei OKUN Systems. Schreibe eine tiefgehende Analyse des AKTUELLEN Digitalisierungsstandes von ${data.company.name}.

NUR IST-ZUSTAND — keine Empfehlungen, keine Maßnahmen, keine nächsten Schritte. Keine englischen Begriffe.

Gesamtscore: ${avgScore}/100 (${label})
Stärkste Bereiche: ${best}
Größter Nachholbedarf: ${worst}
Beantwortete Fragen: ${data.totalAnswered} von ${data.totalActive}

Ergebnisse je Modul:
${moduleList}${contextHint}

Schreibe genau 7 Absätze als Fließtext. Kein Markdown, keine Aufzählungen, keine Überschriften.
Direkte Ansprache ("Sie", "Ihr Unternehmen"). Sachlich. Keine englischen Begriffe.
Jeder Absatz mindestens 4–5 vollständige Sätze. Die Analyse muss eine vollständige Seite füllen.

Absatz 1: Was bedeutet der Gesamtscore von ${avgScore}/100 konkret für ${data.company.name}? Was charakterisiert die Stufe "${label}" — wie sieht ein Unternehmen auf diesem Niveau typischerweise aus, was hat es bereits, was fehlt noch strukturell?

Absatz 2: Wie setzt sich der Gesamtscore aus den ${data.moduleScores.length} Modulen zusammen? Gibt es eine gleichmäßige Verteilung oder große Unterschiede zwischen Modulen? Was sagt das über die Entwicklung des Unternehmens aus?

Absatz 3: Was zeigen die Stärkebereiche (${best}) konkret? Was funktioniert gut, wie zeigt sich das im Tagesgeschäft, welche strukturellen Grundlagen sind bereits vorhanden?

Absatz 4: Was zeigen die Nachholbereiche (${worst}) konkret? Wie äußert sich der aktuelle Stand im Arbeitsalltag — welche Reibungspunkte, welcher Mehraufwand, welche Risiken entstehen daraus täglich?

Absatz 5: ${data.companyContext ? `Wie passt der Score-Profil konkret zu den Zielen und der Situation von ${data.company.name}? Was bedeutet der aktuelle Stand von ${avgScore}/100 im Hinblick auf das, was das Unternehmen erreichen möchte — was unterstützt diese Ziele bereits, was steht noch im Weg?` : `Welches Stadium der digitalen Entwicklung befindet sich ${data.company.name} heute? Was kennzeichnet dieses Stadium typischerweise und welche typischen Engpässe entstehen daraus?`}

Absatz 6: Welches Stadium der digitalen Reife kennzeichnet ${data.company.name} insgesamt? Wie zeigt sich dieses Stadium im täglichen Betrieb — in der Art, wie Informationen fließen, wie Entscheidungen getroffen werden, wie Prozesse koordiniert werden?

Absatz 7: Wie verhält sich der Score von ${avgScore}/100 im Branchenkontext${data.company.industry ? ` (${data.company.industry})` : ""}? Welche typischen Merkmale eines Unternehmens mit diesem Score-Profil treffen auf ${data.company.name} zu, und was sagt das über den aktuellen Wettbewerbsstand aus?

Schreibe jetzt alle 7 Absätze:`;

  try {
    const raw = await callClaude(prompt, 3000);
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
  const scoreAnalysis = await generateScoreAnalysis(data, avgScore);

  // Module texts split into 2 sequential calls for reliability
  const { moduleInsights, moduleDetailedAnalysis } = await generateModuleInsightsAndDetailed(data, avgScore);
  const moduleScoreComposition = await generateModuleScoreComposition(data);

  const finalSections = await generateFinalSections(data, avgScore);

  return {
    einleitungText,
    executiveSummary: finalSections.executiveSummary,
    contextPageText,
    scoreAnalysis,
    moduleInsights,
    moduleDetailedAnalysis,
    moduleScoreComposition,
    conclusionText: finalSections.conclusionText,
    orientationText: finalSections.orientationText,
  };
}
