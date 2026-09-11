"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, ChevronRight, FileText, Video, CalendarPlus } from "lucide-react";
import { updateLeadDetails, updateLeadStatus, addLeadNote, createClosingSession } from "../actions";
import { StammdatenPanel, type MasterDataValues, type RequirementView } from "./StammdatenPanel";

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

const LEAD_SOURCES = ["Referral", "LinkedIn", "Kaltakquise", "Website", "Messe", "Empfehlung", "Sonstiges"];
const PACKAGES = [
  { value: "foundation", label: "Foundation" },
  { value: "operations", label: "Operations" },
  { value: "custom", label: "Custom" },
];
const PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe (Online)" },
  { value: "invoice", label: "Rechnung" },
];

// Manual status transitions allowed (others happen via system events)
const MANUAL_STATUS_OPTIONS = [
  { value: "prospect", label: "→ Interessent" },
  { value: "verloren", label: "→ Verloren" },
  { value: "storniert", label: "→ Storniert" },
  { value: "abgesagt", label: "→ Abgesagt" },
];

type Company = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  contactPerson: string | null;
  leadStatus: string | null;
  leadSource: string | null;
  contractValue: number | null;
  contractPackage: string | null;
  paymentMethod: string | null;
  closingNotes: string | null;
  assignedCloserId: string | null;
  assignedCloser: { id: string; name: string | null } | null;
  notes: Array<{
    id: string;
    content: string;
    createdAt: Date;
    author: { name: string | null };
  }>;
  closingSessions: Array<{
    id: string;
    status: string;
    createdAt: Date;
    appointment: { startTime: Date; endTime: Date; title: string } | null;
    closer: { name: string | null };
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    grossAmount: number;
    createdAt: Date;
  }>;
  _count: { closingSessions: number; offers: number; invoices: number };
  [key: string]: unknown;
};

type Closer = { id: string; name: string | null; role: string };

interface Props {
  /** Serverseitig geprüfte Stammdaten-Vollständigkeit. */
  masterData: {
    values: MasterDataValues;
    requirements: RequirementView[];
    missing: Array<{ key: string; label: string }>;
  };
  company: Company;
  closers: Closer[];
  currentUserId: string;
  currentUserRole: string;
}

export function LeadDetailClient({ company, closers, currentUserId, currentUserRole, masterData }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"details" | "notizen" | "sessions" | "rechnungen">("details");
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Status change
  const [statusTarget, setStatusTarget] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusPending, startStatusTransition] = useTransition();

  // Notes
  const [noteText, setNoteText] = useState("");
  const [notePending, startNoteTransition] = useTransition();
  const [noteError, setNoteError] = useState<string | null>(null);

  // Closing session scheduling
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionClientEmail, setSessionClientEmail] = useState("");
  const [sessionClientName, setSessionClientName] = useState(company.contactPerson ?? "");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("10:00");
  const [sessionDuration, setSessionDuration] = useState(60);
  const [sessionPending, startSessionTransition] = useTransition();
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionSuccess, setSessionSuccess] = useState<string | null>(null);
  const [sessionLink, setSessionLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLeadDetails(company.id, formData);
      if (result?.error) setSaveError(result.error);
      else setSaveSuccess(true);
    });
  }

  function handleStatusChange() {
    if (!statusTarget) return;
    setStatusError(null);
    startStatusTransition(async () => {
      const result = await updateLeadStatus(company.id, statusTarget, statusReason);
      if (result?.error) setStatusError(result.error);
      else {
        setStatusTarget("");
        setStatusReason("");
      }
    });
  }

  function handleAddNote() {
    if (!noteText.trim()) return;
    setNoteError(null);
    startNoteTransition(async () => {
      const result = await addLeadNote(company.id, noteText);
      if (result?.error) setNoteError(result.error);
      else setNoteText("");
    });
  }

  const needsReason = ["verloren", "storniert", "abgesagt"].includes(statusTarget);

  function handleCreateSession() {
    if (!sessionClientEmail.trim() || !sessionDate) return;
    setSessionError(null);
    setSessionSuccess(null);
    const scheduledAt = `${sessionDate}T${sessionTime}:00`;
    startSessionTransition(async () => {
      const result = await createClosingSession(company.id, {
        scheduledAt,
        durationMinutes: sessionDuration,
        clientEmail: sessionClientEmail.trim(),
        clientName: sessionClientName.trim() || company.name,
      });
      if (result?.error) {
        setSessionError(result.error);
      } else {
        setSessionSuccess("Termin erstellt. Einladung wurde versandt.");
        if (result.closingUrl) setSessionLink(result.closingUrl);
        setShowNewSession(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/sales/leads"
          className="flex items-center gap-2 text-[#666] hover:text-[#f0f0f0] text-sm transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Zurück zu Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#f0f0f0]">{company.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[company.leadStatus ?? ""] ?? "bg-[#1a2840] text-[#888]"}`}
              >
                {LEAD_STATUS_LABELS[company.leadStatus ?? ""] ?? company.leadStatus}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#666]">
              {company.industry && <span>{company.industry}</span>}
              {company.contactPerson && <span>· {company.contactPerson}</span>}
              {company.assignedCloser && (
                <span>· Closer: {company.assignedCloser.name}</span>
              )}
            </div>
          </div>

          {/* Manual Status Change (only for Admin + special statuses) */}
          {currentUserRole === "ADMIN" && (
            <div className="flex items-center gap-2">
              <select
                value={statusTarget}
                onChange={(e) => setStatusTarget(e.target.value)}
                className="bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]"
              >
                <option value="">Status ändern…</option>
                {MANUAL_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {statusTarget && (
                <>
                  {needsReason && (
                    <input
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Grund (Pflicht)"
                      className="bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] w-44"
                    />
                  )}
                  <button
                    onClick={handleStatusChange}
                    disabled={statusPending || (needsReason && !statusReason.trim())}
                    className="px-3 py-2 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] text-sm rounded-lg transition-colors"
                  >
                    {statusPending ? "…" : "Setzen"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {statusError && (
          <p className="text-[#ef4444] text-xs mt-2">{statusError}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a2840] mb-6">
        {(
          [
            { key: "details", label: "Details" },
            { key: "notizen", label: `Notizen (${company.notes.length})` },
            { key: "sessions", label: `Closings (${company._count.closingSessions})` },
            { key: "rechnungen", label: `Rechnungen (${company._count.invoices})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "text-[#00b8ff] border-[#00b8ff]"
                : "text-[#666] border-transparent hover:text-[#f0f0f0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Details */}
      {activeTab === "details" && (
        <form onSubmit={handleSaveDetails} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Company Data */}
            <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">Unternehmensdaten</h2>
              <Field label="Branche" name="industry" defaultValue={company.industry ?? ""} />
              <Field label="Ansprechpartner" name="contactPerson" defaultValue={company.contactPerson ?? ""} />
              <Field label="Website" name="website" type="url" defaultValue={company.website ?? ""} />
              <Field label="Telefon" name="phone" type="tel" defaultValue={company.phone ?? ""} />
            </section>

            {/* Sales Data */}
            <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">Sales-Daten</h2>

              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Lead-Quelle</label>
                <select
                  name="leadSource"
                  defaultValue={company.leadSource ?? ""}
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                >
                  <option value="">— Wählen —</option>
                  {LEAD_SOURCES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Paket</label>
                <select
                  name="contractPackage"
                  defaultValue={company.contractPackage ?? ""}
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                >
                  <option value="">— Wählen —</option>
                  {PACKAGES.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>

              <Field
                label="Vertragswert Netto (€)"
                name="contractValue"
                type="number"
                defaultValue={company.contractValue ? String(company.contractValue / 100) : ""}
                placeholder="0"
              />

              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Zahlungsart</label>
                <select
                  name="paymentMethod"
                  defaultValue={company.paymentMethod ?? ""}
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                >
                  <option value="">— Noch nicht festgelegt —</option>
                  {PAYMENT_METHODS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
                </select>
              </div>

              {currentUserRole === "ADMIN" && (
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Zuständiger Closer</label>
                  <select
                    name="assignedCloserId"
                    defaultValue={company.assignedCloserId ?? ""}
                    className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                  >
                    <option value="">— Nicht zugewiesen —</option>
                    {closers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          </div>

          {/* Closing Notes */}
          <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Interne Closing-Notizen</h2>
            <textarea
              name="closingNotes"
              rows={5}
              defaultValue={company.closingNotes ?? ""}
              placeholder="Gesprächseindrücke, Einwände, individuelle Details…"
              className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors resize-none"
            />
          </section>

          {saveError && (
            <p className="text-[#ef4444] text-sm">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-[#22c55e] text-sm">Gespeichert.</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              <Save size={14} />
              {isPending ? "Wird gespeichert…" : "Speichern"}
            </button>
          </div>
        </form>
      )}

      {/* Tab: Notizen */}
      {activeTab === "notizen" && (
        <div className="space-y-4">
          {/* New note */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="Neue Notiz hinzufügen…"
              className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors resize-none mb-3"
            />
            {noteError && <p className="text-[#ef4444] text-xs mb-2">{noteError}</p>}
            <button
              onClick={handleAddNote}
              disabled={notePending || !noteText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              <Plus size={14} />
              {notePending ? "Wird gespeichert…" : "Notiz speichern"}
            </button>
          </div>

          {company.notes.length === 0 ? (
            <p className="text-center text-[#666] text-sm py-8">Noch keine Notizen.</p>
          ) : (
            company.notes.map((note) => (
              <div key={note.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#888]">
                    {note.author.name ?? "Unbekannt"}
                  </span>
                  <span className="text-xs text-[#555]">
                    {new Date(note.createdAt).toLocaleString("de-DE", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-sm text-[#dde6f0] whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Closing Sessions */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <StammdatenPanel
            companyId={company.id}
            values={masterData.values}
            requirements={masterData.requirements}
            missing={masterData.missing}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {sessionSuccess && (
                <p className="text-[#22c55e] text-sm">{sessionSuccess}</p>
              )}
              {masterData.missing.length > 0 && (
                <p className="text-[#fbbf24] text-sm">
                  Closing Meeting noch nicht freigegeben — bitte zuerst die Stammdaten
                  vervollständigen.
                </p>
              )}
            </div>
            <button
              onClick={() => { setShowNewSession((v) => !v); setSessionError(null); setSessionSuccess(null); }}
              disabled={masterData.missing.length > 0}
              title={
                masterData.missing.length > 0
                  ? `Fehlende Angaben: ${masterData.missing.map((m) => m.label).join(", ")}`
                  : undefined
              }
              className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg transition-colors flex-shrink-0"
            >
              <CalendarPlus size={14} />
              Closing Meeting erstellen
            </button>
          </div>

          {sessionLink && (
            <div className="px-4 py-3 bg-[#0c1520] border border-[rgba(0,184,255,0.2)] rounded-xl space-y-2">
              <div className="text-xs font-medium text-[#00b8ff] uppercase tracking-wide">Kunden-Link (nur einmalig sichtbar)</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-[#f0f0f0] truncate bg-[#080d14] px-2 py-1.5 rounded">
                  {sessionLink}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(sessionLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-[#1a2840] hover:bg-[#243550] text-[#f0f0f0] text-xs rounded-lg transition-colors flex-shrink-0"
                >
                  {linkCopied ? "Kopiert ✓" : "Kopieren"}
                </button>
              </div>
              <p className="text-xs text-[#555]">Dieser Link ist nur jetzt sichtbar. Für einen neuen Link nutzen Sie „Einladung erneut senden" im Closing-Workspace.</p>
            </div>
          )}

          {showNewSession && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#f0f0f0]">Neuen Closing-Termin planen</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Datum</label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Uhrzeit</label>
                  <input
                    type="time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Dauer (Minuten)</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
                  >
                    {[30, 45, 60, 75, 90, 120].map((m) => (
                      <option key={m} value={m}>{m} Min.</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Ansprechpartner (Kunde)</label>
                  <input
                    type="text"
                    value={sessionClientName}
                    onChange={(e) => setSessionClientName(e.target.value)}
                    placeholder={company.name}
                    className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">E-Mail (Kundeneinladung) *</label>
                <input
                  type="email"
                  value={sessionClientEmail}
                  onChange={(e) => setSessionClientEmail(e.target.value)}
                  placeholder="kunde@beispiel.de"
                  className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
                />
              </div>

              {sessionError && <p className="text-[#ef4444] text-xs">{sessionError}</p>}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateSession}
                  disabled={sessionPending || !sessionClientEmail.trim() || !sessionDate}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 text-black font-semibold text-sm rounded-lg transition-colors"
                >
                  <Video size={14} />
                  {sessionPending ? "Wird erstellt…" : "Termin erstellen & Einladung senden"}
                </button>
                <button
                  onClick={() => setShowNewSession(false)}
                  className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0] transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {company.closingSessions.length === 0 ? (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-12 text-center">
              <Video size={28} className="text-[#333] mx-auto mb-3" />
              <p className="text-[#666] text-sm">Noch keine Closing-Sessions.</p>
              <p className="text-[#555] text-xs mt-1">Planen Sie einen Termin und senden Sie die Kundeneinladung.</p>
            </div>
          ) : (
            company.closingSessions.map((cs) => (
              <div
                key={cs.id}
                className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-medium text-[#f0f0f0] mb-1">
                    {cs.appointment?.title ?? "Closing Session"}
                  </div>
                  <div className="text-xs text-[#666]">
                    Closer: {cs.closer.name} · Status: {cs.status}
                    {cs.appointment && (
                      <> · {new Date(cs.appointment.startTime).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </div>
                </div>
                <Link
                  href={`/admin/sales/closing/${cs.id}`}
                  className="flex items-center gap-1 text-[#00b8ff] text-sm hover:underline"
                >
                  Öffnen <ChevronRight size={14} />
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Rechnungen */}
      {activeTab === "rechnungen" && (
        <div className="space-y-4">
          {company.invoices.length === 0 ? (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-12 text-center">
              <FileText size={28} className="text-[#333] mx-auto mb-3" />
              <p className="text-[#666] text-sm">Noch keine Rechnungen.</p>
            </div>
          ) : (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1a2840]">
                    <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Nr.</th>
                    <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Status</th>
                    <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Betrag</th>
                    <th className="text-left px-6 py-3 text-[#666] text-xs font-medium uppercase tracking-wide">Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {company.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-[#111e30]">
                      <td className="px-6 py-3 text-sm font-mono text-[#f0f0f0]">{inv.invoiceNumber}</td>
                      <td className="px-6 py-3 text-sm text-[#888]">{inv.status}</td>
                      <td className="px-6 py-3 text-sm font-mono text-[#f0f0f0]">
                        € {(inv.grossAmount / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-sm text-[#666]">
                        {new Date(inv.createdAt).toLocaleDateString("de-DE")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue = "",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
      />
    </div>
  );
}
