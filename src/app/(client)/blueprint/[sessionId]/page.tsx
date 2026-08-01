import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { evaluateSession, getNextPendingQuestion } from "@/lib/blueprint/branching-engine";
import { loadBlueprintQuestions, loadSessionAnswers } from "@/lib/blueprint/loader";
import BlueprintQuestionnaire from "./BlueprintQuestionnaire";
import { completeBlueprintSession } from "../actions";

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

export default async function BlueprintSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  // Verify session ownership and version
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true, blueprintVersion: true },
  });

  if (!analysisSession || analysisSession.companyId !== user.companyId) {
    redirect("/blueprint");
  }
  if (analysisSession.blueprintVersion !== "2.0") redirect("/analyse");
  if (analysisSession.status === "COMPLETED") {
    redirect(`/blueprint/${sessionId}/abgeschlossen`);
  }

  // Load all blueprint questions and current session answers in parallel
  const [questions, sessionAnswers] = await Promise.all([
    loadBlueprintQuestions(),
    loadSessionAnswers(sessionId),
  ]);

  // Guard: seed not yet run — render error instead of redirecting
  // (redirecting to /blueprint causes a loop because the start page
  // redirects back here as long as this session is ACTIVE)
  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto pt-8">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 text-center">
          <p className="text-[#f0f0f0] text-sm font-medium mb-2">
            Fragebogen wird eingerichtet
          </p>
          <p className="text-[#888] text-sm leading-relaxed">
            Die Fragen werden gerade in das System geladen. Bitte laden Sie
            diese Seite in wenigen Minuten neu.
          </p>
        </div>
      </div>
    );
  }

  const evaluated = evaluateSession(questions, sessionAnswers);
  const next = getNextPendingQuestion(evaluated);

  // No more pending questions → complete the session
  if (!next) {
    await completeBlueprintSession(sessionId);
    redirect(`/blueprint/${sessionId}/abgeschlossen`);
  }

  // Load the question text (stored on QuestionTemplate, not included in loader)
  const fullQuestion = await db.questionTemplate.findUnique({
    where: { id: next.questionId },
    select: { questionDe: true },
  });

  // Determine scoring mode directives from activationConds
  const questionRow = questions.find((r) => r.id === next.questionId)!;
  const conds: Array<{ type: string; mode?: string; max?: number }> = (() => {
    try { return JSON.parse(questionRow.activationConds || "[]"); }
    catch { return []; }
  })();
  const isMultiSelect = conds.some(
    (c) => c.type === "SCORE_MODE" && c.mode === "MULTI_SELECT"
  );
  const maxSelections = conds.find((c) => c.type === "MAX_SELECTIONS")?.max ?? null;

  // Module progress data
  const activeQuestions = evaluated.filter((q) => q.isActive && q.moduleNumber !== null);
  const moduleNumbers = [
    ...new Set(activeQuestions.map((q) => q.moduleNumber!)),
  ].sort((a, b) => a - b);

  const answeredByModule: Record<number, number> = {};
  const totalByModule: Record<number, number> = {};
  for (const q of activeQuestions) {
    const m = q.moduleNumber!;
    totalByModule[m] = (totalByModule[m] ?? 0) + 1;
    if (q.status === "ANSWERED") {
      answeredByModule[m] = (answeredByModule[m] ?? 0) + 1;
    }
  }

  const totalActive = activeQuestions.length;
  const totalAnswered = activeQuestions.filter((q) => q.status === "ANSWERED").length;
  const currentModule = next.moduleNumber ?? 1;

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <BlueprintQuestionnaire
        sessionId={sessionId}
        question={{
          id: next.questionId,
          externalId: next.externalId,
          questionDe: fullQuestion?.questionDe ?? "",
          isMultiSelect,
          maxSelections,
          options: questionRow.answerOptions.map((opt) => ({
            id: opt.id,
            externalId: opt.externalId,
            textDe: opt.textDe,
            isExclusive: opt.isExclusive,
          })),
        }}
        currentModule={currentModule}
        moduleLabel={MODULE_LABELS[currentModule] ?? `Modul ${currentModule}`}
        moduleNumbers={moduleNumbers}
        answeredByModule={answeredByModule}
        totalByModule={totalByModule}
        totalActive={totalActive}
        totalAnswered={totalAnswered}
      />
    </div>
  );
}
