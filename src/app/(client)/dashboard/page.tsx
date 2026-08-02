import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  ChevronRight,
  CheckCircle,
  Clock,
  Calendar,
  Play,
  Brain,
  Circle,
} from "lucide-react";

const PROJECT_PHASES = [
  { value: "onboarding",       label: "Onboarding" },
  { value: "blueprint",        label: "Blueprint" },
  { value: "internal_review",  label: "Auswertung" },
  { value: "strategy_session", label: "Strategiegespräch" },
  { value: "learning",         label: "Lernphase" },
  { value: "implementation",   label: "Implementierung" },
  { value: "stabilization",    label: "Stabilisierung" },
  { value: "completed",        label: "Abgeschlossen" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: { company: true },
  });
  if (!user) redirect("/login");

  const company = user.company;
  if (!company) redirect("/dashboard");

  // Load all data in parallel
  const [assignments, documents, nextAppointment, analysisSession, welcomeVideo] =
    await Promise.all([
      db.customerLearningAssignment.findMany({
        where: { companyId: company.id, status: "active" },
        include: {
          chapter: {
            include: {
              lessons: {
                where: { status: "PUBLISHED", isActive: true },
                select: {
                  id: true,
                  progress: { where: { userId: user.id }, select: { status: true } },
                },
              },
            },
          },
        },
        orderBy: { activatedAt: "desc" },
        take: 4,
      }),
      db.document.findMany({
        where: { companyId: company.id, visibility: "customer" },
        select: { id: true, title: true, category: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.appointment.findFirst({
        where: { companyId: company.id, startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
      }),
      db.analysisSession.findFirst({
        where: { companyId: company.id, blueprintVersion: "2.0" },
        orderBy: { updatedAt: "desc" },
        select: { id: true, status: true, completedAt: true },
      }),
      db.systemSetting.findUnique({ where: { key: "welcome_video_url" } }),
    ]);

  // Chapter progress
  const chapterProgress = assignments.map((a) => {
    const total = a.chapter.lessons.length;
    const completed = a.chapter.lessons.filter(
      (l) => l.progress[0]?.status === "completed"
    ).length;
    return {
      assignment: a,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  });

  const completedChapters = chapterProgress.filter((cp) => cp.pct === 100).length;
  const inProgressChapters = chapterProgress.filter((cp) => cp.pct > 0 && cp.pct < 100).length;

  const blueprintStatus = !analysisSession
    ? "none"
    : analysisSession.status === "COMPLETED"
    ? "completed"
    : "in_progress";

  const currentPhaseIdx = PROJECT_PHASES.findIndex(
    (p) => p.value === (company.projectPhase ?? "onboarding")
  );

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">
          Guten Tag, {user.name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-[#888] text-sm mt-1">{company.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Welcome Video */}
        <div className="lg:col-span-2">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {welcomeVideo?.value ? (
              <div className="relative aspect-video">
                <video
                  src={welcomeVideo.value}
                  controls
                  className="w-full h-full object-cover"
                  poster=""
                />
              </div>
            ) : (
              <div className="relative aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mx-auto mb-3">
                    <Play size={20} className="text-[#22c55e] ml-0.5" />
                  </div>
                  <p className="text-[#f0f0f0] font-semibold text-sm">Willkommensvideo</p>
                  <p className="text-[#555] text-xs mt-1">von OKUN Systems</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next action + appointment */}
        <div className="space-y-4">
          {/* Blueprint status */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={15} className="text-[#22c55e]" />
              <h3 className="text-[#f0f0f0] font-semibold text-sm">OKUN Blueprint™</h3>
            </div>
            {blueprintStatus === "none" && (
              <>
                <p className="text-[#888] text-xs mb-3 leading-relaxed">
                  Starten Sie jetzt die strukturierte Unternehmensanalyse.
                </p>
                <Link
                  href="/blueprint"
                  className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-xs rounded-lg py-2.5 text-center transition-colors"
                >
                  Blueprint starten
                </Link>
              </>
            )}
            {blueprintStatus === "in_progress" && (
              <>
                <p className="text-[#888] text-xs mb-3 leading-relaxed">
                  Ihre Analyse ist noch nicht abgeschlossen.
                </p>
                <Link
                  href={`/blueprint/${analysisSession!.id}`}
                  className="block w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-xs rounded-lg py-2.5 text-center transition-colors"
                >
                  Fortsetzen
                </Link>
              </>
            )}
            {blueprintStatus === "completed" && (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={13} className="text-[#22c55e]" />
                  <p className="text-[#22c55e] text-xs font-medium">Abgeschlossen</p>
                </div>
                <p className="text-[#888] text-xs leading-relaxed">
                  OKUN wertet Ihre Ergebnisse intern aus. Buchen Sie jetzt Ihr Strategiegespräch.
                </p>
                <Link
                  href="/termine"
                  className="block w-full mt-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#f0f0f0] font-medium text-xs rounded-lg py-2.5 text-center transition-colors"
                >
                  Strategiegespräch buchen
                </Link>
              </>
            )}
          </div>

          {/* Next appointment */}
          {nextAppointment && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={15} className="text-[#22c55e]" />
                <h3 className="text-[#f0f0f0] font-semibold text-sm">Nächster Termin</h3>
              </div>
              <p className="text-[#f0f0f0] text-sm font-medium truncate">{nextAppointment.title}</p>
              <p className="text-[#888] text-xs mt-1">
                {nextAppointment.startTime.toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                ·{" "}
                {nextAppointment.startTime.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                Uhr
              </p>
              {nextAppointment.meetingUrl && (
                <a
                  href={nextAppointment.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full mt-3 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-xs rounded-lg py-2.5 text-center transition-colors"
                >
                  Gespräch beitreten
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Project phase timeline */}
      {company.projectPhase && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h2 className="text-[#888] text-xs font-medium uppercase tracking-wide mb-4">
            Projektstatus
          </h2>
          <div className="flex items-center overflow-x-auto pb-1">
            {PROJECT_PHASES.map((phase, idx) => {
              const isDone = idx < currentPhaseIdx;
              const isCurrent = idx === currentPhaseIdx;
              return (
                <div key={phase.value} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDone
                          ? "bg-[#22c55e] border-[#22c55e]"
                          : isCurrent
                          ? "border-[#22c55e] bg-[#22c55e]/10"
                          : "border-[#2a2a2a] bg-[#0d0d0d]"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle size={14} className="text-black" />
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                      ) : (
                        <Circle size={14} className="text-[#333]" />
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1.5 whitespace-nowrap ${
                        isCurrent
                          ? "text-[#22c55e] font-semibold"
                          : isDone
                          ? "text-[#555]"
                          : "text-[#333]"
                      }`}
                    >
                      {phase.label}
                    </p>
                  </div>
                  {idx < PROJECT_PHASES.length - 1 && (
                    <div
                      className={`h-px w-6 sm:w-8 mx-1 flex-shrink-0 ${
                        idx < currentPhaseIdx ? "bg-[#22c55e]" : "bg-[#2a2a2a]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Lerninhalte",
            value: assignments.length,
            sub: "freigeschaltet",
            icon: <BookOpen size={16} className="text-[#22c55e]" />,
            href: "/portal/lernen",
          },
          {
            label: "Abgeschlossen",
            value: completedChapters,
            sub: "Kapitel",
            icon: <CheckCircle size={16} className="text-[#22c55e]" />,
            href: "/portal/lernen",
          },
          {
            label: "In Bearbeitung",
            value: inProgressChapters,
            sub: "Kapitel",
            icon: <Clock size={16} className="text-yellow-400" />,
            href: "/portal/lernen",
          },
          {
            label: "Dokumente",
            value: documents.length,
            sub: "verfügbar",
            icon: <FileText size={16} className="text-[#888]" />,
            href: "/portal/dokumente",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#22c55e]/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              {stat.icon}
              <span className="text-[#555] text-xs">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-[#f0f0f0]">{stat.value}</p>
            <p className="text-[#555] text-xs mt-0.5">{stat.sub}</p>
          </Link>
        ))}
      </div>

      {/* Learning + Docs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
              <BookOpen size={15} className="text-[#22c55e]" />
              Ihre Lerninhalte
            </h2>
            <Link
              href="/portal/lernen"
              className="text-[#22c55e] text-xs hover:underline flex items-center gap-1"
            >
              Alle anzeigen <ChevronRight size={12} />
            </Link>
          </div>

          {chapterProgress.length === 0 ? (
            <p className="text-[#555] text-sm">Noch keine Lerninhalte freigeschaltet.</p>
          ) : (
            <div className="space-y-3">
              {chapterProgress.map((cp) => (
                <Link
                  key={cp.assignment.id}
                  href="/portal/lernen"
                  className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-lg hover:bg-[#111] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={13} className="text-[#22c55e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f0f0] text-sm font-medium truncate">
                      {cp.assignment.chapter.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#22c55e] rounded-full"
                          style={{ width: `${cp.pct}%` }}
                        />
                      </div>
                      <span className="text-[#555] text-xs whitespace-nowrap">
                        {cp.completed}/{cp.total}
                      </span>
                    </div>
                  </div>
                  {cp.pct === 100 && (
                    <CheckCircle size={14} className="text-[#22c55e] flex-shrink-0" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
              <FileText size={15} className="text-[#22c55e]" />
              Aktuelle Dokumente
            </h2>
            <Link
              href="/portal/dokumente"
              className="text-[#22c55e] text-xs hover:underline flex items-center gap-1"
            >
              Alle anzeigen <ChevronRight size={12} />
            </Link>
          </div>

          {documents.length === 0 ? (
            <p className="text-[#555] text-sm">Noch keine Dokumente verfügbar.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-lg"
                >
                  <FileText size={13} className="text-[#888] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f0f0] text-sm truncate">{doc.title}</p>
                    <p className="text-[#555] text-xs">
                      {doc.createdAt.toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <span className="text-[#555] text-xs flex-shrink-0">{doc.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
