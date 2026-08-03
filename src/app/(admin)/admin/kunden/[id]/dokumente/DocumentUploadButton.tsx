"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, CheckCircle } from "lucide-react";

export function DocumentUploadButton({
  companyId,
  adminId,
}: {
  companyId: string;
  adminId: string;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = (data.get("file") as File) || null;
    const title = data.get("title") as string;
    const category = data.get("category") as string;
    const visibility = data.get("visibility") as string;

    if (!file || !file.name) {
      setError("Bitte eine Datei auswählen.");
      return;
    }

    setUploading(true);

    try {
      const res = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          adminId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          title,
          category,
          visibility,
          fileSize: file.size,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { uploadUrl, r2Key } = await res.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error(`Upload zu R2 fehlgeschlagen (${putRes.status})`);

      await fetch("/api/documents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          adminId,
          title,
          category,
          visibility,
          r2Key,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <Upload size={14} />
        Dokument hochladen
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[#f0f0f0] font-semibold">Dokument hochladen</h2>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center py-8 gap-3 text-[#00b8ff]">
                <CheckCircle size={32} />
                <p className="text-sm font-medium">Dokument hochgeladen</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[#888] text-xs block mb-1.5">Titel *</label>
                  <input
                    name="title"
                    required
                    placeholder="Dokumententitel"
                    className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#888] text-xs block mb-1.5">Kategorie</label>
                    <select
                      name="category"
                      className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]/50"
                    >
                      <option value="REPORT">Bericht</option>
                      <option value="CONTRACT">Vertrag</option>
                      <option value="PRESENTATION">Präsentation</option>
                      <option value="OTHER">Sonstiges</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[#888] text-xs block mb-1.5">Sichtbarkeit</label>
                    <select
                      name="visibility"
                      className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]/50"
                    >
                      <option value="internal">Intern</option>
                      <option value="customer">Für Kunden</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[#888] text-xs block mb-1.5">Datei *</label>
                  <input
                    ref={fileRef}
                    type="file"
                    name="file"
                    required
                    className="w-full text-sm text-[#888] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-[#222] file:text-[#f0f0f0] file:text-xs file:cursor-pointer cursor-pointer"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 bg-[#101c2e] border border-[#1a2840] hover:bg-[#222] text-[#f0f0f0] text-sm rounded-lg transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "Lädt hoch…" : "Hochladen"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
