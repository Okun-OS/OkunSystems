"use client";

import { useState } from "react";
import { Video, FileText, Link2, Upload, CheckCircle, Loader2, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";

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
  toggleStatusAction,
}: {
  lesson: Lesson;
  index: number;
  updateAction: (formData: FormData) => Promise<void>;
  toggleStatusAction: (formData: FormData) => Promise<void>;
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

  const isPublished = lesson.status === "PUBLISHED";
  const statusCls = isPublished
    ? "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20"
    : "bg-[#888]/10 text-[#888] border-[#888]/20";

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const params = new URLSearchParams({
        lessonId: lesson.id,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      });

      const res = await fetch(`/api/learning/lesson-upload?${params}`, {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }));
        throw new Error(data.error || "Upload fehlgeschlagen");
      }

      setUploaded(true);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border-b border-[#101c2e] last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#101c2e] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[#555] text-xs w-5 text-right">{index + 1}</span>
        {typeIcon}
        <p className="text-[#f0f0f0] text-sm flex-1">{lesson.title}</p>
        {lesson.estimatedMinutes && (
          <span className="text-[#555] text-xs">{lesson.estimatedMinutes} min</span>
        )}
        {uploaded && <CheckCircle size={13} className="text-[#00b8ff]" />}
        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusCls}`}>
          {isPublished ? "Aktiv" : "Entwurf"}
        </span>
        {expanded ? (
          <ChevronUp size={13} className="text-[#555]" />
        ) : (
          <ChevronDown size={13} className="text-[#555]" />
        )}
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-[#060a10]">
          <div className="pt-3 space-y-3">
            {/* Publish toggle */}
            <form action={toggleStatusAction} onClick={(e) => e.stopPropagation()}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="currentStatus" value={lesson.status} />
              <button
                type="submit"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isPublished
                    ? "bg-[#888]/10 border-[#888]/20 text-[#888] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                    : "bg-[#00b8ff]/10 border-[#00b8ff]/20 text-[#00b8ff] hover:bg-[#00b8ff]/20"
                }`}
              >
                {isPublished ? <EyeOff size={11} /> : <Eye size={11} />}
                {isPublished ? "Lektion deaktivieren" : "Lektion veröffentlichen"}
              </button>
            </form>

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
                  className="w-full bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
                />
                <button
                  type="submit"
                  className="mt-2 px-3 py-1.5 text-xs bg-[#101c2e] border border-[#1a2840] hover:bg-[#222] text-[#888] hover:text-[#f0f0f0] rounded-lg transition-colors"
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
                  <span className="px-3 py-1.5 bg-[#101c2e] border border-[#1a2840] hover:bg-[#222] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg transition-colors flex items-center gap-1.5">
                    {uploading ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : uploaded ? (
                      <CheckCircle size={11} className="text-[#00b8ff]" />
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
