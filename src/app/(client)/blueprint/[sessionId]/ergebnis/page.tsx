import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileDown, TrendingUp, Users, Wrench, Code2 } from "lucide-react";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";

const SIGNAL_META: Record<string, { label: string; icon: string }> = {
  WORKFORCE: { label: "Workforce Management", icon: "users" },
  BEWAEHRTE_LOESUNG: { label: "Bewährte Lösungen", icon: "wrench" },
  CUSTOM_DEVELOPMENT: { label: "Individuelle Entwicklung", icon: "code" },
};

const TIER_LABELS: Record<string, string> = {
  foundation: "Foundation",
  operations: "Operations",
  custom: "Custom Development",
};

const TIER_COLORS: Record<string, string> = {
  foundation: "#00b8ff",
  operations: "#3b82f6",
  custom: "#a855f7",
};

function ScoreBar({ score, color = "#00b8ff" }: { score: number; color?: string }) {
  const pct = Math.round(Math.max(0, Math.min(100, score)));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#111e30] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-semibold text-[#f0f0f0] w-12 text-right">
        {pct}%
      </span>
    </div>
  );
}

export default async function BlueprintErgebnisPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  // Clients must not see Blueprint results before the strategy session
  if (role !== "ADMIN") {
    redirect(`/blueprint/${sessionId}/abgeschlossen`);
  }

  const user = await db.user.findUnique({ where: { id: userId } });

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true, blueprintVersion: true, reportUrl: true },
  });

  if (!analysisSession) redirect("/blueprint");

  // Admins can view any session; clients only their company's session
  if (role !== "ADMIN" && analysisSession.companyId !== user?.companyId) {
    redirect("/blueprint");
  }

  if (analysisSession.blueprintVersion !== "2.0") redirect("/analyse");

  if (analysisSession.status !== "COMPLETED") {
    redirect(`/blueprint/${sessionId}`);
  }

  const data = await assembleBlueprintReport(sessionId);

  const overallScore =
    data.moduleScores.length > 0
      ? Math.round(
          data.moduleScores.reduce((s, m) => s + m.score, 0) / data.moduleScores.length
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto pt-6 pb-16 px-4 space-y-6">
      {/* Header */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[#888] text-xs mb-1">OKUN Blueprint™ 2.0</p>
            <h1 className="text-lg font-bold text-[#f0f0f0]">{data.company.name}</h1>
            {data.company.industry && (
              <p className="text-[#555] text-sm mt-0.5">{data.company.industry}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[#888] text-xs mb-1">Gesamtergebnis</p>
            <p className="text-3xl font-bold text-[#00b8ff]">{overallScore}%</p>
            <p className="text-[#555] text-xs mt-0.5">
              {data.totalAnswered} / {data.totalActive} Fragen
            </p>
          </div>
        </div>

        {analysisSession.reportUrl && (
          <a
            href={analysisSession.reportUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-xl py-3 justify-center transition-colors"
          >
            <FileDown size={16} />
            Blueprint-Bericht herunterladen (PDF)
          </a>
        )}
      </div>

      {/* Module Scores */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#00b8ff]" />
          Modul-Ergebnisse
        </h2>
        <div className="space-y-3">
          {data.moduleScores.map((m) => (
            <div key={m.moduleNumber}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[#888]">
                  M{m.moduleNumber} · {m.label}
                </span>
              </div>
              <ScoreBar
                score={m.score}
                color={m.moduleNumber === 5 ? "#3b82f6" : "#00b8ff"}
              />
            </div>
          ))}
        </div>

        {/* M5 Group Breakdown */}
        {data.m5GroupScores.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#111e30]">
            <p className="text-xs text-[#888] mb-3">
              M5 Automatisierungsgrad — Gruppendetail
              <span className="ml-2 text-[#3b82f6] font-semibold">
                {Math.round(data.m5NormalizedScore)}% (normalisiert)
              </span>
            </p>
            <div className="space-y-2">
              {data.m5GroupScores.map((g) => (
                <div key={g.groupCode}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-xs text-[#666]">
                      {g.groupCode}
                      <span className="text-[#444] ml-1">
                        (Gewicht {g.weight})
                      </span>
                    </span>
                  </div>
                  <ScoreBar score={g.score} color="#3b82f6" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Signal Totals */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">
          Lösungssignale
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {(["WORKFORCE", "BEWAEHRTE_LOESUNG", "CUSTOM_DEVELOPMENT"] as const).map(
            (cat) => {
              const meta = SIGNAL_META[cat];
              const value = data.signals[cat];
              return (
                <div
                  key={cat}
                  className="bg-[#101c2e] border border-[#1a2840] rounded-xl p-4 text-center"
                >
                  <p className="text-2xl font-bold text-[#f0f0f0] mb-1">
                    {value}
                  </p>
                  <p className="text-[#555] text-xs leading-tight">{meta.label}</p>
                </div>
              );
            }
          )}
        </div>

        {data.packageType && (
          <div className="mt-4 bg-[#101c2e] border border-[#1a2840] rounded-xl p-4">
            <p className="text-xs text-[#888] mb-1">Empfohlenes Paket</p>
            <p
              className="text-sm font-semibold"
              style={{ color: TIER_COLORS[data.packageType] ?? "#f0f0f0" }}
            >
              {TIER_LABELS[data.packageType] ?? data.packageType}
            </p>
          </div>
        )}
      </div>

      {/* Roadmap */}
      {data.roadmap.length > 0 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">
            Lösungsroadmap
          </h2>
          <div className="space-y-5">
            {data.roadmap.map((phase) => (
              <div key={phase.phaseLabel}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        TIER_COLORS[phase.packageTier] ?? "#888",
                    }}
                  />
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: TIER_COLORS[phase.packageTier] ?? "#888" }}
                  >
                    {phase.phaseLabel}
                  </p>
                </div>
                <div className="space-y-2 pl-4">
                  {phase.solutions.map((sol) => (
                    <div
                      key={sol.solutionId}
                      className="bg-[#101c2e] border border-[#1a2840] rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-[#f0f0f0]">
                            {sol.name}
                          </p>
                          <p className="text-xs text-[#666] mt-0.5">
                            {sol.category}
                          </p>
                          <p className="text-xs text-[#888] mt-2 leading-relaxed">
                            {sol.description}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[#00b8ff] shrink-0">
                          {sol.signalScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Link
          href="/termine"
          className="w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
        >
          Strategiegespräch buchen
        </Link>
        <Link
          href="/dashboard"
          className="w-full bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#ccc] hover:text-[#f0f0f0] font-medium text-sm rounded-xl py-3 flex items-center justify-center transition-colors"
        >
          Zum Dashboard
        </Link>
      </div>
    </div>
  );
}
