"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { ChevronRight, CheckCircle2, MessageCircle } from "lucide-react";
import { saveContextAnswer, completeContextSession } from "./actions";

const QUESTIONS = [
  {
    id: "branche",
    question: "In welcher Branche ist Ihr Unternehmen tätig, und was macht Ihr Unternehmen konkret?",
    hint: "z.B. Dienstleistungen, Produktion, Handel — und welche Leistungen oder Produkte Sie anbieten.",
    required: true,
    minLength: 20,
  },
  {
    id: "struktur",
    question: "Wie ist Ihr Unternehmen aufgestellt? Wie viele Mitarbeiter haben Sie, und welche Bereiche oder Abteilungen gibt es?",
    hint: "Ungefähre Angaben reichen völlig aus.",
    required: false,
    minLength: 0,
  },
  {
    id: "digital_stand",
    question: "Wie würden Sie den aktuellen Stand Ihrer Digitalisierung beschreiben — wo stehen Sie heute?",
    hint: 'Von "kaum digitalisiert" bis "viele Prozesse bereits digital" ist alles möglich.',
    required: true,
    minLength: 15,
  },
  {
    id: "herausforderungen",
    question: "Was sind Ihre größten Herausforderungen im operativen Alltag? Was kostet Sie und Ihr Team am meisten Zeit?",
    hint: "Denken Sie an wiederkehrende Aufgaben, Kommunikation, Koordination oder Verwaltung.",
    required: true,
    minLength: 20,
  },
  {
    id: "motivation",
    question: "Was hat Sie dazu bewogen, sich jetzt mit Digitalisierung zu beschäftigen? Gibt es einen konkreten Auslöser?",
    hint: "Wachstum, Effizienz, Wettbewerb, oder einfach der Wunsch nach Verbesserung — alles ist gültig.",
    required: true,
    minLength: 15,
  },
  {
    id: "ziele",
    question: "Was wäre für Sie ein besonders gutes Ergebnis? Welche Veränderungen würden Ihnen und Ihrem Team am meisten helfen?",
    hint: "Was soll konkret besser, schneller oder einfacher werden?",
    required: true,
    minLength: 15,
  },
];

interface Props {
  contextSessionId: string;
  existingAnswers: Record<number, string>;
}

export function ContextChatClient({ contextSessionId, existingAnswers }: Props) {
  const [currentStep, setCurrentStep] = useState(() => {
    // Start after the last answered step
    const answeredSteps = Object.keys(existingAnswers).map(Number);
    return answeredSteps.length > 0 ? Math.max(...answeredSteps) + 1 : 0;
  });
  const [answers, setAnswers] = useState<Record<number, string>>(existingAnswers);
  const [currentText, setCurrentText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isLastStep = currentStep >= QUESTIONS.length;
  const question = QUESTIONS[currentStep];

  useEffect(() => {
    textareaRef.current?.focus();
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentStep]);

  function handleNext(skip = false) {
    setError(null);
    const text = skip ? "" : currentText.trim();

    if (!skip && question?.required && text.length < (question.minLength ?? 1)) {
      setError(`Bitte beschreiben Sie dies kurz (mindestens ${question.minLength} Zeichen).`);
      return;
    }

    startTransition(async () => {
      if (!skip && text) {
        const res = await saveContextAnswer(contextSessionId, question!.question, text, currentStep);
        if ("error" in res) {
          setError(res.error);
          return;
        }
      }

      if (!skip) {
        setAnswers((prev) => ({ ...prev, [currentStep]: text }));
      }
      setCurrentText("");
      setCurrentStep((s) => s + 1);
    });
  }

  function handleComplete() {
    startTransition(async () => {
      await completeContextSession(contextSessionId);
    });
  }

  const completedCount = Object.values(answers).filter(Boolean).length;

  return (
    <div className="max-w-2xl mx-auto pt-6 pb-16">
      {/* Header */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center">
            <MessageCircle size={16} className="text-[#00b8ff]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#f0f0f0]">Ihr Unternehmenskontext</h1>
            <p className="text-[#666] text-xs">Vor Ihrer eigentlichen Analyse · ca. 3–5 Minuten</p>
          </div>
        </div>
        <p className="text-[#888] text-sm leading-relaxed">
          Bevor Ihre Analyse startet, möchten wir kurz verstehen, wo Ihr Unternehmen heute steht,
          was Sie beschäftigt und welche Ziele Sie verfolgen. So können wir die Auswertung besser
          auf Ihr Unternehmen beziehen.
        </p>
      </div>

      {/* Chat history */}
      <div className="space-y-4 mb-6">
        {QUESTIONS.slice(0, currentStep).map((q, i) => (
          <div key={q.id}>
            {/* Assistant message */}
            <div className="flex items-start gap-3 mb-2">
              <div className="w-7 h-7 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#00b8ff] text-xs font-bold">O</span>
              </div>
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                <p className="text-[#ccc] text-sm leading-relaxed">{q.question}</p>
              </div>
            </div>
            {/* User answer */}
            {answers[i] ? (
              <div className="flex justify-end mb-1">
                <div className="bg-[#00b8ff]/10 border border-[#00b8ff]/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[88%]">
                  <p className="text-[#e0f4ff] text-sm leading-relaxed">{answers[i]}</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-end mb-1">
                <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl rounded-tr-sm px-4 py-2 max-w-[88%]">
                  <p className="text-[#444] text-xs italic">Übersprungen</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Current question or completion */}
        {!isLastStep ? (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#00b8ff] text-xs font-bold">O</span>
              </div>
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                <p className="text-[#f0f0f0] text-sm leading-relaxed font-medium">{question.question}</p>
                {question.hint && (
                  <p className="text-[#555] text-xs mt-1.5 leading-relaxed">{question.hint}</p>
                )}
              </div>
            </div>

            {/* Answer input */}
            <div className="ml-10">
              <textarea
                ref={textareaRef}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleNext();
                }}
                rows={3}
                placeholder="Ihre Antwort…"
                className="w-full bg-[#080d14] border border-[#1a2840] focus:border-[#00b8ff] rounded-xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] resize-none outline-none transition-colors"
              />
              {error && <p className="text-[#ef4444] text-xs mt-1.5">{error}</p>}

              <div className="flex items-center justify-between mt-3">
                {!question.required ? (
                  <button
                    type="button"
                    onClick={() => handleNext(true)}
                    disabled={isPending}
                    className="text-xs text-[#555] hover:text-[#888] transition-colors disabled:opacity-40"
                  >
                    Frage überspringen
                  </button>
                ) : (
                  <span className="text-xs text-[#333]">Ctrl+Enter zum Weiter</span>
                )}
                <button
                  type="button"
                  onClick={() => handleNext(false)}
                  disabled={isPending || (!question.required && !currentText.trim())}
                  className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  {isPending ? "Speichern…" : "Weiter"}
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Completion card */
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-7 h-7 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#22c55e] text-xs font-bold">O</span>
              </div>
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl rounded-tl-sm px-4 py-3 max-w-[88%]">
                <p className="text-[#f0f0f0] text-sm leading-relaxed">
                  Vielen Dank — das gibt uns einen guten Überblick über Ihr Unternehmen.
                  Wir können Ihre Analyse nun individuell auf Ihren Kontext abstimmen.
                </p>
                <p className="text-[#888] text-sm mt-2 leading-relaxed">
                  Jetzt startet Ihre eigentliche Blueprint-Analyse mit {completedCount > 0 ? completedCount + " beantworteten Kontextfragen" : "den strukturierten Fragen"}. Das dauert ca. 15–25 Minuten.
                </p>
              </div>
            </div>

            <div className="ml-10">
              <button
                type="button"
                onClick={handleComplete}
                disabled={isPending}
                className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                <CheckCircle2 size={15} />
                {isPending ? "Analyse wird vorbereitet…" : "Analyse jetzt starten →"}
              </button>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2 px-1">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < currentStep
                ? "bg-[#00b8ff]"
                : i === currentStep
                ? "bg-[#00b8ff]/40"
                : "bg-[#1a2840]"
            }`}
          />
        ))}
        <span className="text-xs text-[#444] ml-1 flex-shrink-0">
          {Math.min(currentStep, QUESTIONS.length)}/{QUESTIONS.length}
        </span>
      </div>
    </div>
  );
}
