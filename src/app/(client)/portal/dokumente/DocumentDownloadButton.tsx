"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function DocumentDownloadButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/read-url?id=${documentId}`);
      if (!res.ok) {
        setError("Dokument nicht zugänglich.");
        return;
      }
      const { url } = await res.json();
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      setError("Fehler beim Herunterladen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <button
        onClick={handleDownload}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
        {loading ? "Lädt…" : "Herunterladen"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
