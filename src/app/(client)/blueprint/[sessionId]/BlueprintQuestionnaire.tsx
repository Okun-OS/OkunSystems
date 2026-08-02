"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBlueprintAnswer } from "../actions";
import { ChevronRight, Check, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Options whose text implies the user should provide additional details
const FREE_TEXT_TRIGGER_PATTERNS = [
  "bitte angeben",
  "angeben welche",
  "angeben welches",
  "freitext",
  "sonstiges",
  "andere lösung",
  "welche anwendungen",
];

function requiresFreeTextInput(optionText: string): boolean {
  const lower = optionText.toLowerCase();
  return FREE_TEXT_TRIGGER_PATTERNS.some((p) => lower.includes(p));
}

interface QuestionOption {
  id: string;
  externalId: string;
  textDe: string;
  isExclusive: boolean;
}

interface QuestionProps {
  id: string;
  externalId: string;
  questionDe: string;
  questionType: string;
  isMultiSelect: boolean;
  maxSelections: number | null;
  options: QuestionOption[];
}

interface BlueprintQuestionnaireProps {
  sessionId: string;
  question: QuestionProps;
  currentModule: number;
  moduleLabel: string;
  moduleNumbers: number[];
  answeredByModule: Record<number, number>;
  totalByModule: Record<number, number>;
  totalActive: number;
  totalAnswered: number;
}

export default function BlueprintQuestionnaire({
  sessionId,
  question,
  currentModule,
  moduleLabel,
  moduleNumbers,
  answeredByModule,
  totalByModule,
  totalActive,
  totalAnswered,
}: BlueprintQuestionnaireProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState("");
  const [conditionalTexts, setConditionalTexts] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

  const isFreeTextOnly = question.options.length === 0;

  // An option that requires a text suffix when selected
  const selectedNeedingText = question.options.filter(
    (o) => selected.has(o.id) && requiresFreeTextInput(o.textDe)
  );

  // Whether all conditional text fields are filled
  const conditionalTextsFilled = selectedNeedingText.every(
    (o) => (conditionalTexts[o.id] ?? "").trim().length > 0
  );

  const canSubmit =
    !isPending &&
    (isFreeTextOnly
      ? freeText.trim().length > 0
      : selected.size > 0 && conditionalTextsFilled);

  const progressPct = totalActive > 0 ? Math.round((totalAnswered / totalActive) * 100) : 0;

  function toggleOption(optionId: string, isExclusive: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (question.isMultiSelect) {
        if (isExclusive) {
          return next.has(optionId) ? new Set() : new Set([optionId]);
        }
        const exclusiveIds = question.options
          .filter((o) => o.isExclusive)
          .map((o) => o.id);
        for (const id of exclusiveIds) next.delete(id);

        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          if (question.maxSelections && next.size >= question.maxSelections) return prev;
          next.add(optionId);
        }
        return next;
      } else {
        return new Set([optionId]);
      }
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      // Build combined free text: base text + any conditional texts
      const parts: string[] = [];
      if (isFreeTextOnly && freeText.trim()) {
        parts.push(freeText.trim());
      }
      for (const opt of selectedNeedingText) {
        const val = (conditionalTexts[opt.id] ?? "").trim();
        if (val) parts.push(`${opt.textDe}: ${val}`);
      }
      const combinedFreeText = parts.length > 0 ? parts.join("\n") : undefined;

      await submitBlueprintAnswer(
        sessionId,
        question.id,
        [...selected],
        combinedFreeText
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Module progress header */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#f0f0f0] text-xs font-semibold">{moduleLabel}</span>
          <span className="text-[#888] text-xs">
            {totalAnswered} / {totalActive} Fragen
          </span>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          {moduleNumbers.map((m) => {
            const answered = answeredByModule[m] ?? 0;
            const total = totalByModule[m] ?? 0;
            const isCompleted = answered >= total && total > 0;
            const isCurrent = m === currentModule;
            return (
              <div
                key={m}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-all",
                  isCompleted ? "bg-[#22c55e]" : isCurrent ? "bg-[#22c55e]/50" : "bg-[#2a2a2a]"
                )}
              />
            );
          })}
        </div>

        <div className="h-0.5 bg-[#1e1e1e] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[#22c55e] text-xs font-medium bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-md px-2.5 py-1">
            M{currentModule} · {moduleLabel}
          </span>
          <div className="flex items-center gap-2">
            {question.isMultiSelect && !isFreeTextOnly && (
              <span className="text-[#888] text-xs">
                {question.maxSelections
                  ? `Bis zu ${question.maxSelections} auswählen`
                  : "Mehrfachauswahl möglich"}
              </span>
            )}
            <button
              onClick={() => setShowHelp(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
              title="Hilfe zu dieser Frage"
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </div>

        <h2 className="text-[#f0f0f0] text-base font-semibold leading-relaxed mb-6">
          {question.questionDe}
        </h2>

        {/* Free-text only question (e.g. M1.13 with empty options) */}
        {isFreeTextOnly ? (
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            disabled={isPending}
            placeholder="Bitte geben Sie hier Ihre Antwort ein…"
            rows={4}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#22c55e]/50 resize-none disabled:opacity-50"
          />
        ) : (
          <div className="space-y-2">
            {question.options.map((opt) => {
              const isSelected = selected.has(opt.id);
              const needsText = isSelected && requiresFreeTextInput(opt.textDe);

              return (
                <div key={opt.id}>
                  <button
                    onClick={() => toggleOption(opt.id, opt.isExclusive)}
                    disabled={isPending}
                    className={cn(
                      "w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-lg border transition-all duration-150",
                      isSelected
                        ? "border-[#22c55e]/50 bg-[#22c55e]/8 text-[#f0f0f0]"
                        : "border-[#2a2a2a] bg-[#0d0d0d] text-[#ccc] hover:border-[#3a3a3a] hover:text-[#f0f0f0] hover:bg-[#141414]",
                      isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-all",
                        question.isMultiSelect ? "rounded" : "rounded-full",
                        isSelected
                          ? "bg-[#22c55e] border-[#22c55e]"
                          : "border-[#3a3a3a] bg-transparent"
                      )}
                    >
                      {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                    </div>
                    <span className="text-sm leading-snug">{opt.textDe}</span>
                  </button>

                  {/* Conditional text field for "bitte angeben" options */}
                  {needsText && (
                    <input
                      type="text"
                      value={conditionalTexts[opt.id] ?? ""}
                      onChange={(e) =>
                        setConditionalTexts((prev) => ({ ...prev, [opt.id]: e.target.value }))
                      }
                      disabled={isPending}
                      placeholder="Bitte angeben…"
                      className="mt-1.5 ml-7 w-[calc(100%-1.75rem)] bg-[#0d0d0d] border border-[#22c55e]/30 rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#22c55e]/60 disabled:opacity-50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "mt-6 w-full font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-all",
            canSubmit
              ? "bg-[#22c55e] hover:bg-[#16a34a] text-black"
              : "bg-[#1a1a1a] text-[#444] cursor-not-allowed border border-[#2a2a2a]"
          )}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Speichern…
            </span>
          ) : (
            <>
              Weiter
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-[#22c55e]" />
                <h3 className="text-[#f0f0f0] font-semibold text-sm">Hilfe zu dieser Frage</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4 mb-4">
              <p className="text-[#888] text-xs font-medium mb-1">Frage</p>
              <p className="text-[#f0f0f0] text-sm leading-relaxed">{question.questionDe}</p>
            </div>

            <div className="space-y-3 text-sm text-[#888] leading-relaxed">
              <p>
                Mit dieser Frage erfassen wir, wie Ihr Unternehmen in diesem Bereich aktuell
                aufgestellt ist. Wählen Sie die Antwort, die Ihrer tatsächlichen Situation am
                nächsten kommt — es gibt kein Richtig oder Falsch.
              </p>
              <p>
                Ihre Angaben fließen in den OKUN Blueprint™ ein und helfen uns, Ihre individuelle
                Analyse und Handlungsempfehlungen möglichst passgenau zu gestalten.
              </p>
              {question.options.length === 0 && (
                <p className="text-[#f0f0f0]">
                  Schreiben Sie einfach auf, welche Tools oder Systeme Sie nutzen — auch
                  Softwarenamen, Apps oder Online-Dienste sind hilfreich.
                </p>
              )}
            </div>

            <p className="text-[#555] text-xs mt-4">
              Frage-ID: {question.externalId}
            </p>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#f0f0f0] text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
