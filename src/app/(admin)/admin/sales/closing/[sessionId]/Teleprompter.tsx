"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

/**
 * Teleprompter für den Closer.
 *
 * Zeigt die gerenderten Script-Abschnitte groß und gut lesbar, mit Navigation
 * und Bestätigungsvermerk je Schritt. Die Texte stammen aus der
 * Admin-Konfiguration und sind mit den eingefrorenen Vertragsdaten gerendert.
 */

export type ScriptSection = {
  step: number;
  title: string;
  text: string;
  kind: string;
  unresolvedPlaceholders: string[];
};

const KIND_LABELS: Record<string, string> = {
  GENERAL_INTRO: "Einleitung",
  PACKAGE: "Paket",
  ADDON: "Laufende Kosten / Zusatzleistungen",
  FINAL_ACCEPTANCE: "Verbindliche Annahme",
};

export function Teleprompter({ sections }: { sections: ScriptSection[] }) {
  const [index, setIndex] = useState(0);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState(false);

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-[#1a2840] bg-[#0a1119] px-6 py-8 text-center">
        <p className="text-[#8899b4] text-sm">
          Es ist noch kein Closing-Script gerendert.
        </p>
      </div>
    );
  }

  const current = sections[Math.min(index, sections.length - 1)];
  const allConfirmed = confirmed.size === sections.length;

  return (
    <div
      className={
        expanded
          ? "fixed inset-0 z-50 bg-[#060a10] overflow-y-auto p-6 md:p-10"
          : "rounded-xl border border-[#1a2840] bg-[#0a1119] overflow-hidden"
      }
    >
      <div className={expanded ? "max-w-[1000px] mx-auto" : ""}>
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[#1a2840]">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sections.map((section, i) => (
              <button
                key={section.step}
                onClick={() => setIndex(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  i === index
                    ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.14)] text-[#00b8ff]"
                    : confirmed.has(section.step)
                      ? "border-[#22c55e]/30 bg-[rgba(34,197,94,0.08)] text-[#22c55e]"
                      : "border-[#1a2840] text-[#5b6b7f] hover:text-[#8899b4]"
                }`}
              >
                {confirmed.has(section.step) && <Check size={10} />}
                Schritt {section.step}
              </button>
            ))}
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[#5b6b7f] hover:text-[#eef2f7] transition-colors flex-shrink-0"
            title={expanded ? "Verkleinern" : "Vollbild"}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        <div className={expanded ? "py-10" : "px-6 py-7"}>
          <p className="text-[#00b8ff] text-xs font-bold uppercase tracking-[0.14em] mb-1.5">
            Schritt {current.step} — {KIND_LABELS[current.kind] ?? current.kind}
          </p>
          <h3 className="text-[#eef2f7] text-lg font-bold mb-5">{current.title}</h3>

          <p
            className={`text-[#dbe4f0] whitespace-pre-wrap ${
              expanded ? "text-2xl leading-[1.65]" : "text-lg leading-[1.7]"
            }`}
          >
            {current.text}
          </p>

          {current.unresolvedPlaceholders.length > 0 && (
            <div className="mt-5 px-4 py-3 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[#f59e0b]/25">
              <p className="text-[#fbbf24] text-xs">
                Für diese Platzhalter liegen keine Vertragsdaten vor:{" "}
                {current.unresolvedPlaceholders.map((p) => `{{${p}}}`).join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-[#1a2840] bg-[#080d14]">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#8899b4] hover:text-[#eef2f7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
            Zurück
          </button>

          <button
            onClick={() => {
              setConfirmed((prev) => new Set(prev).add(current.step));
              if (index < sections.length - 1) setIndex(index + 1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              confirmed.has(current.step)
                ? "bg-[rgba(34,197,94,0.12)] text-[#22c55e] border border-[#22c55e]/30"
                : "bg-[#00b8ff] text-[#041018] hover:bg-[#0099d6]"
            }`}
          >
            {confirmed.has(current.step) ? "Bestätigung erhalten ✓" : "Bestätigung erhalten"}
          </button>

          <button
            onClick={() => setIndex((i) => Math.min(sections.length - 1, i + 1))}
            disabled={index === sections.length - 1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#8899b4] hover:text-[#eef2f7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Weiter
            <ChevronRight size={15} />
          </button>
        </div>

        {allConfirmed && (
          <div className="px-5 py-3 bg-[rgba(34,197,94,0.08)] border-t border-[#22c55e]/25">
            <p className="text-[#22c55e] text-xs font-semibold">
              Alle Script-Abschnitte wurden bestätigt — die Aufzeichnung kann beendet werden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
