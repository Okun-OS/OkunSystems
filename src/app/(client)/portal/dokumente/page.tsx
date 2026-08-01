import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { FileText, Download, Lock } from "lucide-react";
import { DocumentDownloadButton } from "./DocumentDownloadButton";

export default async function PortalDocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  if (!user.companyId) redirect("/dashboard");

  const documents = await db.document.findMany({
    where: { companyId: user.companyId, visibility: "customer" },
    orderBy: { createdAt: "desc" },
  });

  const byCategory = documents.reduce<Record<string, typeof documents>>(
    (acc, doc) => {
      const cat = doc.category ?? "Sonstiges";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {}
  );

  const CATEGORY_LABELS: Record<string, string> = {
    REPORT: "Berichte",
    CONTRACT: "Verträge",
    PRESENTATION: "Präsentationen",
    OTHER: "Sonstiges",
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Dokumente</h1>
        <p className="text-[#888] text-sm mt-1">
          {documents.length} Dokument{documents.length !== 1 ? "e" : ""} verfügbar
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Lock size={40} className="text-[#333] mb-4" />
          <p className="text-[#888] text-sm">Noch keine Dokumente verfügbar.</p>
          <p className="text-[#555] text-xs mt-1">
            Sobald Dokumente für Sie freigegeben werden, erscheinen sie hier.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(Object.entries(byCategory) as [string, typeof documents][]).map(([category, docs]) => (
            <div key={category} className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#2a2a2a]">
                <h2 className="text-[#888] text-xs font-semibold uppercase tracking-wider">
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
              </div>

              <div className="divide-y divide-[#1a1a1a]">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-[#888]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-[#f0f0f0] text-sm font-medium truncate">
                        {doc.title}
                      </p>
                      {doc.description && (
                        <p className="text-[#555] text-xs mt-0.5 truncate">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-[#444] text-xs mt-0.5">
                        {doc.createdAt.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                        {doc.fileSize && (
                          <> · {(doc.fileSize / 1024 / 1024).toFixed(1)} MB</>
                        )}
                      </p>
                    </div>

                    <DocumentDownloadButton documentId={doc.id} fileName={doc.fileName ?? doc.title} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
