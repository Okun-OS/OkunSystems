import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";

const AREA_LABELS: { key: keyof typeof AREA_MAP; label: string; weight: number }[] = [
  { key: "scoreProcesses",     label: "Prozessqualität",      weight: 25 },
  { key: "scoreSales",         label: "Vertriebsstruktur",     weight: 20 },
  { key: "scoreLeadership",    label: "Führungsstruktur",      weight: 15 },
  { key: "scoreAutomation",    label: "Automatisierungsgrad",  weight: 15 },
  { key: "scoreStructure",     label: "Unternehmensstruktur",  weight: 10 },
  { key: "scoreCommunication", label: "Kommunikation",         weight: 10 },
  { key: "scoreHr",            label: "Personalmanagement",    weight: 5  },
];

const AREA_MAP = {
  scoreProcesses: 0, scoreSales: 0, scoreLeadership: 0,
  scoreAutomation: 0, scoreStructure: 0, scoreCommunication: 0, scoreHr: 0,
};

const MATURITY_CFG: Record<string, { cls: string }> = {
  INITIAL:    { cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  DEVELOPING: { cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  DEFINED:    { cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  MANAGED:    { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPTIMIZED:  { cls: "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20" },
};

export default async function PortalBlueprintPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) redirect("/dashboard");

  const score = await db.okunScore.findFirst({
    where: { companyId: user.companyId, isPublished: true },
    orderBy: { publishedAt: "desc" },
    include: {
      session: {
        select: { completedAt: true },
      },
    },
  });

  if (!score) {
    return (
      <div className="max-w-[700px] mx-auto py-12 px-4">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-10 text-center">
          <FileText size={36} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#f0f0f0] font-semibold mb-2">Noch kein Bericht verfügbar</p>
          <p className="text-[#888] text-sm leading-relaxed">
            Ihr OKUN Blueprint™ Analyse-Bericht wird von Ihrem Berater freigegeben,
            sobald die Analyse abgeschlossen ist.
          </p>
        </div>
      </div>
    );
  }

  let strengths: string[] = [];
  let potentials: string[] = [];
  try { strengths = JSON.parse(score.strengths); } catch {}
  try { potentials = JSON.parse(score.potentials); } catch {}

  const matCfg = MATURITY_CFG[score.maturityLevel] ?? MATURITY_CFG.INITIAL;
  const publishedDate = score.publishedAt
    ? new Date(score.publishedAt).toLocaleDateString("de-DE", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : null;

  const scoreMap = score as typeof score & Record<string, number | null>;

  return (
    <div className="max-w-[700px] mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#f0f0f0]">OKUN Blueprint™ Analyse</h1>
        {publishedDate && (
          <p className="text-[#555] text-sm mt-1">Freigegeben am {publishedDate}</p>
        )}
      </div>

      {/* Score hero */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-[#101c2e] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
          <span className="text-[#00b8ff] text-3xl font-black tabular-nums">
            {score.totalScore}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[#f0f0f0] text-lg font-bold">{score.maturityLabel}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${matCfg.cls}`}>
              {score.maturityLevel}
            </span>
          </div>
          {score.customerSummary && (
            <p className="text-[#888] text-sm leading-relaxed max-w-lg">
              {score.customerSummary}
            </p>
          )}
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Score nach Bereichen</h2>
        <div className="space-y-3">
          {AREA_LABELS.map(({ key, label, weight }) => {
            const val = scoreMap[key] as number | null;
            if (val == null) return null;
            const color = val >= 65 ? "#00b8ff" : val >= 50 ? "#f59e0b" : "#ef4444";
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#888] text-xs">{label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[#555] text-xs">{weight}%</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>
                      {val}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-[#101c2e] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${val}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths + Potentials */}
      {(strengths.length > 0 || potentials.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3">Ihre Stärken</h2>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                    <span className="text-[#00b8ff] flex-shrink-0 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {potentials.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3">Erkannte Potenziale</h2>
              <ul className="space-y-2">
                {potentials.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                    <span className="text-[#555] flex-shrink-0 mt-0.5">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
