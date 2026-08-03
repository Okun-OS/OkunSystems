import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle, Clock, Lock, ChevronRight } from "lucide-react";
import { LessonPlayer } from "./LessonPlayer";

export default async function PortalLearningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  if (!user.companyId) redirect("/dashboard");

  const assignments = await db.customerLearningAssignment.findMany({
    where: { companyId: user.companyId, status: "active" },
    include: {
      chapter: {
        include: {
          category: { select: { title: true } },
          lessons: {
            where: { status: "PUBLISHED", isActive: true },
            orderBy: { order: "asc" },
            include: {
              progress: { where: { userId: user.id } },
            },
          },
          tags: { include: { tag: { select: { name: true } } } },
        },
      },
    },
    orderBy: { activatedAt: "desc" },
  });

  // Group by category
  const byCategory = new Map<string, typeof assignments>();
  for (const a of assignments) {
    const catTitle = a.chapter.category.title;
    if (!byCategory.has(catTitle)) byCategory.set(catTitle, []);
    byCategory.get(catTitle)!.push(a);
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Lernbereich</h1>
        <p className="text-[#888] text-sm mt-1">
          {assignments.length} Kapitel freigeschaltet
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Lock size={40} className="text-[#333] mb-4" />
          <p className="text-[#888] text-sm">Noch keine Lerninhalte freigeschaltet.</p>
          <p className="text-[#555] text-xs mt-1">
            Ihr OKUN-Ansprechpartner schaltet passende Inhalte für Sie frei.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(byCategory.entries()).map(([catTitle, catAssignments]) => (
            <div key={catTitle}>
              <h2 className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-4">
                {catTitle}
              </h2>

              <div className="space-y-4">
                {catAssignments.map((a) => {
                  const lessons = a.chapter.lessons;
                  const completedCount = lessons.filter(
                    (l) => l.progress[0]?.status === "completed"
                  ).length;
                  const pct =
                    lessons.length > 0
                      ? Math.round((completedCount / lessons.length) * 100)
                      : 0;

                  return (
                    <div
                      key={a.id}
                      className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden"
                    >
                      {/* Chapter header */}
                      <div className="p-5 border-b border-[#1a2840]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen size={14} className="text-[#00b8ff]" />
                              <h3 className="text-[#f0f0f0] font-semibold text-sm">
                                {a.chapter.title}
                              </h3>
                              {pct === 100 && (
                                <CheckCircle size={14} className="text-[#00b8ff]" />
                              )}
                            </div>
                            {a.chapter.description && (
                              <p className="text-[#888] text-xs ml-5 leading-relaxed">
                                {a.chapter.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 ml-5">
                              {a.chapter.tags.slice(0, 3).map((ct) => (
                                <span
                                  key={ct.tag.name}
                                  className="text-xs px-2 py-0.5 rounded-full bg-[#00b8ff]/10 text-[#00b8ff] border border-[#00b8ff]/20"
                                >
                                  {ct.tag.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[#f0f0f0] text-lg font-bold">{pct}%</p>
                            <p className="text-[#555] text-xs">
                              {completedCount}/{lessons.length} Lektionen
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 bg-[#111e30] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#00b8ff] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Lessons */}
                      {lessons.length === 0 ? (
                        <p className="px-5 py-4 text-[#555] text-sm">
                          Noch keine Lektionen in diesem Kapitel.
                        </p>
                      ) : (
                        <div className="divide-y divide-[#101c2e]">
                          {lessons.map((lesson, idx) => {
                            const progress = lesson.progress[0];
                            const isCompleted = progress?.status === "completed";
                            const isInProgress = progress?.status === "in_progress";

                            return (
                              <LessonPlayer
                                key={lesson.id}
                                lesson={{
                                  id: lesson.id,
                                  title: lesson.title,
                                  contentType: lesson.contentType,
                                  r2Key: lesson.r2Key,
                                  externalUrl: lesson.externalUrl,
                                  estimatedMinutes: lesson.estimatedMinutes,
                                  order: idx,
                                }}
                                status={
                                  isCompleted
                                    ? "completed"
                                    : isInProgress
                                    ? "in_progress"
                                    : "not_started"
                                }
                                progressPct={progress?.progressPct ?? 0}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
