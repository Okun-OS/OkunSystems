import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { companyId } = await req.json();
  if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });

  const company = await db.company.findUnique({
    where: { id: companyId },
    include: {
      analysisSessions: {
        include: {
          processes: { orderBy: { maturityScore: "asc" }, take: 10 },
          problems: { orderBy: { confidence: "desc" }, take: 10 },
          opportunities: { orderBy: { priority: "asc" }, take: 10 },
          score: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const analysis = company.analysisSessions[0];
  if (!analysis?.score) {
    return NextResponse.json({ error: "No score available. Complete analysis first." }, { status: 400 });
  }

  const score = analysis.score;
  const topProcesses = analysis.processes.slice(0, 5);
  const topProblems = analysis.problems.slice(0, 5);
  const topOpps = analysis.opportunities.slice(0, 5);

  const prompt = `Du bist OKUN Systems Strategie-Experte. Bereite eine vollständige Strategy Session für folgendes Unternehmen vor.

**Unternehmen:** ${company.name} | **Branche:** ${company.industry ?? "KMU"}
**OKUN Score™:** ${score.totalScore}/100 – ${score.maturityLabel}

**Subscores:**
- Prozesse: ${score.scoreProcesses}/100 (Gewichtung 25%)
- Vertrieb: ${score.scoreSales}/100 (Gewichtung 20%)
- Führung/Geschäftsführung: ${score.scoreLeadership}/100 (Gewichtung 15%)
- Automatisierung: ${score.scoreAutomation}/100 (Gewichtung 15%)
- Struktur: ${score.scoreStructure}/100 (Gewichtung 10%)
- Kommunikation: ${score.scoreCommunication}/100 (Gewichtung 10%)
- Personal: ${score.scoreHr}/100 (Gewichtung 5%)

**Top Prozesse (nach Reife aufsteigend):**
${topProcesses.map((p) => `- ${p.name} (${p.category}): Reife ${p.maturityScore ?? "—"}/100 | Trigger: ${p.trigger ?? "—"}`).join("\n")}

**Erkannte Root Causes:**
${topProblems.map((p) => `- ${p.operativeProblem} [${p.severity}] Confidence: ${p.confidence}%\n  Root Cause: ${p.rootCause ?? "—"}`).join("\n")}

**Top Opportunities:**
${topOpps.map((o) => `- ${o.title} [${o.type}] Impact: ${o.impact}\n  ${o.description}`).join("\n")}

Erstelle folgende Strategy Session Unterlagen (alle auf Deutsch, professionell und KLAR strukturiert):

## 1. MANAGEMENT SUMMARY (Kundenversion)
2-3 Sätze die der Kunde versteht. Keine Fachbegriffe. Zeigt Verständnis des Unternehmens.

## 2. ERÖFFNUNGSFORMULIERUNG (Minute 1-5)
Exakter Gesprächseinstieg. Was sagt Felix Okun zu Beginn der Session.

## 3. TOP 3 PROZESS-ENGPÄSSE (für Präsentation)
Für jeden Prozess: Ist-Ablauf, Engpass, Business-Auswirkung, Hebel. Max. 3 Prozesse.

## 4. ROOT CAUSE ERKLÄRUNGEN (kundenverständlich)
Symptom → Root Cause → Business-Auswirkung. Ohne Fachwörter.

## 5. TOP 3 OPPORTUNITIES (mit Business-Wert)
Titel, Beschreibung, geschätzter Nutzen (Zeit/Geld/Risiko), Umsetzbarkeit.

## 6. ROADMAP (4 Phasen)
Sofort / Kurzfristig / Mittelfristig / Langfristig mit konkreten Inhalten.

## 7. ANGEBOTSEMPFEHLUNG (intern)
Empfehlung: 7.500€ oder 15.000€ oder Retainer. Mit Begründung aus der Analyse.

## 8. EINWAND-VORBEREITUNG
Die 3 wahrscheinlichsten Einwände dieses Kunden mit konkreten Antwortformulierungen.

## 9. BAFA-DOKUMENTATION
Datum, Analysegrundlage, besprochene Prozesse, empfohlene Maßnahmen, nächste Schritte (Template-Format).

## 10. NÄCHSTE SCHRITTE
Konkrete Vereinbarungen nach der Session.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    // Save to score internal summary
    await db.okunScore.update({
      where: { id: score.id },
      data: { internalSummary: content },
    });

    return NextResponse.json({ prep: content });
  } catch (err) {
    console.error("Strategy prep error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
