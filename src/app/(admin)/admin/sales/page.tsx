import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
} from "lucide-react";

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

const PIPELINE_STATUSES = [
  "prospect",
  "closing_scheduled",
  "in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_given",
  "contract_closed",
  "payment_pending",
];

export default async function SalesDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const closerFilter = userRecord.role === "CLOSER" ? { assignedCloserId: userId } : {};

  const leads = await db.company.findMany({
    where: { leadStatus: { not: null }, ...closerFilter },
    include: {
      assignedCloser: { select: { name: true } },
      _count: { select: { closingSessions: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  type Lead = (typeof leads)[number];

  const pipelineLeads = leads.filter((l: Lead) =>
    PIPELINE_STATUSES.includes(l.leadStatus ?? "")
  );
  const lostLeads = leads.filter((l: Lead) =>
    ["verloren", "storniert", "abgesagt"].includes(l.leadStatus ?? "")
  );

  const byStatus = PIPELINE_STATUSES.reduce<Record<string, number>>(
    (acc, s) => ({
      ...acc,
      [s]: leads.filter((l: Lead) => l.leadStatus === s).length,
    }),
    {}
  );

  const totalValue = pipelineLeads.reduce(
    (sum: number, l: Lead) => sum + (l.contractValue ?? 0),
    0
  );

  const recentLeads = leads.slice(0, 8);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Sales &amp; Closing</h1>
          <p className="text-[#888] text-sm mt-1">
            Pipeline-Übersicht · {pipelineLeads.length} aktive Leads
          </p>
        </div>
        <Link
          href="/admin/sales/leads/neu"
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neuer Lead
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
            <Users size={14} />
            Aktive Pipeline
          </div>
          <div className="text-3xl font-bold text-[#f0f0f0]">{pipelineLeads.length}</div>
          <div className="text-[#666] text-xs mt-1">Leads in Bearbeitung</div>
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
            <TrendingUp size={14} />
            Pipeline-Wert
          </div>
          <div className="text-3xl font-bold text-[#f0f0f0]">
            {totalValue > 0
              ? `€ ${(totalValue / 100).toLocaleString("de-DE", { minimumFractionDigits: 0 })}`
              : "—"}
          </div>
          <div className="text-[#666] text-xs mt-1">Netto gesamt</div>
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
            <CheckCircle size={14} />
            Abschlüsse
          </div>
          <div className="text-3xl font-bold text-[#22c55e]">
            {(byStatus["contract_closed"] ?? 0) + (byStatus["payment_pending"] ?? 0)}
          </div>
          <div className="text-[#666] text-xs mt-1">Verträge abgeschlossen</div>
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
            <AlertCircle size={14} />
            Verloren
          </div>
          <div className="text-3xl font-bold text-[#ef4444]">{lostLeads.length}</div>
          <div className="text-[#666] text-xs mt-1">Verloren / Storniert</div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-[#f0f0f0] mb-5">Pipeline-Status</h2>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          {PIPELINE_STATUSES.map((status) => (
            <div key={status} className="text-center">
              <div className="text-2xl font-bold text-[#00b8ff] mb-1">
                {byStatus[status] ?? 0}
              </div>
              <div className="text-[#666] text-[10px] leading-tight">
                {LEAD_STATUS_LABELS[status]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leads */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2840]">
          <h2 className="text-sm font-semibold text-[#f0f0f0]">Letzte Leads</h2>
          <Link
            href="/admin/sales/leads"
            className="flex items-center gap-1 text-[#00b8ff] text-xs hover:underline"
          >
            Alle ansehen <ArrowRight size={12} />
          </Link>
        </div>
        {recentLeads.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#666] text-sm">
            Noch keine Leads angelegt.{" "}
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
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Closer</th>
                <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Wert</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((lead: Lead) => (
                <tr key={lead.id} className="border-b border-[#111e30] hover:bg-[#0e1a28] transition-colors">
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium text-[#f0f0f0]">{lead.name}</div>
                    {lead.industry && (
                      <div className="text-xs text-[#666]">{lead.industry}</div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <LeadStatusBadge status={lead.leadStatus ?? ""} />
                  </td>
                  <td className="px-6 py-3 text-sm text-[#888]">
                    {lead.assignedCloser?.name ?? "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-[#f0f0f0] font-mono">
                    {lead.contractValue
                      ? `€ ${(lead.contractValue / 100).toLocaleString("de-DE")}`
                      : "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
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

function LeadStatusBadge({ status }: { status: string }) {
  const label = LEAD_STATUS_LABELS[status] ?? status;

  const colorMap: Record<string, string> = {
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

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[status] ?? "bg-[#1a2840] text-[#888]"}`}
    >
      {label}
    </span>
  );
}
