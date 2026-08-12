"use client";

import { useState } from "react";
import { FileDown, Loader2, RefreshCw, X, FileText, ChevronRight } from "lucide-react";

export function BlueprintReportButton({
  sessionId,
  initialReportUrl,
}: {
  sessionId: string;
  initialReportUrl: string | null;
}) {
  const [reportUrl, setReportUrl] = useState<string | null>(initialReportUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [additionalContext, setAdditionalContext] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  async function generate() {
    setLoading(true);
    setShowForm(false);
    setError(null);
    try {
      const res = await fetch("/api/blueprint/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          additionalContext: additionalContext.trim() || undefined,
          specialRequests: specialRequests.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generierung fehlgeschlagen");
      setReportUrl(json.reportUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-3 pt-3 border-t border-[#111e30]">
        <div className="flex items-center gap-2 w-full bg-[#0c1a2e] border border-[#1a2840] rounded-lg px-3 py-3 text-[#00b8ff] text-xs">
          <Loader2 size={13} className="animate-spin flex-shrink-0" />
          <span>Bericht wird generiert — das dauert ca. 3–4 Minuten …</span>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="mt-3 pt-3 border-t border-[#111e30] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[#f0f0f0] text-xs font-semibold">Vor der Generierung</span>
          <button
            onClick={() => setShowForm(false)}
            className="text-[#556] hover:text-[#888] transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[#6b7280] text-[10px] font-medium uppercase tracking-wide">
            Zusätzlicher Unternehmenskontext
          </label>
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Was macht das Unternehmen genau? Besondere Situation, Ziele, Hintergründe die im Bericht berücksichtigt werden sollen …"
            rows={4}
            className="w-full bg-[#060c17] border border-[#1a2840] rounded-lg px-3 py-2 text-[#ccd] text-xs placeholder-[#334] resize-none focus:outline-none focus:border-[#00b8ff]/50 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[#6b7280] text-[10px] font-medium uppercase tracking-wide">
            Besondere Wünsche
          </label>
          <textarea
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Was soll der Bericht unbedingt erwähnen oder betonen? Bestimmte Themen, Formulierungen, Schwerpunkte …"
            rows={3}
            className="w-full bg-[#060c17] border border-[#1a2840] rounded-lg px-3 py-2 text-[#ccd] text-xs placeholder-[#334] resize-none focus:outline-none focus:border-[#00b8ff]/50 transition-colors"
          />
        </div>

        <button
          onClick={generate}
          className="flex items-center gap-2 w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-xs rounded-lg px-3 py-2 transition-colors justify-center"
        >
          <FileDown size={13} />
          Bericht generieren
          <ChevronRight size={12} className="ml-auto opacity-60" />
        </button>

        <p className="text-[#445] text-[10px] text-center">
          Beide Felder sind optional — Bericht lässt sich auch ohne Eingabe generieren.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-[#111e30]">
      {reportUrl && (
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-xs rounded-lg px-3 py-2 transition-colors justify-center"
        >
          <FileDown size={13} />
          PDF herunterladen
        </a>
      )}
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 w-full bg-[#101c2e] hover:bg-[#1a2840] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg px-3 py-2 transition-colors justify-center"
      >
        <RefreshCw size={13} />
        {reportUrl ? "Neu generieren" : "PDF-Bericht generieren"}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  );
}
