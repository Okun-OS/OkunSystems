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
} from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  contentType: string;
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

  const typeIcon =
    lesson.contentType === "video" ? (
      <Video size={13} className="text-[#888]" />
    ) : (
      <FileText size={13} className="text-[#888]" />
    );

  const statusIcon =
    currentStatus === "completed" ? (
      <CheckCircle size={16} className="text-[#22c55e] flex-shrink-0" />
    ) : currentStatus === "in_progress" ? (
      <div className="w-4 h-4 rounded-full border-2 border-yellow-400 flex-shrink-0" />
    ) : (
      <Circle size={16} className="text-[#444] flex-shrink-0" />
    );

  async function markCompleted() {
    setMarking(true);
    try {
      await fetch("/api/portal/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, progressPct: 100 }),
      });
      setCurrentStatus("completed");
      setCurrentPct(100);
    } finally {
      setMarking(false);
    }
  }

  async function openContent() {
    if (!lesson.externalUrl) return;

    // Mark as in-progress when opening
    if (currentStatus === "not_started") {
      await fetch("/api/portal/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, progressPct: 10 }),
      });
      setCurrentStatus("in_progress");
      setCurrentPct(10);
    }

    window.open(lesson.externalUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="border-b border-[#1a1a1a] last:border-0">
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#1a1a1a] transition-colors text-left"
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
            <div className="mt-1.5 h-1 bg-[#1e1e1e] rounded-full overflow-hidden w-32">
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
        <div className="px-5 pb-4 bg-[#0d0d0d] flex items-center gap-3 flex-wrap">
          {lesson.externalUrl && (
            <button
              onClick={openContent}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/20 text-[#22c55e] text-sm font-medium rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Inhalt öffnen
            </button>
          )}

          {currentStatus !== "completed" && (
            <button
              onClick={markCompleted}
              disabled={marking}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] hover:text-[#22c55e] text-sm rounded-lg transition-colors disabled:opacity-50"
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
            <span className="flex items-center gap-1.5 text-[#22c55e] text-sm">
              <CheckCircle size={13} />
              Abgeschlossen
            </span>
          )}
        </div>
      )}
    </div>
  );
}
