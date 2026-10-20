"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HelpCircle, Loader2, Send, X } from "lucide-react";

/**
 * Die Rückfrage zu einer Frage.
 *
 * Wer nicht weiß, wie etwas gemeint ist, rät — und eine geratene Antwort ist
 * für die Auswertung schlimmer als gar keine. Deshalb steht an jeder Frage ein
 * Fragezeichen, und wer eine Weile nichts anklickt, wird einmal darauf
 * hingewiesen. Einmal, nicht wiederholt: ein Hinweis, der sich aufdrängt,
 * wird weggeklickt statt gelesen.
 */

export type HelpTopic =
  | { questionId: string }
  | { topicTitle: string; topicHint?: string; topicOptions?: string[] };

type Message = { role: "user" | "assistant"; content: string };

/** Nach dieser Zeit ohne Eingabe erscheint der Hinweis. */
const HINT_AFTER_MS = 30_000;

export function QuestionHelp({
  sessionId,
  topic,
  label = "Was ist damit gemeint?",
  /** Zählt hoch, sobald der Nutzer etwas tut — setzt den Hinweis zurück. */
  activityKey,
  /** Der Hinweis erscheint nur, wenn noch nichts beantwortet ist. */
  hintEnabled = true,
}: {
  sessionId: string;
  topic: HelpTopic;
  label?: string;
  activityKey?: string | number;
  hintEnabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const hintShown = useRef(false);

  const topicKey = JSON.stringify(topic);

  const ask = useCallback(
    async (userMessage: string | null, history: Message[]) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/blueprint/question-help", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            ...JSON.parse(topicKey),
            userMessage: userMessage ?? undefined,
            conversationHistory: history,
          }),
        });
        const data = (await res.json()) as { explanation?: string; error?: string };
        if (!res.ok || !data.explanation) {
          setError(data.error ?? "Die Erklärung konnte nicht geladen werden.");
          return;
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data.explanation! }]);
      } catch {
        setError("Keine Verbindung. Bitte erneut versuchen.");
      } finally {
        setLoading(false);
      }
    },
    [sessionId, topicKey]
  );

  // Wer eine Weile nichts tut, bekommt den Hinweis — einmal.
  useEffect(() => {
    if (!hintEnabled || hintShown.current || open) return;
    const timer = setTimeout(() => {
      hintShown.current = true;
      setShowHint(true);
    }, HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [hintEnabled, open, activityKey]);

  function send() {
    const text = input.trim();
    if (!text || loading) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    void ask(text, messages);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => {
          setShowHint(false);
          hintShown.current = true;
          setOpen(true);
          // Beim Öffnen einmal von selbst erklären — danach nur auf Nachfrage.
          if (messages.length === 0 && !loading) void ask(null, []);
        }}
        title={label}
        aria-label={label}
        className="inline-flex items-center gap-1.5 text-[#5b6b7f] hover:text-[#00b8ff] transition-colors"
      >
        <HelpCircle size={16} />
        <span className="text-xs">{label}</span>
      </button>

      {showHint && !open && (
        <div className="absolute left-0 top-7 z-30 w-64 rounded-xl border border-[#00b8ff]/30 bg-[#0c1520] p-3 shadow-xl">
          <div className="flex items-start gap-2">
            <HelpCircle size={14} className="text-[#00b8ff] mt-0.5 flex-shrink-0" />
            <p className="text-[#c9d4e4] text-xs leading-relaxed">
              Unklar, wie das gemeint ist? Fragen Sie hier nach — das kostet Sie
              zehn Sekunden und uns eine geratene Antwort weniger.
            </p>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              aria-label="Hinweis schließen"
              className="text-[#5b6b7f] hover:text-[#eef2f7]"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[#16283d] bg-[#080d16]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#12203a]">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-[#00b8ff]" />
                <span className="text-[#eef2f7] text-sm font-semibold">Nachfragen</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
                className="text-[#5b6b7f] hover:text-[#eef2f7]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`text-sm leading-relaxed whitespace-pre-wrap rounded-xl px-3 py-2 ${
                    message.role === "user"
                      ? "bg-[rgba(0,184,255,0.1)] text-[#c9d4e4] ml-8"
                      : "bg-[#0c1520] text-[#c9d4e4] border border-[#12203a]"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-[#5b6b7f] text-xs">
                  <Loader2 size={13} className="animate-spin" />
                  Einen Moment…
                </div>
              )}
              {error && <p className="text-[#fca5a5] text-xs">{error}</p>}
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#12203a]">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") send();
                }}
                placeholder="Eigene Frage stellen…"
                className="flex-1 px-3 py-2 rounded-lg bg-[#0c1520] border border-[#16283d] text-[#eef2f7] text-sm focus:outline-none focus:border-[#00b8ff]/50"
              />
              <button
                type="button"
                onClick={send}
                disabled={loading || input.trim().length === 0}
                aria-label="Frage senden"
                className="w-9 h-9 rounded-lg bg-[#00b8ff] text-[#041018] flex items-center justify-center disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
