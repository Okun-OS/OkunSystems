"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitBlueprintAnswer } from "../actions";
import { ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const canSubmit = selected.size > 0 && !isPending;
  const progressPct = totalActive > 0 ? Math.round((totalAnswered / totalActive) * 100) : 0;

  function toggleOption(optionId: string, isExclusive: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (question.isMultiSelect) {
        if (isExclusive) {
          // Exclusive option clears all others and selects only itself
          return next.has(optionId) ? new Set() : new Set([optionId]);
        }
        // Deselect any exclusive option when selecting a non-exclusive one
        const exclusiveIds = question.options
          .filter((o) => o.isExclusive)
          .map((o) => o.id);
        for (const id of exclusiveIds) next.delete(id);

        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          // Respect MAX_SELECTIONS
          if (question.maxSelections && next.size >= question.maxSelections) return prev;
          next.add(optionId);
        }
        return next;
      } else {
        // Single-select: only one at a time
        return new Set([optionId]);
      }
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      await submitBlueprintAnswer(sessionId, question.id, [...selected]);
      router.refresh();
    });
  }

  const moduleCount = moduleNumbers.length;
  const currentModuleIndex = moduleNumbers.indexOf(currentModule);

  return (
    <div className="space-y-5">
      {/* Module progress header */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#f0f0f0] text-xs font-semibold">
            {moduleLabel}
          </span>
          <span className="text-[#888] text-xs">
            {totalAnswered} / {totalActive} Fragen
          </span>
        </div>

        {/* Module dots */}
        <div className="flex items-center gap-1.5 mb-3">
          {moduleNumbers.map((m, i) => {
            const answered = answeredByModule[m] ?? 0;
            const total = totalByModule[m] ?? 0;
            const isCompleted = answered >= total && total > 0;
            const isCurrent = m === currentModule;

            return (
              <div
                key={m}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-all",
                  isCompleted
                    ? "bg-[#22c55e]"
                    : isCurrent
                    ? "bg-[#22c55e]/50"
                    : "bg-[#2a2a2a]"
                )}
              />
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="h-0.5 bg-[#1e1e1e] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22c55e] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        {/* Module badge */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[#22c55e] text-xs font-medium bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-md px-2.5 py-1">
            M{currentModule} · {moduleLabel}
          </span>
          {question.isMultiSelect && (
            <span className="text-[#888] text-xs">
              {question.maxSelections
                ? `Bis zu ${question.maxSelections} auswählen`
                : "Mehrfachauswahl möglich"}
            </span>
          )}
        </div>

        {/* Question text */}
        <h2 className="text-[#f0f0f0] text-base font-semibold leading-relaxed mb-6">
          {question.questionDe}
        </h2>

        {/* Options */}
        <div className="space-y-2">
          {question.options.map((opt) => {
            const isSelected = selected.has(opt.id);

            return (
              <button
                key={opt.id}
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
                {/* Checkbox / radio indicator */}
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
            );
          })}
        </div>

        {/* Submit button */}
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
    </div>
  );
}
