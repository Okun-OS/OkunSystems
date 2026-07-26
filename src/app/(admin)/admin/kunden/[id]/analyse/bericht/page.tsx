import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";

const AREA_LABELS: Record<string, { label: string; weight: number }> = {
  scoreProcesses:     { label: "Prozessqualität",       weight: 25 },
  scoreSales:         { label: "Vertriebsstruktur",      weight: 20 },
  scoreLeadership:    { label: "Führungsstruktur",       weight: 15 },
  scoreAutomation:    { label: "Automatisierungsgrad",   weight: 15 },
  scoreStructure:     { label: "Unternehmensstruktur",   weight: 10 },
  scoreCommunication: { label: "Kommunikation",          weight: 10 },
  scoreHr:            { label: "Personalmanagement",     weight: 5  },
};

export default async function BerichtPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      analysisSessions: {
        where: { status: "COMPLETED" },
        include: { score: true, opportunities: { orderBy: { priority: "asc" }, take: 8 } },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!company) notFound();

  const session_ = company.analysisSessions[0];
  const score = session_?.score;

  if (!score) {
    return (
      <div className="p-8 text-center text-gray-500">
        Kein abgeschlossener Score für dieses Unternehmen.
      </div>
    );
  }

  let strengths: string[] = [];
  let potentials: string[] = [];
  try { strengths = JSON.parse(score.strengths); } catch {}
  try { potentials = JSON.parse(score.potentials); } catch {}

  const categoryScores = [
    { label: AREA_LABELS.scoreProcesses.label,     weight: AREA_LABELS.scoreProcesses.weight,     val: score.scoreProcesses ?? 0 },
    { label: AREA_LABELS.scoreSales.label,          weight: AREA_LABELS.scoreSales.weight,          val: score.scoreSales ?? 0 },
    { label: AREA_LABELS.scoreLeadership.label,     weight: AREA_LABELS.scoreLeadership.weight,     val: score.scoreLeadership ?? 0 },
    { label: AREA_LABELS.scoreAutomation.label,     weight: AREA_LABELS.scoreAutomation.weight,     val: score.scoreAutomation ?? 0 },
    { label: AREA_LABELS.scoreStructure.label,      weight: AREA_LABELS.scoreStructure.weight,      val: score.scoreStructure ?? 0 },
    { label: AREA_LABELS.scoreCommunication.label,  weight: AREA_LABELS.scoreCommunication.weight,  val: score.scoreCommunication ?? 0 },
    { label: AREA_LABELS.scoreHr.label,             weight: AREA_LABELS.scoreHr.weight,             val: score.scoreHr ?? 0 },
  ];

  const completedDate = session_?.completedAt
    ? new Date(session_.completedAt).toLocaleDateString("de-DE", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "–";

  const impactLabel: Record<string, string> = {
    VERY_HIGH: "Sehr hoch", HIGH: "Hoch", MEDIUM: "Mittel", LOW: "Niedrig",
  };

  return (
    <>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 20mm; size: A4; }
        }
        body { font-family: 'Inter', system-ui, sans-serif; }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          id="printBtn"
        >
          Als PDF drucken
        </button>
        <script dangerouslySetInnerHTML={{ __html: `document.getElementById('printBtn').addEventListener('click', () => window.print())` }} />
      </div>

      <div className="max-w-[800px] mx-auto p-8 bg-white text-gray-900 min-h-screen print:p-0">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OKUN Blueprint™ Analyse-Bericht</h1>
              <p className="text-gray-500 text-sm mt-1">{company.name}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Analyse abgeschlossen</p>
              <p className="text-gray-700 text-sm font-medium">{completedDate}</p>
            </div>
          </div>
        </div>

        {/* OKUN Score */}
        <div className="bg-gray-50 rounded-xl p-6 mb-8 flex items-center gap-8">
          <div className="text-center">
            <p className="text-6xl font-black text-gray-900">{score.totalScore}</p>
            <p className="text-gray-500 text-sm mt-1">OKUN Score</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{score.maturityLabel}</p>
            <p className="text-gray-500 text-sm mt-1">Reifegrad {score.maturityLevel}</p>
            {score.customerSummary && (
              <p className="text-gray-600 text-sm mt-3 leading-relaxed max-w-md">{score.customerSummary}</p>
            )}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-4">Score nach Bereichen</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs text-gray-500 pb-2 font-medium">Bereich</th>
                <th className="text-right text-xs text-gray-500 pb-2 font-medium">Gewichtung</th>
                <th className="text-right text-xs text-gray-500 pb-2 font-medium">Score</th>
                <th className="w-32 text-right text-xs text-gray-500 pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {categoryScores.map((c) => {
                const color = c.val >= 65 ? "#16a34a" : c.val >= 50 ? "#d97706" : "#dc2626";
                return (
                  <tr key={c.label} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-800 font-medium">{c.label}</td>
                    <td className="py-3 text-sm text-gray-500 text-right">{c.weight}%</td>
                    <td className="py-3 text-sm font-bold text-right" style={{ color }}>{c.val}</td>
                    <td className="py-3 pl-4">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${c.val}%`, backgroundColor: color }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Strengths + Potentials */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {strengths.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Stärken</h2>
              <ul className="space-y-2">
                {strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-600 flex-shrink-0 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {potentials.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">Erkannte Potenziale</h2>
              <ul className="space-y-2">
                {potentials.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-600 flex-shrink-0 mt-0.5">→</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Opportunities */}
        {session_?.opportunities && session_.opportunities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">Optimierungspotenziale</h2>
            <div className="space-y-3">
              {session_.opportunities.map((opp) => (
                <div key={opp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{opp.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{opp.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-green-700">
                        {impactLabel[opp.impact] ?? opp.impact}
                      </p>
                      <p className="text-xs text-gray-500">{opp.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internal summary (admin only) */}
        {score.internalSummary && (
          <div className="border border-orange-200 bg-orange-50 rounded-xl p-5 mb-8">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">
              Interne Notizen (nicht für Kunden)
            </p>
            <p className="text-sm text-orange-900 leading-relaxed">{score.internalSummary}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 flex items-center justify-between">
          <p className="text-gray-400 text-xs">OKUN Systems · OKUN Blueprint™ Analyse</p>
          <p className="text-gray-400 text-xs">{completedDate}</p>
        </div>
      </div>
    </>
  );
}
