"use client";

import { useState } from "react";
import { Video, FileText, Link2, Upload, CheckCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  contentType: string;
  r2Key: string | null;
  externalUrl: string | null;
  status: string;
  estimatedMinutes: number | null;
  order: number;
};

export function LessonUploadRow({
  lesson,
  index,
  updateAction,
}: {
  lesson: Lesson;
  index: number;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!lesson.r2Key);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const typeIcon = {
    video: <Video size={13} className="text-[#888]" />,
    text: <FileText size={13} className="text-[#888]" />,
    pdf: <FileText size={13} className="text-[#888]" />,
  }[lesson.contentType] ?? <FileText size={13} className="text-[#888]" />;

  const statusCls =
    lesson.status === "PUBLISHED"
      ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
      : "bg-[#888]/10 text-[#888] border-[#888]/20";

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch("/api/learning/lesson-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: lesson.id,
          fileName: file.name,
          mimeType: file.type,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const { uploadUrl } = await res.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      setUploaded(true);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-b border-[#1a1a1a] last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[#555] text-xs w-5 text-right">{index + 1}</span>
        {typeIcon}
        <p className="text-[#f0f0f0] text-sm flex-1">{lesson.title}</p>
        {lesson.estimatedMinutes && (
          <span className="text-[#555] text-xs">{lesson.estimatedMinutes} min</span>
        )}
        {uploaded && <CheckCircle size={13} className="text-[#22c55e]" />}
        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCls}`}>
          {lesson.status === "PUBLISHED" ? "Aktiv" : "Entwurf"}
        </span>
        {expanded ? (
          <ChevronUp size={13} className="text-[#555]" />
        ) : (
          <ChevronDown size={13} className="text-[#555]" />
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-[#0d0d0d]">
          <div className="pt-3 space-y-3">
            {/* External URL */}
            <div>
              <label className="text-[#555] text-xs flex items-center gap-1 mb-1.5">
                <Link2 size={11} /> Externe URL (optional)
              </label>
              <form action={updateAction}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input type="hidden" name="lessonTitle" value={lesson.title} />
                <input type="hidden" name="lessonStatus" value={lesson.status} />
                <input
                  name="externalUrl"
                  defaultValue={lesson.externalUrl ?? ""}
                  placeholder="https://…"
                  className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
                />
                <button
                  type="submit"
                  className="mt-2 px-3 py-1.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-[#888] hover:text-[#f0f0f0] rounded-lg transition-colors"
                >
                  Speichern
                </button>
              </form>
            </div>

            {/* File upload */}
            {lesson.contentType !== "text" && (
              <div>
                <label className="text-[#555] text-xs flex items-center gap-1 mb-1.5">
                  <Upload size={11} /> Datei hochladen (R2)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg transition-colors flex items-center gap-1.5">
                    {uploading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : uploaded ? (
                      <CheckCircle size={11} className="text-[#22c55e]" />
                    ) : (
                      <Upload size={11} />
                    )}
                    {uploading ? "Lädt…" : uploaded ? "Ersetzt hochladen" : "Datei wählen"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={lesson.contentType === "pdf" ? ".pdf" : "video/*"}
                  />
                </label>
                {uploadError && (
                  <p className="text-red-400 text-xs mt-1">{uploadError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
