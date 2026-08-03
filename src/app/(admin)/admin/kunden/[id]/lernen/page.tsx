import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import {
  suggestAssignment,
  activateAssignment,
  rejectAssignment,
} from "@/lib/learning/actions";
import { BookOpen, CheckCircle, XCircle, Clock, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";

export default async function CustomerLearningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const adminId = (session.user as any).id as string;

  const [company, assignments, allPublishedChapters] = await Promise.all([
    db.company.findUnique({ where: { id }, select: { id: true, name: true } }),
    db.customerLearningAssignment.findMany({
      where: { companyId: id },
      include: {
        chapter: {
          include: {
            category: { select: { title: true } },
            lessons: {
              select: {
                id: true,
                status: true,
                progress: {
                  where: { user: { companyId: id } },
                  select: { updatedAt: true, status: true },
                  orderBy: { updatedAt: "desc" as const },
                  take: 1,
                },
              },
            },
            tags: { include: { tag: { select: { name: true } } } },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    }),
    db.learningChapter.findMany({
      where: { status: "PUBLISHED", isActive: true },
      include: { category: { select: { title: true } } },
      orderBy: [{ category: { order: "asc" } }, { order: "asc" }],
    }),
  ]);

  if (!company) notFound();

  const assignedChapterIds = new Set(assignments.map((a) => a.chapterId));
  const availableChapters = allPublishedChapters.filter(
    (c) => !assignedChapterIds.has(c.id)
  );

  async function handleActivate(formData: FormData) {
    "use server";
    const assignmentId = formData.get("assignmentId") as string;
    await activateAssignment({ assignmentId, adminUserId: adminId });
    redirect(`/admin/kunden/${id}/lernen`);
  }

  async function handleReject(formData: FormData) {
    "use server";
    const assignmentId = formData.get("assignmentId") as string;
    const note = formData.get("note") as string;
    await rejectAssignment({ assignmentId, adminUserId: adminId, note });
    redirect(`/admin/kunden/${id}/lernen`);
  }

  async function handleSuggest(formData: FormData) {
    "use server";
    const chapterId = formData.get("chapterId") as string;
    await suggestAssignment({ companyId: id, chapterId, assignedById: adminId });
    redirect(`/admin/kunden/${id}/lernen`);
  }

  const suggested = assignments.filter((a) => a.status === "suggested");
  const active = assignments.filter((a) => a.status === "active");
  const rejected = assignments.filter((a) => a.status === "rejected");

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Freigegeben", value: active.length, color: "text-[#00b8ff]" },
          { label: "Vorgeschlagen", value: suggested.length, color: "text-yellow-400" },
          { label: "Abgelehnt", value: rejected.length, color: "text-[#888]" },
        ].map((s) => (
          <div key={s.label} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[#888] text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Suggested — awaiting admin decision */}
      {suggested.length > 0 && (
        <div className="bg-[#0c1520] border border-yellow-500/20 rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock size={15} className="text-yellow-400" />
            Vorgeschlagen — Freigabe ausstehend ({suggested.length})
          </h2>
          <div className="space-y-2">
            {suggested.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-[#060a10] rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-[#888]" />
                    <p className="text-[#f0f0f0] text-sm font-medium">{a.chapter.title}</p>
                  </div>
                  <p className="text-[#555] text-xs mt-0.5 ml-5">
                    {a.chapter.category.title} · {a.chapter.lessons.length} Lektionen
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={handleActivate}>
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00b8ff]/10 hover:bg-[#00b8ff]/20 border border-[#00b8ff]/20 text-[#00b8ff] text-xs font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle size={12} />
                      Freigeben
                    </button>
                  </form>
                  <form action={handleReject}>
                    <input type="hidden" name="assignmentId" value={a.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
                    >
                      <XCircle size={12} />
                      Ablehnen
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
          <CheckCircle size={15} className="text-[#00b8ff]" />
          Freigegebene Lerninhalte ({active.length})
        </h2>

        {active.length === 0 ? (
          <p className="text-[#555] text-sm">Noch keine Lerninhalte freigegeben.</p>
        ) : (
          <div className="space-y-2">
            {active.map((a) => {
              const lastActivity = a.chapter.lessons
                .flatMap((l) => l.progress)
                .sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime())[0]?.updatedAt;
              const completedLessons = a.chapter.lessons.filter(
                (l) => l.progress[0]?.status === "completed"
              ).length;
              return (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 bg-[#060a10] rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={13} className="text-[#00b8ff]" />
                    <p className="text-[#f0f0f0] text-sm font-medium">{a.chapter.title}</p>
                  </div>
                  <p className="text-[#555] text-xs mt-0.5 ml-5">
                    {a.chapter.category.title} · {completedLessons}/{a.chapter.lessons.length} Lektionen
                    {a.activatedAt && (
                      <> · Freigegeben {a.activatedAt.toLocaleDateString("de-DE")}</>
                    )}
                    {lastActivity && (
                      <> · Letzte Aktivität {lastActivity.toLocaleDateString("de-DE")}</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.chapter.tags.slice(0, 2).map((ct) => (
                    <span
                      key={ct.tag.name}
                      className="text-xs px-2 py-0.5 rounded-full bg-[#00b8ff]/10 text-[#00b8ff] border border-[#00b8ff]/20"
                    >
                      {ct.tag.name}
                    </span>
                  ))}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add more */}
      {availableChapters.length > 0 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <Plus size={15} className="text-[#00b8ff]" />
            Weitere Lerninhalte hinzufügen
          </h2>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {availableChapters.map((chapter) => {
              const isImmediate = (chapter as any).availability === "immediate";
              return (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-3 bg-[#060a10] rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#f0f0f0] text-sm">{chapter.title}</p>
                      {isImmediate && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff]">
                          Sofort aktiv
                        </span>
                      )}
                    </div>
                    <p className="text-[#555] text-xs mt-0.5">{chapter.category.title}</p>
                  </div>
                  <form action={handleSuggest}>
                    <input type="hidden" name="chapterId" value={chapter.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg transition-colors"
                    >
                      <Plus size={11} />
                      {isImmediate ? "Zuweisen" : "Vorschlagen"}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Link
          href="/admin/lernen"
          className="flex items-center gap-2 text-sm text-[#888] hover:text-[#00b8ff] transition-colors"
        >
          Learning Library verwalten
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
