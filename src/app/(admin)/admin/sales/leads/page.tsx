import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Plus, ArrowRight, Search } from "lucide-react";

const LEAD_STATUS_LABELS: Record<string, string> = {
  prospect: "Interessent",
  closing_scheduled: "Termin geplant",
  in_progress: "Gespräch läuft",
  offer_presented: "Angebot präsentiert",
  agreement_reached: "Einigung erzielt",
  consent_given: "Consent erteilt",
  contract_closed: "Vertrag abgeschlossen",
  payment_pending: "Zahlung ausstehend",
  verloren: "Verloren",
  storniert: "Storniert",
  abgesagt: "Abgesagt",
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "bg-[#1a2840] text-[#8899b4]",
  closing_scheduled: "bg-[rgba(0,184,255,0.1)] text-[#00b8ff]",
  in_progress: "bg-[rgba(0,184,255,0.15)] text-[#00b8ff]",
  offer_presented: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
  agreement_reached: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  consent_given: "bg-[rgba(34,197,94,0.1)] text-[#22c55e]",
  contract_closed: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  payment_pending: "bg-[rgba(34,197,94,0.2)] text-[#22c55e]",
  verloren: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
  storniert: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
  abgesagt: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const q = params.q ?? "";
  const statusFilter = params.status ?? "";

  const whereCloser =
    userRecord.role === "CLOSER" ? { assignedCloserId: userId } : {};

  const leads = await db.company.findMany({
    where: {
      leadStatus: { not: null },
      ...whereCloser,
      ...(statusFilter ? { leadStatus: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { industry: { contains: q, mode: "insensitive" } },
              { contactPerson: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      assignedCloser: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const allAdmins = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CLOSER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  type Lead = (typeof leads)[number];

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Leads</h1>
          <p className="text-[#888] text-sm mt-1">{leads.length} Leads gefunden</p>
        </div>
        <Link
          href="/admin/sales/leads/neu"
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neuer Lead
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form className="flex items-center gap-2 bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2 min-w-[260px]">
          <Search size={14} className="text-[#666]" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Suche nach Name, Branche, Ansprechpartner…"
            className="bg-transparent text-sm text-[#f0f0f0] placeholder-[#666] outline-none flex-1"
          />
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        </form>

        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: "Alle" },
            { value: "prospect", label: "Interessent" },
            { value: "closing_scheduled", label: "Termin geplant" },
            { value: "in_progress", label: "Laufend" },
            { value: "offer_presented", label: "Angebot" },
            { value: "contract_closed", label: "Abgeschlossen" },
            { value: "verloren", label: "Verloren" },
          ].map((f) => (
            <Link
              key={f.value}
              href={`/admin/sales/leads?status=${f.value}${q ? `&q=${q}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-[#00b8ff] text-black"
                  : "bg-[#0c1520] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0]"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        {leads.length === 0 ? (
          <div className="py-16 text-center text-[#666] text-sm">
            Keine Leads gefunden.{" "}
            <Link href="/admin/sales/leads/neu" className="text-[#00b8ff] hover:underline">
              Ersten Lead erstellen
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a2840]">
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Unternehmen</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Status</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Quelle</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Closer</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Paket</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Wert</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead: Lead) => (
                <tr key={lead.id} className="border-b border-[#111e30] hover:bg-[#0e1a28] transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#f0f0f0]">{lead.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {lead.industry && (
                        <span className="text-xs text-[#666]">{lead.industry}</span>
                      )}
                      {lead.contactPerson && (
                        <span className="text-xs text-[#555]">· {lead.contactPerson}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[lead.leadStatus ?? ""] ?? "bg-[#1a2840] text-[#888]"}`}
                    >
                      {LEAD_STATUS_LABELS[lead.leadStatus ?? ""] ?? lead.leadStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888]">
                    {lead.leadSource ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888]">
                    {lead.assignedCloser?.name ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#888]">
                    {lead.contractPackage ?? "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[#f0f0f0] font-mono">
                    {lead.contractValue
                      ? `€ ${(lead.contractValue / 100).toLocaleString("de-DE")}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/sales/leads/${lead.id}`}
                      className="text-[#00b8ff] hover:text-[#0099dd] transition-colors"
                    >
                      <ArrowRight size={15} />
                    </Link>
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
