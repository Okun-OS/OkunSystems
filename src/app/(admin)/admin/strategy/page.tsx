import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Target, ArrowRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function StrategyOverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Get all companies with completed analysis sessions + their scores
  const companies = await db.company.findMany({
    include: {
      analysisSessions: {
        include: { score: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      appointments: {
        where: { type: "STRATEGY" },
        orderBy: { startTime: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const withAnalysis = companies.filter((c) => c.analysisSessions.length > 0);
  const readyForStrategy = withAnalysis.filter(
    (c) => c.analysisSessions[0].status === "COMPLETED" && c.analysisSessions[0].score
  );
  const inProgress = withAnalysis.filter(
    (c) => c.analysisSessions[0].status !== "COMPLETED"
  );

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Strategy Sessions</h1>
        <p className="text-[#888] text-sm mt-1">OKUN Blueprint™ Stage 10 – Vorbereitung und Durchführung</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Bereit für Strategy Session</p>
          <p className="text-[#00b8ff] text-3xl font-bold">{readyForStrategy.length}</p>
        </div>
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Analyse läuft noch</p>
          <p className="text-yellow-400 text-3xl font-bold">{inProgress.length}</p>
        </div>
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Noch keine Analyse</p>
          <p className="text-[#888] text-3xl font-bold">{companies.length - withAnalysis.length}</p>
        </div>
      </div>

      {/* Ready for Strategy */}
      {readyForStrategy.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle2 size={15} className="text-[#00b8ff]" />
            Bereit für Strategy Session
          </h2>
          <div className="space-y-2">
            {readyForStrategy.map((company) => {
              const analysis = company.analysisSessions[0];
              const score = analysis.score;
              const appt = company.appointments[0];
              return (
                <div key={company.id} className="bg-[#0c1520] border border-[#1a2840] hover:border-[#00b8ff]/30 rounded-xl p-4 flex items-center justify-between group transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00b8ff] font-bold text-sm">{company.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[#f0f0f0] font-medium text-sm">{company.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {company.industry && <span className="text-[#555] text-xs">{company.industry}</span>}
                        {score && (
                          <span className={`text-xs font-semibold ${score.totalScore >= 70 ? "text-[#00b8ff]" : score.totalScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                            Score: {score.totalScore}/100
                          </span>
                        )}
                        {score && <span className="text-[#555] text-xs">{score.maturityLabel}</span>}
                        {appt && (
                          <span className="text-blue-400 text-xs">Termin: {formatDate(appt.startTime)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={`/admin/kunden/${company.id}/strategy`}
                    className="flex items-center gap-1.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
                    Vorbereiten
                    <ArrowRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock size={15} className="text-yellow-400" />
            Analyse noch nicht abgeschlossen
          </h2>
          <div className="space-y-2">
            {inProgress.map((company) => {
              const analysis = company.analysisSessions[0];
              return (
                <div key={company.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 font-bold text-sm">{company.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-[#f0f0f0] font-medium text-sm">{company.name}</p>
                      <p className="text-[#555] text-xs mt-0.5">Phase: {analysis.phase} · {analysis.totalMessages} Nachrichten</p>
                    </div>
                  </div>
                  <Link href={`/admin/kunden/${company.id}/analyse`}
                    className="text-[#888] hover:text-[#f0f0f0] text-xs flex items-center gap-1 transition-colors">
                    Analyse ansehen
                    <ArrowRight size={12} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No analysis yet */}
      {companies.filter((c) => c.analysisSessions.length === 0).length > 0 && (
        <div>
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-[#555]" />
            Noch keine Analyse gestartet
          </h2>
          <div className="space-y-2">
            {companies.filter((c) => c.analysisSessions.length === 0).map((company) => (
              <div key={company.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 flex items-center justify-between opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#101c2e] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#555] font-bold text-sm">{company.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-[#888] font-medium text-sm">{company.name}</p>
                    <p className="text-[#555] text-xs">{company.industry ?? "Kein Eintrag"}</p>
                  </div>
                </div>
                <Link href={`/admin/kunden/${company.id}`}
                  className="text-[#555] text-xs flex items-center gap-1">
                  Details
                  <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
