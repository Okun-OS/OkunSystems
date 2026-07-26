import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Brain, AlertTriangle, Lightbulb, Target,
  BarChart3, ChevronRight, Layers, Eye, EyeOff, Printer, CalendarDays,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default async function KundeAnalysePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      analysisSessions: {
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          processes: true,
          problems: true,
          opportunities: true,
          score: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      appointments: {
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!company) notFound();

  const activeSession = company.analysisSessions[0];
  const score = activeSession?.score;

  const AREA_LABELS: Record<string, string> = {
    unternehmensstruktur: "Unternehmensstruktur",
    vertrieb: "Vertrieb",
    kommunikation: "Kommunikation",
    prozesse: "Prozesse",
    systeme: "Systeme & Automatisierung",
    personal: "Personal",
    geschaeftsfuehrung: "Geschäftsführung",
  };

  const PHASE_LABELS: Record<string, string> = {
    INTRO: "Einführung",
    PROFIL: "Unternehmensprofil",
    PROZESSE: "Prozessidentifikation",
    TIEFE: "Tiefenanalyse",
    VALIDIERUNG: "Validierung",
    ABSCHLUSS: "Abschluss",
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Link href={`/admin/kunden/${id}`} className="flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors">
          <ArrowLeft size={15} />
          Zurück zu {company.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0f0]">OKUN Blueprint™ Analyse</h1>
            <p className="text-[#888] text-sm mt-1">{company.name} · Interne Analyseauswertung</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg font-medium">
              Nur intern sichtbar
            </span>
            {score && (
              <Link
                href={`/admin/kunden/${id}/analyse/bericht`}
                target="_blank"
                className="flex items-center gap-2 bg-[#141414] border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg px-3 py-1.5 transition-colors"
              >
                <Printer size={13} />
                Bericht drucken
              </Link>
            )}
          </div>
        </div>
      </div>

      {!activeSession ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <Brain size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm">Noch keine Analyse gestartet.</p>
          <p className="text-[#555] text-xs mt-2">Der Kunde muss zuerst den OKUN Advisor starten.</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            {/* Session status */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Analysestatus</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Status</span>
                  <StatusBadge status={activeSession.status} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Phase</span>
                  <span className="text-[#f0f0f0]">{PHASE_LABELS[activeSession.phase] ?? activeSession.phase}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Aktueller Bereich</span>
                  <span className="text-[#f0f0f0]">{AREA_LABELS[activeSession.currentArea ?? ""] ?? activeSession.currentArea ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Nachrichten</span>
                  <span className="text-[#f0f0f0]">{activeSession.totalMessages}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Gestartet</span>
                  <span className="text-[#f0f0f0]">{formatDateTime(activeSession.startedAt)}</span>
                </div>
                {activeSession.completedAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">Abgeschlossen</span>
                    <span className="text-[#f0f0f0]">{formatDateTime(activeSession.completedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Score */}
            {score && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <BarChart3 size={14} className="text-[#22c55e]" />
                  OKUN Score™
                </h2>
                <div className="flex items-center justify-center my-4">
                  <div className="relative">
                    <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e1e" strokeWidth="8" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={score.totalScore >= 70 ? "#22c55e" : score.totalScore >= 50 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="8"
                        strokeDasharray={`${(score.totalScore / 100) * 314.16} ${314.16 - (score.totalScore / 100) * 314.16}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[#f0f0f0] text-3xl font-bold">{score.totalScore}</span>
                      <span className="text-[#888] text-xs">{score.maturityLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Prozesse", val: score.scoreProcesses, weight: "25%" },
                    { label: "Vertrieb", val: score.scoreSales, weight: "20%" },
                    { label: "Führung", val: score.scoreLeadership, weight: "15%" },
                    { label: "Automatisierung", val: score.scoreAutomation, weight: "15%" },
                    { label: "Struktur", val: score.scoreStructure, weight: "10%" },
                    { label: "Kommunikation", val: score.scoreCommunication, weight: "10%" },
                    { label: "Personal", val: score.scoreHr, weight: "5%" },
                  ].map(({ label, val, weight }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-[#888] mb-1">
                        <span>{label} <span className="text-[#555]">({weight})</span></span>
                        <span className="text-[#f0f0f0]">{val ?? "—"}</span>
                      </div>
                      {val !== null && val !== undefined && (
                        <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{
                              width: `${val}%`,
                              backgroundColor: val >= 70 ? "#22c55e" : val >= 50 ? "#f59e0b" : "#ef4444"
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-8 space-y-5">
            {/* Internal hypotheses */}
            {activeSession.hypotheses && activeSession.hypotheses !== "[]" && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <Brain size={14} className="text-purple-400" />
                  Interne Hypothesen
                  <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
                </h2>
                <div className="space-y-2">
                  {(JSON.parse(activeSession.hypotheses) as string[]).map((h, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-[#0d0d0d] rounded-lg">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                      <p className="text-[#f0f0f0] text-sm">{h}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected problems */}
            {activeSession.problems.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  Erkannte Probleme ({activeSession.problems.length})
                  <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
                </h2>
                <div className="space-y-3">
                  {activeSession.problems.map((prob) => (
                    <div key={prob.id} className="p-3 bg-[#0d0d0d] rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-[#f0f0f0] text-sm font-medium">{prob.operativeProblem}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <SeverityBadge severity={prob.severity} />
                          <span className="text-xs text-[#888] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{prob.confidence}%</span>
                        </div>
                      </div>
                      <p className="text-[#888] text-xs mb-1">Symptom: {prob.symptom}</p>
                      {prob.rootCause && (
                        <p className="text-[#555] text-xs">Root Cause: {prob.rootCause}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {activeSession.opportunities.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <Lightbulb size={14} className="text-[#22c55e]" />
                  Erkannte Potenziale ({activeSession.opportunities.length})
                  <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
                </h2>
                <div className="space-y-3">
                  {activeSession.opportunities.map((opp) => (
                    <div key={opp.id} className="p-3 bg-[#0d0d0d] rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[#f0f0f0] text-sm font-medium">{opp.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <ImpactBadge impact={opp.impact} />
                          <OppTypeBadge type={opp.type} />
                        </div>
                      </div>
                      <p className="text-[#888] text-xs">{opp.description}</p>
                      {opp.okunSystem && (
                        <p className="text-purple-400 text-xs mt-1">System: {opp.okunSystem}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processes */}
            {activeSession.processes.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <Layers size={14} className="text-blue-400" />
                  Kartierte Prozesse ({activeSession.processes.length})
                </h2>
                <div className="space-y-2">
                  {activeSession.processes.map((proc) => (
                    <div key={proc.id} className="p-3 bg-[#0d0d0d] rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[#f0f0f0] text-sm font-medium">{proc.name}</p>
                        <div className="flex items-center gap-2">
                          {proc.isNew && (
                            <span className="text-xs text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">Neu</span>
                          )}
                          {proc.maturityScore !== null && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${proc.maturityScore >= 70 ? "text-[#22c55e] bg-[#22c55e]/10" : proc.maturityScore >= 50 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10"}`}>
                              Reife: {proc.maturityScore}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[#555] text-xs">{proc.category}</p>
                      {proc.trigger && <p className="text-[#888] text-xs mt-0.5">Auslöser: {proc.trigger}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Conversation */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <Target size={14} className="text-[#888]" />
                Gesprächsverlauf ({activeSession.messages.length} Nachrichten)
              </h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {activeSession.messages.map((msg) => {
                  let internalNotes: Record<string, unknown> | null = null;
                  try { if (msg.internalNotes) internalNotes = JSON.parse(msg.internalNotes); } catch {}
                  return (
                    <div key={msg.id} className={`p-3 rounded-lg ${msg.role === "user" ? "bg-[#1a1a1a] ml-6" : "bg-[#0d0d0d]"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#555] text-xs font-medium">{msg.role === "user" ? "Kunde" : "OKUN Advisor™"}</span>
                        <span className="text-[#333] text-xs">{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-[#f0f0f0] text-sm leading-relaxed">{msg.content}</p>
                      {internalNotes && Object.keys(internalNotes).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[#555] text-xs cursor-pointer hover:text-[#888]">Interne Notizen</summary>
                          <pre className="text-[#555] text-xs mt-1 overflow-auto">{JSON.stringify(internalNotes, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gebuchte Termine */}
      {company.appointments && company.appointments.length > 0 && (
        <div className="mt-6 bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <CalendarDays size={15} className="text-[#22c55e]" />
            Gebuchte Termine
          </h2>
          <div className="space-y-3">
            {company.appointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
                <div>
                  <p className="text-[#f0f0f0] text-sm font-medium">{appt.title}</p>
                  <p className="text-[#888] text-xs mt-0.5">
                    {appt.startTime.toLocaleDateString("de-DE", {
                      weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    })}{" "}
                    · {appt.startTime.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </p>
                  {appt.bookedByName && (
                    <p className="text-[#555] text-xs mt-0.5">Gebucht von: {appt.bookedByName} ({appt.bookedByEmail})</p>
                  )}
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  appt.status === "SCHEDULED" ? "bg-blue-500/10 text-blue-400"
                  : appt.status === "COMPLETED" ? "bg-[#22c55e]/10 text-[#22c55e]"
                  : "bg-red-500/10 text-red-400"
                }`}>
                  {appt.status === "SCHEDULED" ? "Geplant"
                   : appt.status === "COMPLETED" ? "Abgeschlossen"
                   : "Abgesagt"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktiv", cls: "text-[#22c55e] bg-[#22c55e]/10" },
    PAUSED: { label: "Pausiert", cls: "text-yellow-400 bg-yellow-500/10" },
    COMPLETED: { label: "Abgeschlossen", cls: "text-blue-400 bg-blue-500/10" },
  };
  const c = map[status] ?? { label: status, cls: "text-[#888] bg-[#1a1a1a]" };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.cls}`}>{c.label}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: "text-red-400 bg-red-500/10",
    HIGH: "text-orange-400 bg-orange-500/10",
    MEDIUM: "text-yellow-400 bg-yellow-500/10",
    LOW: "text-[#888] bg-[#1a1a1a]",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded ${map[severity] ?? "text-[#888] bg-[#1a1a1a]"}`}>{severity}</span>;
}

function ImpactBadge({ impact }: { impact: string }) {
  const map: Record<string, string> = {
    VERY_HIGH: "text-[#22c55e] bg-[#22c55e]/10",
    HIGH: "text-blue-400 bg-blue-500/10",
    MEDIUM: "text-yellow-400 bg-yellow-500/10",
    LOW: "text-[#888] bg-[#1a1a1a]",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded ${map[impact] ?? "text-[#888] bg-[#1a1a1a]"}`}>{impact}</span>;
}

function OppTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    AUTOMATION: "text-purple-400 bg-purple-500/10",
    DELEGATION: "text-blue-400 bg-blue-500/10",
    STANDARDIZATION: "text-orange-400 bg-orange-500/10",
    TRANSPARENCY: "text-cyan-400 bg-cyan-500/10",
    SCALING: "text-[#22c55e] bg-[#22c55e]/10",
  };
  const labels: Record<string, string> = {
    AUTOMATION: "Automatisierung",
    DELEGATION: "Delegation",
    STANDARDIZATION: "Standardisierung",
    TRANSPARENCY: "Transparenz",
    SCALING: "Skalierung",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded ${map[type] ?? "text-[#888] bg-[#1a1a1a]"}`}>{labels[type] ?? type}</span>;
}
