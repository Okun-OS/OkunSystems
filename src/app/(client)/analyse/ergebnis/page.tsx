import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

const AREA_LABELS: Record<string, { label: string; key: string }> = {
  scoreProcesses:      { label: "Prozessqualität",        key: "prozesse" },
  scoreSales:          { label: "Vertriebsstruktur",       key: "vertrieb" },
  scoreLeadership:     { label: "Führungsstruktur",        key: "fuehrung" },
  scoreAutomation:     { label: "Automatisierungsgrad",    key: "automatisierung" },
  scoreStructure:      { label: "Unternehmensstruktur",    key: "struktur" },
  scoreCommunication:  { label: "Kommunikation",           key: "kommunikation" },
  scoreHr:             { label: "Personalmanagement",      key: "personal" },
};

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 80 ? "#00b8ff" :
    score >= 65 ? "#86efac" :
    score >= 50 ? "#fbbf24" :
    score >= 35 ? "#f97316" :
                  "#ef4444";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#111e30" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="70" y="65" textAnchor="middle" fill="#f0f0f0" fontSize="28" fontWeight="700">
        {score}
      </text>
      <text x="70" y="85" textAnchor="middle" fill="#888" fontSize="12">
        / 100
      </text>
    </svg>
  );
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  const color =
    score >= 65 ? "#00b8ff" :
    score >= 50 ? "#fbbf24" :
                  "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[#ccc] text-xs">{label}</span>
        <span className="text-[#f0f0f0] text-xs font-semibold">{score}</span>
      </div>
      <div className="h-1.5 bg-[#111e30] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default async function ErgebnisPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const companyId = user.companyId;

  const analysisSession = await db.analysisSession.findFirst({
    where: { companyId, status: "COMPLETED" },
    include: { score: true },
    orderBy: { completedAt: "desc" },
  });

  if (!analysisSession?.score) {
    // No completed analysis yet — redirect to start analysis
    redirect("/analyse");
  }

  const s = analysisSession.score;

  let strengths: string[] = [];
  let potentials: string[] = [];
  try { strengths = JSON.parse(s.strengths); } catch {}
  try { potentials = JSON.parse(s.potentials); } catch {}

  const opportunities = await db.opportunity.findMany({
    where: { sessionId: analysisSession.id, isInternal: false },
    orderBy: { priority: "asc" },
    take: 5,
  });

  const categoryScores = [
    { label: AREA_LABELS.scoreProcesses.label,     score: s.scoreProcesses ?? 40 },
    { label: AREA_LABELS.scoreSales.label,          score: s.scoreSales ?? 40 },
    { label: AREA_LABELS.scoreLeadership.label,     score: s.scoreLeadership ?? 40 },
    { label: AREA_LABELS.scoreAutomation.label,     score: s.scoreAutomation ?? 40 },
    { label: AREA_LABELS.scoreStructure.label,      score: s.scoreStructure ?? 40 },
    { label: AREA_LABELS.scoreCommunication.label,  score: s.scoreCommunication ?? 40 },
    { label: AREA_LABELS.scoreHr.label,             score: s.scoreHr ?? 40 },
  ];

  const impactLabel: Record<string, string> = {
    VERY_HIGH: "Sehr hoch", HIGH: "Hoch", MEDIUM: "Mittel", LOW: "Niedrig",
  };
  const effortLabel: Record<string, string> = {
    LOW: "Geringer Aufwand", MEDIUM: "Mittlerer Aufwand", HIGH: "Hoher Aufwand",
  };
  const typeLabel: Record<string, string> = {
    AUTOMATION: "Automatisierung",
    DELEGATION: "Delegation",
    STANDARDIZATION: "Standardisierung",
    TRANSPARENCY: "Transparenz",
    SCALING: "Skalierung",
  };

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">OKUN Blueprint™ Ergebnis</h1>
        <p className="text-[#888] text-sm mt-1">
          Ihre Unternehmensanalyse wurde abgeschlossen.
          Abgeschlossen am{" "}
          {analysisSession.completedAt
            ? new Date(analysisSession.completedAt).toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "–"}
        </p>
      </div>

      {/* Score + maturity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 flex items-center gap-6">
          <ScoreRing score={s.totalScore} />
          <div>
            <p className="text-[#888] text-xs mb-1">OKUN Score</p>
            <p className="text-[#f0f0f0] text-xl font-bold">{s.maturityLabel}</p>
            <p className="text-[#555] text-xs mt-1">Reifegrad: {s.maturityLevel}</p>
          </div>
        </div>

        {/* CTA card */}
        <div className="bg-[#00b8ff]/5 border border-[#00b8ff]/20 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-[#00b8ff] text-xs font-semibold uppercase tracking-wider mb-2">
              Nächster Schritt
            </p>
            <h2 className="text-[#f0f0f0] text-lg font-semibold leading-snug">
              Persönliches Strategiegespräch
            </h2>
            <p className="text-[#888] text-sm mt-2">
              In einem kostenlosen Gespräch besprechen wir Ihre Ergebnisse und zeigen konkrete
              Maßnahmen mit echtem ROI. Frühester Termin: 3 Werktage ab heute.
            </p>
          </div>
          <Link
            href="/termine"
            className="mt-4 inline-flex items-center justify-center gap-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <CalendarDays size={15} />
            Termin buchen
          </Link>
        </div>
      </div>

      {/* Category scores */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-4">
        <h3 className="text-[#f0f0f0] font-semibold text-sm mb-4">Analyse nach Bereichen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {categoryScores.map((c) => (
            <CategoryBar key={c.label} label={c.label} score={c.score} />
          ))}
        </div>
      </div>

      {/* Strengths + Potentials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {strengths.length > 0 && (
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-3">
              ✓ Ihre Stärken
            </h3>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                  <span className="text-[#00b8ff] mt-0.5 flex-shrink-0">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {potentials.length > 0 && (
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h3 className="text-[#f0f0f0] font-semibold text-sm mb-3">
              → Erkannte Potenziale
            </h3>
            <ul className="space-y-2">
              {potentials.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#ccc]">
                  <span className="text-[#fbbf24] mt-0.5 flex-shrink-0">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Top opportunities (non-internal only) */}
      {opportunities.length > 0 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-4">
          <h3 className="text-[#f0f0f0] font-semibold text-sm mb-4">
            Erkannte Optimierungspotenziale
          </h3>
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="flex items-start gap-4 p-3 bg-[#060a10] border border-[#222] rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[#f0f0f0] text-sm font-medium">{opp.title}</span>
                    <span className="text-[#555] text-xs px-2 py-0.5 bg-[#111e30] rounded-full">
                      {typeLabel[opp.type] ?? opp.type}
                    </span>
                  </div>
                  <p className="text-[#888] text-xs leading-relaxed">{opp.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[#00b8ff] text-xs font-semibold">
                    {impactLabel[opp.impact] ?? opp.impact}
                  </p>
                  <p className="text-[#555] text-xs mt-0.5">
                    {effortLabel[opp.effort] ?? opp.effort}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <p className="text-[#555] text-xs leading-relaxed">
          Dies ist eine automatisch erstellte Erstbewertung auf Basis Ihrer Angaben. Die genaue
          Auswertung und konkrete Handlungsempfehlungen erhalten Sie im persönlichen
          Strategiegespräch mit Ihrem OKUN-Berater.
        </p>
      </div>
    </div>
  );
}
