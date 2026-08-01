import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle, Circle, Clock, Layers } from "lucide-react";

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  PLANNING:    { label: "Planung",      cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
  ACTIVE:      { label: "Aktiv",        cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
  ON_HOLD:     { label: "Pausiert",     cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  COMPLETED:   { label: "Abgeschlossen",cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  CANCELLED:   { label: "Abgebrochen",  cls: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default async function PortalProjektPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) redirect("/dashboard");

  const projects = await db.project.findMany({
    where: { companyId: user.companyId, isVisibleToClient: true },
    include: {
      milestones: { orderBy: { order: "asc" } },
      tasks: {
        where: { isInternal: false },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-[900px] mx-auto py-8 px-4 space-y-6">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-[#f0f0f0]">Projektstatus</h1>
        <p className="text-[#555] text-sm mt-1">Ihre laufenden Projekte und Meilensteine im Überblick.</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <Layers size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Noch keine Projekte freigegeben.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const sc = STATUS_CFG[project.status] ?? STATUS_CFG.PLANNING;
            const completedMilestones = project.milestones.filter((m) => m.completed).length;
            const totalMilestones = project.milestones.length;
            const startDate = project.startDate
              ? new Date(project.startDate).toLocaleDateString("de-DE", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : null;
            const endDate = project.endDate
              ? new Date(project.endDate).toLocaleDateString("de-DE", {
                  day: "2-digit", month: "short", year: "numeric",
                })
              : null;

            return (
              <div
                key={project.id}
                className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-[#2a2a2a]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-[#f0f0f0] font-semibold">{project.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                          {sc.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-[#888] text-sm leading-relaxed">{project.description}</p>
                      )}
                      {(startDate || endDate) && (
                        <p className="text-[#555] text-xs mt-2 flex items-center gap-1.5">
                          <Clock size={11} />
                          {startDate && endDate
                            ? `${startDate} – ${endDate}`
                            : startDate
                            ? `Start: ${startDate}`
                            : `Ende: ${endDate}`}
                        </p>
                      )}
                    </div>

                    {project.progress > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-black text-[#22c55e] tabular-nums">
                          {project.progress}%
                        </p>
                        <p className="text-[#555] text-xs">Fortschritt</p>
                      </div>
                    )}
                  </div>

                  {project.progress > 0 && (
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full mt-4 overflow-hidden">
                      <div
                        className="h-full bg-[#22c55e] rounded-full transition-all"
                        style={{ width: `${Math.min(100, project.progress)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Milestones */}
                {project.milestones.length > 0 && (
                  <div className="px-6 py-4 border-b border-[#2a2a2a]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#888] text-xs font-medium uppercase tracking-wide">
                        Meilensteine
                      </p>
                      <p className="text-[#555] text-xs tabular-nums">
                        {completedMilestones}/{totalMilestones}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {project.milestones.map((ms) => {
                        const dueDate = ms.dueDate
                          ? new Date(ms.dueDate).toLocaleDateString("de-DE", {
                              day: "2-digit", month: "short",
                            })
                          : null;
                        return (
                          <div key={ms.id} className="flex items-start gap-3">
                            <div className="mt-0.5 flex-shrink-0">
                              {ms.completed ? (
                                <CheckCircle size={15} className="text-[#22c55e]" />
                              ) : (
                                <Circle size={15} className="text-[#333]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm ${
                                  ms.completed ? "text-[#555] line-through" : "text-[#f0f0f0]"
                                }`}
                              >
                                {ms.title}
                              </p>
                              {ms.description && !ms.completed && (
                                <p className="text-[#555] text-xs mt-0.5">{ms.description}</p>
                              )}
                            </div>
                            {dueDate && !ms.completed && (
                              <p className="text-[#555] text-xs flex-shrink-0">{dueDate}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {project.tasks.length > 0 && (
                  <div className="px-6 py-4">
                    <p className="text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
                      Aufgaben
                    </p>
                    <div className="space-y-1.5">
                      {project.tasks.map((task) => {
                        const isDone = task.status === "DONE" || task.status === "COMPLETED";
                        const dueDate = task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("de-DE", {
                              day: "2-digit", month: "short",
                            })
                          : null;
                        return (
                          <div
                            key={task.id}
                            className="flex items-center gap-3 py-1.5 border-b border-[#1a1a1a] last:border-0"
                          >
                            <div className="flex-shrink-0">
                              {isDone ? (
                                <CheckCircle size={13} className="text-[#22c55e]" />
                              ) : (
                                <Circle size={13} className="text-[#333]" />
                              )}
                            </div>
                            <p
                              className={`text-sm flex-1 min-w-0 truncate ${
                                isDone ? "text-[#555] line-through" : "text-[#ccc]"
                              }`}
                            >
                              {task.title}
                            </p>
                            {dueDate && !isDone && (
                              <p className="text-[#555] text-xs flex-shrink-0">{dueDate}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
