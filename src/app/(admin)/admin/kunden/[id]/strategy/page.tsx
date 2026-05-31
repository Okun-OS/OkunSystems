import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Target, FileText, BarChart3, AlertTriangle, Lightbulb, Map, DollarSign, CheckSquare } from "lucide-react";
import { formatDate } from "@/lib/utils";
import StrategyPrepClient from "./StrategyPrepClient";

export default async function StrategySessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      analysisSessions: {
        include: {
          processes: { orderBy: { maturityScore: "asc" } },
          problems: { orderBy: { confidence: "desc" } },
          opportunities: { orderBy: { priority: "asc" } },
          score: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      appointments: { where: { type: "STRATEGY" }, orderBy: { startTime: "desc" }, take: 1 },
    },
  });

  if (!company) notFound();

  const analysis = company.analysisSessions[0];
  const score = analysis?.score;
  const strategyAppt = company.appointments[0];

  const SCORE_RANGES = [
    { min: 81, max: 100, label: "Skalierungsbereit", color: "text-[#22c55e]", bg: "bg-[#22c55e]/10 border-[#22c55e]/20" },
    { min: 61, max: 80, label: "Fortgeschritten", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { min: 41, max: 60, label: "Entwicklungsfähig", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { min: 21, max: 40, label: "Instabil", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    { min: 0, max: 20, label: "Kritisch", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  ];

  const scoreRange = score
    ? SCORE_RANGES.find((r) => (score.totalScore ?? 0) >= r.min && (score.totalScore ?? 0) <= r.max) ?? SCORE_RANGES[4]
    : null;

  const strengths: string[] = score?.strengths ? JSON.parse(score.strengths) : [];
  const potentials: string[] = score?.potentials ? JSON.parse(score.potentials) : [];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href={`/admin/kunden/${id}`} className="flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors">
          <ArrowLeft size={15} />
          Zurück zu {company.name}
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0f0]">Strategy Session Vorbereitung</h1>
            <p className="text-[#888] text-sm mt-1">{company.name} · OKUN Blueprint™ Stage 10</p>
          </div>
          <div className="flex items-center gap-3">
            {strategyAppt && (
              <div className="text-right">
                <p className="text-[#555] text-xs">Nächster Termin</p>
                <p className="text-[#f0f0f0] text-sm font-medium">{formatDate(strategyAppt.startTime)}</p>
              </div>
            )}
            <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg font-medium">
              Nur intern
            </span>
          </div>
        </div>
      </div>

      {!analysis ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
          <Target size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm">Keine abgeschlossene Analyse vorhanden.</p>
          <Link href={`/admin/kunden/${id}/analyse`} className="text-[#22c55e] text-sm hover:underline mt-2 inline-block">
            Zur Blueprint™ Analyse →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-5">
          {/* Left col */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            {/* Score card */}
            {score && scoreRange && (
              <div className={`bg-[#141414] border rounded-xl p-5 ${scoreRange.bg.split(" ")[1]} border`}>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className={scoreRange.color} />
                  <h2 className="text-[#f0f0f0] font-semibold text-sm">OKUN Score™</h2>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#1e1e1e" strokeWidth="7" />
                      <circle cx="50" cy="50" r="40" fill="none"
                        stroke={score.totalScore >= 70 ? "#22c55e" : score.totalScore >= 50 ? "#f59e0b" : "#ef4444"}
                        strokeWidth="7"
                        strokeDasharray={`${(score.totalScore / 100) * 251.2} ${251.2 - (score.totalScore / 100) * 251.2}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[#f0f0f0] text-2xl font-bold">{score.totalScore}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-sm font-semibold ${scoreRange.color}`}>{scoreRange.label}</span>
                    <p className="text-[#888] text-xs mt-1 leading-relaxed">Basis für die Strategy Session Eröffnung</p>
                  </div>
                </div>
                {/* Subscores */}
                <div className="space-y-1.5">
                  {[
                    { label: "Prozesse", val: score.scoreProcesses, w: 25 },
                    { label: "Vertrieb", val: score.scoreSales, w: 20 },
                    { label: "Führung", val: score.scoreLeadership, w: 15 },
                    { label: "Automatisierung", val: score.scoreAutomation, w: 15 },
                    { label: "Struktur", val: score.scoreStructure, w: 10 },
                    { label: "Kommunikation", val: score.scoreCommunication, w: 10 },
                    { label: "Personal", val: score.scoreHr, w: 5 },
                  ].map(({ label, val, w }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-[#555]">{label} <span className="text-[#333]">{w}%</span></span>
                        <span className={val !== null && val !== undefined && val < 50 ? "text-red-400" : "text-[#888]"}>{val ?? "—"}</span>
                      </div>
                      {val !== null && val !== undefined && (
                        <div className="h-0.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: val >= 70 ? "#22c55e" : val >= 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stärken & Potenziale */}
            {score && (strengths.length > 0 || potentials.length > 0) && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Für Kundenpräsentation</h2>
                {strengths.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[#22c55e] text-xs font-medium mb-2">Stärken</p>
                    {strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] mt-1.5 flex-shrink-0" />
                        <p className="text-[#f0f0f0] text-xs">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
                {potentials.length > 0 && (
                  <div>
                    <p className="text-yellow-400 text-xs font-medium mb-2">Potenzialfelder</p>
                    {potentials.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                        <p className="text-[#f0f0f0] text-xs">{p}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Prozesse */}
            {analysis.processes.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <Map size={14} className="text-blue-400" />
                  Prozesse nach Reife
                </h2>
                <div className="space-y-2">
                  {analysis.processes.slice(0, 6).map((proc) => (
                    <div key={proc.id} className="flex items-center justify-between">
                      <div className="min-w-0 mr-2">
                        <p className="text-[#f0f0f0] text-xs truncate">{proc.name}</p>
                        <p className="text-[#555] text-xs">{proc.category}</p>
                      </div>
                      {proc.maturityScore !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${proc.maturityScore >= 70 ? "text-[#22c55e] bg-[#22c55e]/10" : proc.maturityScore >= 50 ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10"}`}>
                          {proc.maturityScore}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Root Causes */}
            {analysis.problems.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-400" />
                  Top Root Causes
                </h2>
                <div className="space-y-2">
                  {analysis.problems.slice(0, 4).map((prob) => (
                    <div key={prob.id} className="p-2 bg-[#0d0d0d] rounded-lg">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[#f0f0f0] text-xs font-medium">{prob.operativeProblem}</p>
                        <span className={`text-xs px-1 rounded ${prob.severity === "CRITICAL" || prob.severity === "HIGH" ? "text-red-400" : "text-yellow-400"}`}>{prob.confidence}%</span>
                      </div>
                      {prob.rootCause && <p className="text-[#555] text-xs">{prob.rootCause}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opportunities */}
            {analysis.opportunities.length > 0 && (
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                  <Lightbulb size={14} className="text-[#22c55e]" />
                  Top Potenziale
                </h2>
                <div className="space-y-2">
                  {analysis.opportunities.slice(0, 4).map((opp) => (
                    <div key={opp.id} className="p-2 bg-[#0d0d0d] rounded-lg">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-[#f0f0f0] text-xs font-medium">{opp.title}</p>
                        <span className={`text-xs px-1 rounded ${opp.impact === "VERY_HIGH" || opp.impact === "HIGH" ? "text-[#22c55e] bg-[#22c55e]/10" : "text-yellow-400 bg-yellow-500/10"}`}>{opp.impact}</span>
                      </div>
                      {opp.okunSystem && <p className="text-purple-400 text-xs">{opp.okunSystem}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Angebotslogik */}
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <DollarSign size={14} className="text-[#22c55e]" />
                Angebotslogik (intern)
              </h2>
              <div className="space-y-2">
                {[
                  { price: "7.500 €", desc: "Ein dominantes Kernproblem, klare Einzellösung", trigger: score && score.totalScore < 50 && analysis.problems.length <= 2 },
                  { price: "15.000 €", desc: "Mehrere zusammenhängende Prozesse/Systeme", trigger: score && score.totalScore >= 30 && analysis.problems.length > 2 },
                  { price: "Retainer", desc: "Nach Umsetzung: laufende Optimierung & Betreuung", trigger: false },
                ].map(({ price, desc, trigger }) => (
                  <div key={price} className={`p-2.5 rounded-lg border ${trigger ? "border-[#22c55e]/30 bg-[#22c55e]/5" : "border-[#2a2a2a] bg-[#0d0d0d]"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-semibold ${trigger ? "text-[#22c55e]" : "text-[#888]"}`}>{price}</span>
                      {trigger && <span className="text-xs text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded">Empfohlen</span>}
                    </div>
                    <p className="text-[#555] text-xs mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right col – KI-Vorbereitung */}
          <div className="col-span-12 lg:col-span-8">
            <StrategyPrepClient companyId={id} existingPrep={score?.internalSummary ?? null} />
          </div>
        </div>
      )}
    </div>
  );
}
