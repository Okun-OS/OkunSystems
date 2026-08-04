"use client";

import { useState } from "react";
import {
  Video,
  FileText,
  CheckCircle,
  Circle,
  Clock,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

type Lesson = {
  id: string;
  title: string;
  contentType: string;
  r2Key: string | null;
  externalUrl: string | null;
  estimatedMinutes: number | null;
  order: number;
};

export function LessonPlayer({
  lesson,
  status,
  progressPct,
}: {
  lesson: Lesson;
  status: "not_started" | "in_progress" | "completed";
  progressPct: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [marking, setMarking] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [currentPct, setCurrentPct] = useState(progressPct);
  const [videoOpen, setVideoOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);

  const hasR2Content = !!lesson.r2Key;
  const hasExternalUrl = !!lesson.externalUrl;
  const embedUrl = lesson.externalUrl ? getEmbedUrl(lesson.externalUrl) : null;
  const isEmbeddable = !!embedUrl;

  const typeIcon =
    lesson.contentType === "video" ? (
      <Video size={13} className="text-[#888]" />
    ) : (
      <FileText size={13} className="text-[#888]" />
    );

  const statusIcon =
    currentStatus === "completed" ? (
      <CheckCircle size={16} className="text-[#00b8ff] flex-shrink-0" />
    ) : currentStatus === "in_progress" ? (
      <div className="w-4 h-4 rounded-full border-2 border-yellow-400 flex-shrink-0" />
    ) : (
      <Circle size={16} className="text-[#444] flex-shrink-0" />
    );

  async function markProgress(pct: number) {
    await fetch("/api/portal/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId: lesson.id, progressPct: pct }),
    });
  }

  async function markCompleted() {
    setMarking(true);
    try {
      await markProgress(100);
      setCurrentStatus("completed");
      setCurrentPct(100);
    } finally {
      setMarking(false);
    }
  }

  async function openR2Video() {
    if (currentStatus === "not_started") {
      await markProgress(10);
      setCurrentStatus("in_progress");
      setCurrentPct(10);
    }
    setVideoOpen((v) => !v);
  }

  async function openExternal() {
    if (!lesson.externalUrl) return;
    if (currentStatus === "not_started") {
      await markProgress(10);
      setCurrentStatus("in_progress");
      setCurrentPct(10);
    }
    if (isEmbeddable) {
      setEmbedOpen((v) => !v);
    } else {
      window.open(lesson.externalUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="border-b border-[#101c2e] last:border-0">
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#101c2e] transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[#555] text-xs w-5 text-right flex-shrink-0">
          {lesson.order + 1}
        </span>
        {statusIcon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {typeIcon}
            <span className="text-[#f0f0f0] text-sm truncate">{lesson.title}</span>
          </div>
          {currentStatus === "in_progress" && currentPct > 0 && currentPct < 100 && (
            <div className="mt-1.5 h-1 bg-[#111e30] rounded-full overflow-hidden w-32">
              <div
                className="h-full bg-yellow-400 rounded-full"
                style={{ width: `${currentPct}%` }}
              />
            </div>
          )}
        </div>
        {lesson.estimatedMinutes && (
          <div className="flex items-center gap-1 text-[#555] text-xs flex-shrink-0">
            <Clock size={11} />
            {lesson.estimatedMinutes} min
          </div>
        )}
        <ChevronRight
          size={13}
          className={`text-[#555] flex-shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-4 bg-[#060a10]">
          <div className="flex items-center gap-3 flex-wrap pt-3">
            {hasR2Content && lesson.contentType === "video" && (
              <button
                onClick={openR2Video}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00b8ff]/10 hover:bg-[#00b8ff]/20 border border-[#00b8ff]/20 text-[#00b8ff] text-sm font-medium rounded-lg transition-colors"
              >
                {videoOpen ? <X size={13} /> : <Video size={13} />}
                {videoOpen ? "Video schließen" : "Video abspielen"}
              </button>
            )}

            {hasExternalUrl && (
              <button
                onClick={openExternal}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#00b8ff]/10 hover:bg-[#00b8ff]/20 border border-[#00b8ff]/20 text-[#00b8ff] text-sm font-medium rounded-lg transition-colors"
              >
                {isEmbeddable ? (
                  embedOpen ? <X size={13} /> : <Video size={13} />
                ) : (
                  <ExternalLink size={13} />
                )}
                {isEmbeddable
                  ? embedOpen ? "Video schließen" : "Video abspielen"
                  : "Inhalt öffnen"}
              </button>
            )}

            {currentStatus !== "completed" && (
              <button
                onClick={markCompleted}
                disabled={marking}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#888] hover:text-[#00b8ff] text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {marking ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle size={13} />
                )}
                Als abgeschlossen markieren
              </button>
            )}

            {currentStatus === "completed" && (
              <span className="flex items-center gap-1.5 text-[#00b8ff] text-sm">
                <CheckCircle size={13} />
                Abgeschlossen
              </span>
            )}
          </div>

          {/* Inline R2 video player (streamed via server proxy) */}
          {videoOpen && (
            <div className="mt-4 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
              <video
                src={`/api/learning/lesson-video?lessonId=${lesson.id}`}
                controls
                autoPlay
                className="w-full h-full"
                onEnded={markCompleted}
              />
            </div>
          )}

          {/* Inline YouTube / Vimeo embed */}
          {embedOpen && embedUrl && (
            <div className="mt-4 rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
