"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Check, Send, Banknote, X, ChevronDown, ChevronUp } from "lucide-react";
import {
  markInvoicePaid,
  cancelInvoice,
  sendInvoice,
} from "./actions";

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  sent: "Versendet",
  paid: "Bezahlt",
  cancelled: "Storniert",
  overdue: "Überfällig",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#1a2840] text-[#8899b4]",
  sent: "bg-[rgba(0,184,255,0.1)] text-[#00b8ff]",
  paid: "bg-[rgba(34,197,94,0.15)] text-[#22c55e]",
  cancelled: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
  overdue: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  netAmount: number;
  grossAmount: number;
  taxRate: number;
  currency: string;
  dueDate: Date;
  issuedAt: Date | null;
  paidAt: Date | null;
  billingName: string | null;
  createdAt: Date;
  company: { id: string; name: string };
  offer: { id: string; template: { name: string } | null } | null;
};

type Company = { id: string; name: string };

interface Props {
  invoices: Invoice[];
  companies: Company[];
}

export function RechnungenClient({ invoices, companies }: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paidByMap, setPaidByMap] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered =
    statusFilter === "all" ? invoices : invoices.filter((i) => i.status === statusFilter);

  const totals = {
    draft: invoices.filter((i) => i.status === "draft").reduce((s, i) => s + i.grossAmount, 0),
    sent: invoices.filter((i) => i.status === "sent").reduce((s, i) => s + i.grossAmount, 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.grossAmount, 0),
  };

  /**
   * Rechnungen entstehen ausschließlich im Editor — dort werden Positionen
   * erfasst, Beträge serverseitig berechnet und die Nummer erst bei der
   * Finalisierung vergeben.
   */
  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const fd = new FormData(e.currentTarget);
    const companyId = (fd.get("companyId") as string)?.trim();
    if (!companyId) {
      setActionError("Bitte ein Unternehmen auswählen.");
      return;
    }
    router.push(`/admin/sales/rechnungen/neu?companyId=${companyId}`);
  }

  async function handleSendEmail(id: string) {
    setSendingId(id);
    setActionError(null);
    try {
      const result = await sendInvoice(id);
      if (result && "error" in result && result.error) setActionError(result.error);
      else router.refresh();
    } finally {
      setSendingId(null);
    }
  }

  function handlePaid(id: string) {
    setActionError(null);
    startTransition(async () => {
      const result = await markInvoicePaid(id, paidByMap[id]);
      if (result && "error" in result && result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleCancel(id: string) {
    const reason = window.prompt("Begründung für die Stornierung:");
    if (!reason?.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await cancelInvoice(id, reason.trim());
      if (result && "error" in result && result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Rechnungen</h1>
          <p className="text-[#888] text-sm mt-1">{invoices.length} Rechnungen gesamt</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setActionError(null); }}
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neue Rechnung
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Entwürfe", amount: totals.draft, color: "text-[#8899b4]" },
          { label: "Offen (versendet)", amount: totals.sent, color: "text-[#00b8ff]" },
          { label: "Bezahlt", amount: totals.paid, color: "text-[#22c55e]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <div className="text-xs text-[#888] font-medium uppercase tracking-wide mb-2">{kpi.label}</div>
            <div className={`text-2xl font-bold font-mono ${kpi.color}`}>
              {kpi.amount > 0
                ? `€ ${(kpi.amount / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}`
                : "—"}
            </div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
          {actionError}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Manuelle Rechnung erstellen</h2>
          <form onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Unternehmen *</label>
                <select
                  name="companyId"
                  required
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]"
                >
                  <option value="">— Wählen —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Rechnungsempfänger</label>
                <input
                  name="billingName"
                  placeholder="Falls abweichend vom Unternehmen"
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Nettobetrag (€) *</label>
                <input
                  name="netAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Zahlungsziel (Tage)</label>
                <input
                  name="dueDays"
                  type="number"
                  defaultValue={14}
                  min={1}
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg"
              >
                <Check size={14} />
                {pending ? "Wird erstellt…" : "Rechnung erstellen"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {["all", "draft", "sent", "paid", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-[#00b8ff] text-black"
                : "bg-[#0c1520] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0]"
            }`}
          >
            {s === "all" ? "Alle" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-16 text-center text-[#666] text-sm">
          Keine Rechnungen gefunden.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div
              key={inv.id}
              className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden"
            >
              {/* Row */}
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4"
                onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
              >
                <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
                  <div>
                    <div className="text-xs text-[#555] mb-0.5 font-mono">{inv.invoiceNumber}</div>
                    <div className="text-sm font-medium text-[#f0f0f0] truncate">
                      {inv.billingName ?? inv.company.name}
                    </div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-[#1a2840] text-[#888]"}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                  <div className="text-sm font-mono font-semibold text-[#f0f0f0]">
                    € {(inv.grossAmount / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#666]">
                    Fällig: {new Date(inv.dueDate).toLocaleDateString("de-DE")}
                  </div>
                </div>
                {expandedId === inv.id ? <ChevronUp size={14} className="text-[#666] flex-shrink-0" /> : <ChevronDown size={14} className="text-[#666] flex-shrink-0" />}
              </button>

              {/* Expanded details */}
              {expandedId === inv.id && (
                <div className="px-5 pb-5 border-t border-[#111e30]">
                  <div className="pt-4 grid grid-cols-2 gap-4 text-sm mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#666]">Unternehmen</span>
                        <span className="text-[#f0f0f0]">{inv.company.name}</span>
                      </div>
                      {inv.offer && (
                        <div className="flex justify-between">
                          <span className="text-[#666]">Angebot</span>
                          <span className="text-[#f0f0f0]">{inv.offer.template?.name ?? inv.offer.id.slice(0, 8)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-[#666]">Netto</span>
                        <span className="text-[#f0f0f0] font-mono">€ {(inv.netAmount / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666]">MwSt. ({Math.round(inv.taxRate * 100)}%)</span>
                        <span className="text-[#f0f0f0] font-mono">€ {((inv.grossAmount - inv.netAmount) / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-[#888]">Brutto</span>
                        <span className="text-[#f0f0f0] font-mono">€ {(inv.grossAmount / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[#666]">Erstellt</span>
                        <span className="text-[#f0f0f0]">{new Date(inv.createdAt).toLocaleDateString("de-DE")}</span>
                      </div>
                      {inv.issuedAt && (
                        <div className="flex justify-between">
                          <span className="text-[#666]">Versendet</span>
                          <span className="text-[#f0f0f0]">{new Date(inv.issuedAt).toLocaleDateString("de-DE")}</span>
                        </div>
                      )}
                      {inv.paidAt && (
                        <div className="flex justify-between">
                          <span className="text-[#666]">Bezahlt</span>
                          <span className="text-[#22c55e]">{new Date(inv.paidAt).toLocaleDateString("de-DE")}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-3 border-t border-[#111e30]">
                    <Link
                      href={`/admin/sales/rechnungen/${inv.id}`}
                      className="flex items-center gap-2 px-3 py-2 bg-[#1a2840] hover:bg-[#243550] text-[#c9d4e4] text-xs rounded-lg"
                    >
                      <Check size={13} />
                      {inv.status === "draft" ? "Entwurf bearbeiten" : "Rechnung öffnen"}
                    </Link>
                    {inv.status !== "draft" && inv.status !== "cancelled" && (
                      <button
                        onClick={() => handleSendEmail(inv.id)}
                        disabled={pending || sendingId === inv.id}
                        className="flex items-center gap-2 px-3 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 text-black font-semibold text-xs rounded-lg"
                      >
                        <Send size={13} />
                        {sendingId === inv.id ? "Wird gesendet…" : "Per E-Mail senden"}
                      </button>
                    )}
                    {inv.status === "sent" && (
                      <div className="flex items-center gap-2">
                        <input
                          value={paidByMap[inv.id] ?? ""}
                          onChange={(e) => setPaidByMap((m) => ({ ...m, [inv.id]: e.target.value }))}
                          placeholder="Zahlungsart (opt.)"
                          className="bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-1.5 text-xs text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] w-36"
                        />
                        <button
                          onClick={() => handlePaid(inv.id)}
                          disabled={pending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-black font-semibold text-xs rounded-lg"
                        >
                          <Banknote size={13} />
                          Bezahlt
                        </button>
                      </div>
                    )}
                    {inv.status !== "paid" && inv.status !== "cancelled" && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        disabled={pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(239,68,68,0.3)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.05)] disabled:opacity-40 text-xs rounded-lg transition-colors"
                      >
                        <X size={13} />
                        Stornieren
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
