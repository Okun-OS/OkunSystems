"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, VideoOff, FileText, Shield, X } from "lucide-react";

type Offer = {
  id: string;
  priceNet: number;
  currency: string;
  validUntil: Date | null;
  status: string;
  acceptedAt: Date | null;
  template: { name: string; description: string | null; r2Key: string | null } | null;
};

type LegalDoc = {
  id: string;
  title: string;
  type: string;
  version: string;
  isRequired: boolean;
  r2Key: string | null;
};

type ConsentRecord = {
  id: string;
  legalDocumentId: string;
  consentType: string;
  agreementAt: Date | null;
};

type Session = {
  id: string;
  status: string;
  clientPendingAction: string | null;
  company: { name: string };
  closer: { name: string | null };
  appointment: {
    startTime: Date;
    endTime: Date | null;
    bookedByName: string | null;
    meetingUrl: string | null;
  } | null;
  activeOffer: Offer | null;
  legalDocuments: LegalDoc[];
  consentRecords: ConsentRecord[];
};

type Props = { session: Session; token: string };

const STATUS_ORDER = [
  "closing_scheduled",
  "in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_given",
  "contract_closed",
  "payment_pending",
];

function fmtEur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function ClosingClientView({ session: s, token }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paying, startPay] = useTransition();
  const [callActive, setCallActive] = useState(false);
  const [consented, setConsented] = useState<Set<string>>(
    new Set(s.consentRecords.map((r) => r.legalDocumentId))
  );
  const [consentPending, setConsentPending] = useState<string | null>(null);

  // Modal state
  const [offerModalDismissed, setOfferModalDismissed] = useState(false);
  const [consentModalSubmitting, setConsentModalSubmitting] = useState(false);
  const [consentModalChecked, setConsentModalChecked] = useState<Set<string>>(new Set());
  const [recordingConsentChecked, setRecordingConsentChecked] = useState(false);
  const [consentModalDone, setConsentModalDone] = useState(false);

  const paymentResult = searchParams.get("payment");
  const isPaid = s.activeOffer?.status === "accepted";
  const statusIdx = STATUS_ORDER.indexOf(s.status);
  const isWaiting = statusIdx < 1;
  const offerVisible = statusIdx >= 2 && s.activeOffer !== null;
  const paymentReady = s.status === "contract_closed" && !isPaid;
  const paymentPending = s.status === "payment_pending";
  const canJoinCall = !!s.appointment?.meetingUrl && statusIdx >= 1 && !isPaid;

  const requiredDocs = s.legalDocuments.filter((d) => d.isRequired);
  const allRequiredConsented = requiredDocs.every((d) => consented.has(d.id));
  const showConsentForm = paymentReady && s.legalDocuments.length > 0;

  // Show offer modal when in call and offer is visible and not dismissed
  const showOfferModal = callActive && offerVisible && s.activeOffer !== null && !offerModalDismissed && !isPaid;

  // Show recording consent modal when clientPendingAction is set and not already done
  const showConsentModal = callActive && s.clientPendingAction === "recording_consent" && !consentModalDone;

  // Polling — faster when in call so clientPendingAction is detected promptly
  useEffect(() => {
    if (isPaid || s.status === "verloren") return;
    const interval = callActive ? 5_000 : 20_000;
    const id = setInterval(() => router.refresh(), interval);
    return () => clearInterval(id);
  }, [isPaid, s.status, router, callActive]);

  async function handleConsent(doc: LegalDoc) {
    if (consented.has(doc.id) || consentPending) return;
    setConsentPending(doc.id);
    try {
      const grossCents = s.activeOffer ? Math.round(s.activeOffer.priceNet * 1.19) : 0;
      const res = await fetch("/api/closing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          legalDocumentId: doc.id,
          consentType: doc.type,
          displayedPriceCents: grossCents,
        }),
      });
      if (res.ok) setConsented((prev) => new Set([...prev, doc.id]));
    } finally {
      setConsentPending(null);
    }
  }

  async function handleBatchConsent() {
    if (!recordingConsentChecked) return;
    const docsToConsent = s.legalDocuments.filter((d) => !consented.has(d.id));
    const allRequired = s.legalDocuments.filter((d) => d.isRequired);
    const requiredChecked = allRequired.every((d) => consentModalChecked.has(d.id) || consented.has(d.id));
    if (!requiredChecked) return;

    setConsentModalSubmitting(true);
    try {
      const grossCents = s.activeOffer ? Math.round(s.activeOffer.priceNet * 1.19) : 0;
      const consentActions = docsToConsent
        .filter((d) => consentModalChecked.has(d.id) || consented.has(d.id))
        .map((d) => ({ legalDocumentId: d.id, consentType: d.type }));

      await fetch("/api/closing/batch-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, consentActions, displayedPriceCents: grossCents }),
      });

      setConsented((prev) => {
        const next = new Set(prev);
        consentActions.forEach((a) => next.add(a.legalDocumentId));
        return next;
      });
      setConsentModalDone(true);
      router.refresh();
    } finally {
      setConsentModalSubmitting(false);
    }
  }

  async function handlePay() {
    startPay(async () => {
      const res = await fetch("/api/stripe/client-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) window.location.href = data.url;
      else alert(data.error ?? "Fehler beim Starten der Zahlung");
    });
  }

  // ── In-call OKUN-shell layout ─────────────────────────────────────────────
  if (callActive && s.appointment?.meetingUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#060a10] flex flex-col">

        {/* ── OKUN header ── */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#080d14] border-b border-[#1a2840] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/okun-logo.png"
              alt="OKUN Systems"
              className="h-6"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <span className="hidden sm:block text-xs text-[#444] border-l border-[#1a2840] pl-3">
              {s.company.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status={s.status} isPaid={isPaid} />
            <button
              onClick={() => setCallActive(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(239,68,68,0.1)] hover:bg-[rgba(239,68,68,0.18)] border border-[rgba(239,68,68,0.22)] text-[#ef4444] text-xs font-semibold rounded-lg transition-colors"
            >
              <VideoOff size={12} />
              Verlassen
            </button>
          </div>
        </div>

        {/* ── Main content: video + OKUN branding padding ── */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-2 min-h-0 overflow-hidden">

          {/* Branding strip above video */}
          <div className="flex items-center gap-3 text-[10px] text-[#2a3a50] uppercase tracking-widest flex-shrink-0">
            <span>OKUN Systems</span>
            <span>·</span>
            <span>{s.company.name}</span>
            {s.closer.name && (
              <>
                <span>·</span>
                <span>Ihr Berater: {s.closer.name}</span>
              </>
            )}
          </div>

          {/* Video card — constrained, not full-screen */}
          <div className="w-full max-w-4xl flex flex-col bg-[#0c1520] border border-[#1a2840] rounded-2xl overflow-hidden" style={{ height: "min(calc(100vh - 200px), 680px)" }}>
            {/* Title strip */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#1a2840] bg-[#080d14] flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
              <span className="text-xs font-medium text-[#666]">
                Videogespräch
                {s.closer.name && <span className="text-[#444]"> · {s.closer.name}</span>}
              </span>
              <span className="ml-auto text-[10px] text-[#2a3a50] uppercase tracking-wider">OKUN Systems</span>
            </div>

            {/* Daily.co iframe */}
            <iframe
              src={s.appointment.meetingUrl}
              allow="camera; microphone; fullscreen; display-capture; screen-wake-lock"
              className="flex-1 w-full border-0 bg-[#0c1520]"
              title="Gespräch"
            />
          </div>

          {/* Branding strip below video */}
          <div className="text-[10px] text-[#1e2d40] tracking-widest uppercase flex-shrink-0">
            Sicheres Gespräch · Powered by OKUN Systems
          </div>
        </div>

        {/* ── Offer modal ── */}
        {showOfferModal && s.activeOffer && (
          <OfferModal
            offer={s.activeOffer}
            token={token}
            onDismiss={() => setOfferModalDismissed(true)}
          />
        )}

        {/* ── Recording consent modal ── */}
        {showConsentModal && (
          <ConsentModal
            legalDocuments={s.legalDocuments}
            alreadyConsented={consented}
            checked={consentModalChecked}
            setChecked={setConsentModalChecked}
            recordingChecked={recordingConsentChecked}
            setRecordingChecked={setRecordingConsentChecked}
            submitting={consentModalSubmitting}
            onSubmit={handleBatchConsent}
            token={token}
          />
        )}

        {/* ── Payment success (full overlay when paid) ── */}
        {(paymentResult === "success" || isPaid) && (
          <div className="fixed inset-0 z-[70] bg-[#060a10]/95 flex items-center justify-center p-6">
            <div className="max-w-sm w-full rounded-2xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-bold text-[#22c55e] mb-2">Zahlung erfolgreich</p>
              <p className="text-sm text-[#888] leading-relaxed">Ihr Konto wird in Kürze aktiviert. Sie erhalten eine Bestätigung per E-Mail.</p>
              <button
                onClick={() => setCallActive(false)}
                className="mt-5 px-5 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-xl transition-colors"
              >
                Zurück zur Übersicht
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Normal info-card layout (call not active) ─────────────────────────────
  return (
    <div className="min-h-screen bg-[#080d14] text-[#f0f0f0] p-4 flex flex-col items-center justify-start pt-12 pb-16">
      <div className="max-w-xl w-full space-y-5">

        {/* Logo */}
        <div className="text-center mb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/okun-logo.png"
            alt="OKUN Systems"
            className="h-8 mx-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* Join call banner */}
        {canJoinCall && (
          <div className="rounded-2xl bg-[rgba(0,184,255,0.05)] border border-[rgba(0,184,255,0.2)] p-4 flex items-center justify-between gap-4">
            <div className="text-sm text-[#aaa]">
              Ihr Berater wartet im Video-Gespräch auf Sie.
            </div>
            <button
              onClick={() => setCallActive(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 bg-[#00b8ff] text-black hover:bg-[#0099dd]"
            >
              <Video size={13} />
              Beitreten
            </button>
          </div>
        )}

        {/* Payment success banner */}
        {(paymentResult === "success" || isPaid) && (
          <div className="rounded-2xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-lg font-bold text-[#22c55e] mb-2">Zahlung erfolgreich</h2>
            <p className="text-sm text-[#888]">
              Vielen Dank! Wir haben Ihre Zahlung erhalten und Ihr Konto wird in Kürze aktiviert.
              Sie erhalten eine Bestätigung per E-Mail.
            </p>
          </div>
        )}

        {/* Payment cancelled banner */}
        {paymentResult === "cancelled" && !isPaid && (
          <div className="rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] p-5 text-center">
            <p className="text-sm text-[#ef4444]">Zahlung abgebrochen. Sie können es jederzeit erneut versuchen.</p>
          </div>
        )}

        {/* Session info card */}
        <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 space-y-4">
          <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Gesprächsdetails</div>
          <div className="space-y-3">
            <Row icon="🏢" label="Unternehmen" value={s.company.name} />
            {s.closer.name && <Row icon="👤" label="Ihr Berater" value={s.closer.name} />}
            {s.appointment && (
              <Row
                icon="📅"
                label="Termin"
                value={fmtDate(s.appointment.startTime)}
                sub={fmtTime(s.appointment.startTime) + " Uhr"}
              />
            )}
          </div>
          <StatusPill status={s.status} isPaid={isPaid} />
        </div>

        {/* Offer card */}
        {offerVisible && s.activeOffer && !isPaid && (
          <OfferCard offer={s.activeOffer} token={token} />
        )}

        {/* Consent form */}
        {showConsentForm && !isPaid && (
          <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 space-y-4">
            <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Einwilligungen</div>
            <p className="text-sm text-[#888]">
              Bitte bestätigen Sie die folgenden Dokumente, um den Vertrag abzuschließen.
            </p>
            <div className="space-y-3">
              {s.legalDocuments.map((doc) => {
                const checked = consented.has(doc.id);
                const loading = consentPending === doc.id;
                return (
                  <div key={doc.id} className="space-y-1.5">
                    <label
                      className={`flex items-start gap-3 cursor-pointer group ${loading ? "opacity-60" : ""}`}
                      onClick={() => !checked && handleConsent(doc)}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                          checked ? "bg-[#22c55e] border-[#22c55e]" : "border-[#2a3a50] group-hover:border-[#00b8ff]"
                        }`}
                      >
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#ccc] leading-tight">
                        Ich akzeptiere die{" "}
                        <span className="text-[#00b8ff] font-medium">{doc.title}</span>
                        {doc.isRequired && <span className="text-[#ef4444] ml-0.5">*</span>}
                        <span className="text-[#555] text-xs ml-1">v{doc.version}</span>
                      </span>
                    </label>
                    {doc.r2Key && (
                      <a
                        href={`/api/closing/legal-doc-pdf?token=${encodeURIComponent(token)}&id=${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-7 flex items-center gap-1.5 text-xs text-[#00b8ff] hover:text-[#0099dd] transition-colors w-fit"
                      >
                        <FileText size={10} />
                        Dokument lesen
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {requiredDocs.length > 0 && <p className="text-xs text-[#444]">* Pflichtfeld</p>}
          </div>
        )}

        {/* Payment CTA */}
        {paymentReady && s.activeOffer && (
          <div className="rounded-2xl bg-[#0c1520] border border-[rgba(0,184,255,0.2)] p-6 space-y-4">
            <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Vertragsabschluss</div>
            <p className="text-sm text-[#aaa]">
              Ihr Berater hat den Vertrag bestätigt. Schließen Sie Ihre Bestellung jetzt ab.
            </p>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[#888] text-sm">Gesamtbetrag inkl. MwSt.</span>
              <span className="text-2xl font-bold text-[#f0f0f0]">
                {fmtEur(Math.round(s.activeOffer.priceNet * 1.19))}
              </span>
            </div>
            {showConsentForm && !allRequiredConsented && (
              <p className="text-xs text-[#f59e0b]">Bitte bestätigen Sie alle Pflichtdokumente um fortzufahren.</p>
            )}
            <button
              onClick={handlePay}
              disabled={paying || (showConsentForm && !allRequiredConsented)}
              className="w-full py-3 rounded-xl bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {paying ? "Weiterleitung…" : "Jetzt bezahlen →"}
            </button>
            <p className="text-xs text-[#444] text-center">Sicher über Stripe · Kreditkarte oder SEPA-Lastschrift</p>
          </div>
        )}

        {/* Payment pending */}
        {paymentPending && !isPaid && (
          <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 text-center space-y-3">
            <div className="text-3xl">⏳</div>
            <p className="text-sm text-[#888]">Zahlung wird verarbeitet. Diese Seite aktualisiert sich automatisch.</p>
          </div>
        )}

        {/* Lost */}
        {s.status === "verloren" && (
          <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 text-center">
            <p className="text-sm text-[#666] leading-relaxed">
              Das Gespräch wurde beendet. Bei Fragen wenden Sie sich bitte an Ihren Berater.
            </p>
          </div>
        )}

        {isWaiting && !isPaid && (
          <div className="text-center">
            <p className="text-xs text-[#333]">Diese Seite aktualisiert sich automatisch alle 20 Sekunden.</p>
          </div>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-[#333]">
            OKUN Systems ·{" "}
            <a href="mailto:info@okun-systems.de" className="hover:text-[#555] transition-colors">
              info@okun-systems.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Offer modal (shown over video when offer is presented) ──────────────────
function OfferModal({
  offer,
  token,
  onDismiss,
}: {
  offer: Offer;
  token: string;
  onDismiss: () => void;
}) {
  const grossCents = Math.round(offer.priceNet * 1.19);
  const netCents = offer.priceNet;
  const mwst = grossCents - netCents;
  const hasPdf = !!offer.template?.r2Key;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0c1520] border border-[rgba(245,158,11,0.3)] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a2840] flex-shrink-0">
          <div>
            <div className="text-[10px] font-semibold text-[#f59e0b] uppercase tracking-widest mb-0.5">Ihr Angebot</div>
            <h2 className="text-base font-bold text-[#f0f0f0]">
              {offer.template?.name ?? "OKUN Systems Paket"}
            </h2>
          </div>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#555] hover:text-[#f0f0f0] hover:bg-[#1a2840] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Price summary */}
          <div className="px-6 py-4 space-y-3">
            {offer.template?.description && (
              <p className="text-sm text-[#888] leading-relaxed">{offer.template.description}</p>
            )}
            <div className="bg-[#080d14] rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-[#888]">
                <span>Nettobetrag</span>
                <span>{fmtEur(netCents)}</span>
              </div>
              <div className="flex justify-between text-[#888]">
                <span>MwSt. 19%</span>
                <span>{fmtEur(mwst)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#f0f0f0] pt-1.5 border-t border-[#1a2840] mt-1.5">
                <span>Gesamt inkl. MwSt.</span>
                <span className="text-lg">{fmtEur(grossCents)}</span>
              </div>
            </div>
            {offer.validUntil && (
              <div className="text-xs text-[#555] text-right">
                Angebot gültig bis: {new Date(offer.validUntil).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
              </div>
            )}
          </div>

          {/* PDF viewer — auto-displayed when offer has a PDF */}
          {hasPdf && (
            <div className="px-6 pb-4">
              <div className="text-xs font-medium text-[#888] uppercase tracking-widest mb-2">
                <FileText size={11} className="inline mr-1.5" />
                Angebots-Dokument
              </div>
              <div className="rounded-xl overflow-hidden border border-[#1a2840] bg-[#080d14]" style={{ height: "400px" }}>
                <iframe
                  src={`/api/closing/offer-pdf?token=${encodeURIComponent(token)}#toolbar=0`}
                  className="w-full h-full border-0"
                  title="Angebot PDF"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1a2840] flex-shrink-0">
          <button
            onClick={onDismiss}
            className="px-5 py-2.5 rounded-xl bg-[#1a2840] hover:bg-[#243550] text-[#f0f0f0] font-medium text-sm transition-colors"
          >
            Verstanden
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Recording & legal consent modal ──────────────────────────────────────────
function ConsentModal({
  legalDocuments,
  alreadyConsented,
  checked,
  setChecked,
  recordingChecked,
  setRecordingChecked,
  submitting,
  onSubmit,
  token,
}: {
  legalDocuments: LegalDoc[];
  alreadyConsented: Set<string>;
  checked: Set<string>;
  setChecked: (s: Set<string>) => void;
  recordingChecked: boolean;
  setRecordingChecked: (v: boolean) => void;
  submitting: boolean;
  token: string;
  onSubmit: () => void;
}) {
  const requiredDocs = legalDocuments.filter((d) => d.isRequired);
  const allRequiredChecked = requiredDocs.every(
    (d) => alreadyConsented.has(d.id) || checked.has(d.id)
  );
  const canSubmit = recordingChecked && allRequiredChecked && !submitting;

  function toggleDoc(id: string) {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
      <div className="bg-[#0c1520] border border-[rgba(139,92,246,0.3)] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1a2840] flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#f0f0f0]">Ihre Einwilligung wird benötigt</h2>
            <p className="text-xs text-[#666] mt-0.5">Bitte bestätigen Sie die folgenden Punkte</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Recording consent */}
          <div className="bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)] rounded-xl p-4">
            <div className="text-[10px] font-semibold text-[#ef4444] uppercase tracking-widest mb-3">Gesprächsaufzeichnung</div>
            <label className="flex items-start gap-3 cursor-pointer group">
              <div
                onClick={() => setRecordingChecked(!recordingChecked)}
                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors cursor-pointer ${
                  recordingChecked ? "bg-[#ef4444] border-[#ef4444]" : "border-[#3a3a50] group-hover:border-[#ef4444]"
                }`}
              >
                {recordingChecked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-[#ccc] leading-snug">
                Ich stimme der Aufzeichnung dieses Gesprächs zu. Die Aufzeichnung dient der Dokumentation des Vertragsabschlusses.
              </span>
            </label>
          </div>

          {/* Legal documents */}
          {legalDocuments.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">Rechtliche Dokumente</div>
              {legalDocuments.map((doc) => {
                const alreadyDone = alreadyConsented.has(doc.id);
                const isChecked = alreadyDone || checked.has(doc.id);
                return (
                  <div key={doc.id} className="space-y-1.5">
                    <label
                      className={`flex items-start gap-3 ${alreadyDone ? "cursor-default" : "cursor-pointer group"}`}
                      onClick={() => !alreadyDone && toggleDoc(doc.id)}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                          isChecked ? "bg-[#22c55e] border-[#22c55e]" : "border-[#2a3a50] group-hover:border-[#00b8ff]"
                        }`}
                      >
                        {isChecked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#ccc] leading-snug">
                        Ich akzeptiere{" "}
                        <span className="text-[#f0f0f0] font-medium">{doc.title}</span>
                        {doc.isRequired && <span className="text-[#ef4444] ml-0.5"> *</span>}
                        <span className="text-[#555] text-xs ml-1">v{doc.version}</span>
                      </span>
                    </label>
                    {doc.r2Key && (
                      <a
                        href={`/api/closing/legal-doc-pdf?token=${encodeURIComponent(token)}&id=${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-7 flex items-center gap-1.5 text-xs text-[#00b8ff] hover:text-[#0099dd] transition-colors w-fit"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText size={10} />
                        Dokument lesen
                      </a>
                    )}
                  </div>
                );
              })}
              {requiredDocs.length > 0 && <p className="text-[10px] text-[#444]">* Pflichtfeld</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#1a2840] flex-shrink-0 space-y-3">
          {!allRequiredChecked && (
            <p className="text-xs text-[#f59e0b]">Bitte alle Pflichtfelder bestätigen um fortzufahren.</p>
          )}
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-[#8b5cf6] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            {submitting ? "Wird gespeichert…" : "Zustimmen & Weiter →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0e1a28] text-base flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-xs text-[#444] mb-0.5">{label}</div>
        <div className="text-sm font-medium text-[#f0f0f0]">{value}</div>
        {sub && <div className="text-xs text-[#888]">{sub}</div>}
      </div>
    </div>
  );
}

function StatusPill({ status, isPaid }: { status: string; isPaid: boolean }) {
  if (isPaid) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22c55e] text-xs font-medium w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        Bezahlt & Aktiv
      </div>
    );
  }
  const map: Record<string, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
    closing_scheduled: { label: "Termin bestätigt", color: "#00b8ff", bg: "rgba(0,184,255,0.1)", border: "rgba(0,184,255,0.2)", pulse: false },
    in_progress: { label: "Gespräch läuft", color: "#00b8ff", bg: "rgba(0,184,255,0.1)", border: "rgba(0,184,255,0.2)", pulse: true },
    offer_presented: { label: "Angebot wurde unterbreitet", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", pulse: false },
    agreement_reached: { label: "Einigung erzielt", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", pulse: false },
    consent_given: { label: "Einwilligung erteilt", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", pulse: false },
    contract_closed: { label: "Vertrag bestätigt", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)", pulse: false },
    payment_pending: { label: "Zahlung ausstehend", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", pulse: true },
    verloren: { label: "Gespräch beendet", color: "#666", bg: "rgba(102,102,102,0.1)", border: "rgba(102,102,102,0.2)", pulse: false },
  };
  const cfg = map[status] ?? map.closing_scheduled;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </div>
  );
}

function OfferCard({ offer, token }: { offer: Offer; token: string }) {
  const grossCents = Math.round(offer.priceNet * 1.19);
  const netCents = offer.priceNet;
  const mwst = grossCents - netCents;
  const [showPdf, setShowPdf] = useState(false);

  return (
    <div className="rounded-2xl bg-[#0c1520] border border-[rgba(245,158,11,0.25)] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#444] uppercase tracking-widest mb-1">Ihr Angebot</div>
          <h3 className="text-base font-bold text-[#f0f0f0]">
            {offer.template?.name ?? "OKUN Systems Paket"}
          </h3>
          {offer.template?.description && (
            <p className="text-sm text-[#888] mt-1 leading-relaxed">{offer.template.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-[#f0f0f0]">{fmtEur(grossCents)}</div>
          <div className="text-xs text-[#555]">inkl. MwSt.</div>
        </div>
      </div>

      <div className="border-t border-[#1a2840] pt-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-[#888]"><span>Nettobetrag</span><span>{fmtEur(netCents)}</span></div>
        <div className="flex justify-between text-[#888]"><span>MwSt. 19%</span><span>{fmtEur(mwst)}</span></div>
        <div className="flex justify-between font-semibold text-[#f0f0f0]"><span>Gesamt</span><span>{fmtEur(grossCents)}</span></div>
      </div>

      {offer.template?.r2Key && (
        <div className="space-y-2">
          <button
            onClick={() => setShowPdf((v) => !v)}
            className="flex items-center gap-2 text-sm text-[#00b8ff] hover:text-[#0099dd] transition-colors"
          >
            <FileText size={14} />
            {showPdf ? "PDF ausblenden" : "Angebot als PDF ansehen"}
          </button>
          {showPdf && (
            <div className="rounded-xl overflow-hidden border border-[#1a2840] bg-[#080d14]" style={{ height: "500px" }}>
              <iframe
                src={`/api/closing/offer-pdf?token=${encodeURIComponent(token)}#toolbar=0`}
                className="w-full h-full border-0"
                title="Angebot PDF"
              />
            </div>
          )}
        </div>
      )}

      {offer.validUntil && (
        <div className="text-xs text-[#555] text-right">
          Gültig bis: {fmtDate(new Date(offer.validUntil))}
        </div>
      )}
    </div>
  );
}
