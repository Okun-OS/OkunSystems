"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Session {
  id: string;
  phase: string;
  currentArea: string | null;
  status: string;
  totalMessages: number;
  questionsAsked: number;
  messages: Message[];
}

const AREA_LABELS: Record<string, string> = {
  unternehmensstruktur: "Unternehmensstruktur",
  vertrieb: "Vertrieb",
  kommunikation: "Kommunikation",
  prozesse: "Prozesse",
  systeme: "Systeme & Automatisierung",
  personal: "Personal",
  geschaeftsfuehrung: "Geschäftsführung",
};

const PHASE_LABELS: Record<string, string> = {
  INTRO: "Einführung",
  PROFIL: "Unternehmensprofil",
  PROZESSE: "Prozessidentifikation",
  TIEFE: "Tiefenanalyse",
  VALIDIERUNG: "Validierung",
  ABSCHLUSS: "Abschluss",
};

const TOTAL_QUESTIONS = 21;

export default function AdvisorChat({ initialSession }: { initialSession: Session }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialSession.messages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(initialSession.phase);
  const [currentArea, setCurrentArea] = useState(initialSession.currentArea ?? "unternehmensstruktur");
  const [isComplete, setIsComplete] = useState(initialSession.status === "COMPLETED");
  const [questionsAsked, setQuestionsAsked] = useState(initialSession.questionsAsked ?? 0);
  const [completedAreas, setCompletedAreas] = useState<string[]>([]);
  const [redirecting, setRedirecting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If already complete on load, redirect
  useEffect(() => {
    if (initialSession.status === "COMPLETED") {
      setRedirecting(true);
      setTimeout(() => router.push("/analyse/ergebnis"), 1500);
    }
  }, []);

  const msgBasedProgress = Math.min(85, Math.round((messages.length / 50) * 100));
  const qBasedProgress = Math.min(95, Math.round((questionsAsked / TOTAL_QUESTIONS) * 100));
  const progressPercent = isComplete ? 100 : Math.max(msgBasedProgress, qBasedProgress);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    // If already complete, redirect instead of sending
    if (isComplete) {
      router.push("/analyse/ergebnis");
      return;
    }

    const userMsg = input.trim();
    setInput("");

    const tempId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userMsg, createdAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, sessionId: initialSession.id }),
      });

      if (res.status === 400) {
        const err = await res.json();
        if (err.error === "Session completed") {
          // Session already complete on server — redirect
          setIsComplete(true);
          setRedirecting(true);
          setTimeout(() => router.push("/analyse/ergebnis"), 1500);
          return;
        }
        throw new Error(err.error ?? "Fehler");
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Fehler");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          createdAt: new Date().toISOString(),
        },
      ]);
      if (data.phase) setPhase(data.phase);
      if (data.currentArea) setCurrentArea(data.currentArea);
      if (Array.isArray(data.completedAreas)) setCompletedAreas(data.completedAreas);
      if (typeof data.questionsAsked === "number") setQuestionsAsked(data.questionsAsked);

      if (data.analysisComplete) {
        setIsComplete(true);
        setRedirecting(true);
        // Redirect after brief pause so user sees the completion message
        setTimeout(() => router.push("/analyse/ergebnis"), 3000);
      }
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Es ist ein technischer Fehler aufgetreten. Bitte versuchen Sie es erneut.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }

  const currentAreaLabel = AREA_LABELS[currentArea] ?? "–";

  return (
    <div className="max-w-[900px] mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">OKUN Blueprint™</h1>
          <p className="text-[#888] text-sm mt-1">Unternehmensanalyse mit Ihrem OKUN Advisor</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[#888] text-xs">Phase</p>
            <p className="text-[#f0f0f0] text-sm font-medium">{PHASE_LABELS[phase] ?? phase}</p>
          </div>
          <div className="h-8 w-px bg-[#1a2840]" />
          <div className="text-right">
            <p className="text-[#888] text-xs">Bereich</p>
            <p className="text-[#f0f0f0] text-sm font-medium">{currentAreaLabel}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5 bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#888] text-xs">Analysefortschritt</span>
          <span className="text-[#f0f0f0] text-xs font-semibold">{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-[#111e30] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00b8ff] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex gap-1 mt-3">
          {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i < questionsAsked ? "bg-[#00b8ff]" : "bg-[#1a2840]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
                <span className="text-[#00b8ff] text-xs font-bold">OA</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#f0f0f0]"
                  : "bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0]"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[#555] text-xs mt-1">
                {new Date(msg.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mr-3 mt-1">
              <span className="text-[#00b8ff] text-xs font-bold">OA</span>
            </div>
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-[#888] text-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>Analysiert...</span>
              </div>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="flex justify-center py-4">
            <div className="bg-[#00b8ff]/10 border border-[#00b8ff]/20 rounded-xl px-6 py-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-[#00b8ff]" />
              <div>
                <p className="text-[#f0f0f0] font-semibold text-sm">Analyse abgeschlossen</p>
                <p className="text-[#888] text-xs mt-0.5">
                  {redirecting
                    ? "Ihr OKUN Score wird geladen…"
                    : "Ihr Score wird berechnet."}
                </p>
              </div>
              {redirecting && <Loader2 size={16} className="text-[#00b8ff] animate-spin ml-2" />}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — hidden when complete */}
      {!isComplete && (
        <div className="mt-4 bg-[#0c1520] border border-[#1a2840] rounded-xl p-3 flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder="Ihre Antwort eingeben… (Enter zum Senden)"
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-[#f0f0f0] text-sm placeholder-[#555] resize-none focus:outline-none min-h-[24px] max-h-[120px] leading-relaxed"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-lg bg-[#00b8ff] hover:bg-[#0099d6] disabled:bg-[#111e30] disabled:text-[#444] text-white flex items-center justify-center transition-colors flex-shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      )}

      {!isComplete && (
        <p className="text-center text-[#555] text-xs mt-2">
          Shift+Enter für Zeilenumbruch · Ihre Analyse wird automatisch gespeichert
        </p>
      )}
    </div>
  );
}
