import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock,
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
  Send,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const PROCESS_STEPS = [
  { id: 1, label: "Onboarding", status: "DONE" },
  { id: 2, label: "OKUN FirstScan", status: "IN_PROGRESS" },
  { id: 3, label: "Analyse & Auswertung", status: "PENDING" },
  { id: 4, label: "Strategiegespräch", status: "PENDING" },
  { id: 5, label: "Umsetzung", status: "PENDING" },
  { id: 6, label: "Betreuung & Optimierung", status: "PENDING" },
];

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
                        strokeDasharray={`${(assessment?.score ?? 65)} ${100 - (assessment?.score ?? 65)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[#f0f0f0] text-xs font-bold">
                      {assessment?.score ?? 65}%
                    </span>
                  </div>
                  <div>
                    <p className="text-[#f0f0f0] text-sm font-medium">
                      {assessment?.status === "IN_PROGRESS" ? "In Bearbeitung" : "Ausstehend"}
                    </p>
                    <button className="text-[#22c55e] text-xs mt-1">Zur Analyse →</button>
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
              {PROCESS_STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center gap-3 py-3 relative">
                  {i < PROCESS_STEPS.length - 1 && (
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
                <p className="text-[#f0f0f0] text-sm font-medium">OKUN FirstScan</p>
                <p className="text-[#888] text-xs mt-0.5">
                  Bitte setzen Sie die OKUN FirstScan Analyse fort.
                </p>
              </div>
            </div>
            <button className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors">
              Analyse fortsetzen
              <ChevronRight size={15} />
            </button>
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
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg py-2 transition-colors">
                <Mail size={13} />
                E-Mail
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg py-2 transition-colors">
                <Phone size={13} />
                Anrufen
              </button>
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
            <button className="w-full bg-[#1a1a1a] hover:bg-[#22c55e]/10 border border-[#2a2a2a] hover:border-[#22c55e]/40 text-[#f0f0f0] font-medium text-sm rounded-lg py-2.5 transition-colors">
              Termin buchen
            </button>
          </div>
        </div>
      </div>

      {/* AI Chat (OKUN FirstScan) */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 lg:col-start-9">
          <AiChatWidget userName={user.name?.split(" ")[0] ?? "Kunde"} />
        </div>
      </div>
    </div>
  );
}

function AiChatWidget({ userName }: { userName: string }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
        <div className="w-9 h-9 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
          <span className="text-[#22c55e] text-xs font-bold">AI</span>
        </div>
        <div>
          <p className="text-[#f0f0f0] text-sm font-medium">OKUN FirstScan</p>
          <p className="text-[#22c55e] text-xs">Ihr digitaler OKUN-Berater</p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-3 max-h-[280px] overflow-y-auto">
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex-shrink-0 flex items-center justify-center">
            <span className="text-[#22c55e] text-xs">AI</span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg rounded-tl-none px-3 py-2.5 max-w-[85%]">
            <p className="text-[#f0f0f0] text-xs leading-relaxed">
              Hallo {userName}, ich bin Ihr digitaler OKUN-Berater. Ich begleite Sie durch die Analyse, um Ihr Unternehmen bestmöglich zu verstehen.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex-shrink-0 flex items-center justify-center">
            <span className="text-[#22c55e] text-xs">AI</span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg rounded-tl-none px-3 py-2.5 max-w-[85%]">
            <p className="text-[#f0f0f0] text-xs leading-relaxed">
              Erzählen Sie mir gerne kurz von Ihrem Unternehmen.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-[#22c55e]/15 border border-[#22c55e]/25 rounded-lg rounded-tr-none px-3 py-2.5 max-w-[85%]">
            <p className="text-[#f0f0f0] text-xs leading-relaxed">
              Wir sind ein ambulanter Pflegedienst mit 28 Mitarbeitern.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex-shrink-0 flex items-center justify-center">
            <span className="text-[#22c55e] text-xs">AI</span>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg rounded-tl-none px-3 py-2.5 max-w-[85%]">
            <p className="text-[#f0f0f0] text-xs leading-relaxed">
              Vielen Dank! Das ist ein guter Start. Wie organisieren Sie aktuell die Dienstplanung?
            </p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2a2a2a] flex gap-2">
        <input
          type="text"
          placeholder="Ihre Nachricht..."
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
        />
        <button className="w-9 h-9 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] flex items-center justify-center flex-shrink-0 transition-colors">
          <Send size={14} className="text-black" />
        </button>
      </div>
    </div>
  );
}
