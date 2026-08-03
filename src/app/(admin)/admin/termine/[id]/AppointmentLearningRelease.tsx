"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, Clock, Plus, Loader2 } from "lucide-react";

type Chapter = {
  id: string;
  title: string;
  estimatedMinutes: number | null;
};

type ActiveAssignment = {
  id: string;
  chapter: {
    title: string;
    lessons: { progress: { status: string }[] }[];
  };
};

export function AppointmentLearningRelease({
  companyId,
  availableChapters,
  activeAssignments,
}: {
  companyId: string;
  availableChapters: Chapter[];
  activeAssignments: ActiveAssignment[];
}) {
  const router = useRouter();
  const [releasing, setReleasing] = useState<string | null>(null);
  const [released, setReleased] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function release(chapterId: string) {
    setReleasing(chapterId);
    setErrors((prev) => { const next = { ...prev }; delete next[chapterId]; return next; });

    try {
      const res = await fetch("/api/learning/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, chapterId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [chapterId]: data.error ?? "Fehler beim Freigeben." }));
      } else {
        setReleased((prev) => new Set(prev).add(chapterId));
        router.refresh();
      }
    } catch {
      setErrors((prev) => ({ ...prev, [chapterId]: "Netzwerkfehler." }));
    } finally {
      setReleasing(null);
    }
  }

  const pendingChapters = availableChapters.filter((c) => !released.has(c.id));

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
      <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2 mb-4">
        <BookOpen size={15} className="text-[#00b8ff]" />
        Lernfreigabe
      </h2>

      {/* Active assignments */}
      {activeAssignments.length > 0 && (
        <div className="space-y-2 mb-4">
          {activeAssignments.map((a) => {
            const total = a.chapter.lessons.length;
            const done = a.chapter.lessons.filter((l) => l.progress[0]?.status === "completed").length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={a.id} className="flex items-center gap-3 p-2.5 bg-[#060a10] rounded-lg">
                {pct === 100 ? (
                  <CheckCircle size={13} className="text-[#00b8ff] flex-shrink-0" />
                ) : (
                  <Clock size={13} className="text-[#555] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f0f0] text-xs font-medium truncate">{a.chapter.title}</p>
                  <p className="text-[#555] text-xs">{done}/{total} Lektionen · {pct}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available to release */}
      {pendingChapters.length > 0 ? (
        <div className="space-y-2">
          {activeAssignments.length > 0 && (
            <p className="text-[#555] text-xs uppercase tracking-wide font-semibold mb-1">Verfügbar zur Freigabe</p>
          )}
          {pendingChapters.map((chapter) => (
            <div key={chapter.id}>
              <div className="flex items-center gap-3 p-2.5 bg-[#060a10] rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[#888] text-xs font-medium truncate">{chapter.title}</p>
                  {chapter.estimatedMinutes && (
                    <p className="text-[#444] text-xs">{chapter.estimatedMinutes} Min.</p>
                  )}
                </div>
                <button
                  onClick={() => release(chapter.id)}
                  disabled={releasing === chapter.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#00b8ff]/10 text-[#00b8ff] text-xs font-medium hover:bg-[#00b8ff]/20 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  {releasing === chapter.id ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Plus size={11} />
                  )}
                  Freigeben
                </button>
              </div>
              {errors[chapter.id] && (
                <p className="text-red-400 text-xs mt-1 ml-1">{errors[chapter.id]}</p>
              )}
            </div>
          ))}
        </div>
      ) : activeAssignments.length === 0 ? (
        <p className="text-[#555] text-sm">Keine veröffentlichten Kapitel verfügbar.</p>
      ) : null}

      {released.size > 0 && (
        <p className="text-[#00b8ff] text-xs mt-3 flex items-center gap-1">
          <CheckCircle size={11} />
          {released.size} Kapitel soeben freigegeben
        </p>
      )}
    </div>
  );
}
