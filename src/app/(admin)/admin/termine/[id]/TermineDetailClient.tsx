"use client";

import { useState } from "react";
import { Video, Loader2, ExternalLink } from "lucide-react";

export function CreateRoomButton({
  appointmentId,
  initialUrl,
}: {
  appointmentId: string;
  initialUrl: string | null;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/daily/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setUrl(data.meetingUrl);
    } catch (err: any) {
      setError(err.message ?? "Fehler beim Erstellen");
    } finally {
      setLoading(false);
    }
  }

  if (url) {
    return (
      <div className="space-y-3">
        <div className="bg-[#060a10] border border-[#00b8ff]/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Video size={14} className="text-[#00b8ff] flex-shrink-0" />
            <span className="text-[#00b8ff] text-xs font-mono truncate">{url}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-xs font-semibold rounded-lg transition-colors flex-shrink-0"
          >
            <ExternalLink size={11} />
            Beitreten
          </a>
        </div>
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={url}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            style={{ width: "100%", height: "100%", border: 0 }}
            title="Strategiegespräch Video"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCreate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Video size={14} />
        )}
        {loading ? "Erstelle Videoraum…" : "Videoraum erstellen"}
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
