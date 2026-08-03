"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitBlueprintAnswer, undoBlueprintAnswer } from "../actions";
import { ChevronRight, ChevronLeft, Check, HelpCircle, X, Send, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface HelpMessage {
  role: "user" | "assistant";
  content: string;
}

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
  const [isGoingBack, setIsGoingBack] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [freeText, setFreeText] = useState("");
  const [conditionalTexts, setConditionalTexts] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [helpMessages, setHelpMessages] = useState<HelpMessage[]>([]);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpInput, setHelpInput] = useState("");
  const helpScrollRef = useRef<HTMLDivElement>(null);

  const isFreeTextOnly = question.options.length === 0;

  async function fetchHelpExplanation(
    conversationHistory: HelpMessage[],
    userMessage?: string
  ) {
    setHelpLoading(true);
    try {
      const res = await fetch("/api/blueprint/question-help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          sessionId,
          userMessage,
          conversationHistory,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setHelpMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.explanation },
        ]);
      }
    } catch {
      setHelpMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Entschuldigung, die KI ist momentan nicht erreichbar. Bitte versuchen Sie es später erneut." },
      ]);
    } finally {
      setHelpLoading(false);
    }
  }

  useEffect(() => {
    if (showHelp && helpMessages.length === 0) {
      fetchHelpExplanation([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHelp]);

  useEffect(() => {
    if (helpScrollRef.current) {
      helpScrollRef.current.scrollTop = helpScrollRef.current.scrollHeight;
    }
  }, [helpMessages, helpLoading]);

  function handleOpenHelp() {
    setHelpMessages([]);
    setHelpInput("");
    setShowHelp(true);
  }

  async function handleHelpSend() {
    const msg = helpInput.trim();
    if (!msg || helpLoading) return;
    const userMsg: HelpMessage = { role: "user", content: msg };
    const newHistory = [...helpMessages, userMsg];
    setHelpMessages(newHistory);
    setHelpInput("");
    await fetchHelpExplanation(helpMessages, msg);
  }

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

  async function handleBack() {
    setIsGoingBack(true);
    try {
      await undoBlueprintAnswer(sessionId);
      router.refresh();
    } finally {
      setIsGoingBack(false);
    }
  }

  function handleSaveAndExit() {
    router.push("/blueprint");
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
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
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
                  isCompleted ? "bg-[#00b8ff]" : isCurrent ? "bg-[#00b8ff]/50" : "bg-[#1a2840]"
                )}
              />
            );
          })}
        </div>

        <div className="h-0.5 bg-[#111e30] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00b8ff] rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[#00b8ff] text-xs font-medium bg-[#00b8ff]/10 border border-[#00b8ff]/20 rounded-md px-2.5 py-1">
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
              onClick={handleOpenHelp}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[#555] hover:text-[#888] hover:bg-[#101c2e] transition-colors"
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
            className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-4 py-3 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/50 resize-none disabled:opacity-50"
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
                        ? "border-[#00b8ff]/50 bg-[#00b8ff]/8 text-[#f0f0f0]"
                        : "border-[#1a2840] bg-[#060a10] text-[#ccc] hover:border-[#3a3a3a] hover:text-[#f0f0f0] hover:bg-[#0c1520]",
                      isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-all",
                        question.isMultiSelect ? "rounded" : "rounded-full",
                        isSelected
                          ? "bg-[#00b8ff] border-[#00b8ff]"
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
                      className="mt-1.5 ml-7 w-[calc(100%-1.75rem)] bg-[#060a10] border border-[#00b8ff]/30 rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/60 disabled:opacity-50"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={handleBack}
            disabled={isPending || isGoingBack || totalAnswered === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#1a2840] bg-[#101c2e] text-[#888] hover:text-[#ccc] hover:bg-[#1a2840] disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all flex-shrink-0"
          >
            {isGoingBack ? (
              <span className="w-4 h-4 border-2 border-[#888]/30 border-t-[#888] rounded-full animate-spin" />
            ) : (
              <ChevronLeft size={15} />
            )}
            Zurück
          </button>

          {/* Submit / Weiter */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "flex-1 font-semibold text-sm rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all",
              canSubmit
                ? "bg-[#00b8ff] hover:bg-[#0099d6] text-white"
                : "bg-[#101c2e] text-[#444] cursor-not-allowed border border-[#1a2840]"
            )}
          >
            {isPending ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Speichern…
              </>
            ) : (
              <>
                Weiter
                <ChevronRight size={16} />
              </>
            )}
          </button>

          {/* Save & exit */}
          <button
            onClick={handleSaveAndExit}
            disabled={isPending || isGoingBack}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#1a2840] bg-[#101c2e] text-[#888] hover:text-[#ccc] hover:bg-[#1a2840] disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium transition-all flex-shrink-0"
            title="Fortschritt speichern und später fortsetzen"
          >
            <Save size={13} />
            Beenden
          </button>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-[#0c1520] border border-[#1a2840] rounded-2xl max-w-lg w-full flex flex-col"
            style={{ maxHeight: "85vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a2840] flex-shrink-0">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-[#00b8ff]" />
                <h3 className="text-[#f0f0f0] font-semibold text-sm">KI-Assistent</h3>
                <span className="text-[#555] text-xs">· {question.externalId}</span>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#555] hover:text-[#888] hover:bg-[#101c2e] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Current question context */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="bg-[#060a10] border border-[#111e30] rounded-xl px-4 py-3">
                <p className="text-[#555] text-xs mb-1">Aktuelle Frage</p>
                <p className="text-[#ccc] text-sm leading-relaxed">{question.questionDe}</p>
              </div>
            </div>

            {/* Conversation area */}
            <div
              ref={helpScrollRef}
              className="flex-1 overflow-y-auto px-5 pb-3 space-y-3 min-h-0"
            >
              {helpMessages.length === 0 && !helpLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={18} className="text-[#555] animate-spin" />
                </div>
              )}

              {helpMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-[#060a10] border border-[#111e30] text-[#d0d8e4]"
                      : "bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#f0f0f0] ml-6"
                  )}
                >
                  {msg.role === "assistant" && (
                    <p className="text-[#00b8ff] text-xs font-medium mb-1.5">KI-Assistent</p>
                  )}
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                </div>
              ))}

              {helpLoading && helpMessages.length > 0 && (
                <div className="bg-[#060a10] border border-[#111e30] rounded-xl px-4 py-3">
                  <p className="text-[#00b8ff] text-xs font-medium mb-1.5">KI-Assistent</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#555] animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="px-5 pb-5 pt-3 border-t border-[#1a2840] flex-shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={helpInput}
                  onChange={(e) => setHelpInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleHelpSend();
                    }
                  }}
                  disabled={helpLoading}
                  placeholder="Weitere Frage stellen…"
                  className="flex-1 bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/50 disabled:opacity-50"
                />
                <button
                  onClick={handleHelpSend}
                  disabled={!helpInput.trim() || helpLoading}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                    helpInput.trim() && !helpLoading
                      ? "bg-[#00b8ff] hover:bg-[#0099d6] text-white"
                      : "bg-[#101c2e] text-[#333] cursor-not-allowed"
                  )}
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[#444] text-xs mt-2 text-center">
                Powered by KI · Ihre Antworten werden nicht gespeichert
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
