import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  createLearningCategory,
  createLearningChapter,
  publishChapter,
  archiveChapter,
} from "@/lib/learning/actions";
import { SIGNAL_TAG_MAP } from "@/lib/learning/constants";
import {
  BookOpen,
  FolderOpen,
  Plus,
  ChevronRight,
  Eye,
  Archive,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default async function LearningLibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const categories = await db.learningCategory.findMany({
    where: { isActive: true },
    include: {
      chapters: {
        where: { isActive: true },
        include: {
          _count: { select: { lessons: true, assignments: true } },
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  const totalChapters = categories.reduce((sum, c) => sum + c.chapters.length, 0);
  const publishedChapters = categories.reduce(
    (sum, c) => sum + c.chapters.filter((ch) => ch.status === "PUBLISHED").length,
    0
  );

  // Compute which Blueprint signal categories have no published learning content
  const coveredTags = await db.learningTag.findMany({
    where: {
      chapters: {
        some: {
          chapter: { status: "PUBLISHED", isActive: true },
        },
      },
    },
    select: { name: true },
  });
  const coveredTagNames = new Set(coveredTags.map((t) => t.name));
  const uncoveredSignals = Object.entries(SIGNAL_TAG_MAP)
    .filter(([, tags]) => !tags.some((tag) => coveredTagNames.has(tag)))
    .map(([signal]) => signal);

  async function handleCreateCategory(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    if (!title?.trim()) return;
    await createLearningCategory({ title: title.trim() });
    redirect("/admin/lernen");
  }

  async function handlePublish(formData: FormData) {
    "use server";
    const chapterId = formData.get("chapterId") as string;
    await publishChapter(chapterId);
    redirect("/admin/lernen");
  }

  async function handleArchive(formData: FormData) {
    "use server";
    const chapterId = formData.get("chapterId") as string;
    await archiveChapter(chapterId);
    redirect("/admin/lernen");
  }

  async function handleCreateChapter(formData: FormData) {
    "use server";
    const categoryId = formData.get("categoryId") as string;
    const title = formData.get("title") as string;
    if (!title?.trim() || !categoryId) return;
    const chapter = await createLearningChapter({ categoryId, title: title.trim() });
    redirect(`/admin/lernen/kapitel/${chapter.id}`);
  }

  const statusCfg: Record<string, { label: string; cls: string }> = {
    DRAFT: { label: "Entwurf", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
    PUBLISHED: { label: "Veröffentlicht", cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20" },
    ARCHIVED: { label: "Archiviert", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  };

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Learning Library</h1>
          <p className="text-[#888] text-sm mt-1">
            {totalChapters} Kapitel · {publishedChapters} veröffentlicht
          </p>
        </div>

        <form action={handleCreateCategory} className="flex items-center gap-2">
          <input
            name="title"
            required
            placeholder="Neue Kategorie…"
            className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50 w-48"
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} />
            Kategorie
          </button>
        </form>
      </div>

      {/* Missing content warning */}
      {uncoveredSignals.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-yellow-400 text-sm mt-0.5 flex-shrink-0">⚠</span>
          <div className="min-w-0">
            <p className="text-yellow-400 text-sm font-medium mb-1.5">
              Fehlende Lerninhalte für {uncoveredSignals.length} Blueprint-Signal
              {uncoveredSignals.length !== 1 ? "e" : ""}
            </p>
            <p className="text-[#888] text-xs mb-2">
              Für folgende Blueprint-Signalkategorien existieren noch keine veröffentlichten Kapitel
              mit passenden Tags. Neue Empfehlungen können für diese Bereiche nicht automatisch
              ausgesprochen werden.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uncoveredSignals.map((signal) => (
                <span
                  key={signal}
                  className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                >
                  {signal}
                </span>
              ))}
            </div>
            <p className="text-[#555] text-xs mt-2">
              Tags laut Mapping:{" "}
              {uncoveredSignals
                .flatMap((s) => SIGNAL_TAG_MAP[s] ?? [])
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(", ")}
            </p>
            <Link
              href="/admin/lernen"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <Plus size={12} />
              Lerninhalt erstellen
            </Link>
          </div>
        </div>
      )}

      {/* Categories */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Layers size={40} className="text-[#333] mb-4" />
          <p className="text-[#888] text-sm">Noch keine Kategorien vorhanden.</p>
          <p className="text-[#555] text-xs mt-1">
            Erstellen Sie eine Kategorie, um die Lernbibliothek aufzubauen.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden"
            >
              {/* Category header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-3">
                  <FolderOpen size={16} className="text-[#22c55e]" />
                  <div>
                    <h2 className="text-[#f0f0f0] font-semibold text-sm">{category.title}</h2>
                    <p className="text-[#555] text-xs">
                      {category.chapters.length} Kapitel
                    </p>
                  </div>
                </div>

                <form action={handleCreateChapter} className="flex items-center gap-2">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input
                    name="title"
                    required
                    placeholder="Neues Kapitel…"
                    className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50 w-44"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] hover:text-[#f0f0f0] text-xs rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    Kapitel
                  </button>
                </form>
              </div>

              {/* Chapters */}
              {category.chapters.length === 0 ? (
                <p className="px-5 py-4 text-[#555] text-sm">
                  Noch keine Kapitel. Erstellen Sie das erste Kapitel.
                </p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1e1e1e]">
                      {["Kapitel", "Lektionen", "Zuweisungen", "Status", ""].map((h) => (
                        <th key={h} className="text-left text-xs text-[#555] font-medium px-5 py-2.5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]">
                    {category.chapters.map((chapter) => {
                      const sc = statusCfg[chapter.status] ?? statusCfg.DRAFT;
                      return (
                        <tr key={chapter.id} className="hover:bg-[#1a1a1a] transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <BookOpen size={13} className="text-[#888] flex-shrink-0" />
                              <div>
                                <p className="text-[#f0f0f0] text-sm font-medium">{chapter.title}</p>
                                {chapter.estimatedMinutes && (
                                  <p className="text-[#555] text-xs">{chapter.estimatedMinutes} min</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[#888]">
                            {chapter._count.lessons}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[#888]">
                            {chapter._count.assignments}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Link
                                href={`/admin/lernen/kapitel/${chapter.id}`}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] transition-colors"
                              >
                                <ChevronRight size={13} />
                              </Link>

                              {chapter.status === "DRAFT" && (
                                <form action={handlePublish}>
                                  <input type="hidden" name="chapterId" value={chapter.id} />
                                  <button
                                    type="submit"
                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                                    title="Veröffentlichen"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </form>
                              )}

                              {chapter.status === "PUBLISHED" && (
                                <form action={handleArchive}>
                                  <input type="hidden" name="chapterId" value={chapter.id} />
                                  <button
                                    type="submit"
                                    className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                                    title="Archivieren"
                                  >
                                    <Archive size={13} />
                                  </button>
                                </form>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
