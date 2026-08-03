import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setDocumentVisibility, deleteDocument } from "@/lib/documents/actions";
import { sendDocumentReleasedEmail } from "@/lib/email";
import { FileText, Lock, Globe } from "lucide-react";
import { DocumentUploadButton } from "./DocumentUploadButton";
import { DeleteDocumentButton } from "./DeleteDocumentButton";

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

    if (next === "customer") {
      const [doc, portalUsers] = await Promise.all([
        db.document.findUnique({ where: { id: docId }, select: { title: true } }),
        db.user.findMany({
          where: { companyId: id, role: "CLIENT" },
          select: { email: true, name: true },
        }),
      ]);
      if (doc) {
        await Promise.allSettled(
          portalUsers.map((u) =>
            sendDocumentReleasedEmail({
              toEmail: u.email,
              toName: u.name ?? u.email,
              companyName: company!.name,
              documentTitle: doc.title,
            })
          )
        );
      }
    }

    revalidatePath(`/admin/kunden/${id}/dokumente`);
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const docId = formData.get("documentId") as string;
    await deleteDocument(docId, adminId);
    revalidatePath(`/admin/kunden/${id}/dokumente`);
  }

  const customerDocs = documents.filter((d) => d.visibility === "customer");
  const internalDocs = documents.filter((d) => d.visibility !== "customer");

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#888]">
            <Globe size={14} className="text-[#00b8ff]" />
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
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={32} className="text-[#333] mb-3" />
            <p className="text-[#555] text-sm">Noch keine Dokumente vorhanden.</p>
            <p className="text-[#444] text-xs mt-1">Laden Sie Dokumente hoch, um sie mit dem Kunden zu teilen.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2840]">
                {["Dokument", "Kategorie", "Hochgeladen von", "Datum", "Sichtbarkeit", ""].map((h) => (
                  <th key={h} className="text-left text-xs text-[#888] font-medium px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111e30]">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#101c2e] transition-colors group">
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
                            ? "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20 hover:bg-[#00b8ff]/20"
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
                      <DeleteDocumentButton />
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
