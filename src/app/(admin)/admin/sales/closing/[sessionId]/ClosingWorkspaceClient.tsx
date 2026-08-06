"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import {
  updateClosingSessionStatus,
  createOfferForSession,
  presentOffer,
  recordConsent,
  closeContract,
  resendClientInvitation,
} from "../actions";
import { createInvoiceFromOffer } from "../../rechnungen/actions";

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

type ClosingSessionData = {
  id: string;
  status: string;
  activeOfferId: string | null;
  recordingStatus: string;
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
    startTime: Date;
    endTime: Date;
    title: string;
    bookedByName: string | null;
    bookedByEmail: string | null;
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
};

interface Props {
  closingSession: ClosingSessionData;
  salesContent: SalesContentItem[];
  offerTemplates: OfferTemplate[];
  legalDocuments: LegalDocument[];
  currentUserId: string;
}

export function ClosingWorkspaceClient({
  closingSession,
  salesContent,
  offerTemplates,
  legalDocuments,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "skript" | "angebot" | "consent" | "protokoll">("overview");
  const [statusPending, startStatusTransition] = useTransition();
  const [offerPending, startOfferTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

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

  // Invoice
  const [invoicePending, startInvoiceTransition] = useTransition();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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

  // Resend invitation
  const [resendPending, startResendTransition] = useTransition();
  const [resendLink, setResendLink] = useState<string | null>(null);
  const [resendLinkCopied, setResendLinkCopied] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  function handleResendInvitation() {
    setResendError(null);
    setResendLink(null);
    startResendTransition(async () => {
      const result = await resendClientInvitation(closingSession.id);
      if (result?.error) setResendError(result.error);
      else if (result?.closingUrl) setResendLink(result.closingUrl);
    });
  }

  // Consent & payment state
  const [consentPending, startConsentTransition] = useTransition();
  const [contractPending, startContractTransition] = useTransition();
  const [paymentPending, setPaymentPending] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

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

  const filteredContent =
    contentTypeFilter === "all"
      ? salesContent
      : salesContent.filter((c) => c.type === contentTypeFilter);

  const selectedContent = salesContent.find((c) => c.id === selectedContentId);

  const contentTypes = Array.from(new Set(salesContent.map((c) => c.type)));

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
              <h1 className="text-2xl font-bold text-[#f0f0f0]">
                {closingSession.company.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[closingSession.status] ?? "bg-[#1a2840] text-[#888]"}`}
              >
                {STATUS_LABELS[closingSession.status] ?? closingSession.status}
              </span>
            </div>
            <p className="text-sm text-[#666]">
              Closer: {closingSession.closer.name}
              {closingSession.appointment && (
                <> · {new Date(closingSession.appointment.startTime).toLocaleString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })} Uhr</>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {actionError && (
              <p className="text-[#ef4444] text-xs">{actionError}</p>
            )}
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
      <div className="flex gap-1 border-b border-[#1a2840] mb-6">
        {(
          [
            { key: "overview", label: "Übersicht" },
            { key: "skript", label: `Skript & Inhalte (${salesContent.length})` },
            { key: "angebot", label: `Angebote (${closingSession.offers.length})` },
            { key: "consent", label: `Consent & Abschluss (${closingSession.consentRecords.length})` },
            { key: "protokoll", label: `Protokoll (${closingSession.events.length})` },
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

      {/* Tab: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Session Status Flow */}
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
                  const statuses = [
                    "closing_scheduled", "in_progress", "offer_presented",
                    "agreement_reached", "consent_given", "contract_closed",
                  ];
                  const currentIdx = statuses.indexOf(closingSession.status);
                  const stepIdx = statuses.indexOf(step.status);
                  const isDone = stepIdx < currentIdx;
                  const isCurrent = step.status === closingSession.status;
                  const isPast = stepIdx > currentIdx;
                  return (
                    <div
                      key={step.status}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                        isCurrent
                          ? "bg-[rgba(0,184,255,0.05)] border border-[rgba(0,184,255,0.2)]"
                          : "border border-transparent"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                          isDone
                            ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]"
                            : isCurrent
                            ? "bg-[rgba(0,184,255,0.15)] text-[#00b8ff]"
                            : "bg-[#0e1a28] text-[#444]"
                        }`}
                      >
                        {isDone ? <CheckCircle size={14} /> : i + 1}
                      </div>
                      <span
                        className={`text-sm ${
                          isDone ? "text-[#22c55e]" : isCurrent ? "text-[#f0f0f0] font-medium" : "text-[#555]"
                        }`}
                      >
                        {step.label}
                      </span>
                      {isCurrent && (
                        <span className="ml-auto text-xs text-[#00b8ff] font-medium">Aktuell</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Closing Notes */}
            {closingSession.company.closingNotes && (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[#f0f0f0] mb-3">Interne Closing-Notizen</h2>
                <p className="text-sm text-[#aab4c4] leading-relaxed whitespace-pre-wrap">
                  {closingSession.company.closingNotes}
                </p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Appointment info */}
            {closingSession.appointment && (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
                <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-3">
                  <Clock size={13} />
                  Termin
                </div>
                <div className="text-sm font-semibold text-[#f0f0f0] mb-0.5">
                  {new Date(closingSession.appointment.startTime).toLocaleDateString("de-DE", {
                    weekday: "short", day: "2-digit", month: "2-digit", year: "numeric",
                  })}
                </div>
                <div className="text-xs text-[#888]">
                  {new Date(closingSession.appointment.startTime).toLocaleTimeString("de-DE", {
                    hour: "2-digit", minute: "2-digit",
                  })} –{" "}
                  {new Date(closingSession.appointment.endTime).toLocaleTimeString("de-DE", {
                    hour: "2-digit", minute: "2-digit",
                  })} Uhr
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
              </div>
            )}

            {/* Company quick info */}
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              <div className="text-xs font-medium text-[#888] uppercase tracking-wide mb-3">Unternehmen</div>
              <div className="space-y-2 text-sm">
                {closingSession.company.industry && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Branche</span>
                    <span className="text-[#f0f0f0]">{closingSession.company.industry}</span>
                  </div>
                )}
                {closingSession.company.contactPerson && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Kontakt</span>
                    <span className="text-[#f0f0f0]">{closingSession.company.contactPerson}</span>
                  </div>
                )}
                {closingSession.company.contractValue && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Wert</span>
                    <span className="text-[#f0f0f0] font-mono">
                      € {(closingSession.company.contractValue / 100).toLocaleString("de-DE")}
                    </span>
                  </div>
                )}
                {closingSession.company.contractPackage && (
                  <div className="flex justify-between">
                    <span className="text-[#666]">Paket</span>
                    <span className="text-[#f0f0f0]">{closingSession.company.contractPackage}</span>
                  </div>
                )}
              </div>

            {/* Resend invitation */}
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-3">
              <div className="text-xs font-medium text-[#888] uppercase tracking-wide">Kunden-Einladung</div>
              {resendError && <p className="text-[#ef4444] text-xs">{resendError}</p>}
              {resendLink ? (
                <div className="space-y-2">
                  <p className="text-xs text-[#22c55e]">Einladung gesendet. Neuer Link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[10px] font-mono text-[#00b8ff] truncate bg-[#080d14] px-2 py-1.5 rounded">
                      {resendLink}
                    </code>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(resendLink);
                        setResendLinkCopied(true);
                        setTimeout(() => setResendLinkCopied(false), 2000);
                      }}
                      className="px-2 py-1.5 bg-[#1a2840] hover:bg-[#243550] text-[#f0f0f0] text-xs rounded transition-colors"
                    >
                      {resendLinkCopied ? "✓" : "Kopieren"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleResendInvitation}
                  disabled={resendPending}
                  className="w-full py-2 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] text-xs font-medium rounded-lg transition-colors"
                >
                  {resendPending ? "Wird gesendet…" : "Einladung erneut senden"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Skript & Inhalte */}
      {activeTab === "skript" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Content list */}
          <div className="space-y-3">
            {/* Type filter */}
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
                <p className="text-[#555] text-xs mt-1">
                  Inhalte in Sales Library verwalten.
                </p>
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
                    {item.category && (
                      <span className="text-[10px] text-[#555]">· {item.category}</span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-[#f0f0f0]">{item.title}</div>
                </button>
              ))
            )}
          </div>

          {/* Content detail */}
          <div className="col-span-2">
            {selectedContent ? (
              <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 h-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-[#00b8ff] uppercase tracking-wide">
                    {CONTENT_TYPE_LABELS[selectedContent.type] ?? selectedContent.type}
                  </span>
                  {selectedContent.category && (
                    <span className="text-xs text-[#555]">· {selectedContent.category}</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#f0f0f0] mb-4">{selectedContent.title}</h2>
                <div className="prose prose-invert text-sm text-[#aab4c4] leading-relaxed whitespace-pre-wrap">
                  {selectedContent.content}
                </div>
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

      {/* Tab: Angebote */}
      {activeTab === "angebot" && (
        <div className="space-y-6">
          {/* Existing offers */}
          {closingSession.offers.length > 0 && (
            <div className="space-y-3">
              {closingSession.offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-[#0c1520] border rounded-xl p-5 flex items-center justify-between ${
                    offer.id === closingSession.activeOfferId
                      ? "border-[rgba(0,184,255,0.3)]"
                      : "border-[#1a2840]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#f0f0f0]">
                        {offer.template?.name ?? "Angebot"}
                      </span>
                      {offer.id === closingSession.activeOfferId && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(0,184,255,0.1)] text-[#00b8ff]">
                          Aktiv
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          offer.status === "presented"
                            ? "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]"
                            : offer.status === "accepted"
                            ? "bg-[rgba(34,197,94,0.1)] text-[#22c55e]"
                            : "bg-[#1a2840] text-[#888]"
                        }`}
                      >
                        {offer.status === "draft" ? "Entwurf" : offer.status === "presented" ? "Präsentiert" : offer.status === "accepted" ? "Akzeptiert" : offer.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#666]">
                      <span className="font-mono text-[#f0f0f0]">
                        {offer.currency} {(offer.priceNet / 100).toLocaleString("de-DE")} netto
                      </span>
                      {offer.validUntil && <span>Gültig bis {new Date(offer.validUntil).toLocaleDateString("de-DE")}</span>}
                      {offer.presentedAt && (
                        <span>Gezeigt: {new Date(offer.presentedAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      )}
                    </div>
                  </div>
                  {offer.status === "draft" && (
                    <button
                      onClick={() => handlePresentOffer(offer.id)}
                      disabled={offerPending}
                      className="flex items-center gap-2 px-3 py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition-colors"
                    >
                      <Eye size={13} />
                      Präsentieren
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Create from template */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Neues Angebot erstellen</h2>
            {offerTemplates.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={24} className="mx-auto mb-2 text-[#333]" />
                <p className="text-[#666] text-sm">Noch keine Angebots-Templates.</p>
                <p className="text-[#555] text-xs mt-1">Templates in der Sales Library anlegen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {offerTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleCreateOffer(template.id)}
                    disabled={offerPending}
                    className="text-left p-4 bg-[#080d14] border border-[#1a2840] hover:border-[#243550] rounded-xl transition-colors disabled:opacity-40"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Tag size={13} className="text-[#00b8ff]" />
                      <span className="text-xs font-medium text-[#00b8ff]">{template.packageType}</span>
                    </div>
                    <div className="text-sm font-semibold text-[#f0f0f0] mb-1">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-[#666] mb-2 line-clamp-2">{template.description}</div>
                    )}
                    <div className="text-sm font-mono text-[#22c55e]">
                      {template.currency} {(template.priceNet / 100).toLocaleString("de-DE")} netto
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Consent & Abschluss */}
      {activeTab === "consent" && (
        <div className="space-y-6">
          {consentError && (
            <div className="px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
              {consentError}
            </div>
          )}

          {/* Legal document consent */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-1">Dokument-Consents</h2>
            <p className="text-xs text-[#666] mb-4">Klicken Sie für jedes Dokument, sobald der Kunde zugestimmt hat.</p>
            {legalDocuments.length === 0 ? (
              <p className="text-[#555] text-sm">Keine aktiven Rechtsdokumente. In den Admin-Einstellungen hinterlegen.</p>
            ) : (
              <div className="space-y-3">
                {legalDocuments.map((doc) => {
                  const alreadyConsented = closingSession.consentRecords.some(
                    (cr) => cr.legalDocument.title === doc.title
                  );
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-4 rounded-xl border ${
                        alreadyConsented
                          ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.05)]"
                          : "border-[#1a2840]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#f0f0f0]">{doc.title}</span>
                          <span className="text-xs text-[#555]">v{doc.version}</span>
                          {doc.isRequired && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#ef4444]">
                              Pflicht
                            </span>
                          )}
                        </div>
                        {doc.checkboxLabel && (
                          <p className="text-xs text-[#666]">{doc.checkboxLabel}</p>
                        )}
                      </div>
                      {alreadyConsented ? (
                        <div className="flex items-center gap-1.5 text-[#22c55e] text-sm">
                          <CheckCircle size={15} />
                          <span className="text-xs">Bestätigt</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRecordConsent(doc.id, doc.type)}
                          disabled={consentPending}
                          className="px-3 py-1.5 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] text-xs font-medium rounded-lg transition-colors"
                        >
                          Consent bestätigen
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Previously recorded consents */}
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
                      {new Date(cr.grantedAt).toLocaleString("de-DE", {
                        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contract closing */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Vertrag abschließen</h2>
            <p className="text-xs text-[#666] mb-4">
              Schließt den Vertrag ab und erstellt den ContractSnapshot. Nur wenn alle Pflicht-Consents erteilt wurden.
            </p>
            {closingSession.status === "contract_closed" ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm">
                <CheckCircle size={16} />
                Vertrag wurde abgeschlossen.
              </div>
            ) : (
              <button
                onClick={handleCloseContract}
                disabled={contractPending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-40 text-black font-bold text-sm rounded-lg transition-colors"
              >
                <CheckCircle size={15} />
                {contractPending ? "Wird abgeschlossen…" : "Vertrag jetzt abschließen"}
              </button>
            )}
            {!closingSession.activeOfferId && (
              <p className="text-xs text-[#ef4444] mt-2">Kein aktives Angebot — erst Angebot erstellen.</p>
            )}
          </div>

          {/* Stripe payment */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Stripe-Zahlung anfordern</h2>
            <p className="text-xs text-[#666] mb-4">
              Öffnet den Stripe-Checkout-Link. Der Kunde kann direkt zahlen (Karte, SEPA). Nach Zahlung wird das Unternehmen automatisch aktiviert.
            </p>
            {closingSession.status === "payment_pending" || closingSession.status === "contract_closed" ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm">
                <CheckCircle size={15} />
                {closingSession.status === "contract_closed" ? "Zahlung eingegangen — Unternehmen aktiviert." : "Warte auf Zahlung…"}
              </div>
            ) : (
              <button
                onClick={handleRequestPayment}
                disabled={paymentPending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 text-white font-bold text-sm rounded-lg transition-colors"
              >
                <CreditCard size={15} />
                {paymentPending ? "Wird vorbereitet…" : "Stripe-Checkout öffnen"}
              </button>
            )}
          </div>

          {/* Invoice creation */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-sm font-semibold text-[#f0f0f0] mb-2">Rechnung erstellen</h2>
            <p className="text-xs text-[#666] mb-4">
              Erstellt eine Rechnungserfassung aus dem aktiven Angebot für die Rechnungs-Verwaltung.
            </p>
            {invoiceError && <p className="text-[#ef4444] text-xs mb-3">{invoiceError}</p>}
            {invoiceId ? (
              <div className="flex items-center gap-2 text-[#22c55e] text-sm">
                <CheckCircle size={15} />
                Rechnung erstellt.{" "}
                <a href="/admin/sales/rechnungen" className="text-[#00b8ff] hover:underline text-xs">
                  Zur Rechnungs-Verwaltung →
                </a>
              </div>
            ) : (
              <button
                onClick={handleCreateInvoice}
                disabled={invoicePending || !closingSession.activeOfferId}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#1a2840] hover:bg-[#243550] disabled:opacity-40 text-[#f0f0f0] font-medium text-sm rounded-lg transition-colors"
              >
                <FileText size={14} />
                {invoicePending ? "Wird erstellt…" : "Rechnung aus Angebot erstellen"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab: Protokoll */}
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
                          : event.eventType}
                      </div>
                      <div className="text-xs text-[#555]">
                        {event.actor?.name ?? "System"} · {new Date(event.occurredAt).toLocaleString("de-DE", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
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
