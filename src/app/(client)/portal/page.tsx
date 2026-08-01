import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, FileText, ChevronRight, CheckCircle, Clock, BarChart3, Circle } from "lucide-react";
import { logActivity } from "@/lib/activity/log";

const PROJECT_PHASES = [
  { value: "onboarding",       label: "Onboarding" },
  { value: "blueprint",        label: "Blueprint Analyse" },
  { value: "internal_review",  label: "Auswertung" },
  { value: "strategy_session", label: "Strategiegespräch" },
  { value: "learning",         label: "Lernphase" },
  { value: "implementation",   label: "Implementierung" },
  { value: "stabilization",    label: "Stabilisierung" },
  { value: "completed",        label: "Abgeschlossen" },
];

export default async function PortalDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  if (!user.companyId) redirect("/dashboard");

  const [company, assignments, documents] = await Promise.all([
    db.company.findUnique({
      where: { id: user.companyId },
      select: { name: true, status: true, projectPhase: true },
    }),
    db.customerLearningAssignment.findMany({
      where: { companyId: user.companyId, status: "active" },
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
    }),
    db.document.findMany({
      where: { companyId: user.companyId, visibility: "customer" },
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Calculate chapter progress
  const chapterProgress = assignments.map((a) => {
    const totalLessons = a.chapter.lessons.length;
    const completedLessons = a.chapter.lessons.filter(
      (l) => l.progress[0]?.status === "completed"
    ).length;
    const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    return { assignment: a, totalLessons, completedLessons, pct };
  });

  const completedChapters = chapterProgress.filter((cp) => cp.pct === 100).length;
  const inProgressChapters = chapterProgress.filter(
    (cp) => cp.pct > 0 && cp.pct < 100
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">
          Guten Tag, {user.name?.split(" ")[0] ?? ""}
        </h1>
        <p className="text-[#888] text-sm mt-1">{company?.name}</p>
      </div>

      {/* Project phase timeline */}
      {company?.projectPhase && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 mb-6">
          <h2 className="text-[#888] text-xs font-medium uppercase tracking-wide mb-4">Projektstatus</h2>
          <div className="flex items-center gap-0 overflow-x-auto pb-1">
            {PROJECT_PHASES.map((phase, idx) => {
              const currentIdx = PROJECT_PHASES.findIndex(p => p.value === company.projectPhase);
              const isDone = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isUpcoming = idx > currentIdx;
              return (
                <div key={phase.value} className="flex items-center flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isDone ? "bg-[#22c55e] border-[#22c55e]" :
                      isCurrent ? "border-[#22c55e] bg-[#22c55e]/10" :
                      "border-[#2a2a2a] bg-[#0d0d0d]"
                    }`}>
                      {isDone ? (
                        <CheckCircle size={14} className="text-black" />
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                      ) : (
                        <Circle size={14} className="text-[#333]" />
                      )}
                    </div>
                    <p className={`text-xs mt-1.5 whitespace-nowrap ${
                      isCurrent ? "text-[#22c55e] font-semibold" :
                      isDone ? "text-[#555]" : "text-[#333]"
                    }`}>
                      {phase.label}
                    </p>
                  </div>
                  {idx < PROJECT_PHASES.length - 1 && (
                    <div className={`h-px w-6 sm:w-8 mx-1 flex-shrink-0 ${
                      idx < currentIdx ? "bg-[#22c55e]" : "bg-[#2a2a2a]"
                    }`} />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent learning */}
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
              {chapterProgress.slice(0, 4).map((cp) => {
                const { assignment: a, pct, completedLessons, totalLessons } = cp;
                return (
                <Link
                  key={a.id}
                  href={`/portal/lernen`}
                  className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-lg hover:bg-[#111] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={13} className="text-[#22c55e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f0f0] text-sm font-medium truncate">
                      {a.chapter.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#22c55e] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[#555] text-xs whitespace-nowrap">
                        {completedLessons}/{totalLessons}
                      </span>
                    </div>
                  </div>
                  {pct === 100 && (
                    <CheckCircle size={14} className="text-[#22c55e] flex-shrink-0" />
                  )}
                </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent documents */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
              <FileText size={15} className="text-[#22c55e]" />
              Dokumente
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
                    <p className="text-[#555] text-xs">{doc.createdAt.toLocaleDateString("de-DE")}</p>
                  </div>
                  <span className="text-[#555] text-xs">{doc.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
