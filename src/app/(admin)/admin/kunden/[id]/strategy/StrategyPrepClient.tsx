"use client";

import { useState } from "react";
import { Loader2, Wand2, Copy, CheckCheck, FileText, ChevronDown, ChevronRight } from "lucide-react";

interface Section {
  title: string;
  content: string;
}

function parseSections(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split("\n");
  let current: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+\d+\.\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1].trim(), content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) sections.push(current);
  return sections;
}

export default function StrategyPrepClient({
  companyId,
  existingPrep,
}: {
  companyId: string;
  existingPrep: string | null;
}) {
  const [prep, setPrep] = useState<string | null>(existingPrep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set([0, 1, 2]));

  async function generatePrep() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setPrep(data.prep);
      setOpenSections(new Set([0, 1, 2, 3, 4, 5]));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  function copyAll() {
    if (!prep) return;
    navigator.clipboard.writeText(prep);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function toggleSection(i: number) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const sections = prep ? parseSections(prep) : [];

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-[#1a2840] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-[#00b8ff]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">KI-Vorbereitungsunterlagen</h2>
        </div>
        <div className="flex items-center gap-2">
          {prep && (
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#f0f0f0] bg-[#101c2e] hover:bg-[#222] px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <CheckCheck size={13} className="text-[#00b8ff]" /> : <Copy size={13} />}
              {copied ? "Kopiert" : "Alles kopieren"}
            </button>
          )}
          <button
            onClick={generatePrep}
            disabled={loading}
            className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099d6] disabled:bg-[#101c2e] disabled:text-[#444] text-white font-semibold text-sm px-4 py-1.5 rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {loading ? "Wird generiert..." : prep ? "Neu generieren" : "KI-Vorbereitung generieren"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!prep && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-xl bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center mb-4">
              <Wand2 size={24} className="text-[#00b8ff]" />
            </div>
            <p className="text-[#f0f0f0] font-semibold mb-2">Strategy Session vorbereiten</p>
            <p className="text-[#888] text-sm max-w-sm">
              Generiert vollständige Vorbereitungsunterlagen auf Basis der Blueprint™ Analyse:
              Management Summary, Gesprächsleitfaden, Prozessanalyse, Angebotslogik, BAFA-Dokumentation.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={32} className="text-[#00b8ff] animate-spin" />
            <p className="text-[#888] text-sm">Analysiere Daten und generiere Unterlagen...</p>
          </div>
        )}

        {sections.length > 0 && (
          <div className="space-y-2">
            {sections.map((section, i) => (
              <div key={i} className="bg-[#060a10] border border-[#111e30] rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection(i)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-[#111] transition-colors"
                >
                  <span className="text-[#f0f0f0] font-medium text-sm">{section.title}</span>
                  {openSections.has(i) ? (
                    <ChevronDown size={16} className="text-[#555] flex-shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-[#555] flex-shrink-0" />
                  )}
                </button>
                {openSections.has(i) && (
                  <div className="px-4 pb-4 border-t border-[#111e30]">
                    <div className="pt-3 text-[#ccc] text-sm leading-relaxed whitespace-pre-wrap">
                      {section.content.trim()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {prep && sections.length === 0 && (
          <div className="text-[#ccc] text-sm leading-relaxed whitespace-pre-wrap">{prep}</div>
        )}
      </div>
    </div>
  );
}
