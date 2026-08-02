import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import {
  updateLearningChapter,
  createLearningLesson,
  updateLearningLesson,
  publishChapter,
  setChapterTags,
} from "@/lib/learning/actions";
import { ArrowLeft, BookOpen, Plus, Save, Tag, Clock } from "lucide-react";
import Link from "next/link";
import { LessonUploadRow } from "./LessonUploadRow";

export default async function ChapterEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const chapter = await db.learningChapter.findUnique({
    where: { id },
    include: {
      category: { select: { title: true, id: true } },
      lessons: { orderBy: { order: "asc" } },
      tags: { include: { tag: true } },
    },
  });

  if (!chapter) notFound();

  async function handleUpdateChapter(formData: FormData) {
    "use server";
    await updateLearningChapter(id, {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      contentType: formData.get("contentType") as string,
      availability: formData.get("availability") as string,
      estimatedMinutes: formData.get("estimatedMinutes")
        ? parseInt(formData.get("estimatedMinutes") as string)
        : undefined,
    });
    const tagsRaw = (formData.get("tags") as string) || "";
    const tagNames = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    await setChapterTags(id, tagNames);
    redirect(`/admin/lernen/kapitel/${id}`);
  }

  async function handlePublish(formData: FormData) {
    "use server";
    await publishChapter(formData.get("chapterId") as string);
    redirect(`/admin/lernen/kapitel/${id}`);
  }

  async function handleCreateLesson(formData: FormData) {
    "use server";
    const title = formData.get("lessonTitle") as string;
    if (!title?.trim()) return;
    const chapterData = await db.learningChapter.findUnique({
      where: { id },
      select: { lessons: { select: { id: true } } },
    });
    const order = chapterData?.lessons.length ?? 0;
    await createLearningLesson({
      chapterId: id,
      title: title.trim(),
      contentType: formData.get("lessonType") as string,
      estimatedMinutes: formData.get("lessonMinutes")
        ? parseInt(formData.get("lessonMinutes") as string)
        : undefined,
      order,
    });
    redirect(`/admin/lernen/kapitel/${id}`);
  }

  async function handleUpdateLesson(formData: FormData) {
    "use server";
    const lessonId = formData.get("lessonId") as string;
    await updateLearningLesson(lessonId, {
      title: formData.get("lessonTitle") as string,
      externalUrl: (formData.get("externalUrl") as string) || undefined,
      status: formData.get("lessonStatus") as string,
    });
    redirect(`/admin/lernen/kapitel/${id}`);
  }

  const currentTags = chapter.tags.map((ct) => ct.tag.name).join(", ");
  const statusCfg: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Entwurf", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
    PUBLISHED: { label: "Veröffentlicht", cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
    ARCHIVED: { label: "Archiviert", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  };
  const sc = statusCfg[chapter.status] ?? statusCfg.DRAFT;

  return (
    <div className="max-w-[900px] mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/admin/lernen"
          className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Learning Library
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#555] text-sm">{chapter.category.title}</span>
              <span className="text-[#333]">/</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#f0f0f0]">{chapter.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                {sc.label}
              </span>
            </div>
          </div>

          {chapter.status === "DRAFT" && (
            <form action={handlePublish}>
              <input type="hidden" name="chapterId" value={chapter.id} />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
              >
                Veröffentlichen
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chapter settings */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Kapitel-Einstellungen</h2>

            <form action={handleUpdateChapter} className="space-y-4">
              <div>
                <label className="text-[#888] text-xs block mb-1.5">Titel</label>
                <input
                  name="title"
                  defaultValue={chapter.title}
                  required
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>

              <div>
                <label className="text-[#888] text-xs block mb-1.5">Beschreibung</label>
                <textarea
                  name="description"
                  defaultValue={chapter.description ?? ""}
                  rows={3}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm resize-none focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#888] text-xs block mb-1.5">Inhaltstyp</label>
                  <select
                    name="contentType"
                    defaultValue={chapter.contentType}
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#22c55e]/50"
                  >
                    <option value="video">Video</option>
                    <option value="text">Text</option>
                    <option value="pdf">PDF</option>
                    <option value="mixed">Gemischt</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#888] text-xs block mb-1.5">
                    <Clock size={11} className="inline mr-1" />
                    Minuten
                  </label>
                  <input
                    name="estimatedMinutes"
                    type="number"
                    min={1}
                    defaultValue={chapter.estimatedMinutes ?? ""}
                    placeholder="—"
                    className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#888] text-xs flex items-center gap-1 mb-1.5">
                  <Tag size={11} />
                  Tags (kommagetrennt)
                </label>
                <input
                  name="tags"
                  defaultValue={currentTags}
                  placeholder="Automatisierung, Prozesse, …"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>

              <div>
                <label className="text-[#888] text-xs block mb-1.5">Verfügbarkeit</label>
                <select
                  name="availability"
                  defaultValue={chapter.availability ?? "strategy_session"}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#22c55e]/50"
                >
                  <option value="strategy_session">Nach Strategiegespräch (Standard)</option>
                  <option value="immediate">Sofort nach Zuweisung</option>
                </select>
                <p className="text-[#555] text-xs mt-1">
                  Steuert, ob der Inhalt direkt aktiviert oder erst per Strategiegespräch freigegeben wird.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#f0f0f0] text-sm rounded-lg transition-colors"
              >
                <Save size={13} />
                Speichern
              </button>
            </form>
          </div>
        </div>

        {/* Lessons */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center gap-2">
              <BookOpen size={15} className="text-[#22c55e]" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">
                Lektionen ({chapter.lessons.length})
              </h2>
            </div>

            {chapter.lessons.length > 0 && (
              <div className="divide-y divide-[#1a1a1a]">
                {chapter.lessons.map((lesson, idx) => (
                  <LessonUploadRow
                    key={lesson.id}
                    lesson={lesson}
                    index={idx}
                    updateAction={handleUpdateLesson}
                  />
                ))}
              </div>
            )}

            {/* Add lesson */}
            <form action={handleCreateLesson} className="p-4 border-t border-[#2a2a2a] flex items-end gap-3">
              <div className="flex-1">
                <label className="text-[#555] text-xs block mb-1">Neue Lektion</label>
                <input
                  name="lessonTitle"
                  required
                  placeholder="Lektionstitel…"
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
              <div>
                <label className="text-[#555] text-xs block mb-1">Typ</label>
                <select
                  name="lessonType"
                  className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#22c55e]/50"
                >
                  <option value="video">Video</option>
                  <option value="text">Text</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div>
                <label className="text-[#555] text-xs block mb-1">Min</label>
                <input
                  name="lessonMinutes"
                  type="number"
                  min={1}
                  placeholder="—"
                  className="w-20 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus size={13} />
                Lektion
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
