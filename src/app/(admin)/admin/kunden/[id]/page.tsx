import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  Building2, Mail, Phone,
  FolderOpen, Lightbulb, MessageSquare, FileText, CalendarDays, Brain, Target, CheckCircle2, Clock,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { BlueprintReportButton } from "./BlueprintReportButton";

export default async function KundeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      users: { where: { role: "CLIENT" }, select: { id: true, name: true, email: true } },
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

  async function handleSaveNote(formData: FormData) {
    "use server";
    const content = formData.get("content") as string;
    if (!content?.trim()) return;
    const authorId = (session!.user as any).id as string;
    await db.note.create({
      data: { content: content.trim(), companyId: id, authorId, isInternal: true },
    });
    revalidatePath(`/admin/kunden/${id}`);
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/admin/kunden/${id}/strategy`}
          className="bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors flex items-center gap-2">
          <Target size={14} />
          Strategy Session
        </Link>
        <Link href={`/admin/kunden/${id}/analyse`}
          className="bg-[#00b8ff]/10 hover:bg-[#00b8ff]/20 border border-[#00b8ff]/20 text-[#00b8ff] text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center gap-2">
          <Brain size={14} />
          Analyse
        </Link>
        <Link href={`/admin/kunden/${id}/bearbeiten`}
          className="bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#f0f0f0] text-sm font-medium rounded-lg px-4 py-2.5 transition-colors">
          Bearbeiten
        </Link>
      </div>

      {activeSession?.blueprintVersion === "2.0" && activeSession.status === "COMPLETED" && !activeSession.reportUrl && (
        <div className="mb-5 flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm">
          <Clock size={14} className="text-yellow-400 shrink-0" />
          <span className="text-yellow-300">Blueprint abgeschlossen — PDF-Bericht wird generiert oder muss manuell ausgelöst werden.</span>
          <Link href={`/admin/kunden/${id}/ergebnisse`} className="ml-auto text-yellow-400 hover:underline text-xs shrink-0">Ergebnisse →</Link>
        </div>
      )}
      {activeSession?.blueprintVersion === "2.0" && activeSession.status === "COMPLETED" && activeSession.reportUrl && (
        <div className="mb-5 flex items-center gap-3 bg-[#00b8ff]/5 border border-[#00b8ff]/20 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 size={14} className="text-[#00b8ff] shrink-0" />
          <span className="text-[#00b8ff]">Blueprint abgeschlossen — PDF-Bericht verfügbar.</span>
          <Link href={`/admin/kunden/${id}/ergebnisse`} className="ml-auto text-[#00b8ff] hover:underline text-xs shrink-0">Ergebnisse →</Link>
        </div>
      )}

      <div className="grid grid-cols-12 gap-5">
        {/* Left */}
        <div className="col-span-12 lg:col-span-4 space-y-5">
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Kundendaten</h2>
            <div className="space-y-3">
              {company.contactPerson && (
                <div className="flex items-start gap-3">
                  <Mail size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Ansprechpartner</p>
                    <p className="text-[#f0f0f0] text-sm">{company.contactPerson}</p>
                  </div>
                </div>
              )}
              {!company.contactPerson && company.users.map(u => (
                <div key={u.id} className="flex items-start gap-3">
                  <Mail size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Ansprechpartner</p>
                    <p className="text-[#f0f0f0] text-sm">{u.name ?? u.email}</p>
                    <p className="text-[#888] text-xs">{u.email}</p>
                  </div>
                </div>
              ))}
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
              {company.plan && (
                <div className="flex items-start gap-3">
                  <FolderOpen size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Gebuchtes Paket</p>
                    <p className="text-[#f0f0f0] text-sm">{company.plan}</p>
                  </div>
                </div>
              )}
              {(company as any).projectPhase && (
                <div className="flex items-start gap-3">
                  <Target size={14} className="text-[#555] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[#555] text-xs">Projektphase</p>
                    <p className="text-[#f0f0f0] text-sm capitalize">{(company as any).projectPhase.replace(/_/g, " ")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Blueprint Analysis Status */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
                <Brain size={14} className="text-[#00b8ff]" />
                Blueprint™ Analyse
              </h2>
              <Link href={`/admin/kunden/${id}/analyse`} className="text-[#00b8ff] text-xs hover:underline">Öffnen →</Link>
            </div>
            {!activeSession ? (
              <p className="text-[#555] text-sm">Noch nicht gestartet</p>
            ) : activeSession.blueprintVersion === "2.0" ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Version</span>
                  <span className="text-[#00b8ff] text-xs font-semibold">Blueprint 2.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Status</span>
                  <span className={activeSession.status === "COMPLETED" ? "text-[#00b8ff]" : "text-yellow-400"}>
                    {activeSession.status === "COMPLETED" ? "Abgeschlossen" : "In Bearbeitung"}
                  </span>
                </div>
                {activeSession.status === "COMPLETED" && (
                  <>
                    <Link
                      href={`/blueprint/${activeSession.id}/ergebnis`}
                      className="flex items-center justify-between text-xs text-[#888] hover:text-[#00b8ff] transition-colors pt-1"
                    >
                      Ergebnisse anzeigen <span>→</span>
                    </Link>
                    <BlueprintReportButton
                      sessionId={activeSession.id}
                      initialReportUrl={activeSession.reportUrl}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#888]">Status</span>
                  <span className={activeSession.status === "COMPLETED" ? "text-[#00b8ff]" : "text-yellow-400"}>
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
                    <span className="text-[#00b8ff] font-bold">{activeSession.score.totalScore}/100</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {activeSession?.score && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">OKUN Score™</h2>
              <div className="flex items-center justify-center my-4">
                <div className="relative">
                  <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#111e30" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={activeSession.score.totalScore >= 70 ? "#00b8ff" : "#f59e0b"}
                      strokeWidth="8"
                      strokeDasharray={`${(activeSession.score.totalScore / 100) * 314.16} ${314.16 - (activeSession.score.totalScore / 100) * 314.16}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[#f0f0f0] text-3xl font-bold">{activeSession.score.totalScore}</span>
                    <span className="text-[#888] text-xs">/100 Gesamt</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {assessment?.recommendations && assessment.recommendations.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <Lightbulb size={14} className="text-[#00b8ff]" />
                Empfohlene Systeme
                <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
              </h2>
              <div className="space-y-2">
                {assessment.recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-3 bg-[#060a10] rounded-lg">
                    <Lightbulb size={13} className="text-[#00b8ff] mt-0.5 flex-shrink-0" />
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
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <FolderOpen size={15} className="text-[#00b8ff]" />
                <h2 className="text-[#f0f0f0] font-semibold text-sm">Aktuelles Projekt</h2>
              </div>
              <p className="text-[#f0f0f0] font-medium mb-3">{project.title}</p>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#888] mb-1">
                  <span>Fortschritt</span><span>{project.progress}%</span>
                </div>
                <div className="h-1.5 bg-[#111e30] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00b8ff] rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-[#00b8ff]" />
                <h2 className="text-[#f0f0f0] font-semibold text-sm">Termine ({company.appointments.length})</h2>
              </div>
            </div>
            {company.appointments.length === 0 ? (
              <p className="text-[#555] text-sm">Noch keine Termine geplant.</p>
            ) : (
              <div className="space-y-2">
                {company.appointments.slice(0, 4).map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-3 bg-[#060a10] rounded-lg">
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

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={15} className="text-[#00b8ff]" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Dokumente ({company.documents.length})</h2>
              <Link href={`/admin/kunden/${id}/dokumente`} className="ml-auto text-[#555] text-xs hover:text-[#00b8ff] transition-colors">Alle →</Link>
            </div>
            {company.documents.length === 0 ? (
              <p className="text-[#555] text-sm">Noch keine Dokumente.</p>
            ) : (
              <div className="space-y-2">
                {company.documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-[#060a10] rounded-lg">
                    <FileText size={14} className={doc.category === "BLUEPRINT" ? "text-[#00b8ff]" : "text-[#888]"} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f0f0] text-sm truncate">{doc.title}</p>
                      {doc.category === "BLUEPRINT" && (
                        <p className="text-[#555] text-xs">Blueprint PDF · automatisch generiert</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${doc.visibility === "customer" ? "text-[#00b8ff] bg-[#00b8ff]/10" : "text-[#888] bg-[#101c2e]"}`}>
                      {doc.visibility === "customer" ? "Für Kunden" : "Intern"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={15} className="text-[#00b8ff]" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Interne Notizen</h2>
              <span className="ml-auto text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Intern</span>
            </div>
            {company.notes.length > 0 && (
              <div className="space-y-2 mb-3">
                {company.notes.map((note) => (
                  <div key={note.id} className="p-3 bg-[#060a10] rounded-lg border-l-2 border-[#00b8ff]/40">
                    <p className="text-[#f0f0f0] text-sm">{note.content}</p>
                    <p className="text-[#555] text-xs mt-1">{note.author.name} · {formatDateTime(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            <form action={handleSaveNote}>
              <textarea name="content" placeholder="Neue interne Notiz..." rows={2}
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50 resize-none" />
              <button type="submit" className="mt-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-lg px-4 py-2 transition-colors">
                Notiz speichern
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// StatusBadge kept for internal reference only (layout provides the visible one)
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktiv", cls: "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20" },
    ONBOARDING: { label: "Onboarding", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    INACTIVE: { label: "Inaktiv", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888]" };
  return <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${c.cls}`}>{c.label}</span>;
}
