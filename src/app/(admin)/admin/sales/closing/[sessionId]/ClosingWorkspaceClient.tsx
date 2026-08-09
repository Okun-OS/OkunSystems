"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  ChevronRight,
  FileText,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Tag,
  Eye,
  Clock,
  CreditCard,
  Mic,
  MicOff,
  Video,
  Square,
} from "lucide-react";
import {
  updateClosingSessionStatus,
  createOfferForSession,
  presentOffer,
  recordConsent,
  closeContract,
  resendClientInvitation,
  saveChecklistState,
  saveClosingNotes,
} from "../actions";
import { createInvoiceFromOffer } from "../../rechnungen/actions";

// ─── Closing checklist definition ────────────────────────────────────────────
const CLOSING_CHECKLIST = [
  {
    phase: "1. Einstieg & Rapport",
    steps: [
      { id: "intro_greeting", label: "Begrüßung & kurze Vorstellung" },
      { id: "intro_agenda", label: "Agenda des Gesprächs erklärt" },
      { id: "intro_rapport", label: "Rapport aufgebaut / Small Talk" },
    ],
  },
  {
    phase: "2. Ist-Analyse",
    steps: [
      { id: "analysis_situation", label: "Aktuelle Situation erfasst" },
      { id: "analysis_challenges", label: "Aktuelle Herausforderungen verstanden" },
      { id: "analysis_tried", label: "Bisherige Lösungsversuche besprochen" },
      { id: "analysis_impact", label: "Auswirkungen auf das Business quantifiziert" },
    ],
  },
  {
    phase: "3. Ziel & Vision",
    steps: [
      { id: "goal_target", label: "Konkretes Ziel definiert" },
      { id: "goal_timeline", label: "Zeitrahmen besprochen" },
      { id: "goal_roi", label: "ROI / Ergebniserwartung festgehalten" },
      { id: "goal_urgency", label: "Dringlichkeit etabliert" },
    ],
  },
  {
    phase: "4. Präsentation",
    steps: [
      { id: "pres_solution", label: "Lösung vorgestellt" },
      { id: "pres_package", label: "Paket & Inhalte erklärt" },
      { id: "pres_offer", label: "Angebot gezeigt (Kunden-Link geöffnet)" },
      { id: "pres_price", label: "Preis & MwSt erklärt" },
    ],
  },
  {
    phase: "5. Einwandbehandlung",
    steps: [
      { id: "obj_identified", label: "Einwände vollständig erfasst" },
      { id: "obj_handled", label: "Einwände behandelt" },
      { id: "obj_confirmed", label: "Zustimmung nach Einwandbehandlung geholt" },
    ],
  },
  {
    phase: "6. Abschluss",
    steps: [
      { id: "close_decision", label: "Kaufentscheidung bestätigt" },
      { id: "close_consent", label: "Rechtsdokumente & Consent erteilt" },
      { id: "close_contract", label: "Vertrag abgeschlossen" },
      { id: "close_next_steps", label: "Nächste Schritte & Onboarding besprochen" },
    ],
  },
];

const ALL_STEP_IDS = CLOSING_CHECKLIST.flatMap((p) => p.steps.map((s) => s.id));

// ─── Labels & colors ──────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  closing_scheduled: "Termin geplant",
  in_progress: "Gespräch läuft",
  offer_presented: "Angebot präsentiert",
  agreement_reached: "Einigung erzielt",
  consent_given: "Consent erteilt",
  contract_closed: "Abgeschlossen",
  verloren: "Verloren",
};

const STATUS_COLORS: Record<string, string> = {
  closing_scheduled: "bg-[rgba(0,184,255,0.1)] text-[#00b8ff]",
  in_progress: "bg-[rgba(0,184,255,0.15)] text-[#00b8ff]",
  offer_presented: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
  agreement_reached: "bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  consent_given: "bg-[rgba(34,197,94,0.1)] text-[#22c55e]",
  contract_closed: "bg-[rgba(34,197,94,0.2)] text-[#22c55e]",
  verloren: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
};

const NEXT_STATUS_MAP: Record<string, { value: string; label: string; color: string }> = {
  closing_scheduled: { value: "in_progress", label: "Gespräch starten", color: "bg-[#00b8ff] text-black" },
  in_progress: { value: "offer_presented", label: "Angebot zeigen", color: "bg-[#f59e0b] text-black" },
  offer_presented: { value: "agreement_reached", label: "Einigung markieren", color: "bg-[#22c55e] text-black" },
  agreement_reached: { value: "consent_given", label: "Consent bestätigt", color: "bg-[#22c55e] text-black" },
  consent_given: { value: "contract_closed", label: "Vertrag abschließen", color: "bg-[#22c55e] text-black" },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  closing_script: "Skript",
  objection: "Einwand",
  faq: "FAQ",
  package_info: "Paket-Info",
  guide: "Leitfaden",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
type ClosingSessionData = {
  id: string;
  status: string;
  activeOfferId: string | null;
  recordingStatus: string;
  dailyRecordingId: string | null;
  currentStep: string | null;
  startedAt: Date | null;
  company: {
    id: string;
    name: string;
    industry: string | null;
    contactPerson: string | null;
    contractValue: number | null;
    contractPackage: string | null;
    closingNotes: string | null;
  };
  closer: { id: string; name: string | null };
  appointment: {
    id: string;
    startTime: Date;
    endTime: Date;
    title: string;
    bookedByName: string | null;
    bookedByEmail: string | null;
    meetingUrl: string | null;
  } | null;
  offers: Array<{
    id: string;
    status: string;
    priceNet: number;
    currency: string;
    validUntil: Date | null;
    presentedAt: Date | null;
    template: { name: string } | null;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    metadata: string;
    occurredAt: Date;
    actor: { name: string | null } | null;
  }>;
  consentRecords: ConsentRecord[];
};

type LegalDocument = {
  id: string;
  type: string;
  title: string;
  version: string;
  isRequired: boolean;
  checkboxLabel: string | null;
};

type ConsentRecord = {
  id: string;
  consentType: string;
  result: string;
  grantedAt: Date;
  legalDocument: { title: string; version: string };
};

type SalesContentItem = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  content: string;
};

type OfferTemplate = {
  id: string;
  name: string;
  packageType: string;
  priceNet: number;
  currency: string;
  description: string | null;
  r2Key: string | null;
};

interface Props {
  closingSession: ClosingSessionData;
  salesContent: SalesContentItem[];
  offerTemplates: OfferTemplate[];
  legalDocuments: LegalDocument[];
  currentUserId: string;
}

// ─── Call timer ────────────────────────────────────────────────────────────────
function CallTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    setElapsed(base);
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
  return (
    <div className="flex items-center gap-1.5 text-sm font-mono text-[#888]">
      <Clock size={13} />
      {fmt}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ClosingWorkspaceClient({
  closingSession,
  salesContent,
  offerTemplates,
  legalDocuments,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "maske" | "skript" | "angebot" | "consent" | "protokoll">("overview");

  // Status actions
  const [statusPending, startStatusTransition] = useTransition();
  const [offerPending, startOfferTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Library
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  // Invoice
  const [invoicePending, startInvoiceTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Resend invitation
  const [resendPending, startResendTransition] = useTransition();
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [resendLinkCopied, setResendLinkCopied] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  // Consent & payment
  const [consentPending, startConsentTransition] = useTransition();
  const [contractPending, startContractTransition] = useTransition();
  const [paymentPending, setPaymentPending] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  // ─── Maske state ────────────────────────────────────────────────────────────
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    if (!closingSession.currentStep) return {};
    try { return JSON.parse(closingSession.currentStep) as Record<string, boolean>; }
    catch { return {}; }
  });
  const [notes, setNotes] = useState(closingSession.company.closingNotes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState(closingSession.recordingStatus);
  const [recordingPending, setRecordingPending] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checklistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkedCount = ALL_STEP_IDS.filter((id) => checklist[id]).length;
  const totalCount = ALL_STEP_IDS.length;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const handleChecklistChange = useCallback(
    (stepId: string, checked: boolean) => {
      const next = { ...checklist, [stepId]: checked };
      setChecklist(next);
      if (checklistTimerRef.current) clearTimeout(checklistTimerRef.current);
      checklistTimerRef.current = setTimeout(() => {
        void saveChecklistState(closingSession.id, next);
      }, 800);
    },
    [checklist, closingSession.id]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setNotesSaved(false);
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesTimerRef.current = setTimeout(async () => {
        await saveClosingNotes(closingSession.id, value);
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }, 1500);
    },
    [closingSession.id]
  );

  async function handleStartRecording() {
    setRecordingPending(true);
    try {
      const res = await fetch("/api/daily/start-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingSessionId: closingSession.id }),
      });
      const data = (await res.json()) as { ok?: boolean; recordingStatus?: string; error?: string };
      if (data.ok) setRecordingStatus("recording");
      else setActionError(data.error ?? "Aufzeichnung konnte nicht gestartet werden.");
    } catch { setActionError("Netzwerkfehler beim Starten der Aufzeichnung."); }
    finally { setRecordingPending(false); }
  }

  async function handleStopRecording() {
    setRecordingPending(true);
    try {
      const res = await fetch("/api/daily/stop-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingSessionId: closingSession.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) setRecordingStatus("stopped");
      else setActionError(data.error ?? "Fehler beim Stoppen der Aufzeichnung.");
    } catch { setActionError("Netzwerkfehler beim Stoppen der Aufzeichnung."); }
    finally { setRecordingPending(false); }
  }

  // ─── Other handlers ─────────────────────────────────────────────────────────
  function handleStatusAdvance() {
    const next = NEXT_STATUS_MAP[closingSession.status];
    if (!next) return;
    setActionError(null);
    startStatusTransition(async () => {
      const result = await updateClosingSessionStatus(closingSession.id, next.value);
      if (result?.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleStatusChange(newStatus: string) {
    setActionError(null);
    startStatusTransition(async () => {
      const result = await updateClosingSessionStatus(closingSession.id, newStatus);
      if (result?.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleCreateOffer(templateId: string) {
    setActionError(null);
    startOfferTransition(async () => {
      const result = await createOfferForSession(closingSession.id, templateId);
      if (result?.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handlePresentOffer(offerId: string) {
    setActionError(null);
    startOfferTransition(async () => {
      const result = await presentOffer(closingSession.id, offerId);
      if (result?.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleCreateInvoice() {
    const activeOffer = closingSession.offers.find((o) => o.id === closingSession.activeOfferId);
    if (!activeOffer) { setInvoiceError("Kein aktives Angebot."); return; }
    setInvoiceError(null);
    startInvoiceTransition(async () => {
      const result = await createInvoiceFromOffer(activeOffer.id);
      if (result?.error) setInvoiceError(result.error);
      else if (result?.invoiceId) { setInvoiceId(result.invoiceId); router.refresh(); }
    });
  }

  function handleResendInvitation() {
    setResendError(null);
    setResendLink(null);
    startResendTransition(async () => {
      const result = await resendClientInvitation(closingSession.id);
      if (result?.error) setResendError(result.error);
      else if (result?.closingUrl) setResendLink(result.closingUrl);
    });
  }

  function handleRecordConsent(docId: string, consentType: string) {
    const activeOffer = closingSession.offers.find((o) => o.id === closingSession.activeOfferId);
    if (!activeOffer) { setConsentError("Kein aktives Angebot. Zuerst ein Angebot erstellen."); return; }
    setConsentError(null);
    startConsentTransition(async () => {
      const result = await recordConsent(closingSession.id, {
        offerId: activeOffer.id,
        legalDocumentId: docId,
        consentType,
        displayedPriceCents: activeOffer.priceNet,
        sessionTokenHash: closingSession.id,
      });
      if (result?.error) setConsentError(result.error);
      else router.refresh();
    });
  }

  async function handleRequestPayment() {
    const activeOffer = closingSession.offers.find((o) => o.id === closingSession.activeOfferId);
    if (!activeOffer) { setConsentError("Kein aktives Angebot."); return; }
    setPaymentPending(true);
    setConsentError(null);
    try {
      const res = await fetch("/api/stripe/sales-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingSessionId: closingSession.id, offerId: activeOffer.id }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.error) { setConsentError(data.error); }
      else if (data.url) { window.open(data.url, "_blank"); }
    } catch { setConsentError("Stripe-Checkout konnte nicht gestartet werden."); }
    finally { setPaymentPending(false); }
  }

  function handleCloseContract() {
    const activeOffer = closingSession.offers.find((o) => o.id === closingSession.activeOfferId);
    if (!activeOffer) { setConsentError("Kein aktives Angebot."); return; }
    setConsentError(null);
    startContractTransition(async () => {
      const result = await closeContract(closingSession.id, {
        offerId: activeOffer.id,
        packageType: closingSession.company.contractPackage ?? "custom",
        agbVersion: legalDocuments.find((d) => d.type === "agb")?.version ?? "1.0",
        privacyVersion: legalDocuments.find((d) => d.type === "datenschutz")?.version ?? "1.0",
        closerName: closingSession.closer.name ?? "Closer",
        companyName: closingSession.company.name,
      });
      if (result?.error) setConsentError(result.error);
      else router.refresh();
    });
  }

  const nextAction = NEXT_STATUS_MAP[closingSession.status];
  const filteredContent = contentTypeFilter === "all"
    ? salesContent
    : salesContent.filter((c) => c.type === contentTypeFilter);
  const selectedContent = salesContent.find((c) => c.id === selectedContentId);
  const contentTypes = Array.from(new Set(salesContent.map((c) => c.type)));

  const scripts = salesContent.filter((c) => c.type === "closing_script" || c.type === "objection");

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/admin/sales/leads/${closingSession.company.id}`}
          className="flex items-center gap-2 text-[#666] hover:text-[#f0f0f0] text-sm transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Zurück zum Lead
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-[#f0f0f0]">{closingSession.company.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[closingSession.status] ?? "bg-[#1a2840] text-[#888]"}`}>
                {STATUS_LABELS[closingSession.status] ?? closingSession.status}
              </span>
            </div>
            <p className="text-sm text-[#666]">
              Closer: {closingSession.closer.name}
              {closingSession.appointment && (
                <> · {new Date(closingSession.appointment.startTime).toLocaleString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                })} Uhr</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {actionError && <p className="text-[#ef4444] text-xs max-w-xs">{actionError}</p>}
            {nextAction && (
              <button
                onClick={handleStatusAdvance}
                disabled={statusPending}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 ${nextAction.color}`}
              >
                <Play size={14} />
                {statusPending ? "…" : nextAction.label}
              </button>
            )}
            {closingSession.status !== "contract_closed" && closingSession.status !== "verloren" && (
              <button
                onClick={() => handleStatusChange("verloren")}
                disabled={statusPending}
                className="px-3 py-2.5 rounded-lg text-sm text-[#ef4444] border border-[rgba(239,68,68,0.2)] hover:bg-[rgba(239,68,68,0.05)] transition-colors disabled:opacity-50"
              >
                Verloren
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1a2840] mb-6 overflow-x-auto">
        {(
          [
            { key: "overview", label: "Übersicht" },
            { key: "maske", label: "Gesprächs-Maske" },
            { key: "skript", label: `Bibliothek (${salesContent.length})` },
            { key: "angebot", label: `Angebote (${closingSession.offers.length})` },
            { key: "consent", label: `Consent & Abschluss (${closingSession.consentRecords.length})` },
            { key: "protokoll", label: `Protokoll (${closingSession.events.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? "text-[#00b8ff] border-[#00b8ff]"
                : "text-[#666] border-transparent hover:text-[#f0f0f0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Übersicht ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Gesprächsfortschritt</h2>
              <div className="space-y-2">
                {[
                  { status: "closing_scheduled", label: "Termin geplant" },
                  { status: "in_progress", label: "Gespräch läuft" },
                  { status: "offer_presented", label: "Angebot präsentiert" },
                  { status: "agreement_reached", label: "Einigung erzielt" },
                  { status: "consent_given", label: "Consent erteilt" },
                  { status: "contract_closed", label: "Vertrag abgeschlossen" },
                ].map((step, i) => {
                  const statuses = ["closing_scheduled","in_progress","offer_presented","agreement_reached","consent_given","contract_closed"];
                  const currentIdx = statuses.indexOf(closingSession.status);
                  const stepIdx = statuses.indexOf(step.status);
                  const isDone = stepIdx < currentIdx;
                  const isCurrent = step.status === closingSession.status;
                  return (
                    <div key={step.status} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isCurrent ? "bg-[rgba(0,184,255,0.05)] border border-[rgba(0,184,255,0.2)]" : "border border-transparent"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${isDone ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : isCurrent ? "bg-[rgba(0,184,255,0.15)] text-[#00b8ff]" : "bg-[#0e1a28] text-[#444]"}`}>
                        {isDone ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span className={`text-sm ${isDone ? "text-[#22c55e]" : isCurrent ? "text-[#f0f0f0] font-medium" : "text-[#555]"}`}>{step.label}</span>
                      {isCurrent && <span className="ml-auto text-xs text-[#00b8ff] font-medium">Aktuell</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {closingSession.company.closingNotes && (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[#f0f0f0] mb-3">Interne Closing-Notizen</h2>
                <p className="text-sm text-[#aab4c4] leading-relaxed whitespace-pre-wrap">{closingSession.company.closingNotes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {closingSession.appointment && (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
                  <Clock size={13} />
                  Termin
                </div>
                <div className="text-sm font-semibold text-[#f0f0f0] mb-0.5">
                  {new Date(closingSession.appointment.startTime).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
                <div className="text-xs text-[#888]">
                  {new Date(closingSession.appointment.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} –{" "}
                  {new Date(closingSession.appointment.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                </div>
                {closingSession.appointment.bookedByName && (
                  <div className="mt-3 pt-3 border-t border-[#1a2840]">
                    <div className="text-xs text-[#666] mb-0.5">Ansprechpartner</div>
                    <div className="text-sm text-[#f0f0f0]">{closingSession.appointment.bookedByName}</div>
                    {closingSession.appointment.bookedByEmail && (
                      <div className="text-xs text-[#888]">{closingSession.appointment.bookedByEmail}</div>
                    )}
                  </div>
                )}
                {closingSession.appointment.meetingUrl ? (
                  <a
                    href={closingSession.appointment.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-2 text-xs text-[#00b8ff] hover:underline"
                  >
                    <Video size={12} />
                    Video-Raum öffnen
                  </a>
                ) : (
                  <CreateRoomButton appointmentId={closingSession.appointment.id} />
                )}
              </div>
            )}

            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <div className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">Unternehmen</div>
              <div className="space-y-2 text-sm">
                {closingSession.company.industry && (
                  <div className="flex justify-between"><span className="text-[#666]">Branche</span><span className="text-[#f0f0f0]">{closingSession.company.industry}</span></div>
                )}
                {closingSession.company.contactPerson && (
                  <div className="flex justify-between"><span className="text-[#666]">Kontakt</span><span className="text-[#f0f0f0]">{closingSession.company.contactPerson}</span></div>
                )}
                {closingSession.company.contractValue && (
                  <div className="flex justify-between"><span className="text-[#666]">Wert</span><span className="text-[#f0f0f0] font-mono">€ {(closingSession.company.contractValue / 100).toLocaleString("de-DE")}</span></div>
                )}
                {closingSession.company.contractPackage && (
                  <div className="flex justify-between"><span className="text-[#666]">Paket</span><span className="text-[#f0f0f0]">{closingSession.company.contractPackage}</span></div>
                )}
              </div>
            </div>

            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-3">
              <div className="text-xs font-medium text-[#888] uppercase tracking-wide">Kunden-Einladung</div>
              {resendError && <p className="text-[#ef4444] text-xs">{resendError}</p>}
              {resendLink ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#22c55e]">Einladung gesendet. Neuer Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-[#00b8ff] truncate bg-[#080d14] px-2 py-1.5 rounded">{resendLink}</code>
                    <button
                      onClick={() => { void navigator.clipboard.writeText(resendLink); setResendLinkCopied(true); setTimeout(() => setResendLinkCopied(false), 2000); }}
                      className="px-2 py-1.5 bg-[#1a2840] hover:bg-[#243550] text-[#f0f0f0] text-xs rounded transition-colors"
                    >
                      {resendLinkCopied ? "✓" : "Kopieren"}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={handleResendInvitation} disabled={resendPending}
                  className="w-full py-2 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] text-xs font-medium rounded-lg transition-colors">
                  {resendPending ? "Wird gesendet…" : "Einladung erneut senden"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Gesprächs-Maske ───────────────────────────────────────────── */}
      {activeTab === "maske" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Main column */}
          <div className="col-span-2 space-y-4">
            {/* Control bar */}
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 flex items-center gap-4 flex-wrap">
              {closingSession.appointment?.meetingUrl ? (
                <a
                  href={closingSession.appointment.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[rgba(0,184,255,0.1)] hover:bg-[rgba(0,184,255,0.15)] border border-[rgba(0,184,255,0.2)] text-[#00b8ff] text-sm font-medium rounded-lg transition-colors"
                >
                  <Video size={14} />
                  Video-Raum öffnen
                </a>
              ) : closingSession.appointment ? (
                <CreateRoomButton appointmentId={closingSession.appointment.id} />
              ) : null}

              {/* Recording */}
              {recordingStatus === "idle" && (
                <button
                  onClick={handleStartRecording}
                  disabled={recordingPending}
                  className="flex items-center gap-2 px-3 py-2 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.15)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
                >
                  <Mic size={14} />
                  {recordingPending ? "Startet…" : "Aufzeichnung starten"}
                </button>
              )}
              {recordingStatus === "recording" && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                    <span className="text-sm text-[#ef4444] font-medium">Aufzeichnung läuft</span>
                  </div>
                  <button
                    onClick={handleStopRecording}
                    disabled={recordingPending}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1a2840] hover:bg-[#243550] text-[#f0f0f0] text-sm rounded-lg transition-colors disabled:opacity-40"
                  >
                    <Square size={13} />
                    {recordingPending ? "Stoppt…" : "Stoppen"}
                  </button>
                </div>
              )}
              {recordingStatus === "stopped" && (
                <div className="flex items-center gap-2 text-sm text-[#22c55e]">
                  <MicOff size={14} />
                  Aufzeichnung gespeichert
                </div>
              )}

              <div className="ml-auto">
                {closingSession.startedAt && <CallTimer startedAt={closingSession.startedAt} />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#888]">Gesprächs-Fortschritt</span>
                <span className="text-xs font-mono text-[#00b8ff]">{checkedCount}/{totalCount} ({progress}%)</span>
              </div>
              <div className="h-2 bg-[#0e1a28] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00b8ff] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Checklist phases */}
            {CLOSING_CHECKLIST.map((phase) => {
              const phaseDone = phase.steps.every((s) => checklist[s.id]);
              const phasePartial = phase.steps.some((s) => checklist[s.id]);
              return (
                <div
                  key={phase.phase}
                  className={`bg-[#0c1520] border rounded-xl p-5 ${phaseDone ? "border-[rgba(34,197,94,0.3)]" : phasePartial ? "border-[rgba(0,184,255,0.2)]" : "border-[#1a2840]"}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[#f0f0f0]">{phase.phase}</h3>
                    {phaseDone && <CheckCircle size={14} className="text-[#22c55e]" />}
                  </div>
                  <div className="space-y-2.5">
                    {phase.steps.map((step) => {
                      const checked = checklist[step.id] ?? false;
                      return (
                        <label
                          key={step.id}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <div
                            onClick={() => handleChecklistChange(step.id, !checked)}
                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                              checked
                                ? "bg-[#22c55e] border-[#22c55e]"
                                : "border-[#2a3a50] bg-[#080d14] group-hover:border-[#3a5070]"
                            }`}
                          >
                            {checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm transition-colors ${checked ? "line-through text-[#444]" : "text-[#ccc] group-hover:text-[#f0f0f0]"}`}
                          >
                            {step.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Notes */}
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-medium text-[#888] uppercase tracking-wide">Gesprächsnotizen</div>
                {notesSaved && (
                  <span className="text-xs text-[#22c55e]">Gespeichert ✓</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Live-Notizen während des Gesprächs…&#10;Einwände, Zahlen, Vereinbarungen…"
                className="w-full bg-transparent text-sm text-[#ccc] resize-none h-52 outline-none placeholder-[#333] leading-relaxed"
              />
            </div>

            {/* Quick script reference */}
            {scripts.length > 0 && (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#1a2840] text-xs font-medium text-[#888] uppercase tracking-wide">
                  Skript & Einwände
                </div>
                <div className="divide-y divide-[#111e30] max-h-72 overflow-y-auto">
                  {scripts.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelectedContentId(s.id === selectedContentId ? null : s.id); setActiveTab("skript"); }}
                      className="w-full text-left px-4 py-3 hover:bg-[#0e1a28] transition-colors"
                    >
                      <div className="text-[10px] font-medium text-[#00b8ff] uppercase mb-0.5">
                        {CONTENT_TYPE_LABELS[s.type] ?? s.type}
                      </div>
                      <div className="text-sm text-[#ccc] truncate">{s.title}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick nav to other tabs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTab("angebot")}
                className="px-3 py-2.5 bg-[#0c1520] border border-[#1a2840] hover:border-[#243550] rounded-xl text-xs text-[#888] hover:text-[#f0f0f0] transition-colors text-center"
              >
                Angebot erstellen →
              </button>
              <button
                onClick={() => setActiveTab("consent")}
                className="px-3 py-2.5 bg-[#0c1520] border border-[#1a2840] hover:border-[#243550] rounded-xl text-xs text-[#888] hover:text-[#f0f0f0] transition-colors text-center"
              >
                Consent & Abschluss →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Bibliothek ────────────────────────────────────────────────── */}
      {activeTab === "skript" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["all", ...contentTypes].map((type) => (
                <button
                  key={type}
                  onClick={() => setContentTypeFilter(type)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    contentTypeFilter === type
                      ? "bg-[#00b8ff] text-black"
                      : "bg-[#0c1520] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0]"
                  }`}
                >
                  {type === "all" ? "Alle" : CONTENT_TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>

            {filteredContent.length === 0 ? (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-10 text-center">
                <BookOpen size={24} className="mx-auto mb-2 text-[#333]" />
                <p className="text-[#666] text-sm">Keine Inhalte gefunden.</p>
              </div>
            ) : (
              filteredContent.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedContentId(item.id === selectedContentId ? null : item.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedContentId === item.id
                      ? "bg-[rgba(0,184,255,0.05)] border-[rgba(0,184,255,0.3)]"
                      : "bg-[#0c1520] border-[#1a2840] hover:border-[#243550]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-[#00b8ff] uppercase tracking-wide">
                      {CONTENT_TYPE_LABELS[item.type] ?? item.type}
                    </span>
                    {item.category && <span className="text-[10px] text-[#555]">· {item.category}</span>}
                  </div>
                  <div className="text-sm font-medium text-[#f0f0f0]">{item.title}</div>
                </button>
              ))
            )}
          </div>

          <div className="col-span-2">
            {selectedContent ? (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 h-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[#00b8ff] uppercase tracking-wide">
                    {CONTENT_TYPE_LABELS[selectedContent.type] ?? selectedContent.type}
                  </span>
                  {selectedContent.category && <span className="text-xs text-[#555]">· {selectedContent.category}</span>}
                </div>
                <h2 className="text-lg font-bold text-[#f0f0f0] mb-4">{selectedContent.title}</h2>
                <div className="text-sm text-[#aab4c4] leading-relaxed whitespace-pre-wrap">{selectedContent.content}</div>
              </div>
            ) : (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl h-full flex items-center justify-center">
                <div className="text-center">
                  <BookOpen size={32} className="mx-auto mb-3 text-[#222]" />
                  <p className="text-[#555] text-sm">Inhalt auswählen</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Angebote ──────────────────────────────────────────────────── */}
      {activeTab === "angebot" && (
        <div className="space-y-6">
          {closingSession.offers.length > 0 && (
            <div className="space-y-3">
              {closingSession.offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-[#0c1520] border rounded-xl p-5 flex items-center justify-between ${offer.id === closingSession.activeOfferId ? "border-[rgba(0,184,255,0.3)]" : "border-[#1a2840]"}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#f0f0f0]">{offer.template?.name ?? "Angebot"}</span>
                      {offer.id === closingSession.activeOfferId && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,184,255,0.1)] text-[#00b8ff]">Aktiv</span>
                      )}
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${offer.status === "presented" ? "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]" : offer.status === "accepted" ? "bg-[rgba(34,197,94,0.1)] text-[#22c55e]" : "bg-[#1a2840] text-[#888]"}`}>
                        {offer.status === "draft" ? "Entwurf" : offer.status === "presented" ? "Präsentiert" : offer.status === "accepted" ? "Akzeptiert" : offer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#666]">
                      <span className="font-mono text-[#f0f0f0]">{offer.currency} {(offer.priceNet / 100).toLocaleString("de-DE")} netto</span>
                      {offer.validUntil && <span>Gültig bis {new Date(offer.validUntil).toLocaleDateString("de-DE")}</span>}
                      {offer.presentedAt && <span>Gezeigt: {new Date(offer.presentedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                  </div>
                  {offer.status === "draft" && (
                    <button onClick={() => handlePresentOffer(offer.id)} disabled={offerPending}
                      className="flex items-center gap-2 px-3 py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition-colors">
                      <Eye size={13} />
                      Präsentieren
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Neues Angebot aus Template erstellen</h2>
            {offerTemplates.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={24} className="mx-auto mb-2 text-[#333]" />
                <p className="text-[#666] text-sm">Noch keine Angebots-Templates.</p>
                <Link href="/admin/sales/angebote" className="text-xs text-[#00b8ff] hover:underline mt-1 inline-block">Templates verwalten →</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {offerTemplates.map((template) => (
                  <div key={template.id} className="bg-[#080d14] border border-[#1a2840] rounded-xl overflow-hidden">
                    <button onClick={() => handleCreateOffer(template.id)} disabled={offerPending}
                      className="w-full text-left p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors disabled:opacity-40">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag size={13} className="text-[#00b8ff]" />
                        <span className="text-xs font-medium text-[#00b8ff]">{template.packageType}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#f0f0f0] mb-1">{template.name}</div>
                      {template.description && <div className="text-xs text-[#666] mb-2 line-clamp-2">{template.description}</div>}
                      <div className="text-sm font-mono text-[#22c55e]">{template.currency} {(template.priceNet / 100).toLocaleString("de-DE")} netto</div>
                    </button>
                    {template.r2Key && (
                      <a
                        href={`/api/admin/offer-pdf?templateId=${template.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 border-t border-[#1a2840] text-xs text-[#888] hover:text-[#00b8ff] transition-colors"
                      >
                        <FileText size={11} />
                        PDF anzeigen
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Consent & Abschluss ───────────────────────────────────────── */}
      {activeTab === "consent" && (
        <div className="space-y-6">
          {consentError && (
            <div className="px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">{consentError}</div>
          )}

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Dokument-Consents</h2>
            <p className="text-xs text-[#666] mb-4">Klicken Sie für jedes Dokument, sobald der Kunde zugestimmt hat.</p>
            {legalDocuments.length === 0 ? (
              <p className="text-[#555] text-sm">Keine aktiven Rechtsdokumente. In den Admin-Einstellungen hinterlegen.</p>
            ) : (
              <div className="space-y-3">
                {legalDocuments.map((doc) => {
                  const alreadyConsented = closingSession.consentRecords.some((cr) => cr.legalDocument.title === doc.title);
                  return (
                    <div key={doc.id} className={`flex items-center justify-between p-4 rounded-xl border ${alreadyConsented ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)]" : "border-[#1a2840]"}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#f0f0f0]">{doc.title}</span>
                          <span className="text-xs text-[#555]">v{doc.version}</span>
                          {doc.isRequired && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#ef4444]">Pflicht</span>}
                        </div>
                        {doc.checkboxLabel && <p className="text-xs text-[#666]">{doc.checkboxLabel}</p>}
                      </div>
                      {alreadyConsented ? (
                        <div className="flex items-center gap-1.5 text-[#22c55e] text-sm"><CheckCircle size={15} /><span className="text-xs">Bestätigt</span></div>
                      ) : (
                        <button onClick={() => handleRecordConsent(doc.id, doc.type)} disabled={consentPending}
                          className="px-3 py-1.5 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] text-xs font-medium rounded-lg transition-colors">
                          Consent bestätigen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {closingSession.consentRecords.length > 0 && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Consent-Protokoll</h2>
              <div className="space-y-2">
                {closingSession.consentRecords.map((cr) => (
                  <div key={cr.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-[#22c55e]" />
                      <span className="text-[#f0f0f0]">{cr.legalDocument.title}</span>
                      <span className="text-xs text-[#555]">v{cr.legalDocument.version}</span>
                    </div>
                    <span className="text-xs text-[#555]">
                      {new Date(cr.grantedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Vertrag abschließen</h2>
            <p className="text-xs text-[#666] mb-4">Schließt den Vertrag ab und erstellt den ContractSnapshot. Kunden-Account wird automatisch angelegt.</p>
            {closingSession.status === "contract_closed" ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm"><CheckCircle size={16} />Vertrag wurde abgeschlossen.</div>
            ) : (
              <button onClick={handleCloseContract} disabled={contractPending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-black font-bold text-sm rounded-lg transition-colors">
                <CheckCircle size={15} />
                {contractPending ? "Wird abgeschlossen…" : "Vertrag jetzt abschließen"}
              </button>
            )}
            {!closingSession.activeOfferId && <p className="text-xs text-[#ef4444] mt-2">Kein aktives Angebot — erst Angebot erstellen.</p>}
          </div>

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Stripe-Zahlung anfordern</h2>
            <p className="text-xs text-[#666] mb-4">Öffnet den Stripe-Checkout-Link (Karte, SEPA). Nach Zahlung wird das Unternehmen automatisch aktiviert.</p>
            {closingSession.status === "payment_pending" || closingSession.status === "contract_closed" ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm">
                <CheckCircle size={15} />
                {closingSession.status === "contract_closed" ? "Zahlung eingegangen — Unternehmen aktiviert." : "Warte auf Zahlung…"}
              </div>
            ) : (
              <button onClick={handleRequestPayment} disabled={paymentPending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-colors">
                <CreditCard size={15} />
                {paymentPending ? "Wird vorbereitet…" : "Stripe-Checkout öffnen"}
              </button>
            )}
          </div>

          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Rechnung erstellen</h2>
            <p className="text-xs text-[#666] mb-4">Erstellt eine Rechnungserfassung aus dem aktiven Angebot.</p>
            {invoiceError && <p className="text-[#ef4444] text-xs mb-3">{invoiceError}</p>}
            {invoiceId ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm">
                <CheckCircle size={15} />
                Rechnung erstellt.{" "}
                <a href="/admin/sales/rechnungen" className="text-[#00b8ff] hover:underline text-xs">Zur Rechnungs-Verwaltung →</a>
              </div>
            ) : (
              <button onClick={handleCreateInvoice} disabled={invoicePending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] font-medium text-sm rounded-lg transition-colors">
                <FileText size={14} />
                {invoicePending ? "Wird erstellt…" : "Rechnung aus Angebot erstellen"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Protokoll ─────────────────────────────────────────────────── */}
      {activeTab === "protokoll" && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
          {closingSession.events.length === 0 ? (
            <div className="py-12 text-center text-[#666] text-sm">Noch keine Ereignisse.</div>
          ) : (
            <div className="divide-y divide-[#111e30]">
              {closingSession.events.map((event) => {
                let meta: Record<string, string> = {};
                try { meta = JSON.parse(event.metadata); } catch {}
                return (
                  <div key={event.id} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#0e1a28] flex items-center justify-center flex-shrink-0">
                      {event.eventType === "status_change" ? (
                        <ChevronRight size={14} className="text-[#00b8ff]" />
                      ) : event.eventType === "offer_created" || event.eventType === "offer_presented" ? (
                        <FileText size={14} className="text-[#f59e0b]" />
                      ) : (
                        <AlertCircle size={14} className="text-[#888]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#f0f0f0] mb-0.5">
                        {event.eventType === "status_change"
                          ? `Status → ${STATUS_LABELS[meta.newStatus] ?? meta.newStatus}`
                          : event.eventType === "offer_created"
                          ? `Angebot erstellt: ${meta.templateName ?? ""}`
                          : event.eventType === "offer_presented"
                          ? "Angebot präsentiert"
                          : event.eventType === "contract_closed"
                          ? "Vertrag abgeschlossen"
                          : event.eventType === "consent_recorded"
                          ? "Consent erfasst"
                          : event.eventType}
                      </div>
                      <div className="text-xs text-[#555]">
                        {event.actor?.name ?? "System"} · {new Date(event.occurredAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateRoomButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/daily/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const data = (await res.json()) as { meetingUrl?: string; error?: string };
      if (data.error) setError(data.error);
      else router.refresh();
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mt-3">
      {error && <p className="text-xs text-[#ef4444] mb-1">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={creating}
        className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#00b8ff] transition-colors disabled:opacity-40"
      >
        <Video size={12} />
        {creating ? "Wird erstellt…" : "Videoraum erstellen"}
      </button>
    </div>
  );
}
