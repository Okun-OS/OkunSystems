import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { CheckSquare, Square, MessageSquare, AlertCircle } from "lucide-react";

const MODULE_LABELS: Record<number, string> = {
  1: "Unternehmensprofil",
  2: "Prozessqualität",
  3: "Vertriebsstruktur",
  4: "Führungsstruktur",
  5: "Automatisierungsgrad",
  6: "Unternehmensstruktur",
  7: "Kommunikation",
  8: "Personalmanagement",
};

export default async function BlueprintAntworten({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const analysisSession = await db.analysisSession.findFirst({
    where: { companyId: id, blueprintVersion: "2.0" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, status: true, completedAt: true },
  });

  if (!analysisSession) {
    return (
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
        <AlertCircle size={28} className="text-[#555] mx-auto mb-3" />
        <p className="text-[#888] text-sm">Kein Blueprint 2.0 für diesen Kunden vorhanden.</p>
      </div>
    );
  }

  const sessionAnswers = await db.sessionAnswer.findMany({
    where: { sessionId: analysisSession.id },
    include: {
      question: {
        select: {
          questionDe: true,
          moduleNumber: true,
          order: true,
          externalId: true,
          questionType: true,
          answerOptions: {
            select: { id: true, textDe: true, points: true },
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
    orderBy: { question: { order: "asc" } },
  });

  // Group by module
  const byModule: Record<number, typeof sessionAnswers> = {};
  for (const sa of sessionAnswers) {
    const mod = sa.question.moduleNumber ?? 0;
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(sa);
  }
  const moduleKeys = Object.keys(byModule)
    .map(Number)
    .sort((a, b) => a - b);

  const completedDate = analysisSession.completedAt
    ? new Date(analysisSession.completedAt).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#888] text-sm">
            {sessionAnswers.length} Antworten gespeichert
            {completedDate && <> · Abgeschlossen {completedDate}</>}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
            analysisSession.status === "COMPLETED"
              ? "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20"
              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
          }`}
        >
          {analysisSession.status === "COMPLETED" ? "Abgeschlossen" : "In Bearbeitung"}
        </span>
      </div>

      {moduleKeys.length === 0 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <MessageSquare size={28} className="text-[#555] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Noch keine Antworten vorhanden.</p>
        </div>
      )}

      {moduleKeys.map((mod) => {
        const answers = byModule[mod];
        const label = MODULE_LABELS[mod] ?? `Modul ${mod}`;
        return (
          <div key={mod} className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
            {/* Module header */}
            <div className="px-5 py-3.5 border-b border-[#1a2840] flex items-center gap-3">
              <span className="text-[#00b8ff] text-xs font-mono font-semibold bg-[#00b8ff]/10 px-2 py-0.5 rounded">
                M{mod}
              </span>
              <span className="text-[#f0f0f0] font-semibold text-sm">{label}</span>
              <span className="ml-auto text-[#555] text-xs">{answers.length} Fragen</span>
            </div>

            {/* Questions */}
            <div className="divide-y divide-[#111e30]">
              {answers.map((sa) => {
                let selectedIds: string[] = [];
                try {
                  selectedIds = JSON.parse(sa.selectedOptionIds);
                } catch {}

                const selectedOptions = sa.question.answerOptions.filter((o) =>
                  selectedIds.includes(o.id)
                );
                const hasText = !!sa.freeText?.trim();
                const isProfilingQ = sa.question.questionType === "A";

                return (
                  <div key={sa.id} className="px-5 py-4">
                    {/* Question */}
                    <div className="flex items-start gap-2 mb-3">
                      <span className="text-[#555] text-xs font-mono mt-0.5 flex-shrink-0 w-12">
                        {sa.question.externalId}
                      </span>
                      <p className="text-[#eef2f7] text-sm leading-relaxed flex-1">
                        {sa.question.questionDe}
                      </p>
                      {!isProfilingQ && sa.computedScore !== null && (
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${
                            sa.computedScore >= 70
                              ? "text-[#00b8ff] bg-[#00b8ff]/10"
                              : sa.computedScore >= 40
                              ? "text-yellow-400 bg-yellow-500/10"
                              : "text-red-400 bg-red-500/10"
                          }`}
                        >
                          {sa.computedScore} Pkt.
                        </span>
                      )}
                    </div>

                    {/* Answer options */}
                    {sa.question.answerOptions.length > 0 && (
                      <div className="ml-14 space-y-1.5">
                        {sa.question.answerOptions.map((opt) => {
                          const chosen = selectedIds.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                                chosen
                                  ? "bg-[#00b8ff]/10 border border-[#00b8ff]/20"
                                  : "text-[#555]"
                              }`}
                            >
                              {chosen ? (
                                <CheckSquare size={13} className="text-[#00b8ff] flex-shrink-0" />
                              ) : (
                                <Square size={13} className="text-[#333] flex-shrink-0" />
                              )}
                              <span className={chosen ? "text-[#eef2f7]" : "text-[#555]"}>
                                {opt.textDe}
                              </span>
                              {chosen && !isProfilingQ && opt.points !== 0 && (
                                <span className="ml-auto text-[#00b8ff]/60 text-xs">
                                  {opt.points > 0 ? "+" : ""}
                                  {opt.points}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Free text answer */}
                    {hasText && (
                      <div className="ml-14 mt-2 bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2">
                        <p className="text-[#888] text-xs mb-1">Freitext-Antwort</p>
                        <p className="text-[#eef2f7] text-sm leading-relaxed">{sa.freeText}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
