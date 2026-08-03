import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { TrendingUp, FileDown, Brain, AlertCircle, CheckCircle2, Clock, Target, Zap } from "lucide-react";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { BlueprintReportButton } from "../BlueprintReportButton";

const PACKAGE_COLORS: Record<string, string> = {
  foundation: "#00b8ff",
  operations: "#3b82f6",
  custom: "#a855f7",
};
const PACKAGE_LABELS: Record<string, string> = {
  foundation: "Foundation",
  operations: "Operations",
  custom: "Custom Development",
};

export default async function ErgebnissePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      industry: true,
      analysisSessions: {
        where: { blueprintVersion: "2.0" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          completedAt: true,
          reportUrl: true,
          packageType: true,
          totalMessages: true,
        },
      },
      okunScores: {
        orderBy: { calculatedAt: "desc" },
        take: 1,
      },
      documents: {
        where: { category: "REPORT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, r2Key: true, createdAt: true, visibility: true },
      },
    },
  });

  if (!company) notFound();

  const analysisSession = company.analysisSessions[0] ?? null;
  const okunScore = company.okunScores[0] ?? null;

  let reportData: Awaited<ReturnType<typeof assembleBlueprintReport>> | null = null;
  if (analysisSession?.status === "COMPLETED") {
    try {
      reportData = await assembleBlueprintReport(analysisSession.id);
    } catch {
      // report assembly may fail if data is incomplete
    }
  }

  const overallScore =
    reportData && reportData.moduleScores.length > 0
      ? Math.round(
          reportData.moduleScores.reduce((s, m) => s + m.score, 0) /
            reportData.moduleScores.length
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      {!analysisSession ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 flex items-center gap-3">
          <AlertCircle size={18} className="text-[#555]" />
          <div>
            <p className="text-[#888] text-sm font-medium">Kein Blueprint 2.0 vorhanden</p>
            <p className="text-[#555] text-xs mt-0.5">Der Kunde hat noch keine Blueprint-Analyse gestartet.</p>
          </div>
          <Link
            href={`/admin/kunden/${id}/blueprint-portal`}
            className="ml-auto text-[#00b8ff] text-xs hover:underline"
          >
            Blueprint starten →
          </Link>
        </div>
      ) : (
        <div
          className={`bg-[#0c1520] border rounded-xl p-5 flex items-center gap-4 ${
            analysisSession.status === "COMPLETED"
              ? "border-[#00b8ff]/30"
              : "border-yellow-500/20"
          }`}
        >
          {analysisSession.status === "COMPLETED" ? (
            <CheckCircle2 size={18} className="text-[#00b8ff] flex-shrink-0" />
          ) : (
            <Clock size={18} className="text-yellow-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-[#f0f0f0] text-sm font-semibold">
              Blueprint 2.0{" "}
              <span
                className={
                  analysisSession.status === "COMPLETED"
                    ? "text-[#00b8ff]"
                    : "text-yellow-400"
                }
              >
                {analysisSession.status === "COMPLETED" ? "Abgeschlossen" : "In Bearbeitung"}
              </span>
            </p>
            <p className="text-[#555] text-xs mt-0.5">
              {reportData
                ? `${reportData.totalAnswered}/${reportData.totalActive} Fragen beantwortet`
                : `${analysisSession.totalMessages} Nachrichten`}
              {analysisSession.completedAt && (
                <> · Abgeschlossen {new Date(analysisSession.completedAt).toLocaleDateString("de-DE")}</>
              )}
            </p>
          </div>
          <Link
            href={`/admin/kunden/${id}/analyse`}
            className="text-[#00b8ff] text-xs hover:underline flex-shrink-0"
          >
            Analyse öffnen →
          </Link>
        </div>
      )}

      {reportData && (
        <>
          {/* Score + Package row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 flex flex-col items-center justify-center">
              <p className="text-[#888] text-xs mb-2">Gesamtergebnis Blueprint</p>
              <p
                className="text-5xl font-bold"
                style={{
                  color:
                    overallScore !== null && overallScore >= 70
                      ? "#00b8ff"
                      : overallScore !== null && overallScore >= 50
                      ? "#f59e0b"
                      : "#ef4444",
                }}
              >
                {overallScore ?? "—"}%
              </p>
            </div>

            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 flex flex-col items-center justify-center">
              <p className="text-[#888] text-xs mb-2">Empfohlenes Paket</p>
              {reportData.packageType ? (
                <p
                  className="text-2xl font-bold text-center"
                  style={{ color: PACKAGE_COLORS[reportData.packageType] ?? "#f0f0f0" }}
                >
                  {PACKAGE_LABELS[reportData.packageType] ?? reportData.packageType}
                </p>
              ) : (
                <p className="text-[#555] text-sm">Kein Paket ermittelt</p>
              )}
            </div>

            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <p className="text-[#888] text-xs mb-3">Signale</p>
              <div className="space-y-2">
                {(
                  [
                    ["WORKFORCE", "Workforce"],
                    ["BEWAEHRTE_LOESUNG", "Bewährte Lösung"],
                    ["CUSTOM_DEVELOPMENT", "Custom Dev"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-[#888] text-xs">{label}</span>
                    <span className="text-[#f0f0f0] text-sm font-bold">
                      {reportData!.signals[key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Module scores */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-[#00b8ff]" />
              Modul-Ergebnisse
            </h2>
            <div className="space-y-3">
              {reportData.moduleScores.map((m) => (
                <div key={m.moduleNumber}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs text-[#888]">
                      M{m.moduleNumber} · {m.label}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{
                        color:
                          m.score >= 70
                            ? "#00b8ff"
                            : m.score >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    >
                      {Math.round(m.score)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#111e30] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(m.score)}%`,
                        backgroundColor:
                          m.score >= 70
                            ? "#00b8ff"
                            : m.score >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {reportData.recommendations.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <Zap size={15} className="text-[#00b8ff]" />
                Lösungsempfehlungen ({reportData.recommendations.length})
              </h2>
              <div className="space-y-2">
                {reportData.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-[#060a10] rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f0f0] text-sm font-medium">{rec.name}</p>
                      <p className="text-[#555] text-xs mt-0.5">{rec.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Roadmap */}
          {reportData.roadmap.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <Target size={15} className="text-[#00b8ff]" />
                Roadmap
              </h2>
              <div className="space-y-3">
                {reportData.roadmap.map((phase, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#00b8ff] text-xs font-bold">{i + 1}</span>
                      </div>
                      {i < reportData!.roadmap.length - 1 && (
                        <div className="w-px flex-1 bg-[#1a2840]" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-[#f0f0f0] text-sm font-medium">{phase.phaseLabel}</p>
                      <p className="text-[#888] text-xs mt-0.5">
                        {PACKAGE_LABELS[phase.packageTier] ?? phase.packageTier}
                      </p>
                      {phase.solutions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {phase.solutions.map((s, j) => (
                            <span
                              key={j}
                              className="text-xs px-2 py-0.5 rounded bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff]"
                            >
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDF actions */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
              <FileDown size={15} className="text-[#00b8ff]" />
              Blueprint-PDF
            </h2>
            <BlueprintReportButton
              sessionId={analysisSession!.id}
              initialReportUrl={analysisSession!.reportUrl}
            />
            <Link
              href={`/blueprint/${analysisSession!.id}/ergebnis`}
              target="_blank"
              className="mt-3 flex items-center gap-1.5 text-xs text-[#00b8ff] hover:underline"
            >
              Kundenseitige Ergebnisseite öffnen →
            </Link>
          </div>
        </>
      )}

      {/* OKUN Score (Blueprint 1.x) */}
      {okunScore && !reportData && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <Brain size={15} className="text-[#00b8ff]" />
            OKUN Score™
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-[#00b8ff]">{okunScore.totalScore}</p>
              <p className="text-[#555] text-xs mt-1">/100</p>
            </div>
            <div>
              <p className="text-[#f0f0f0] text-sm font-medium">{okunScore.maturityLabel}</p>
              <p className="text-[#888] text-xs mt-0.5">{okunScore.maturityLevel}</p>
            </div>
          </div>
          {okunScore.customerSummary && (
            <p className="text-[#888] text-xs leading-relaxed mt-4 p-3 bg-[#060a10] rounded-lg">
              {okunScore.customerSummary}
            </p>
          )}
        </div>
      )}

      {/* No data at all */}
      {!analysisSession && !okunScore && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#555] text-sm text-center py-8">
            Noch keine Analyseergebnisse verfügbar.
          </p>
        </div>
      )}
    </div>
  );
}
