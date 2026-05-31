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
        where: { status: "COMPLETED" },
        include: {
          processes: true,
          problems: true,
          opportunities: true,
          score: true,
        },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
      memory: true,
    },
  });

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!company.analysisSessions[0]) {
    return NextResponse.json({ error: "No completed analysis session" }, { status: 400 });
  }

  const analysis = company.analysisSessions[0];
  const score = analysis.score;
  const processes = analysis.processes;
  const problems = analysis.problems;
  const opportunities = analysis.opportunities;
  const memory = company.memory;

  const reportPrompt = `Du bist ein erfahrener Unternehmensberater von OKUN Systems.

Erstelle einen professionellen OKUN Blueprint™ Analysebericht für folgendes Unternehmen:

**Unternehmen:** ${company.name}
**Branche:** ${company.industry ?? "Unbekannt"}

**OKUN Score™:** ${score?.totalScore ?? "—"}/100 (${score?.maturityLabel ?? "—"})

**Analysierte Prozesse (${processes.length}):**
${processes.map((p) => `- ${p.name} (${p.category}): Reife ${p.maturityScore ?? "—"}/100`).join("\n")}

**Erkannte Probleme (${problems.length}):**
${problems.map((p) => `- ${p.operativeProblem} [${p.severity}] (Confidence: ${p.confidence}%): ${p.rootCause ?? "Root Cause unbekannt"}`).join("\n")}

**Erkannte Potenziale (${opportunities.length}):**
${opportunities.map((o) => `- ${o.title} [${o.type}] [${o.impact}]: ${o.description}`).join("\n")}

**Subscores:**
${score ? `Prozesse: ${score.scoreProcesses}, Vertrieb: ${score.scoreSales}, Führung: ${score.scoreLeadership}, Automatisierung: ${score.scoreAutomation}, Struktur: ${score.scoreStructure}, Kommunikation: ${score.scoreCommunication}, Personal: ${score.scoreHr}` : "Keine Scores"}

Erstelle einen strukturierten Analysebericht mit folgenden Abschnitten:
1. Zusammenfassung (2-3 Sätze Überblick für Kunde)
2. Unternehmensprofil und Analyseumfang
3. Erkannte Kernprozesse
4. Identifizierte Engpässe und Root Causes (intern)
5. Optimierungspotenziale
6. OKUN Score Interpretation
7. Empfohlene nächste Schritte

Schreibe professionell, sachlich und auf Deutsch. Interner Bericht für OKUN Systems (kein Kundenversand ohne Freigabe).`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 3000,
      messages: [{ role: "user", content: reportPrompt }],
    });

    const reportContent = response.content[0].type === "text" ? response.content[0].text : "";

    // Save the internal summary to the score
    if (score) {
      await db.okunScore.update({
        where: { id: score.id },
        data: { internalSummary: reportContent },
      });
    }

    return NextResponse.json({ report: reportContent });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
  }
}
