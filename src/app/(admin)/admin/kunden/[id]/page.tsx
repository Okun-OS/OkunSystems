import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Mail, Phone,
  FolderOpen, BarChart3, Lightbulb, MessageSquare, FileText, CalendarDays, Brain,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      users: { where: { role: "CLIENT" } },
      projects: { include: { milestones: true, tasks: true }, orderBy: { updatedAt: "desc" } },
      appointments: { orderBy: { startTime: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      retainers: { include: { tickets: true } },
      assessments: { include: { recommendations: true }, orderBy: { updatedAt: "desc" } },
      notes: { include: { author: true }, orderBy: { createdAt: "desc" } },
      analysisSessions: { include: { score: true }, orderBy: { updatedAt: "desc" }, take: 1 },
    },
  });

  if (!company) notFound();

  const assessment = company.assessments[0];
  const project = company.projects[0];
  const activeSession = company.analysisSessions[0];

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Link href="/admin/kunden" className="flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors">
          <ArrowLeft size={15} />
          Zurück zur Übersicht
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
              <span className="text-[#22c55e] text-xl font-bold">{company.name.charAt(0)}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f0f0f0]">{company.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                {company.industry && <span className="text-[#888] text-sm">{company.industry}</span>}
                <StatusBadge status={company.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/admin/kunden/${id}/analyse`}
              className="bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/20 text-[#22c55e] text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center gap-2">
              <Brain size={14} />
              Blueprint™ Analyse
            </Link>
            <Link href={`/admin/kunden/${id}/bearbeiten`}
              className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#f0f0f0] text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
              Bearbeiten
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Left */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Kundendaten</h2>
            <div className="space-y-3">
              {company.industry && (
                <div className="flex items-start gap-3">
                  <Building2 size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Branche</p>
                    <p className="text-[#f0f0f0] text-sm">{company.industry}</p>
                  </div>
                </div>
              )}
              {company.phone && (
                <div className="flex items-start gap-3">
                  <Phone size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Telefon</p>
                    <p className="text-[#f0f0f0] text-sm">{company.phone}</p>
                  </div>
                </div>
              )}
              {company.users.map(u => (
                <div key={u.id} className="flex items-start gap-3">
                  <Mail size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Ansprechpartner</p>
                    <p className="text-[#f0f0f0] text-sm">{u.name ?? u.email}</p>
                    <p className="text-[#888] text-xs">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blueprint Analysis Status */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
                <Brain size={14} className="text-[#22c55e]" />
                Blueprint™ Analyse
              </h2>
              <Link href={`/admin/kunden/${id}/analyse`} className="text-[#22c55e] text-xs hover:underline">Öffnen →</Link>
            </div>
            {!activeSession ? (
              <p className="text-[#555] text-sm">Noch nicht gestartet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Status</span>
                  <span className={activeSession.status === "COMPLETED" ? "text-[#22c55e]" : "text-yellow-400"}>
                    {activeSession.status === "COMPLETED" ? "Abgeschlossen" : activeSession.status === "ACTIVE" ? "Aktiv" : "Pausiert"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Phase</span>
                  <span className="text-[#f0f0f0]">{activeSession.phase}</span>
                </div>
                {activeSession.score && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888]">OKUN Score™</span>
                    <span className="text-[#22c55e] font-bold">{activeSession.score.totalScore}/100</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {assessment && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Score Übersicht</h2>
              <div className="flex items-center justify-center my-4">
                <div className="relative">
                  <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1e1e1e" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={assessment.score && assessment.score >= 70 ? "#22c55e" : "#f59e0b"}
                      strokeWidth="8"
                      strokeDasharray={`${((assessment.score ?? 0) / 100) * 314.16} ${314.16 - ((assessment.score ?? 0) / 100) * 314.16}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[#f0f0f0] text-3xl font-bold">{assessment.score ?? "—"}</span>
                    <span className="text-[#888] text-xs">/100 Gesamt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {assessment?.recommendations && assessment.recommendations.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <Lightbulb size={14} className="text-[#22c55e]" />
                Empfohlene Systeme
                <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
              </h2>
              <div className="space-y-2">
                {assessment.recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-3 bg-[#0d0d0d] rounded-lg">
                    <Lightbulb size={13} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#f0f0f0] text-sm">{rec.title}</p>
                      <p className="text-[#888] text-xs mt-0.5">{rec.system}</p>
                      <p className="text-xs mt-1">
                        Priorität: <span className={rec.priority === 1 ? "text-red-400" : "text-yellow-400"}>
                          {rec.priority === 1 ? "Hoch" : "Mittel"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {project && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen size={15} className="text-[#22c55e]" />
                <h2 className="text-[#f0f0f0] font-semibold text-sm">Aktuelles Projekt</h2>
              </div>
              <p className="text-[#f0f0f0] font-medium mb-3">{project.title}</p>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#888] mb-1">
                  <span>Fortschritt</span><span>{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div className="h-full bg-[#22c55e] rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-[#22c55e]" />
                <h2 className="text-[#f0f0f0] font-semibold text-sm">Termine ({company.appointments.length})</h2>
              </div>
            </div>
            {company.appointments.length === 0 ? (
              <p className="text-[#555] text-sm">Noch keine Termine geplant.</p>
            ) : (
              <div className="space-y-2">
                {company.appointments.slice(0, 4).map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-[#0d0d0d] rounded-lg">
                    <div>
                      <p className="text-[#f0f0f0] text-sm">{appt.title}</p>
                      <p className="text-[#888] text-xs mt-0.5">{formatDateTime(appt.startTime)}</p>
                    </div>
                    <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{appt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} className="text-[#22c55e]" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Dokumente ({company.documents.length})</h2>
            </div>
            {company.documents.length === 0 ? (
              <p className="text-[#555] text-sm">Noch keine Dokumente.</p>
            ) : (
              <div className="space-y-2">
                {company.documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#0d0d0d] rounded-lg">
                    <FileText size={14} className="text-[#888] flex-shrink-0" />
                    <p className="text-[#f0f0f0] text-sm flex-1 truncate">{doc.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${doc.isPublished ? "text-[#22c55e] bg-[#22c55e]/10" : "text-[#888] bg-[#1a1a1a]"}`}>
                      {doc.isPublished ? "Freigegeben" : "Intern"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={15} className="text-[#22c55e]" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Interne Notizen</h2>
              <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
            </div>
            {company.notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {company.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-[#0d0d0d] rounded-lg border-l-2 border-[#22c55e]/40">
                    <p className="text-[#f0f0f0] text-sm">{note.content}</p>
                    <p className="text-[#555] text-xs mt-1">{note.author.name} · {formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            <textarea placeholder="Neue interne Notiz..." rows={2}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50 resize-none" />
            <button className="mt-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg px-4 py-2 transition-colors">
              Notiz speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktiv", cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
    ONBOARDING: { label: "Onboarding", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    INACTIVE: { label: "Inaktiv", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888]" };
  return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${c.cls}`}>{c.label}</span>;
}
