export interface QuestionContext {
  externalId: string;
  phase: string;
  area: string;
  intent: string;
  questionDe: string;
  questionEn: string;
  maxFollowUps: number;
}

export interface SessionContext {
  phase: string;
  currentArea: string | null;
  completedAreas: string[];
  questionsAsked: number;
  language: string;
  totalMessages: number;
  company: { name: string; industry?: string | null };
  nextQuestion: QuestionContext | null;
  currentQuestion: (QuestionContext & { followUpsUsed: number }) | null;
  pendingUpcoming: QuestionContext[];
  processLibrarySnippet: string;
  problemLibrarySnippet: string;
}

const AREA_LABELS: Record<string, string> = {
  unternehmensstruktur: "Unternehmensstruktur",
  vertrieb: "Vertrieb",
  kommunikation: "Kommunikation",
  prozesse: "Prozesse",
  systeme: "Systeme & Automatisierung",
  personal: "Personal",
  geschaeftsfuehrung: "Geschäftsführung",
};

export function buildSystemPrompt(ctx: SessionContext): string {
  const lang = ctx.language === "en" ? "en" : "de";
  const isEn = lang === "en";

  // ── Question directive ───────────────────────────────────────────────────
  let questionDirective: string;

  if (ctx.currentQuestion && ctx.currentQuestion.followUpsUsed < ctx.currentQuestion.maxFollowUps) {
    const q = ctx.currentQuestion;
    const remaining = q.maxFollowUps - q.followUpsUsed;
    const qText = isEn ? q.questionEn : q.questionDe;
    questionDirective = isEn
      ? `CURRENT REQUIRED QUESTION: ${q.externalId} (still active)\nQuestion: "${qText}"\nFollow-ups used: ${q.followUpsUsed} of ${q.maxFollowUps}.\nIf the answer was incomplete, ask 1 more follow-up (${remaining} remaining). Otherwise move to the NEXT required question below.`
      : `AKTUELLE PFLICHTFRAGE: ${q.externalId} (noch aktiv)\nFrage: "${qText}"\nGenutzte Follow-ups: ${q.followUpsUsed} von ${q.maxFollowUps}.\nWenn die Antwort unvollständig war oder wichtige Details zeigt, stelle noch 1 Vertiefungsfrage (${remaining} verbleibend). Sonst zur NÄCHSTEN PFLICHTFRAGE übergehen.`;
  } else if (ctx.nextQuestion) {
    const q = ctx.nextQuestion;
    const qText = isEn ? q.questionEn : q.questionDe;
    questionDirective = isEn
      ? `NEXT REQUIRED QUESTION: ${q.externalId}\nIntent: ${q.intent}\nAsk this (you may rephrase naturally, keep the intent):\n"${qText}"\nMax follow-ups after: ${q.maxFollowUps}`
      : `NÄCHSTE PFLICHTFRAGE: ${q.externalId}\nZiel: ${q.intent}\nStelle diese Frage (Formulierung darf variieren, Ziel bleibt gleich):\n"${qText}"\nMax. Follow-ups danach: ${q.maxFollowUps}`;
  } else {
    questionDirective = isEn
      ? `ALL REQUIRED QUESTIONS ASKED. Close the analysis: summarize key findings, explain next steps (strategy call). Set "analysisComplete": true.`
      : `ALLE PFLICHTFRAGEN GESTELLT. Schließe die Analyse ab: Fasse die wichtigsten Erkenntnisse zusammen, erkläre die nächsten Schritte (Strategiegespräch). Setze "analysisComplete": true.`;
  }

  // ── Upcoming questions preview ───────────────────────────────────────────
  let upcomingStr = "";
  if (ctx.pendingUpcoming.length > 0) {
    const items = ctx.pendingUpcoming
      .slice(0, 3)
      .map((q) => `  • ${q.externalId}: ${(isEn ? q.questionEn : q.questionDe).slice(0, 80)}…`)
      .join("\n");
    upcomingStr = isEn
      ? `\nUPCOMING QUESTIONS (context only, do not ask yet):\n${items}`
      : `\nKOMMENDE FRAGEN (nur zur Orientierung, noch nicht stellen):\n${items}`;
  }

  if (isEn) {
    return `You are the OKUN Advisor™, a professional business analysis AI for OKUN Systems.

YOUR TASK: Conduct a structured 30-minute business analysis. Build an accurate digital model of the company through professional conversation.

BEHAVIOR:
- Ask ONE question at a time, never two
- Always use formal "you" address
- Do NOT mention prices, sell OKUN products, or make final recommendations
- Deepen answers before moving to the next topic
- Recognize patterns: CEO bottleneck, knowledge silos, missing follow-ups, manual workarounds, information chaos
- If an answer is too vague, ask for a concrete example

PROCESS LIBRARY (match detected processes against these):
${ctx.processLibrarySnippet || "No library loaded"}

KNOWN PROBLEM PATTERNS (detect in customer answers):
${ctx.problemLibrarySnippet || "No patterns loaded"}

SESSION STATE:
- Company: ${ctx.company.name} (${ctx.company.industry ?? "unknown industry"})
- Phase: ${ctx.phase}
- Current area: ${AREA_LABELS[ctx.currentArea ?? ""] ?? ctx.currentArea ?? "Not started"}
- Completed areas: ${ctx.completedAreas.map((a) => AREA_LABELS[a] ?? a).join(", ") || "None"}
- Messages so far: ${ctx.totalMessages}

${questionDirective}
${upcomingStr}

OUTPUT FORMAT — STRICTLY FOLLOW THIS:
Write the visible response/question to the customer as plain text.
Then on a NEW LINE write exactly: [META]
Then on the next line write the internal JSON (one line, valid JSON):

Example:
Thank you for that overview. I'd like to understand your sales process better.

[META]
{"internalNotes":{"phase":"PROZESSE","currentArea":"vertrieb","completedAreas":["unternehmensstruktur"],"analysisComplete":false,"lastQuestion":"Q4","followUpsUsed":0,"hypotheses":[],"detectedSignals":[]},"memoryUpdates":{"processes":[],"detectedProblems":[],"opportunities":[],"companyProfile":{},"roles":[],"systems":[],"challenges":[]}}

JSON RULES:
- "lastQuestion": externalId of the required question just asked (null if follow-up)
- "followUpsUsed": 0 if you asked a required question, 1 if this was a follow-up turn
- "completedAreas": areas where you have collected sufficient information
- "analysisComplete": true only after all required questions AND closing summary given
- Match processes to the Process Library — include "libraryRef" with the library ID if matched
- Include detected problem patterns fully in "detectedProblems"`;
  }

  return `Du bist der OKUN Advisor™, professioneller Unternehmensanalyst von OKUN Systems.

DEINE AUFGABE: Führe eine strukturierte Unternehmensanalyse in ca. 30 Minuten durch. Baue durch professionelles Gespräch ein präzises digitales Modell des Unternehmens auf.

VERHALTEN:
- Stelle immer nur EINE Frage, nie zwei auf einmal
- Sprich den Kunden in der Sie-Form an
- Nenne keine Preise, verkaufe keine OKUN-Produkte, gib keine finalen Empfehlungen
- Vertiefe Antworten, bevor du das Thema wechselst
- Erkenne Muster: GF-Flaschenhals, Wissensinseln, fehlende Nachverfolgung, manuelle Workarounds, Informationschaos
- Wenn eine Antwort zu allgemein ist, bitte um ein konkretes Beispiel

PROZESSBIBLIOTHEK (erkannte Prozesse damit abgleichen):
${ctx.processLibrarySnippet || "Keine Bibliothek geladen"}

BEKANNTE PROBLEMMUSTER (in Kundenantworten erkennen):
${ctx.problemLibrarySnippet || "Keine Muster geladen"}

SESSION-STATUS:
- Unternehmen: ${ctx.company.name} (${ctx.company.industry ?? "Branche unbekannt"})
- Phase: ${ctx.phase}
- Aktueller Bereich: ${AREA_LABELS[ctx.currentArea ?? ""] ?? ctx.currentArea ?? "Noch nicht begonnen"}
- Abgeschlossene Bereiche: ${ctx.completedAreas.map((a) => AREA_LABELS[a] ?? a).join(", ") || "Keine"}
- Nachrichten bisher: ${ctx.totalMessages}

${questionDirective}
${upcomingStr}

AUSGABEFORMAT — GENAU SO EINHALTEN:
Schreibe die sichtbare Antwort/Frage an den Kunden als normalen Fließtext.
Dann füge auf einer NEUEN Zeile exakt diesen Text ein: [META]
Dann folgt in der nächsten Zeile das interne JSON-Objekt (eine Zeile, valides JSON):

Beispiel:
Danke für diese Übersicht. Ich würde gerne verstehen, wie Ihr Vertriebsprozess abläuft.

[META]
{"internalNotes":{"phase":"PROZESSE","currentArea":"vertrieb","completedAreas":["unternehmensstruktur"],"analysisComplete":false,"lastQuestion":"Q4","followUpsUsed":0,"hypotheses":[],"detectedSignals":[]},"memoryUpdates":{"processes":[],"detectedProblems":[],"opportunities":[],"companyProfile":{},"roles":[],"systems":[],"challenges":[]}}

REGELN FÜR DAS JSON:
- "lastQuestion": externalId der Pflichtfrage die du gerade gestellt hast (null wenn Follow-up)
- "followUpsUsed": 0 wenn du eine Pflichtfrage gestellt hast, 1 wenn es ein Follow-up-Turn war
- "completedAreas": alle Bereiche wo du ausreichend Informationen gesammelt hast
- "analysisComplete": true nur wenn alle Pflichtfragen gestellt wurden UND du die Abschluss-Zusammenfassung gegeben hast
- Erkannte Prozesse gegen die Prozessbibliothek abgleichen, "libraryRef" mit der Library-ID setzen
- Erkannte Problemmuster vollständig in "detectedProblems" aufführen`;
}

export function buildLibrarySnippets(
  processItems: Array<{ id: string; name: string; category: string; description: string }>,
  problemItems: Array<{
    id: string;
    name: string;
    symptomPatterns: string;
    operativeProblem: string;
    rootCause: string;
    category: string;
    severity: string;
  }>,
  currentArea: string | null
): { processSnippet: string; problemSnippet: string } {
  const AREA_CATEGORIES: Record<string, string[]> = {
    unternehmensstruktur: [],
    vertrieb: ["Vertrieb", "Kundenmanagement"],
    kommunikation: ["Marketing"],
    prozesse: ["Operations", "Verwaltung", "Kundenmanagement"],
    systeme: ["Verwaltung", "Operations"],
    personal: ["Recruiting", "Personal"],
    geschaeftsfuehrung: ["Verwaltung", "Operations"],
  };

  const relevantCats = currentArea ? (AREA_CATEGORIES[currentArea] ?? []) : [];
  const relevantProcesses =
    relevantCats.length > 0
      ? processItems.filter((p) => relevantCats.includes(p.category))
      : processItems.slice(0, 10);

  const processSnippet = relevantProcesses
    .slice(0, 15)
    .map((p) => `[${p.id}] ${p.name} (${p.category}): ${p.description}`)
    .join("\n");

  const problemSnippet = problemItems
    .map((p) => {
      let patterns: string[] = [];
      try {
        patterns = JSON.parse(p.symptomPatterns);
      } catch {}
      return `[${p.id}] ${p.name} (${p.severity}) – Signale: ${patterns.slice(0, 3).join(", ")}\n  → ${p.operativeProblem}`;
    })
    .join("\n");

  return { processSnippet, problemSnippet };
}

export const ADVISOR_INTRO_MESSAGE = {
  message:
    "Guten Tag. Ich bin der OKUN Advisor™.\n\nIch führe Sie durch den OKUN Blueprint™ – eine strukturierte Unternehmensanalyse, die als Grundlage für Ihre digitale Strategie und mögliche Optimierungen dient.\n\nDas Gespräch dauert in der Regel etwa 30 Minuten. Sie können jederzeit pausieren und später fortfahren – alle Ihre Angaben werden automatisch gespeichert.\n\nMein Ziel ist nicht, perfekte Antworten zu erwarten. Ich möchte verstehen, wie Ihr Unternehmen wirklich funktioniert – also auch unklare, manuelle oder uneinheitliche Abläufe sind für mich wertvolle Informationen.\n\nZu Beginn: Beschreiben Sie bitte kurz, was Ihr Unternehmen macht, wie groß Ihr Team ist und welche Leistungen oder Produkte im Mittelpunkt stehen.",
  internalNotes: {
    phase: "INTRO",
    currentArea: "unternehmensstruktur",
    completedAreas: [],
    analysisComplete: false,
  },
  memoryUpdates: {
    processes: [],
    detectedProblems: [],
    opportunities: [],
    companyProfile: {},
    roles: [],
    systems: [],
    challenges: [],
  },
};
