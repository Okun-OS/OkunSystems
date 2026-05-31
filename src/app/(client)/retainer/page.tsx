"use client";

import { useState } from "react";
import { Headphones, Plus, Clock, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

const MOCK_RETAINER = {
  name: "OKUN Premium Retainer",
  type: "PREMIUM",
  status: "ACTIVE",
  hoursPerMonth: 10,
  usedHours: 3,
  startDate: "2024-01-01",
};

const MOCK_TICKETS = [
  { id: "1", title: "Dienstplanoptimierung — Software-Anpassung", status: "IN_PROGRESS", priority: "HIGH", type: "CHANGE_REQUEST", createdAt: "2024-05-15" },
  { id: "2", title: "Frage zu Onboarding-Prozess", status: "RESOLVED", priority: "MEDIUM", type: "QUESTION", createdAt: "2024-05-10" },
  { id: "3", title: "Export-Funktion für Berichte", status: "OPEN", priority: "MEDIUM", type: "CHANGE_REQUEST", createdAt: "2024-05-20" },
];

export default function RetainerPage() {
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("CHANGE_REQUEST");

  const usagePercent = Math.round((MOCK_RETAINER.usedHours / MOCK_RETAINER.hoursPerMonth) * 100);
  const openCount = MOCK_TICKETS.filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Retainer & Betreuung</h1>
        <p className="text-[#888] text-sm mt-1">Laufende Betreuung und Änderungsanfragen</p>
      </div>

      {/* Retainer Status */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center">
              <Headphones size={17} className="text-[#22c55e]" />
            </div>
            <div>
              <p className="text-[#f0f0f0] font-semibold">{MOCK_RETAINER.name}</p>
              <p className="text-[#888] text-xs mt-0.5">Aktiver Retainer</p>
            </div>
          </div>
          <span className="bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 text-xs px-2.5 py-1 rounded-full font-medium">
            Aktiv
          </span>
        </div>

        {/* Hours usage */}
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-[#888]">Stunden verbraucht</span>
            <span className="text-[#f0f0f0]">{MOCK_RETAINER.usedHours} / {MOCK_RETAINER.hoursPerMonth}h</span>
          </div>
          <div className="h-2.5 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePercent > 80 ? "bg-yellow-400" : "bg-[#22c55e]"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-[#555] text-xs mt-2">{MOCK_RETAINER.hoursPerMonth - MOCK_RETAINER.usedHours} Stunden verbleibend diesen Monat</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-[#1e1e1e]">
          <div>
            <p className="text-[#555] text-xs">Offene Tickets</p>
            <p className="text-[#f0f0f0] font-bold text-xl mt-1">{openCount}</p>
          </div>
          <div>
            <p className="text-[#555] text-xs">Stunden/Monat</p>
            <p className="text-[#f0f0f0] font-bold text-xl mt-1">{MOCK_RETAINER.hoursPerMonth}h</p>
          </div>
          <div>
            <p className="text-[#555] text-xs">Status</p>
            <p className="text-[#22c55e] font-bold text-sm mt-1.5">Premium</p>
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Tickets & Änderungsanfragen</h2>
          <button
            onClick={() => setShowNewTicket(!showNewTicket)}
            className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-xs rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={13} />
            Neues Ticket
          </button>
        </div>

        {/* New Ticket Form */}
        {showNewTicket && (
          <div className="p-5 border-b border-[#2a2a2a] bg-[#0d0d0d]">
            <h3 className="text-[#f0f0f0] text-sm font-medium mb-4">Neues Ticket erstellen</h3>
            <div className="space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Titel / Kurzbeschreibung"
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
              />
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Beschreiben Sie Ihre Anfrage oder das Problem..."
                rows={3}
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50 resize-none"
              />
              <div className="flex gap-3">
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#888] text-sm focus:outline-none"
                >
                  <option value="CHANGE_REQUEST">Änderungsanfrage</option>
                  <option value="SUPPORT">Support</option>
                  <option value="BUG">Fehler</option>
                  <option value="QUESTION">Frage</option>
                </select>
                <button className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors">
                  Ticket senden
                </button>
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] text-sm rounded-lg hover:bg-[#222] transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ticket list */}
        <div className="divide-y divide-[#1e1e1e]">
          {MOCK_TICKETS.map((ticket) => (
            <div key={ticket.id} className="flex items-start gap-4 p-4 hover:bg-[#1a1a1a] transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                {ticket.status === "RESOLVED" ? (
                  <CheckCircle2 size={17} className="text-[#22c55e]" />
                ) : ticket.status === "IN_PROGRESS" ? (
                  <Clock size={17} className="text-blue-400" />
                ) : (
                  <AlertCircle size={17} className="text-yellow-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#f0f0f0] text-sm font-medium">{ticket.title}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <TypeBadge type={ticket.type} />
                  <PriorityLabel priority={ticket.priority} />
                  <span className="text-[#555] text-xs">{ticket.createdAt}</span>
                </div>
              </div>
              <TicketStatusBadge status={ticket.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    CHANGE_REQUEST: "Änderung", SUPPORT: "Support", BUG: "Fehler", QUESTION: "Frage",
  };
  return <span className="text-xs text-[#888] bg-[#1a1a1a] px-2 py-0.5 rounded">{labels[type] ?? type}</span>;
}

function PriorityLabel({ priority }: { priority: string }) {
  const cfg: Record<string, string> = { HIGH: "text-red-400", MEDIUM: "text-yellow-400", LOW: "text-[#888]" };
  const labels: Record<string, string> = { HIGH: "Hoch", MEDIUM: "Mittel", LOW: "Niedrig", URGENT: "Dringend" };
  return <span className={`text-xs ${cfg[priority] ?? "text-[#888]"}`}>{labels[priority] ?? priority}</span>;
}

function TicketStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    OPEN: { label: "Offen", cls: "bg-yellow-500/10 text-yellow-400" },
    IN_PROGRESS: { label: "In Bearbeitung", cls: "bg-blue-500/10 text-blue-400" },
    RESOLVED: { label: "Gelöst", cls: "bg-[#22c55e]/10 text-[#22c55e]" },
    CLOSED: { label: "Geschlossen", cls: "bg-[#888]/10 text-[#888]" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888]" };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${c.cls}`}>{c.label}</span>;
}
