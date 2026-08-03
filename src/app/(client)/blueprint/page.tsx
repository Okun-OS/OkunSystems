import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { startBlueprintSession } from "./actions";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, ChevronRight } from "lucide-react";

export default async function BlueprintStartPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  // Redirect if there's an active session
  const activeSession = await db.analysisSession.findFirst({
    where: {
      companyId,
      blueprintVersion: "2.0",
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });
  if (activeSession) redirect(`/blueprint/${activeSession.id}`);

  // Redirect if already completed — only when the session has actual answers
  // (sessions falsely completed with 0 answers due to missing seed are ignored)
  const completedSession = await db.analysisSession.findFirst({
    where: { companyId, blueprintVersion: "2.0", status: "COMPLETED" },
    select: { id: true, _count: { select: { sessionAnswers: true } } },
  });
  if (completedSession && completedSession._count.sessionAnswers > 0) {
    redirect(`/blueprint/${completedSession.id}/abgeschlossen`);
  }

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center">
            <ClipboardList size={18} className="text-[#00b8ff]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#f0f0f0]">OKUN Blueprint™ 2.0</h1>
            <p className="text-[#888] text-sm">Strukturierte Unternehmensanalyse</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-[#ccc] text-sm leading-relaxed mb-6">
          Der OKUN Blueprint™ erfasst systematisch den Digitalisierungsstand Ihres Unternehmens in 8 Modulen. Auf Basis Ihrer Antworten erhalten Sie einen individuellen Optimierungsfahrplan mit konkreten Lösungsempfehlungen.
        </p>

        {/* Info tiles */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-[#00b8ff]" />
              <span className="text-[#888] text-xs">Dauer</span>
            </div>
            <p className="text-[#f0f0f0] text-sm font-semibold">ca. 15–25 Minuten</p>
          </div>
          <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={14} className="text-[#00b8ff]" />
              <span className="text-[#888] text-xs">Module</span>
            </div>
            <p className="text-[#f0f0f0] text-sm font-semibold">8 Themenbereiche</p>
          </div>
        </div>

        {/* Module overview */}
        <div className="mb-8">
          <p className="text-[#888] text-xs font-medium mb-3 uppercase tracking-wider">Inhalt</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              "M1 · Unternehmensprofil",
              "M2 · Prozessqualität",
              "M3 · Vertriebsstruktur",
              "M4 · Führungsstruktur",
              "M5 · Automatisierungsgrad",
              "M6 · Unternehmensstruktur",
              "M7 · Kommunikation",
              "M8 · Personalmanagement",
            ].map((label) => (
              <div key={label} className="flex items-center gap-2 text-[#888] text-xs">
                <div className="w-1 h-1 rounded-full bg-[#00b8ff]/60 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <form action={startBlueprintSession}>
          <button
            type="submit"
            className="w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            Blueprint starten
            <ChevronRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
