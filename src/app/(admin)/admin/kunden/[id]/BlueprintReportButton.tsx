"use client";

import { useState } from "react";
import { FileDown, Loader2, RefreshCw } from "lucide-react";

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

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blueprint/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
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

  return (
    <div className="space-y-2 mt-3 pt-3 border-t border-[#111e30]">
      {reportUrl ? (
        <>
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-xs rounded-lg px-3 py-2 transition-colors justify-center"
          >
            <FileDown size={13} />
            PDF herunterladen
          </a>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 w-full bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg px-3 py-2 transition-colors justify-center disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            Neu generieren
          </button>
        </>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 w-full bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-xs rounded-lg px-3 py-2 transition-colors justify-center"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <FileDown size={13} />
          )}
          {loading ? "Wird generiert …" : "PDF-Bericht generieren"}
        </button>
      )}
      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  );
}
