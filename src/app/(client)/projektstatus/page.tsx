import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function ProjektstatusPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      company: {
        include: {
          projects: {
            include: { milestones: { orderBy: { order: "asc" } }, tasks: { where: { isInternal: false } } },
          },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const projects = user.company?.projects ?? [];

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Projektstatus</h1>
        <p className="text-[#888] text-sm mt-1">Übersicht Ihrer laufenden Projekte</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-16 text-center">
          <AlertCircle size={32} className="text-[#555] mx-auto mb-4" />
          <p className="text-[#888]">Noch keine Projekte vorhanden.</p>
          <p className="text-[#555] text-sm mt-2">Ihr OKUN-Berater richtet Ihr erstes Projekt ein.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
              {/* Project header */}
              <div className="p-6 border-b border-[#2a2a2a]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[#f0f0f0] font-semibold text-lg">{project.title}</h2>
                    {project.description && (
                      <p className="text-[#888] text-sm mt-1">{project.description}</p>
                    )}
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#888] mb-1.5">
                    <span>Fortschritt</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>
              </div>

              {/* Milestones */}
              {project.milestones.length > 0 && (
                <div className="p-6">
                  <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">Meilensteine</h3>
                  <div className="space-y-3">
                    {project.milestones.map((m) => (
                      <div key={m.id} className="flex items-center gap-3">
                        {m.completed ? (
                          <CheckCircle2 size={16} className="text-[#22c55e] flex-shrink-0" />
                        ) : (
                          <Circle size={16} className="text-[#444] flex-shrink-0" />
                        )}
                        <span className={`text-sm flex-1 ${m.completed ? "text-[#888] line-through" : "text-[#f0f0f0]"}`}>
                          {m.title}
                        </span>
                        {m.dueDate && (
                          <span className="text-[#555] text-xs">{formatDate(m.dueDate)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {project.tasks.length > 0 && (
                <div className="border-t border-[#1e1e1e] p-6">
                  <h3 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">Offene Aufgaben</h3>
                  <div className="space-y-2">
                    {project.tasks.filter(t => t.status !== "DONE").slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-[#22c55e] flex-shrink-0" />
                        <span className="text-[#f0f0f0] text-sm flex-1">{task.title}</span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    PLANNING: { label: "In Planung", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    ACTIVE: { label: "Aktiv", cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
    REVIEW: { label: "Review", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    COMPLETED: { label: "Abgeschlossen", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
    PAUSED: { label: "Pausiert", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888] border-[#888]/20" };
  return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${c.cls}`}>{c.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    HIGH: { label: "Hoch", cls: "text-red-400" },
    MEDIUM: { label: "Mittel", cls: "text-yellow-400" },
    LOW: { label: "Niedrig", cls: "text-[#888]" },
  };
  const c = cfg[priority] ?? { label: priority, cls: "text-[#888]" };
  return <span className={`text-xs ${c.cls}`}>{c.label}</span>;
}
