import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Eye, EyeOff, ArrowRight } from "lucide-react";

export default async function AdminDokumentePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string; visibility?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const { companyId, visibility } = await searchParams;

  const [documents, companies] = await Promise.all([
    db.document.findMany({
      where: {
        ...(companyId ? { companyId } : {}),
        ...(visibility ? { visibility } : {}),
      },
      include: {
        company: { select: { id: true, name: true } },
        uploadedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Dokumente</h1>
        <p className="text-[#888] text-sm mt-1">Alle Kundendokumente im Überblick</p>
      </div>

      {/* Filters */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-[#888] text-xs font-medium">Filter:</span>

        <Link
          href="/admin/dokumente"
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            !companyId && !visibility
              ? "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20"
              : "text-[#888] bg-[#101c2e] border-[#1a2840] hover:border-[#3a3a3a]"
          }`}
        >
          Alle
        </Link>

        <Link
          href="/admin/dokumente?visibility=customer"
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            visibility === "customer"
              ? "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20"
              : "text-[#888] bg-[#101c2e] border-[#1a2840] hover:border-[#3a3a3a]"
          }`}
        >
          Für Kunden freigegeben
        </Link>

        <Link
          href="/admin/dokumente?visibility=internal"
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            visibility === "internal"
              ? "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20"
              : "text-[#888] bg-[#101c2e] border-[#1a2840] hover:border-[#3a3a3a]"
          }`}
        >
          Intern
        </Link>

        {companies.length > 0 && (
          <form method="get" action="/admin/dokumente" className="flex items-center gap-2">
            {visibility && <input type="hidden" name="visibility" value={visibility} />}
            <select
              name="companyId"
              defaultValue={companyId ?? ""}
              className="text-xs bg-[#101c2e] border border-[#1a2840] rounded-lg px-3 py-1.5 text-[#888] focus:outline-none focus:border-[#00b8ff]/50"
            >
              <option value="">Alle Kunden</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 bg-[#101c2e] border border-[#1a2840] hover:border-[#3a3a3a] text-[#888] hover:text-[#f0f0f0] rounded-lg transition-colors"
            >
              Filtern
            </button>
          </form>
        )}

        <span className="ml-auto text-[#555] text-xs">{documents.length} Dokument(e)</span>
      </div>

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-16 text-center">
          <FileText size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm">Keine Dokumente gefunden.</p>
        </div>
      ) : (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#1a2840]">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#101c2e] transition-colors"
              >
                <FileText size={15} className="text-[#555] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f0f0] text-sm font-medium truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Link
                      href={`/admin/kunden/${doc.company.id}/dokumente`}
                      className="text-[#00b8ff] text-xs hover:underline"
                    >
                      {doc.company.name}
                    </Link>
                    {doc.category !== "OTHER" && (
                      <>
                        <span className="text-[#333] text-xs">·</span>
                        <span className="text-[#555] text-xs">{doc.category}</span>
                      </>
                    )}
                    {doc.uploadedBy && (
                      <>
                        <span className="text-[#333] text-xs">·</span>
                        <span className="text-[#555] text-xs">von {doc.uploadedBy.name}</span>
                      </>
                    )}
                    <span className="text-[#333] text-xs">·</span>
                    <span className="text-[#555] text-xs">
                      {new Date(doc.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {doc.visibility === "customer" ? (
                    <span className="flex items-center gap-1 text-xs text-[#00b8ff] bg-[#00b8ff]/10 border border-[#00b8ff]/20 px-2 py-0.5 rounded-full">
                      <Eye size={10} />
                      Freigegeben
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-[#888] bg-[#101c2e] border border-[#1a2840] px-2 py-0.5 rounded-full">
                      <EyeOff size={10} />
                      Intern
                    </span>
                  )}
                  {doc.fileUrl && (
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#888] hover:text-[#f0f0f0] text-xs transition-colors"
                    >
                      <ArrowRight size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
