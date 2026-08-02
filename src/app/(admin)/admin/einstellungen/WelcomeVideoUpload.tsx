"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, CheckCircle } from "lucide-react";

export function WelcomeVideoUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setDone(false);

    try {
      // Step 1: Get presigned upload URL + final public URL
      const res = await fetch("/api/admin/welcome-video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "video/mp4" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Vorbereiten des Uploads");

      // Step 2: Upload directly to R2
      const putRes = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!putRes.ok) throw new Error(`Upload zu R2 fehlgeschlagen (${putRes.status})`);

      // Step 3: Save the public URL as the welcome_video_url setting
      const saveRes = await fetch("/api/admin/welcome-video-upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicVideoUrl: data.publicVideoUrl }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error ?? "URL konnte nicht gespeichert werden");
      }

      setDone(true);
      // Reload to reflect the new URL in the server-rendered form
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] text-sm rounded-lg transition-colors">
          {uploading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : done ? (
            <CheckCircle size={13} className="text-[#22c55e]" />
          ) : (
            <Upload size={13} />
          )}
          {uploading ? "Lädt hoch…" : done ? "Hochgeladen" : "Videodatei hochladen"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
      </label>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
      {done && <p className="text-[#22c55e] text-xs mt-1.5">Video hochgeladen und URL gespeichert.</p>}
    </div>
  );
}
