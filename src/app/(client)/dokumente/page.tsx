import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, Download, Eye, Search, BookOpen, Map, BookMarked, GraduationCap } from "lucide-react";
import { formatDate } from "@/lib/utils";

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  REPORT: { label: "Analysebericht", icon: FileText, color: "text-blue-400" },
  ROADMAP: { label: "Roadmap", icon: Map, color: "text-purple-400" },
  SOP: { label: "SOP", icon: BookOpen, color: "text-yellow-400" },
  TRAINING: { label: "Schulungsunterlage", icon: GraduationCap, color: "text-green-400" },
  OTHER: { label: "Sonstiges", icon: BookMarked, color: "text-[#888]" },
};

export default async function DokumentePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      company: {
        include: {
          documents: { where: { isPublished: true }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const documents = user.company?.documents ?? [];
  const byCategory = documents.reduce<Record<string, typeof documents>>((acc, doc) => {
    const cat = doc.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  const categories = Object.keys(CATEGORY_CONFIG) as (keyof typeof CATEGORY_CONFIG)[];

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Dokumentencenter</h1>
          <p className="text-[#888] text-sm mt-1">{documents.length} freigegebene Dokumente</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            placeholder="Dokument suchen..."
            className="bg-[#141414] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
          />
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-16 text-center">
          <FileText size={32} className="text-[#555] mx-auto mb-4" />
          <p className="text-[#888]">Noch keine Dokumente freigegeben.</p>
          <p className="text-[#555] text-sm mt-2">Ihr OKUN-Berater wird hier Berichte und Unterlagen bereitstellen.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const docs = byCategory[cat];
            if (!docs || docs.length === 0) return null;
            const config = CATEGORY_CONFIG[cat];
            const Icon = config.icon;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2.5 mb-4">
                  <Icon size={16} className={config.color} />
                  <h2 className="text-[#f0f0f0] font-semibold text-sm">{config.label}</h2>
                  <span className="text-[#555] text-xs">({docs.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {docs.map((doc) => (
                    <div key={doc.id} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#22c55e]/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className={config.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#f0f0f0] text-sm font-medium truncate">{doc.title}</p>
                          {doc.description && (
                            <p className="text-[#888] text-xs mt-0.5 truncate">{doc.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {doc.version && (
                              <span className="text-[#555] text-xs">v{doc.version}</span>
                            )}
                            <span className="text-[#555] text-xs">{formatDate(doc.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#22c55e]/10 border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#22c55e] text-xs rounded-lg py-1.5 transition-colors">
                          <Eye size={12} />
                          Anzeigen
                        </button>
                        {doc.fileUrl && (
                          <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#1a1a1a] hover:bg-[#22c55e]/10 border border-[#2a2a2a] hover:border-[#22c55e]/30 text-[#888] hover:text-[#22c55e] text-xs rounded-lg py-1.5 transition-colors">
                            <Download size={12} />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
