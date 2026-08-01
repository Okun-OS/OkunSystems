import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { setDocumentVisibility, deleteDocument } from "@/lib/documents/actions";
import { FileText, Lock, Globe, Trash2, Upload, Eye, EyeOff } from "lucide-react";
import { DocumentUploadButton } from "./DocumentUploadButton";

export default async function CustomerDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const adminId = (session.user as any).id as string;

  const [company, documents] = await Promise.all([
    db.company.findUnique({ where: { id }, select: { id: true, name: true } }),
    db.document.findMany({
      where: { companyId: id },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!company) notFound();

  async function handleToggleVisibility(formData: FormData) {
    "use server";
    const docId = formData.get("documentId") as string;
    const current = formData.get("visibility") as string;
    const next = current === "customer" ? "internal" : "customer";
    await setDocumentVisibility(docId, next as "internal" | "customer", adminId);
    redirect(`/admin/kunden/${id}/dokumente`);
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const docId = formData.get("documentId") as string;
    await deleteDocument(docId, adminId);
    redirect(`/admin/kunden/${id}/dokumente`);
  }

  const customerDocs = documents.filter((d) => d.visibility === "customer");
  const internalDocs = documents.filter((d) => d.visibility !== "customer");

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#888]">
            <Globe size={14} className="text-[#22c55e]" />
            <span className="text-[#f0f0f0] font-medium">{customerDocs.length}</span> für Kunden sichtbar
          </div>
          <div className="flex items-center gap-2 text-sm text-[#888]">
            <Lock size={14} className="text-[#888]" />
            <span>{internalDocs.length}</span> intern
          </div>
        </div>
        <DocumentUploadButton companyId={id} adminId={adminId} />
      </div>

      {/* Document list */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={32} className="text-[#333] mb-3" />
            <p className="text-[#555] text-sm">Noch keine Dokumente vorhanden.</p>
            <p className="text-[#444] text-xs mt-1">Laden Sie Dokumente hoch, um sie mit dem Kunden zu teilen.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Dokument", "Kategorie", "Hochgeladen von", "Datum", "Sichtbarkeit", ""].map((h) => (
                  <th key={h} className="text-left text-xs text-[#888] font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#1a1a1a] transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <FileText size={14} className="text-[#888] flex-shrink-0" />
                      <div>
                        <p className="text-sm text-[#f0f0f0] font-medium">{doc.title}</p>
                        {doc.fileName && (
                          <p className="text-xs text-[#555]">{doc.fileName}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#888]">{doc.category}</td>
                  <td className="px-4 py-3.5 text-sm text-[#888]">
                    {doc.uploadedBy?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-[#888] whitespace-nowrap">
                    {doc.createdAt.toLocaleDateString("de-DE")}
                  </td>
                  <td className="px-4 py-3.5">
                    <form action={handleToggleVisibility}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <input type="hidden" name="visibility" value={doc.visibility} />
                      <button
                        type="submit"
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          doc.visibility === "customer"
                            ? "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 hover:bg-[#22c55e]/20"
                            : "bg-[#888]/10 text-[#888] border-[#888]/20 hover:bg-[#888]/20"
                        }`}
                      >
                        {doc.visibility === "customer" ? (
                          <><Globe size={11} /> Für Kunde sichtbar</>
                        ) : (
                          <><Lock size={11} /> Intern</>
                        )}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3.5">
                    <form action={handleDelete}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <button
                        type="submit"
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[#555] hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => {
                          if (!confirm("Dokument wirklich löschen?")) e.preventDefault();
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
