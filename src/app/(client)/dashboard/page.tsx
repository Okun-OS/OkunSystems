import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireBlueprintComplete } from "@/lib/require-blueprint";
import {
  CheckCircle2,
  ChevronRight,
  Bell,
  HelpCircle,
  Mail,
  Phone,
  CalendarDays,
  Play,
  BarChart3,
  FolderOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const TOTAL_QUESTIONS = 21;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      company: {
        include: {
          projects: { orderBy: { updatedAt: "desc" }, take: 1 },
          appointments: {
            where: { startTime: { gte: new Date() } },
            orderBy: { startTime: "asc" },
            take: 3,
          },
          assessments: { orderBy: { updatedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const company = user.company;

  // Gate: require completed Blueprint before showing dashboard
  if (company?.id) await requireBlueprintComplete(company.id);

  const project = company?.projects[0];
  const nextAppointment = company?.appointments[0];
  const assessment = company?.assessments[0];

  const openTasks = await db.task.count({
    where: {
      project: { companyId: company?.id ?? "" },
      status: { not: "DONE" },
      isInternal: false,
    },
  });

  const analysisSession = company?.id
    ? await db.analysisSession.findFirst({
        where: { companyId: company.id },
        include: { score: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  let completedAreasCount = 0;
  try {
    const arr = JSON.parse(analysisSession?.completedAreas ?? "[]");
    completedAreasCount = Array.isArray(arr) ? arr.length : 0;
  } catch {}

  const analysisProgress =
    analysisSession?.status === "COMPLETED"
      ? 100
      : analysisSession
      ? Math.min(
          95,
          Math.round(
            ((analysisSession.questionsAsked ?? 0) / TOTAL_QUESTIONS) * 100
          )
        )
      : 0;

  const blueprintStatus =
    !analysisSession ? "PENDING"
    : analysisSession.status === "COMPLETED" ? "DONE"
    : "IN_PROGRESS";

  const auswertungStatus =
    analysisSession?.score ? "IN_PROGRESS"
    : "PENDING";

  const processSteps = [
    { id: 1, label: "Onboarding",                status: "DONE" },
    { id: 2, label: "OKUN Blueprint™",            status: blueprintStatus },
    { id: 3, label: "Analyse & Auswertung",       status: auswertungStatus },
    { id: 4, label: "Strategiegespräch",          status: "PENDING" },
    { id: 5, label: "Umsetzung",                  status: "PENDING" },
    { id: 6, label: "Betreuung & Optimierung",    status: "PENDING" },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">
            Willkommen, {user.name?.split(" ")[0]}!
          </h1>
          <p className="text-[#888] text-sm mt-1">
            {company?.name ?? "Schön, dass es losgeht."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:border-[#3a3a3a] transition-colors">
            <Bell size={16} />
          </button>
          <button className="w-9 h-9 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:border-[#3a3a3a] transition-colors">
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* LEFT: Video + Stats */}
        <div className="col-span-12 lg:col-span-5 space-y-5">
          {/* Welcome Video */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="relative aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#141414]/60" />
              <div className="relative z-10 text-center">
                <button className="w-14 h-14 rounded-full bg-[#22c55e] hover:bg-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22c55e]/20 transition-colors mb-3">
                  <Play size={22} className="text-black ml-0.5" fill="currentColor" />
                </button>
                <p className="text-[#f0f0f0] font-semibold text-sm">Willkommensvideo</p>
                <p className="text-[#888] text-xs mt-0.5">von Felix Okun</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-4">Übersicht</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Analysis Progress */}
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#888] text-xs">Analysefortschritt</span>
                  <BarChart3 size={14} className="text-[#22c55e]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e1e" strokeWidth="2.5" />
                      <circle
                        cx="18" cy="18" r="15.9" fill="none"
                        stroke="#22c55e" strokeWidth="2.5"
                        strokeDasharray={`${analysisProgress} ${100 - analysisProgress}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[#f0f0f0] text-xs font-bold">
                      {analysisProgress}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[#f0f0f0] text-sm font-medium">
                      {analysisSession?.status === "COMPLETED" ? "Abgeschlossen" :
                       analysisSession ? "In Bearbeitung" : "Ausstehend"}
                    </p>
                    <Link href={analysisSession?.status === "COMPLETED" ? "/analyse/ergebnis" : "/analyse"} className="text-[#22c55e] text-xs mt-1 block">
                      {analysisSession?.status === "COMPLETED" ? "Ergebnisse →" : "Zur Analyse →"}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Project Status */}
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#888] text-xs">Projektstatus</span>
                  <FolderOpen size={14} className="text-[#22c55e]" />
                </div>
                <p className="text-[#888] text-xs mb-1">Aktueller Status</p>
                <p className="text-[#f0f0f0] text-sm font-semibold">
                  {project
                    ? project.status === "ACTIVE" ? "Analyse läuft"
                    : project.status === "PLANNING" ? "In Planung"
                    : project.status === "COMPLETED" ? "Abgeschlossen"
                    : project.phase ?? "Aktiv"
                    : "Kein Projekt"}
                </p>
                <button className="text-[#22c55e] text-xs mt-2">Details anzeigen →</button>
              </div>

              {/* Open Tasks */}
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#888] text-xs">Offene Aufgaben</span>
                  <AlertCircle size={14} className="text-[#22c55e]" />
                </div>
                <p className="text-[#f0f0f0] text-3xl font-bold">{openTasks}</p>
                <p className="text-[#888] text-xs mt-1">Aufgaben offen</p>
                <button className="text-[#22c55e] text-xs mt-1">Anzeigen →</button>
              </div>

              {/* Last Update */}
              <div className="bg-[#0d0d0d] rounded-lg p-4 border border-[#1e1e1e]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#888] text-xs">Letzte Aktualisierung</span>
                  <RefreshCw size={14} className="text-[#22c55e]" />
                </div>
                <p className="text-[#f0f0f0] text-sm font-medium">
                  {project ? formatDateTime(project.updatedAt) : "Heute, 09:15 Uhr"}
                </p>
                <button className="text-[#22c55e] text-xs mt-2">Verlauf anzeigen →</button>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER: Process Steps */}
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-5">Ihr aktueller Fortschritt</h3>
            <div className="space-y-1">
              {processSteps.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3 py-3 relative">
                  {i < processSteps.length - 1 && (
                    <div className="absolute left-[11px] top-[calc(50%+12px)] w-0.5 h-[calc(100%-4px)] bg-[#2a2a2a]" />
                  )}
                  <div className="relative z-10 flex-shrink-0">
                    {step.status === "DONE" ? (
                      <CheckCircle2 size={22} className="text-[#22c55e]" />
                    ) : step.status === "IN_PROGRESS" ? (
                      <div className="w-[22px] h-[22px] rounded-full border-2 border-[#22c55e] flex items-center justify-center">
                        <span className="text-[#22c55e] text-xs font-bold">{step.id}</span>
                      </div>
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full border border-[#3a3a3a] flex items-center justify-center">
                        <span className="text-[#555] text-xs">{step.id}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      step.status === "DONE" ? "text-[#888]" :
                      step.status === "IN_PROGRESS" ? "text-[#f0f0f0]" :
                      "text-[#555]"
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${
                    step.status === "DONE" ? "text-[#22c55e]" :
                    step.status === "IN_PROGRESS" ? "text-[#f0f0f0]" :
                    "text-[#444]"
                  }`}>
                    {step.status === "DONE" ? "Abgeschlossen ✓" :
                     step.status === "IN_PROGRESS" ? "In Bearbeitung" :
                     "Noch nicht begonnen"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Next Step + Contact + AI Chat */}
        <div className="col-span-12 lg:col-span-3 space-y-5">
          {/* Next Step */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-3">Nächster Schritt</h3>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BarChart3 size={16} className="text-[#22c55e]" />
              </div>
              <div>
                <p className="text-[#f0f0f0] text-sm font-medium">
                  {analysisSession?.status === "COMPLETED"
                    ? "Ihre Ergebnisse sind bereit"
                    : analysisSession
                    ? "OKUN Blueprint™ fortsetzen"
                    : "OKUN Blueprint™ starten"}
                </p>
                <p className="text-[#888] text-xs mt-0.5">
                  {analysisSession?.status === "COMPLETED"
                    ? "Sehen Sie Ihren OKUN Score und Optimierungspotenziale."
                    : analysisSession
                    ? "Ihre Analyse ist noch nicht abgeschlossen."
                    : "Starten Sie jetzt die strukturierte Unternehmensanalyse."}
                </p>
              </div>
            </div>
            <Link
              href={analysisSession?.status === "COMPLETED" ? "/analyse/ergebnis" : "/analyse"}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
            >
              {analysisSession?.status === "COMPLETED"
                ? "Ergebnisse ansehen"
                : analysisSession
                ? "Analyse fortsetzen"
                : "Analyse starten"}
              <ChevronRight size={15} />
            </Link>
          </div>

          {/* Contact */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-3">Ihr Ansprechpartner</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22c55e]/30 to-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[#22c55e] text-sm font-bold">FO</span>
              </div>
              <div>
                <p className="text-[#f0f0f0] text-sm font-medium">Felix Okun</p>
                <p className="text-[#888] text-xs">Geschäftsführer</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@okun-systems.de"}`}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg py-2 transition-colors"
              >
                <Mail size={13} />
                E-Mail
              </a>
              <a
                href={`tel:${process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+4900000000000"}`}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg py-2 transition-colors"
              >
                <Phone size={13} />
                Anrufen
              </a>
            </div>
          </div>

          {/* Appointment */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-3">Termin vereinbaren</h3>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                <CalendarDays size={16} className="text-[#888]" />
              </div>
              <p className="text-[#888] text-xs leading-relaxed">
                Buchen Sie hier Ihren Wunschtermin für das Strategiegespräch.
              </p>
            </div>
            <Link
              href="/termine"
              className="w-full block text-center bg-[#1a1a1a] hover:bg-[#22c55e]/10 border border-[#2a2a2a] hover:border-[#22c55e]/40 text-[#f0f0f0] font-medium text-sm rounded-lg py-2.5 transition-colors"
            >
              Termin buchen
            </Link>
          </div>
        </div>
      </div>

      {/* Blueprint Status */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 lg:col-start-9">
          <BlueprintStatusCard session={analysisSession} progress={analysisProgress} />
        </div>
      </div>
    </div>
  );
}

type SessionWithScore = {
  status: string;
  questionsAsked: number;
  totalMessages: number;
  lastActiveAt: Date | null;
  completedAt: Date | null;
  score: { totalScore: number; maturityLabel: string } | null;
} | null;

function BlueprintStatusCard({
  session,
  progress,
}: {
  session: SessionWithScore;
  progress: number;
}) {
  if (!session) {
    return (
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#22c55e] text-xs font-bold">OA</span>
          </div>
          <div>
            <p className="text-[#f0f0f0] text-sm font-medium">OKUN Blueprint™</p>
            <p className="text-[#888] text-xs">Noch nicht gestartet</p>
          </div>
        </div>
        <p className="text-[#888] text-xs leading-relaxed mb-5">
          Starten Sie jetzt Ihre strukturierte Unternehmensanalyse. Die KI führt Sie in ca.&nbsp;30&nbsp;Minuten durch alle wichtigen Bereiche Ihres Unternehmens.
        </p>
        <Link
          href="/analyse"
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          Blueprint starten
          <ChevronRight size={15} />
        </Link>
      </div>
    );
  }

  if (session.status === "COMPLETED" && session.score) {
    return (
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#22c55e] text-xs font-bold">OA</span>
          </div>
          <div>
            <p className="text-[#f0f0f0] text-sm font-medium">OKUN Blueprint™</p>
            <p className="text-[#22c55e] text-xs">Analyse abgeschlossen ✓</p>
          </div>
        </div>
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#888] text-xs mb-1">OKUN Score</p>
              <p className="text-[#f0f0f0] text-2xl font-bold">{session.score.totalScore}</p>
              <p className="text-[#888] text-xs mt-0.5">{session.score.maturityLabel}</p>
            </div>
            <div className="relative w-14 h-14 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e1e1e" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#22c55e" strokeWidth="2.5"
                  strokeDasharray={`${session.score.totalScore} ${100 - session.score.totalScore}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[#f0f0f0] text-xs font-bold">
                {session.score.totalScore}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/analyse/ergebnis"
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
        >
          Ergebnisse ansehen
          <ChevronRight size={15} />
        </Link>
      </div>
    );
  }

  // In progress
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[#22c55e] text-xs font-bold">OA</span>
        </div>
        <div>
          <p className="text-[#f0f0f0] text-sm font-medium">OKUN Blueprint™</p>
          <p className="text-[#888] text-xs">Analyse läuft</p>
        </div>
        <span className="ml-auto text-[#22c55e] text-xs font-semibold">{progress}%</span>
      </div>
      <div className="mb-4">
        <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[#555] text-xs">
          {session.questionsAsked} von {18} Fragen beantwortet
          {session.lastActiveAt && (
            <> · Zuletzt aktiv {new Date(session.lastActiveAt).toLocaleDateString("de-DE")}</>
          )}
        </p>
      </div>
      <Link
        href="/analyse"
        className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
      >
        Analyse fortsetzen
        <ChevronRight size={15} />
      </Link>
    </div>
  );
}
